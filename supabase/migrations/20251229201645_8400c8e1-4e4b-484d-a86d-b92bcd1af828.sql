-- Create function to increment usage count
CREATE OR REPLACE FUNCTION public.increment_usage(p_user_id UUID, p_month_year TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usage_tracking (user_id, month_year, analyses_count)
  VALUES (p_user_id, p_month_year, 1)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET analyses_count = usage_tracking.analyses_count + 1, updated_at = NOW();
END;
$$;