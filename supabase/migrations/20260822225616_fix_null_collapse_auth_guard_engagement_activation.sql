-- QNT-DEFECT-001 remediation, files 3 and 4 of 4 (task_0b2b72d7).
--
-- Both get_user_engagement_stats(uuid) and get_user_activation_score(uuid) are
-- EXECUTE-granted to the `anon` role (confirmed via has_function_privilege) and
-- guarded with a raw `auth.uid() != p_user_id` check. For an anonymous caller
-- (no JWT `sub` claim), auth.uid() IS NULL, so `NULL != p_user_id` evaluates to
-- SQL NULL rather than true/false. plpgsql's `IF` treats a NULL condition as
-- false, so the RAISE EXCEPTION branch never fires -- the guard silently no-ops.
--
-- Live-exploit confirmed by direct curl against the anon-key REST RPC endpoint
-- before this fix (200 OK, full user data returned for an arbitrary UUID with
-- no Authorization session at all) and re-verified fixed after (400 "Access
-- denied") -- see docs/RELEASE_EVIDENCE.json and docs/OPEN_DEFECTS.json
-- QNT-DEFECT-001 for the full before/after evidence.
--
-- Fix: replace `auth.uid() != p_user_id` with `p_user_id IS DISTINCT FROM
-- auth.uid()`, which is NULL-safe (never itself evaluates to NULL), matching
-- the pattern already used in get_referral_stats() (20260814120000). Also wrap
-- is_service_role() in COALESCE(...,false) for defense in depth, matching the
-- get_user_activation_score fix that predates this migration.

CREATE OR REPLACE FUNCTION public.get_user_engagement_stats(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT COALESCE(public.is_service_role(), false) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT jsonb_build_object(
    'current_streak', COALESCE(ue.current_streak, 0),
    'longest_streak', COALESCE(ue.longest_streak, 0),
    'total_analyses', COALESCE(ue.total_analyses, 0),
    'total_exports', COALESCE(ue.total_exports, 0),
    'activity_score', COALESCE(ue.activity_score, 0),
    'engagement_tier', COALESCE(ue.engagement_tier, 'new'),
    'milestones_achieved', COALESCE(ue.milestones_achieved, '[]'::jsonb),
    'email_frequency', COALESCE(ue.email_frequency, 'weekly'),
    'last_active_date', ue.last_active_date
  ) INTO v_result FROM public.user_engagement ue WHERE ue.user_id = p_user_id;
  IF v_result IS NULL THEN
    v_result := jsonb_build_object('current_streak', 0, 'longest_streak', 0, 'total_analyses', 0, 'total_exports', 0, 'activity_score', 0, 'engagement_tier', 'new', 'milestones_achieved', '[]'::jsonb, 'email_frequency', 'weekly', 'last_active_date', null);
  END IF;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_activation_score(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_score INTEGER := 0; v_event_counts JSONB; v_band TEXT; v_next_step TEXT; v_unique_events INTEGER;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin') AND NOT COALESCE(public.is_service_role(), false) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT COALESCE(jsonb_object_agg(event_type, cnt), '{}'::jsonb) INTO v_event_counts
  FROM (SELECT event_type, COUNT(*)::int AS cnt FROM public.activation_events WHERE user_id = p_user_id GROUP BY event_type) sub;
  v_score :=
    LEAST(3, COALESCE((v_event_counts->>'idea_entered')::int, 0)) * 10 +
    LEAST(3, COALESCE((v_event_counts->>'location_entered')::int, 0)) * 10 +
    LEAST(3, COALESCE((v_event_counts->>'calculation_completed')::int, 0)) * 20 +
    LEAST(3, COALESCE((v_event_counts->>'pdf_exported')::int, 0)) * 25 +
    LEAST(3, COALESCE((v_event_counts->>'return_visit')::int, 0)) * 15 +
    LEAST(3, COALESCE((v_event_counts->>'doc_generated')::int, 0)) * 20 +
    LEAST(3, COALESCE((v_event_counts->>'scenario_edited')::int, 0)) * 15 +
    LEAST(3, COALESCE((v_event_counts->>'invoice_created')::int, 0)) * 25;
  v_score := LEAST(100, v_score);
  SELECT COUNT(DISTINCT event_type)::int INTO v_unique_events FROM public.activation_events WHERE user_id = p_user_id;
  IF v_score >= 80 THEN v_band := 'champion'; v_next_step := 'Upgrade to Plus and unlock unlimited analyses + investor-ready exports.';
  ELSIF v_score >= 50 THEN v_band := 'engaged'; v_next_step := 'Export your analysis as PDF to see the full investor-ready report.';
  ELSIF v_score >= 25 THEN v_band := 'exploring'; v_next_step := 'Run a full calculation to see your unit economics and verdict.';
  ELSE v_band := 'new'; v_next_step := 'Enter your business idea and location to start your first analysis.';
  END IF;
  RETURN jsonb_build_object('score', v_score, 'band', v_band, 'next_step', v_next_step, 'event_counts', v_event_counts, 'unique_events', v_unique_events);
END;
$function$;
