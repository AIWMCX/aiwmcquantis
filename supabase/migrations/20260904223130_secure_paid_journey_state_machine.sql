-- Restrict the paid-journey state machine to trusted server callers and
-- make replay handling safe under concurrency.

revoke all on table public.engagement_state_transitions from anon, authenticated;
revoke all on table public.quantis_events from anon, authenticated;
grant select, insert, update, delete
  on table public.engagement_state_transitions to service_role;
grant select, insert, update, delete
  on table public.quantis_events to service_role;

revoke execute on function public.apply_engagement_transition(
  uuid, public.engagement_journey_state, uuid, text, text
) from public, anon, authenticated;
grant execute on function public.apply_engagement_transition(
  uuid, public.engagement_journey_state, uuid, text, text
) to service_role;

create unique index if not exists engagement_state_transitions_stripe_event_id_key
  on public.engagement_state_transitions (stripe_event_id)
  where stripe_event_id is not null;

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
set search_path = ''
as $function$
declare
  v_current public.engagement_journey_state;
  v_existing public.engagement_state_transitions;
  v_row public.engagement_state_transitions;
  v_valid boolean := false;
begin
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'apply_engagement_transition: idempotency key is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_idempotency_key, 0)
  );

  select journey_state
    into v_current
    from public.paid_engagements
   where id = p_engagement_id
   for update;

  if not found then
    raise exception 'apply_engagement_transition: engagement % not found',
      p_engagement_id;
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
$function$;

revoke execute on function public.apply_engagement_transition(
  uuid, public.engagement_journey_state, uuid, text, text
) from public, anon, authenticated;
grant execute on function public.apply_engagement_transition(
  uuid, public.engagement_journey_state, uuid, text, text
) to service_role;
