-- Function to increment API key usage count
CREATE OR REPLACE FUNCTION public.increment_api_key_usage(p_key_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.api_keys
  SET usage_count = usage_count + 1
  WHERE id = p_key_id;
END;
$$;