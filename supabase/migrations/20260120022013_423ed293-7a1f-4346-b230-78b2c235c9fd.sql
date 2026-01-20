-- Fix: Replace security definer view with security invoker view
DROP VIEW IF EXISTS public.admin_metrics;

CREATE VIEW public.admin_metrics
WITH (security_invoker = true) AS
SELECT
  (SELECT COUNT(*)::integer FROM public.profiles) as total_users,
  (SELECT COUNT(*)::integer FROM public.analyses) as total_analyses,
  (SELECT COUNT(*)::integer FROM public.subscriptions WHERE status IN ('active', 'trialing') AND plan_id = 'plus') as plus_subscribers,
  (SELECT COUNT(*)::integer FROM public.subscriptions WHERE status = 'active' AND plan_id = 'free') as free_users,
  (SELECT COALESCE(SUM(analyses_count), 0)::integer FROM public.usage_tracking WHERE month_year = to_char(NOW(), 'YYYY-MM')) as monthly_analyses,
  (SELECT COUNT(*)::integer FROM public.profiles WHERE created_at >= NOW() - INTERVAL '7 days') as weekly_signups,
  (SELECT COUNT(*)::integer FROM public.profiles WHERE created_at >= NOW() - INTERVAL '30 days') as monthly_signups;

-- Grant access for authenticated users
GRANT SELECT ON public.admin_metrics TO authenticated;