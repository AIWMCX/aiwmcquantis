-- Activation-to-revenue Wave 6 (PR C): SECOND_REAL_ANALYSIS_COMPLETED, the
-- primary product KPI per the founder's spec ("first useful result ->
-- meaningful second use", not just signup -> first analysis).
--
-- Deliberately server-derived from persisted analyses rows, never from a
-- client analytics event -- 20260816000000_analysis_complete_event_trigger.sql
-- already documents a real, live 4x gap found between persisted completed
-- analyses and the client-emitted analysis_complete funnel event, which is
-- exactly the failure mode this spec warns about ("we previously had a
-- material mismatch between persisted completed analyses and
-- analysis_complete events; measurement truth must remain grounded in
-- persisted production records").
--
-- Reuses public.commercial_analyses (confirmed live, already excludes
-- founder/staff/test-email cohorts via classify_user_cohort/
-- external_commercial_users) rather than re-deriving that exclusion list a
-- third time. Mirrors has_completed_real_analysis()'s exact shape/security
-- posture (STABLE SECURITY DEFINER, scoped to auth.uid() only -- no
-- cross-user read), just counting instead of checking existence.

CREATE OR REPLACE FUNCTION public.has_completed_second_real_analysis()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT count(*) >= 2
  FROM public.commercial_analyses
  WHERE user_id = auth.uid();
$function$;

GRANT EXECUTE ON FUNCTION public.has_completed_second_real_analysis() TO authenticated, service_role;
