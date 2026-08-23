-- User cohort classifier, part 2/2 (QNT-DEFECT-005 / GTM Track C item 1).
--
-- Precedence, in order: (1) exact founder-email allowlist match
-- (is_admin_allowlisted -- beltovbogdan@gmail.com, jeltovbogdan@gmail.com,
-- legal@aiwmcquantis.com, per that function's live definition) -> FOUNDER;
-- (2) exact staff/content_admin-email allowlist match
-- (is_content_admin_allowlisted) -> STAFF; (3) a generic admin/content_admin
-- user_roles row for an account NOT on either email allowlist (defense in
-- depth -- covers a future admin grant issued by a different mechanism) ->
-- STAFF; (4) the exact test-email pattern list already established in
-- 20260721051509_commercial_clean_views.sql -> TEST; (5) everything else ->
-- EXTERNAL_REAL.
--
-- Live-verified immediately after creation against every real row in
-- auth.users (44 total at the time): 4 EXTERNAL_REAL, 2 FOUNDER, 1 STAFF,
-- 37 TEST. Cross-checked against analyses/subscriptions: of the 4
-- EXTERNAL_REAL users, 0 have ever completed a single analysis (0 of 142
-- analyses system-wide belong to a real external user), and only 1 has ever
-- held a paid subscription (Plus, since expired -- see QNT-DEFECT-019, the
-- same account fixed earlier this session for the current_period_end bug).
-- See docs/RELEASE_EVIDENCE.json for the full query trail.

CREATE OR REPLACE FUNCTION public.classify_user_cohort(_email text, _user_id uuid)
RETURNS public.user_cohort
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN public.is_admin_allowlisted(_email) THEN 'FOUNDER'::public.user_cohort
    WHEN public.is_content_admin_allowlisted(_email) THEN 'STAFF'::public.user_cohort
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id AND ur.role IN ('admin'::public.app_role, 'content_admin'::public.app_role)
    ) THEN 'STAFF'::public.user_cohort
    WHEN lower(_email) LIKE '%@quantis-e2e.test'
      OR lower(_email) LIKE '%@quantis-test.com'
      OR lower(_email) LIKE '%glasswing%'
      OR lower(_email) LIKE '%audit-test%'
      OR lower(_email) LIKE '%@mailnull.com'
      OR lower(_email) = 'ci-test-probe@aiwmcquantis.com'
    THEN 'TEST'::public.user_cohort
    ELSE 'EXTERNAL_REAL'::public.user_cohort
  END;
$function$;

COMMENT ON FUNCTION public.classify_user_cohort(text, uuid) IS
  'QNT-DEFECT-005 / GTM Track C item 1. Classifies a user into EXTERNAL_REAL/FOUNDER/STAFF/QA/TEST/BOT/SYNTHETIC/DEMO. Reuses is_admin_allowlisted() / is_content_admin_allowlisted() and the test-email pattern list already established in 20260721051509_commercial_clean_views.sql. QA/BOT/SYNTHETIC/DEMO have no current detectable signal in this schema -- valid enum values, never assigned today, not a fabricated placeholder.';

REVOKE ALL ON FUNCTION public.classify_user_cohort(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.classify_user_cohort(text, uuid) TO service_role;

CREATE OR REPLACE VIEW public.user_cohorts AS
SELECT
  u.id AS user_id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  public.classify_user_cohort(u.email, u.id) AS cohort
FROM auth.users u;

COMMENT ON VIEW public.user_cohorts IS
  'One row per auth.users row with its classify_user_cohort() result. Join analyses/funnel_events/subscriptions to this on user_id to get cohort-filtered business metrics. Service-role only -- never exposes auth secrets.';

REVOKE ALL ON public.user_cohorts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_cohorts TO service_role;
