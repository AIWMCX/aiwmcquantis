-- Found while building the Semgrep custom rule for QNT-DEFECT-001's bug
-- class (item 8, sql-unwrapped-is-service-role in .semgrep/quantis-rules.yml).
--
-- get_referral_stats was fixed earlier this session (migration 20260814120000)
-- for the raw-inequality-against-auth.uid() half of the NULL-collapse pattern
-- via IS DISTINCT FROM, but its negated is_service_role() term was never wrapped in
-- COALESCE, unlike get_user_activation_score and get_user_engagement_stats
-- (both fixed in migration 20260822225616). is_service_role() itself returns
-- SQL NULL when neither JWT role claim nor the `role` GUC is set — an edge
-- case essentially unreachable via normal PostgREST-routed HTTP calls (which
-- always set a role), but theoretically reachable via a direct SQL/internal
-- call path that bypasses PostgREST's session setup. Confirmed via
-- pg_get_functiondef() before this fix that the live definition still lacked
-- COALESCE; applying the same already-proven-safe wrap for full consistency
-- across all 3 functions in the QNT-DEFECT-001 family and so the new Semgrep
-- rule finds zero current occurrences rather than flagging already-known,
-- narrow-severity code on its very first run.

CREATE OR REPLACE FUNCTION public.get_referral_stats(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT COALESCE(public.is_service_role(), false) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'code', rc.code,
    'total_clicks', rc.total_clicks,
    'total_conversions', rc.total_conversions,
    'total_rewards_earned', rc.total_rewards_earned,
    'is_active', rc.is_active,
    'pending_rewards', (
      SELECT COUNT(*) FROM public.referral_rewards rr
      WHERE rr.user_id = p_user_id AND rr.status = 'pending'
    ),
    'share_url', 'https://aiwmcquantis.com?ref=' || rc.code
  )
  INTO v_result
  FROM public.referral_codes rc
  WHERE rc.user_id = p_user_id;

  IF v_result IS NULL THEN
    v_result := jsonb_build_object(
      'code', NULL,
      'total_clicks', 0,
      'total_conversions', 0,
      'total_rewards_earned', 0,
      'is_active', false,
      'pending_rewards', 0,
      'share_url', NULL
    );
  END IF;

  RETURN v_result;
END;
$function$;
