-- Fix new linter ERRORs: make the 2 new admin views security_invoker
-- so they respect the admin-only RLS on funnel_events.
ALTER VIEW public.funnel_summary_30d SET (security_invoker = true);
ALTER VIEW public.funnel_daily_30d   SET (security_invoker = true);

-- Revoke from authenticated; admins still read via has_role check on the
-- underlying table because security_invoker now applies it.
REVOKE SELECT ON public.funnel_summary_30d FROM authenticated;
REVOKE SELECT ON public.funnel_daily_30d   FROM authenticated;
GRANT  SELECT ON public.funnel_summary_30d TO authenticated;
GRANT  SELECT ON public.funnel_daily_30d   TO authenticated;