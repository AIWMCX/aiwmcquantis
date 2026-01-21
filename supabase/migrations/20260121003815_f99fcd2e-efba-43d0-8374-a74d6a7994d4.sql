-- Drop existing functions that need signature changes
DROP FUNCTION IF EXISTS public.get_monthly_analyses(integer);
DROP FUNCTION IF EXISTS public.get_daily_signups(integer);

-- Recreate secure RPC for daily signups (admin only)
CREATE OR REPLACE FUNCTION public.get_daily_signups(days_back integer DEFAULT 30)
RETURNS TABLE (
  signup_date date,
  signup_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    DATE(created_at) as signup_date,
    COUNT(*) as signup_count
  FROM auth.users
  WHERE created_at > NOW() - (days_back || ' days')::interval
  GROUP BY DATE(created_at)
  ORDER BY signup_date DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_daily_signups(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_daily_signups(integer) TO authenticated;

-- Recreate secure RPC for monthly analyses (admin only)
CREATE OR REPLACE FUNCTION public.get_monthly_analyses(months_back integer DEFAULT 6)
RETURNS TABLE (
  month_year text,
  analysis_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    TO_CHAR(created_at, 'YYYY-MM') as month_year,
    COUNT(*) as analysis_count
  FROM public.analyses
  WHERE created_at > NOW() - (months_back || ' months')::interval
  GROUP BY TO_CHAR(created_at, 'YYYY-MM')
  ORDER BY month_year DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_monthly_analyses(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_analyses(integer) TO authenticated;