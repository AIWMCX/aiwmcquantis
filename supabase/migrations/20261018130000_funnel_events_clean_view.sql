-- One canonical source for product/commercial metrics (YC-grade counts).
--
-- funnel_events still holds historical alias pairs (analysis_started /
-- analysis_completed fired alongside analysis_start / analysis_complete until
-- mid-September; result_rendered fires with result_viewed), plus internal and
-- test traffic. Metrics must come from this view, never raw COUNT(*).
--
--  * canonical_event: alias -> current name.
--  * is_internal: tagged QA sessions (metadata.internal_qa), internal accounts
--    (jeltov|aiwmc|jjbalaganvasya), localhost / preview hosts.
--  * is_first_in_session: first occurrence of a canonical event per session
--    (count unique sessions, not raw repeats).
-- security_invoker: callers see only what funnel_events' own RLS allows
-- (service role / admin), so no new exposure.
CREATE OR REPLACE VIEW public.funnel_events_clean
WITH (security_invoker = true) AS
WITH base AS (
  SELECT
    fe.*,
    CASE fe.event_name
      WHEN 'analysis_started'   THEN 'analysis_start'
      WHEN 'analysis_completed' THEN 'analysis_complete'
      WHEN 'result_rendered'    THEN 'result_viewed'
      ELSE fe.event_name
    END AS canonical_event,
    (
      COALESCE(fe.metadata->>'internal_qa', '') = 'true'
      OR COALESCE(u.email, '') ~* '(jeltov|aiwmc|jjbalaganvasya)'
      OR COALESCE(fe.metadata->>'host', '') ~* '(localhost|127\.0\.0\.1|vercel\.app)'
      OR COALESCE(fe.referrer, '') ~* '(localhost|127\.0\.0\.1)'
    ) AS is_internal,
    (fe.created_at AT TIME ZONE 'America/Denver')::date AS denver_day
  FROM public.funnel_events fe
  LEFT JOIN auth.users u ON u.id = fe.user_id
)
SELECT
  b.*,
  ROW_NUMBER() OVER (PARTITION BY b.session_id, b.canonical_event ORDER BY b.created_at, b.id) = 1 AS is_first_in_session
FROM base b;

REVOKE ALL ON public.funnel_events_clean FROM anon, authenticated;
GRANT SELECT ON public.funnel_events_clean TO service_role;

COMMENT ON VIEW public.funnel_events_clean IS
  'Canonical funnel metrics: alias-mapped events, internal/test flag, first-in-session flag, Denver day. Use instead of raw funnel_events counts.';
