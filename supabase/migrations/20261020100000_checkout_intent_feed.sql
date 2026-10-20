-- notify-checkout-intent reads funnel_events_clean, a security_invoker view
-- whose is_internal logic joins auth.users. service_role has no SELECT on
-- auth.users, so the edge function failed with "permission denied for table
-- users". This definer function returns exactly what the alert needs.
-- Execute is granted to service_role only.
create or replace function public.checkout_intent_feed(p_since timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with clicks as (
    select f.id, f.session_id, f.user_id, f.metadata, f.created_at
    from public.funnel_events_clean f
    where f.event_name = 'paid_checkout_start'
      and f.is_internal = false
      and f.created_at >= p_since
      and f.session_id is not null
    order by f.created_at
    limit 200
  )
  select jsonb_build_object(
    'clicks', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from clicks c), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'session_id', e.session_id, 'event_name', e.event_name, 'path', e.path,
        'referrer', e.referrer, 'utm_source', e.utm_source, 'utm_medium', e.utm_medium,
        'utm_campaign', e.utm_campaign, 'created_at', e.created_at) order by e.created_at)
      from public.funnel_events_clean e
      where e.session_id in (select distinct session_id from clicks)
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.checkout_intent_feed(timestamptz) from public, anon, authenticated;
grant execute on function public.checkout_intent_feed(timestamptz) to service_role;
