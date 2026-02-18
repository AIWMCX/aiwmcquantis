
CREATE OR REPLACE FUNCTION public.get_unique_users_with_analysis()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT COUNT(DISTINCT user_id)::integer INTO v_count
  FROM public.analyses;

  RETURN v_count;
END;
$function$;
