-- Real, attributable traffic sources for the admin panel.
--
-- 1. funnel_events_clean.is_internal becomes SESSION-level: if any row of a
--    session is internal (QA tag, internal email, localhost/preview host,
--    founder-granted account) the whole session is internal. Previously the
--    anonymous rows before an internal user signed in counted as external.
-- 2. Founder-granted accounts (subscriptions.stripe_subscription_id
--    'founder_%' / 'sub_plus_%') are internal. Invite grants stay external:
--    they are real invited people.
-- 3. traffic_channel() classifies a session's first touch: UTM medium first
--    (paid, email, social), then the referrer host. Unattributed sessions are
--    reported as 'Direct / unknown', never guessed.
-- 4. admin_traffic_sources(p_days) returns per-source funnel counts for
--    admins only (the view itself stays revoked from anon/authenticated).

CREATE OR REPLACE VIEW public.funnel_events_clean
WITH (security_invoker = true) AS
WITH granted AS (
  SELECT DISTINCT user_id
  FROM public.subscriptions
  WHERE user_id IS NOT NULL
    AND (stripe_subscription_id LIKE 'founder\_%' OR stripe_subscription_id LIKE 'sub\_plus\_%')
),
base AS (
  SELECT fe.id,
    fe.event_name,
    fe.session_id,
    fe.user_id,
    fe.path,
    fe.referrer,
    fe.utm_source,
    fe.utm_medium,
    fe.utm_campaign,
    fe.metadata,
    fe.created_at,
    CASE fe.event_name
      WHEN 'analysis_started' THEN 'analysis_start'
      WHEN 'analysis_completed' THEN 'analysis_complete'
      WHEN 'result_rendered' THEN 'result_viewed'
      ELSE fe.event_name
    END AS canonical_event,
    (
      COALESCE(fe.metadata ->> 'internal_qa', '') = 'true'
      OR COALESCE(u.email, '')::text ~* '(jeltov|aiwmc|jjbalaganvasya)'
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
)
SELECT id,
  event_name,
  session_id,
  user_id,
  path,
  referrer,
  utm_source,
  utm_medium,
  utm_campaign,
  metadata,
  created_at,
  canonical_event,
  bool_or(row_internal) OVER (PARTITION BY COALESCE(session_id, id::text)) AS is_internal,
  denver_day,
  row_number() OVER (PARTITION BY session_id, canonical_event ORDER BY created_at, id) = 1 AS is_first_in_session
FROM base b;

REVOKE ALL ON public.funnel_events_clean FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.traffic_channel(p_referrer text, p_utm_source text, p_utm_medium text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH h AS (
    SELECT regexp_replace(lower(COALESCE(substring(p_referrer FROM '^[a-zA-Z]+://([^/:?#]+)'), '')), '^www\.', '') AS host
  )
  SELECT CASE
    WHEN lower(COALESCE(p_utm_medium, '')) IN ('cpc', 'ppc', 'paid', 'paid_social', 'paidsocial', 'ads', 'display') THEN 'Paid'
    WHEN lower(COALESCE(p_utm_medium, '')) IN ('email', 'outreach', 'newsletter')
      OR lower(COALESCE(p_utm_source, '')) IN ('email', 'outreach', 'newsletter') THEN 'Email'
    WHEN lower(COALESCE(p_utm_medium, '')) IN ('social', 'organic_social', 'organic-social') THEN 'Social'
    WHEN lower(COALESCE(p_utm_source, '')) ~ '(chatgpt|openai|perplexity|claude|gemini|copilot)' THEN 'AI assistants'
    WHEN NULLIF(btrim(p_utm_source), '') IS NOT NULL THEN 'Campaign (UTM)'
    WHEN h.host = '' OR h.host ~ 'aiwmcquantis\.com$' THEN 'Direct / unknown'
    WHEN h.host ~ '(chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|you\.com)$' THEN 'AI assistants'
    WHEN h.host ~ '(^|\.)(google|bing|duckduckgo|yahoo|yandex|baidu|ecosia|search\.brave)\.' THEN 'Search'
    WHEN h.host ~ '(facebook\.com|fb\.com|fb\.me|instagram\.com|linkedin\.com|lnkd\.in|^t\.co|x\.com|twitter\.com|reddit\.com|youtube\.com|youtu\.be|tiktok\.com|threads\.(net|com)|t\.me|telegram\.org|whatsapp\.com|pinterest\.)' THEN 'Social'
    WHEN h.host ~ 'stripe\.com$' THEN 'Checkout return'
    ELSE 'Referral'
  END
  FROM h;
$$;

CREATE OR REPLACE FUNCTION public.admin_traffic_sources(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  WITH ev AS (
    SELECT * FROM public.funnel_events_clean
    WHERE created_at >= now() - make_interval(days => v_days)
      AND session_id IS NOT NULL
  ),
  sess AS (
    SELECT session_id,
      bool_or(is_internal) AS internal,
      (array_agg(referrer ORDER BY created_at, id))[1] AS first_referrer,
      (array_agg(path ORDER BY created_at, id))[1] AS landing_path,
      (array_agg(utm_source ORDER BY created_at, id) FILTER (WHERE NULLIF(btrim(utm_source), '') IS NOT NULL))[1] AS utm_source,
      (array_agg(utm_medium ORDER BY created_at, id) FILTER (WHERE NULLIF(btrim(utm_medium), '') IS NOT NULL))[1] AS utm_medium,
      bool_or(canonical_event = 'analysis_start') AS a_start,
      bool_or(canonical_event = 'analysis_complete') AS a_done,
      bool_or(canonical_event = 'free_signup_complete') AS signup,
      bool_or(canonical_event = 'paid_checkout_start') AS co_start,
      bool_or(canonical_event IN ('paid_checkout_complete', 'subscription_activated')) AS co_done
    FROM ev
    GROUP BY session_id
  ),
  labelled AS (
    SELECT s.*,
      public.traffic_channel(first_referrer, utm_source, utm_medium) AS channel,
      COALESCE(
        NULLIF(btrim(utm_source), ''),
        NULLIF(regexp_replace(lower(COALESCE(substring(first_referrer FROM '^[a-zA-Z]+://([^/:?#]+)'), '')), '^www\.', ''), ''),
        '(no referrer)'
      ) AS source
    FROM sess s
  ),
  ext AS (SELECT * FROM labelled WHERE NOT internal),
  by_source AS (
    SELECT channel, source,
      count(*) AS sessions,
      count(*) FILTER (WHERE a_start) AS analysis_started,
      count(*) FILTER (WHERE a_done) AS analysis_completed,
      count(*) FILTER (WHERE signup) AS signups,
      count(*) FILTER (WHERE co_start) AS checkout_started,
      count(*) FILTER (WHERE co_done) AS checkout_completed
    FROM ext
    GROUP BY channel, source
  )
  SELECT jsonb_build_object(
    'days', v_days,
    'generated_at', now(),
    'totals', jsonb_build_object(
      'sessions_all', (SELECT count(*) FROM labelled),
      'internal_excluded', (SELECT count(*) FROM labelled WHERE internal),
      'external', (SELECT count(*) FROM ext),
      'utm_tagged', (SELECT count(*) FROM ext WHERE utm_source IS NOT NULL),
      'direct_unknown', (SELECT count(*) FROM ext WHERE channel = 'Direct / unknown')
    ),
    'channels', COALESCE((
      SELECT jsonb_agg(c ORDER BY (c->>'sessions')::int DESC)
      FROM (
        SELECT jsonb_build_object(
          'channel', channel,
          'sessions', sum(sessions),
          'analysis_started', sum(analysis_started),
          'analysis_completed', sum(analysis_completed),
          'signups', sum(signups),
          'checkout_started', sum(checkout_started),
          'checkout_completed', sum(checkout_completed)
        ) AS c
        FROM by_source GROUP BY channel
      ) x
    ), '[]'::jsonb),
    'sources', COALESCE((
      SELECT jsonb_agg(to_jsonb(b) ORDER BY b.sessions DESC, b.source) FROM by_source b
    ), '[]'::jsonb),
    'events', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'event_name', e.canonical_event,
        'total_events', e.total_events,
        'unique_sessions', e.unique_sessions,
        'unique_users', e.unique_users,
        'unique_analyses', e.unique_analyses
      ))
      FROM (
        SELECT canonical_event,
          count(*) AS total_events,
          count(DISTINCT session_id) AS unique_sessions,
          count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS unique_users,
          count(DISTINCT metadata ->> 'analysis_id') FILTER (WHERE metadata ->> 'analysis_id' IS NOT NULL) AS unique_analyses
        FROM ev
        WHERE NOT is_internal
        GROUP BY canonical_event
      ) e
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_traffic_sources(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_traffic_sources(integer) TO authenticated;
