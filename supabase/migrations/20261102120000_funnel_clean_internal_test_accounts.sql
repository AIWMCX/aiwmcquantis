-- funnel_events_clean: count founder, QA and fixture accounts as internal.
--
-- Production read-out 2026-11-02: the clean funnel still carried internal
-- accounts (analysis completes: beltovbogdan@ 76, jeltovbogdan@ 29,
-- jjbalaganvasya@ 22, glasswing.qa.2026-07-12@ 10). The repo's email rule was
-- (jeltov|beltov|aiwmc|jjbalaganvasya): the QA and fixture accounts that
-- public.classify_user_cohort() already calls TEST (20260823174934:
-- quantis-e2e.test, quantis-test.com, glasswing, audit-test, mailnull) and the
-- founder's other accounts were not in it. The first three emails already
-- match that rule, so if they still show as outside traffic the live view is
-- older than this file's history; CREATE OR REPLACE below sets the live
-- definition to this one either way.
--
-- A row is now also internal when its user's auth.users email matches:
--   (jeltov|beltov|aiwmc|jjbalaganvasya|glasswing|qatest|audit-test)
--   (quantis-e2e.test|quantis-test.com|mailnull)
--   bel%@gmail.com (founder aliases)
--   digitalhubshops@gmail.com (founder account)
-- is_internal stays session-level: bool_or over the session, so every event in
-- a session that has one event by such a user is internal, including events
-- sent before sign-in.
--
-- The analyses trigger's own analysis_complete copy (session_id = analysis id,
-- no browser session) stays excluded, as in 20261029010000, so it can never
-- show up here as an unflagged outside complete.
--
-- The view is redefined exactly as in 20261029010000; only the email rule
-- changes. Same columns, invoker security and grants.

CREATE OR REPLACE VIEW public.funnel_events_clean
WITH (security_invoker = true) AS
WITH granted AS (
  SELECT DISTINCT subscriptions.user_id
  FROM public.subscriptions
  WHERE subscriptions.user_id IS NOT NULL
    AND (subscriptions.stripe_subscription_id LIKE 'founder\_%' OR subscriptions.stripe_subscription_id LIKE 'sub\_plus\_%')
), base AS (
  SELECT fe.id, fe.event_name, fe.session_id, fe.user_id, fe.path, fe.referrer,
    fe.utm_source, fe.utm_medium, fe.utm_campaign, fe.metadata, fe.created_at,
    CASE fe.event_name
      WHEN 'analysis_started'   THEN 'analysis_start'
      WHEN 'analysis_completed' THEN 'analysis_complete'
      WHEN 'result_rendered'    THEN 'result_viewed'
      ELSE fe.event_name
    END AS canonical_event,
    (
      COALESCE(fe.metadata ->> 'internal_qa', '') = 'true'
      OR COALESCE(u.email, '')::text ~* '(jeltov|beltov|aiwmc|jjbalaganvasya|glasswing|qatest|audit-test)'
      OR COALESCE(u.email, '')::text ~* '(quantis-e2e\.test|quantis-test\.com|mailnull)'
      OR COALESCE(u.email, '')::text ILIKE 'bel%@gmail.com'
      OR lower(COALESCE(u.email, '')::text) = 'digitalhubshops@gmail.com'
      OR COALESCE(fe.metadata ->> 'host', '') ~* '(localhost|127\.0\.0\.1|vercel\.app)'
      OR COALESCE(fe.referrer, '') ~* '(localhost|127\.0\.0\.1|\.chatgpt\.site)'
      OR lower(COALESCE(fe.utm_medium, '')) = 'internal'
      OR lower(COALESCE(fe.utm_source, '')) ~ '^(qa_test|internal|test)$'
      OR g.user_id IS NOT NULL
    ) AS row_internal,
    (fe.created_at AT TIME ZONE 'America/Denver')::date AS denver_day
  FROM public.funnel_events fe
  LEFT JOIN auth.users u ON u.id = fe.user_id
  LEFT JOIN granted g ON g.user_id = fe.user_id
  -- Skip the analyses-table trigger's own copy of analysis_complete (see header).
  WHERE COALESCE(fe.metadata ->> 'emitted_by', '') <> 'trg_analyses_emit_complete_event'
)
SELECT id, event_name, session_id, user_id, path, referrer, utm_source, utm_medium,
  utm_campaign, metadata, created_at, canonical_event,
  bool_or(row_internal) OVER (PARTITION BY COALESCE(session_id, id::text)) AS is_internal,
  denver_day,
  row_number() OVER (PARTITION BY session_id, canonical_event ORDER BY created_at, id) = 1 AS is_first_in_session
FROM base b;

REVOKE ALL ON public.funnel_events_clean FROM anon, authenticated;
GRANT SELECT ON public.funnel_events_clean TO service_role;
