-- Close the anonymous Commercial Foundation read path.
-- The SECURITY INVOKER function now observes commercial_foundations RLS:
-- authenticated callers see rows only when the existing admin policy allows
-- them; the trusted service-role Edge Function remains supported.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_commercial_foundation()
RETURNS public.commercial_foundations
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT f.* FROM public.commercial_foundations f
  WHERE f.is_current
  LIMIT 1;
$function$;

-- PostgreSQL/Supabase may grant EXECUTE to PUBLIC by default. Do not rely on
-- RLS to protect a SECURITY DEFINER RPC: function EXECUTE must be restricted.
REVOKE EXECUTE ON FUNCTION public.get_commercial_foundation() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.upsert_commercial_foundation(jsonb) FROM PUBLIC, anon;

-- Preserve intended application and server callers. Authenticated reads are
-- still constrained by the table's admin-only RLS policy.
GRANT EXECUTE ON FUNCTION public.get_commercial_foundation() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_commercial_foundation(jsonb) TO authenticated, service_role;

-- Migration-time regression assertions: fail the migration if access drifts.
DO $verify$
DECLARE
  v_get_is_definer boolean;
BEGIN
  SELECT p.prosecdef
    INTO v_get_is_definer
    FROM pg_proc AS p
   WHERE p.oid = 'public.get_commercial_foundation()'::regprocedure;

  IF v_get_is_definer IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'get_commercial_foundation must remain SECURITY INVOKER';
  END IF;

  IF has_function_privilege('anon', 'public.get_commercial_foundation()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute get_commercial_foundation';
  END IF;
  IF has_function_privilege('anon', 'public.upsert_commercial_foundation(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute upsert_commercial_foundation';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.get_commercial_foundation()', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.get_commercial_foundation()', 'EXECUTE') THEN
    RAISE EXCEPTION 'intended get_commercial_foundation callers lost EXECUTE';
  END IF;
END
$verify$;

COMMIT;
