-- Applied directly to production via the Supabase MCP tool on 2026-09-04,
-- before GitHub repository access was available in that session. Committed
-- here now, at its actual ledger-assigned version, to close the ledger/repo
-- drift this omission caused (caught by scripts/verify-migration-ledger.mjs
-- blocking every Production Deploy since).
--
-- Step 2 of 2: replace the hardcoded transition CASE with an explicit rules
-- table (failure/refund/cancellation/admin-override paths push the matrix
-- past what's readable as an inline CASE), and rewrite
-- apply_engagement_transition to consult it. All existing hardening
-- (SECURITY DEFINER, empty search_path, service_role-only execute,
-- advisory-lock-before-state-read, idempotency/stripe_event_id conflict
-- detection) is preserved verbatim, not reintroduced weaker.

create table public.engagement_transition_rules (
  from_state public.engagement_journey_state not null,
  to_state public.engagement_journey_state not null,
  requires_actor boolean not null default false,
  primary key (from_state, to_state)
);

alter table public.engagement_transition_rules enable row level security;
-- deny-all for anon/authenticated (no policies); service_role reads via existing default grants.

comment on table public.engagement_transition_rules is
  'Explicit allow-list for apply_engagement_transition(). A transition not present here is rejected. requires_actor=true means p_actor_user_id must be non-null (used for admin_corrected, since a human-supervised correction must never be attributed to an anonymous/service caller). Adding a new engagement_journey_state value later requires a follow-up migration to also add its rows here -- the enum alone grants no reachability.';

insert into public.engagement_transition_rules (from_state, to_state, requires_actor) values
  ('checkout_created',   'payment_confirmed', false),
  ('checkout_created',   'payment_failed',    false),
  ('checkout_created',   'checkout_expired',  false),
  ('checkout_created',   'canceled',          false),

  ('payment_failed',     'payment_confirmed', false),
  ('payment_failed',     'checkout_expired',  false),
  ('payment_failed',     'canceled',          false),

  ('checkout_expired',   'checkout_created',  false),
  ('checkout_expired',   'canceled',          false),

  ('payment_confirmed',  'engagement_created',    false),
  ('payment_confirmed',  'refunded',              false),
  ('payment_confirmed',  'partially_refunded',    false),
  ('payment_confirmed',  'canceled',              false),

  ('engagement_created', 'intake_started',        false),
  ('engagement_created', 'refunded',              false),
  ('engagement_created', 'partially_refunded',    false),
  ('engagement_created', 'canceled',              false),

  ('intake_started',     'intake_completed',      false),
  ('intake_started',     'intake_abandoned',      false),
  ('intake_started',     'refunded',              false),
  ('intake_started',     'partially_refunded',    false),
  ('intake_started',     'canceled',              false),

  ('intake_abandoned',   'intake_started',        false),
  ('intake_abandoned',   'canceled',              false),

  ('intake_completed',   'workspace_active',      false),
  ('intake_completed',   'refunded',              false),
  ('intake_completed',   'partially_refunded',    false),
  ('intake_completed',   'canceled',              false),

  ('workspace_active',   'analysis_ready',        false),
  ('workspace_active',   'refunded',              false),
  ('workspace_active',   'partially_refunded',    false),
  ('workspace_active',   'canceled',              false),

  ('analysis_ready',     'memo_reviewed',         false),
  ('analysis_ready',     'refunded',              false),
  ('analysis_ready',     'partially_refunded',    false),
  ('analysis_ready',     'canceled',              false),

  ('memo_reviewed',      'delivered',             false),
  ('memo_reviewed',      'refunded',              false),
  ('memo_reviewed',      'partially_refunded',    false),
  ('memo_reviewed',      'canceled',              false),

  ('delivered',          'revision_requested',    false),
  ('delivered',          'completed',             false),
  ('delivered',          'refunded',              false),
  ('delivered',          'partially_refunded',    false),

  ('revision_requested', 'workspace_active',      false),
  ('revision_requested', 'memo_reviewed',         false),
  ('revision_requested', 'refunded',              false),
  ('revision_requested', 'partially_refunded',    false),
  ('revision_requested', 'canceled',              false),

  ('completed',          'refunded',              false),
  ('completed',          'partially_refunded',    false),

  ('canceled',           'refunded',              false),
  ('canceled',           'partially_refunded',    false),

  ('partially_refunded', 'refunded',              false);

-- admin_corrected: reachable from every other state, and can escape to any other
-- state (the human-supervised reset valve). Generated from the enum itself so
-- it's provably complete, not hand-typed.
with all_states as (
  select unnest(enum_range(null::public.engagement_journey_state)) as s
)
insert into public.engagement_transition_rules (from_state, to_state, requires_actor)
select s, 'admin_corrected'::public.engagement_journey_state, true
  from all_states where s <> 'admin_corrected'
union all
select 'admin_corrected'::public.engagement_journey_state, s, true
  from all_states where s <> 'admin_corrected';

create or replace function public.apply_engagement_transition(
  p_engagement_id uuid,
  p_next_state public.engagement_journey_state,
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_stripe_event_id text default null
) returns public.engagement_state_transitions
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_current public.engagement_journey_state;
  v_existing public.engagement_state_transitions;
  v_row public.engagement_state_transitions;
  v_requires_actor boolean;
begin
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'apply_engagement_transition: idempotency key is required';
  end if;

  -- Serialize callers using the same key before inspecting either state.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_idempotency_key, 0)
  );

  select journey_state
    into v_current
    from public.paid_engagements
   where id = p_engagement_id
   for update;

  if not found then
    raise exception 'apply_engagement_transition: engagement % not found', p_engagement_id;
  end if;

  select *
    into v_existing
    from public.engagement_state_transitions
   where idempotency_key = p_idempotency_key
      or (p_stripe_event_id is not null and stripe_event_id = p_stripe_event_id)
   order by id
   limit 1;

  if found then
    if v_existing.engagement_id <> p_engagement_id
       or v_existing.next_state <> p_next_state then
      raise exception 'apply_engagement_transition: idempotency conflict';
    end if;
    return v_existing;
  end if;

  select requires_actor
    into v_requires_actor
    from public.engagement_transition_rules
   where from_state = v_current
     and to_state = p_next_state;

  if not found then
    raise exception
      'apply_engagement_transition: invalid transition % -> % for engagement %',
      v_current, p_next_state, p_engagement_id;
  end if;

  if v_requires_actor and p_actor_user_id is null then
    raise exception
      'apply_engagement_transition: transition % -> % requires a non-null actor_user_id',
      v_current, p_next_state;
  end if;

  update public.paid_engagements
     set journey_state = p_next_state
   where id = p_engagement_id;

  insert into public.engagement_state_transitions (
    engagement_id,
    actor_user_id,
    previous_state,
    next_state,
    idempotency_key,
    stripe_event_id
  )
  values (
    p_engagement_id,
    p_actor_user_id,
    v_current,
    p_next_state,
    p_idempotency_key,
    p_stripe_event_id
  )
  returning * into v_row;

  return v_row;
end;
$function$;

revoke all on function public.apply_engagement_transition(uuid, public.engagement_journey_state, uuid, text, text) from public;
revoke all on function public.apply_engagement_transition(uuid, public.engagement_journey_state, uuid, text, text) from anon, authenticated;
grant execute on function public.apply_engagement_transition(uuid, public.engagement_journey_state, uuid, text, text) to service_role;

comment on function public.apply_engagement_transition is
  'Priority 2, revised 2026-09-04: transition validity and actor requirements are now looked up from engagement_transition_rules instead of an inline CASE, to accommodate failure/refund/cancellation/admin-override paths. service_role execute only. Callers (stripe-webhook, engagement-intake, etc.) still need to be wired to call this -- not part of this migration.';
