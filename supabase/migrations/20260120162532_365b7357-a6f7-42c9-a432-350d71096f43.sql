-- Drop and recreate the admin_metrics view with security_invoker enabled
DROP VIEW IF EXISTS public.admin_metrics;

CREATE VIEW public.admin_metrics WITH (security_invoker = on) AS
SELECT 
  (SELECT COUNT(*)::integer FROM public.profiles) AS total_users,
  (SELECT COUNT(*)::integer FROM public.analyses) AS total_analyses,
  (SELECT COUNT(*)::integer FROM public.subscriptions 
   WHERE status IN ('active', 'trialing') AND plan_id = 'plus') AS plus_subscribers,
  (SELECT COUNT(*)::integer FROM public.subscriptions 
   WHERE status = 'active' AND plan_id = 'free') AS free_users,
  (SELECT COALESCE(SUM(analyses_count), 0)::integer FROM public.usage_tracking 
   WHERE month_year = to_char(now(), 'YYYY-MM')) AS monthly_analyses,
  (SELECT COUNT(*)::integer FROM public.profiles 
   WHERE created_at >= now() - interval '7 days') AS weekly_signups,
  (SELECT COUNT(*)::integer FROM public.profiles 
   WHERE created_at >= now() - interval '30 days') AS monthly_signups;

-- Grant SELECT permission to authenticated users (RLS will control actual access)
GRANT SELECT ON public.admin_metrics TO authenticated;

-- Revoke all access from anonymous users
REVOKE ALL ON public.admin_metrics FROM anon;

-- Create a secure database function to fetch admin metrics
-- This function uses SECURITY DEFINER to bypass RLS but includes its own admin check
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS TABLE (
  total_users integer,
  total_analyses integer,
  plus_subscribers integer,
  free_users integer,
  monthly_analyses integer,
  weekly_signups integer,
  monthly_signups integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::integer FROM public.profiles) AS total_users,
    (SELECT COUNT(*)::integer FROM public.analyses) AS total_analyses,
    (SELECT COUNT(*)::integer FROM public.subscriptions 
     WHERE status IN ('active', 'trialing') AND plan_id = 'plus') AS plus_subscribers,
    (SELECT COUNT(*)::integer FROM public.subscriptions 
     WHERE status = 'active' AND plan_id = 'free') AS free_users,
    (SELECT COALESCE(SUM(analyses_count), 0)::integer FROM public.usage_tracking 
     WHERE month_year = to_char(now(), 'YYYY-MM')) AS monthly_analyses,
    (SELECT COUNT(*)::integer FROM public.profiles 
     WHERE created_at >= now() - interval '7 days') AS weekly_signups,
    (SELECT COUNT(*)::integer FROM public.profiles 
     WHERE created_at >= now() - interval '30 days') AS monthly_signups;
END;
$$;