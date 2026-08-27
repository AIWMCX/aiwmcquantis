-- P0 security fix, third wave (same-day systematic audit).
--
-- Part 1 -- quota/rate-limit spoofing (medium severity): seven functions
-- accept an arbitrary p_user_id/p_key_id with no check that it matches the
-- caller, and are (or were) directly callable via the public anon key.
-- A malicious caller could pass a real victim's UUID to exhaust their
-- monthly analysis/download/idea-gen quota, inflate their rate-limit
-- counter to lock them out, or (for consume_scenario_set_quota) insert a
-- scenario_sets row attributed to someone else's analysis. Confirmed via
-- codebase search: every real caller of all seven uses a service-role
-- admin client (supabaseService / adminClient in analyze-business,
-- create-scenario-set, generate-idea edge functions) -- there is no
-- legitimate anon/authenticated direct caller for any of them, so the
-- clean fix is the same REVOKE pattern already used for the critical
-- billing-provisioning functions, not a more complex internal guard.
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_analysis_quota(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_download_quota(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_idea_gen_quota(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_scenario_set_quota(uuid, uuid, integer, text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_export_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_usage(uuid, text) FROM PUBLIC, anon, authenticated;

-- Part 2 -- admin-metrics info disclosure (medium severity): unlike their
-- sibling get_admin_metrics()/get_recent_users(), these two had no
-- has_role() check at all. src/hooks/useAdminMetrics.ts DOES call both
-- directly with the caller's own session (not service_role), so a blanket
-- REVOKE would break the legitimate admin dashboard -- the grants stay as
-- they were; the missing authorization check is added to the function
-- body instead, matching get_admin_metrics()'s exact pattern. Live-tested:
-- calling get_daily_signups() with no admin session now raises
-- "Access denied: admin role required" instead of returning data.
CREATE OR REPLACE FUNCTION public.get_daily_signups(days_back integer DEFAULT 30)
 RETURNS TABLE(signup_date date, signup_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    DATE(p.created_at) as signup_date,
    COUNT(*) as signup_count
  FROM public.profiles p
  WHERE p.created_at >= NOW() - (days_back || ' days')::interval
  GROUP BY DATE(p.created_at)
  ORDER BY signup_date ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_analyses(months_back integer DEFAULT 6)
 RETURNS TABLE(month_year text, analyses_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    ut.month_year,
    COALESCE(SUM(ut.analyses_count), 0) as analyses_count
  FROM public.usage_tracking ut
  WHERE ut.month_year >= to_char(NOW() - (months_back || ' months')::interval, 'YYYY-MM')
  GROUP BY ut.month_year
  ORDER BY ut.month_year ASC;
END;
$function$;

-- Part 3 -- security-posture reconnaissance (medium severity):
-- audit_rls_security() returns RLS-enabled/forced/policy-count status for
-- every table in public, letting an unauthenticated caller map which
-- tables lack RLS protection. No app caller exists anywhere in src/ or
-- supabase/functions/ -- it appears to be a manual DBA/SQL-editor tool
-- only, so it's revoked entirely rather than guarded.
REVOKE EXECUTE ON FUNCTION public.audit_rls_security() FROM PUBLIC, anon, authenticated;
