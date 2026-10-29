-- funnel_events_clean: stop counting the analyses trigger as a visitor session.
--
-- Buy-blockers #127/#128 (2026-10-29). trg_analyses_emit_complete_event
-- (20260816000000) writes an analysis_complete row for every saved analysis
-- with session_id = the analysis id, because a trigger has no browser session.
-- In this view each of those rows became its own "session": no referrer, so
-- it was counted as an external Direct / unknown visit, and it was a second
-- analysis_complete for the same run (the browser already records one in the
-- visitor's real session). Result on /admin/funnel: more completes than
-- starts, and inflated Direct / unknown sessions.
--
-- The trigger stays (it is the ground-truth count of saved analyses, which
-- public.analyses also holds). Only this visitor-funnel view skips its rows.
-- The view is redefined exactly as in 20261025010000 plus one WHERE line.

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
      OR COALESCE(u.email, '')::text ~* '(jeltov|beltov|aiwmc|jjbalaganvasya)'
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
