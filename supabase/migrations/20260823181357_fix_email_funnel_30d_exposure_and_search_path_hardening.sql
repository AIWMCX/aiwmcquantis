-- QNT-DEFECT-020 (P0). public.email_funnel_30d is a SECURITY DEFINER view
-- (Supabase advisor ERROR: security_definer_view) over leads / email_send_log
-- (both RLS'd service_role-only) and email_engagement (RLS'd admin-only via
-- has_role). Being SECURITY DEFINER, it runs as the view owner and bypasses
-- ALL of those RLS policies -- and it was separately GRANTed SELECT to
-- anon and authenticated. src/pages/admin/EmailFunnel.tsx queries it
-- directly with the browser's anon/authenticated key, with the only access
-- control being client-side route guarding. Net effect: any unauthenticated
-- request to the PostgREST API could read full lead-funnel and email
-- engagement analytics. Live-confirmed via pg_policies + role_table_grants,
-- not just the advisor's say-so.
--
-- Fix, matching the existing get_subscription_summary()/get_referral_stats()
-- pattern already used in this schema: close the raw view to anon/authenticated,
-- and expose the same data only through a SECURITY DEFINER function that
-- checks has_role(auth.uid(), 'admin') internally before returning anything,
-- reusing the exact has_role() call and RAISE EXCEPTION idiom already used
-- by get_subscription_summary.

REVOKE ALL ON public.email_funnel_30d FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.email_funnel_30d TO service_role;

CREATE OR REPLACE FUNCTION public.get_email_funnel_30d()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT COALESCE(public.has_role(auth.uid(), 'admin'), false) THEN
    RAISE EXCEPTION 'Access denied: Admin role required for email funnel data';
  END IF;

  SELECT to_jsonb(f.*) INTO v_result
  FROM public.email_funnel_30d f;

  RETURN v_result;
END;
$function$;

COMMENT ON FUNCTION public.get_email_funnel_30d() IS
  'QNT-DEFECT-020. Admin-gated accessor for public.email_funnel_30d, which is SECURITY DEFINER and must never be granted to anon/authenticated directly. Mirrors the has_role()+RAISE EXCEPTION pattern in get_subscription_summary().';

REVOKE ALL ON FUNCTION public.get_email_funnel_30d() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_email_funnel_30d() TO authenticated, service_role;

-- QNT-DEFECT-021 (P2, defense-in-depth, same class as the earlier
-- function_search_path_mutable fixes this session). Two trigger functions
-- had no SET search_path, leaving them vulnerable to search_path-based
-- object shadowing if a lower-privileged role could ever create objects
-- earlier in another role's search_path.

CREATE OR REPLACE FUNCTION public.enforce_public_metric_monotonic()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.value < OLD.value THEN
    RAISE EXCEPTION 'public_metrics.value is monotonic: cannot lower % from % to %',
      OLD.key, OLD.value, NEW.value;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_service_job_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- QNT-DEFECT-022 (P3, dead-code removal). public.charge_free_analysis(text)
-- (the 1-arg overload, no SET search_path) is superseded by the 2-arg
-- (text, boolean) overload added later in this same schema, which already
-- has SET search_path TO 'public'. Repo-wide grep (src/ and
-- supabase/functions/) confirms ZERO callers of either overload anywhere in
-- application code -- this whole mechanism is orphaned (a parallel,
-- never-wired free-analysis quota path; the live one is
-- consume_analysis_quota() via requireAnalysisQuota() in
-- _shared/entitlements.ts). Dropping the superseded overload rather than
-- patching dead code.

DROP FUNCTION IF EXISTS public.charge_free_analysis(text);
