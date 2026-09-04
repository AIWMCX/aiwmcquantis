-- Priority 2: Paid Journey State Machine
-- Additive only. Existing status columns remain until call sites migrate.

create type public.engagement_journey_state as enum (
  'checkout_created',
  'payment_confirmed',
  'engagement_created',
  'intake_started',
  'intake_completed',
  'workspace_active',
  'analysis_ready',
  'memo_reviewed',
  'delivered',
  'revision_requested',
  'completed'
);

alter table public.paid_engagements
  add column journey_state public.engagement_journey_state not null
  default 'checkout_created';

create table public.engagement_state_transitions (
  id bigint generated always as identity primary key,
  engagement_id uuid not null references public.paid_engagements(id),
  actor_user_id uuid,
  previous_state public.engagement_journey_state,
  next_state public.engagement_journey_state not null,
  occurred_at timestamptz not null default now(),
  idempotency_key text not null,
  failure_code text,
  stripe_event_id text,
  created_at timestamptz not null default now(),
  constraint engagement_state_transitions_idempotency_key_key
    unique (idempotency_key)
);

create index engagement_state_transitions_engagement_id_idx
  on public.engagement_state_transitions (engagement_id, occurred_at);

alter table public.engagement_state_transitions enable row level security;

create or replace function public.apply_engagement_transition(
  p_engagement_id uuid,
  p_next_state public.engagement_journey_state,
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_stripe_event_id text default null
)
returns public.engagement_state_transitions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.engagement_journey_state;
  v_existing public.engagement_state_transitions;
  v_row public.engagement_state_transitions;
  v_valid boolean := false;
begin
  select * into v_existing
    from public.engagement_state_transitions
   where idempotency_key = p_idempotency_key;
  if found then
    return v_existing;
  end if;

  select journey_state into v_current
    from public.paid_engagements
   where id = p_engagement_id
   for update;
  if not found then
    raise exception 'apply_engagement_transition: engagement % not found',
      p_engagement_id;
  end if;

  v_valid := case v_current
    when 'checkout_created'   then p_next_state = 'payment_confirmed'
    when 'payment_confirmed'  then p_next_state = 'engagement_created'
    when 'engagement_created' then p_next_state = 'intake_started'
    when 'intake_started'     then p_next_state = 'intake_completed'
    when 'intake_completed'   then p_next_state = 'workspace_active'
    when 'workspace_active'   then p_next_state = 'analysis_ready'
    when 'analysis_ready'     then p_next_state = 'memo_reviewed'
    when 'memo_reviewed'      then p_next_state = 'delivered'
    when 'delivered'          then p_next_state in ('revision_requested', 'completed')
    when 'revision_requested' then p_next_state in ('workspace_active', 'memo_reviewed')
    else false
  end;

  if not v_valid then
    insert into public.engagement_state_transitions (
      engagement_id, actor_user_id, previous_state, next_state,
      idempotency_key, stripe_event_id, failure_code
    ) values (
      p_engagement_id, p_actor_user_id, v_current, p_next_state,
      p_idempotency_key, p_stripe_event_id, 'invalid_transition'
    )
    returning * into v_row;
    raise exception
      'apply_engagement_transition: invalid transition % -> % for engagement %',
      v_current, p_next_state, p_engagement_id;
  end if;

  update public.paid_engagements
     set journey_state = p_next_state
   where id = p_engagement_id;

  insert into public.engagement_state_transitions (
    engagement_id, actor_user_id, previous_state, next_state,
    idempotency_key, stripe_event_id
  ) values (
    p_engagement_id, p_actor_user_id, v_current, p_next_state,
    p_idempotency_key, p_stripe_event_id
  )
  returning * into v_row;

  return v_row;
end;
$$;
