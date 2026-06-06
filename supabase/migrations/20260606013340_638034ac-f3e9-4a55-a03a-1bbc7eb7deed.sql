CREATE OR REPLACE FUNCTION public.decrement_idea_generation_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _month text := to_char((now() AT TIME ZONE 'utc'),'YYYY-MM');
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  UPDATE public.idea_generation_usage
     SET usage_count = GREATEST(usage_count - 1, 0),
         updated_at = now()
   WHERE user_id = _uid AND month_key = _month;
END
$$;

GRANT EXECUTE ON FUNCTION public.decrement_idea_generation_usage() TO authenticated;