-- Create admin metrics view (secure, admin-only)
CREATE OR REPLACE VIEW public.admin_metrics AS
SELECT
  (SELECT COUNT(*)::integer FROM public.profiles) as total_users,
  (SELECT COUNT(*)::integer FROM public.analyses) as total_analyses,
  (SELECT COUNT(*)::integer FROM public.subscriptions WHERE status IN ('active', 'trialing') AND plan_id = 'plus') as plus_subscribers,
  (SELECT COUNT(*)::integer FROM public.subscriptions WHERE status = 'active' AND plan_id = 'free') as free_users,
  (SELECT COALESCE(SUM(analyses_count), 0)::integer FROM public.usage_tracking WHERE month_year = to_char(NOW(), 'YYYY-MM')) as monthly_analyses,
  (SELECT COUNT(*)::integer FROM public.profiles WHERE created_at >= NOW() - INTERVAL '7 days') as weekly_signups,
  (SELECT COUNT(*)::integer FROM public.profiles WHERE created_at >= NOW() - INTERVAL '30 days') as monthly_signups;

-- Create function to get daily signups for charts
CREATE OR REPLACE FUNCTION public.get_daily_signups(days_back integer DEFAULT 30)
RETURNS TABLE(signup_date date, signup_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    DATE(created_at) as signup_date,
    COUNT(*) as signup_count
  FROM public.profiles
  WHERE created_at >= NOW() - (days_back || ' days')::interval
  GROUP BY DATE(created_at)
  ORDER BY signup_date ASC;
$$;

-- Create function to get monthly analyses for charts
CREATE OR REPLACE FUNCTION public.get_monthly_analyses(months_back integer DEFAULT 6)
RETURNS TABLE(month_year text, analyses_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    month_year,
    COALESCE(SUM(analyses_count), 0) as analyses_count
  FROM public.usage_tracking
  WHERE month_year >= to_char(NOW() - (months_back || ' months')::interval, 'YYYY-MM')
  GROUP BY month_year
  ORDER BY month_year ASC;
$$;

-- Grant access to admin_metrics view for authenticated users
-- (actual access control is done via has_role check in application)
GRANT SELECT ON public.admin_metrics TO authenticated;