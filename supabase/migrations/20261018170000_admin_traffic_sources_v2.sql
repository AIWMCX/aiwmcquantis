-- admin_traffic_sources v2: uses the client attribution payload
-- (metadata.attr, src/lib/attribution.ts).
--  - gclid / msclkid => Paid (fbclid is added to all Facebook links, so it is
--    not treated as paid).
--  - A session with no source of its own is classified from the visitor's
--    recorded 90-day first touch (attr.ft) and counted as
--    recovered_by_first_touch. Nothing is inferred when neither exists.
--  - engaged = sessions with more than one event (scanner clicks rarely are).
-- Rollback: re-run the function from 20261018150000_admin_traffic_sources.sql.

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
      bool_or(canonical_event IN ('paid_checkout_complete', 'subscription_activated')) AS co_done,
      count(*) AS n_events,
      (array_agg(metadata -> 'attr' -> 's' ->> 'gclid') FILTER (WHERE metadata -> 'attr' -> 's' ->> 'gclid' IS NOT NULL))[1] AS gclid,
      (array_agg(metadata -> 'attr' -> 's' ->> 'msclkid') FILTER (WHERE metadata -> 'attr' -> 's' ->> 'msclkid' IS NOT NULL))[1] AS msclkid,
      (array_agg(metadata -> 'attr' -> 'ft' ORDER BY created_at, id) FILTER (WHERE jsonb_typeof(metadata -> 'attr' -> 'ft') = 'object'))[1] AS ft
    FROM ev
    GROUP BY session_id
  ),
  own AS (
    SELECT s.*,
      public.traffic_channel(first_referrer, utm_source, utm_medium) AS own_channel,
      COALESCE(
        NULLIF(btrim(utm_source), ''),
        NULLIF(regexp_replace(lower(COALESCE(substring(first_referrer FROM '^[a-zA-Z]+://([^/:?#]+)'), '')), '^www\.', ''), ''),
        '(no referrer)'
      ) AS own_source
    FROM sess s
  ),
  labelled AS (
    -- Ad click ids win; a visit with no source of its own falls back to the
    -- visitor's recorded first touch (metadata.attr.ft), never a guess.
    SELECT o.*,
      (o.own_channel = 'Direct / unknown' AND o.ft IS NOT NULL AND o.gclid IS NULL AND o.msclkid IS NULL) AS via_first_touch,
      CASE
        WHEN o.gclid IS NOT NULL OR o.msclkid IS NOT NULL THEN 'Paid'
        WHEN o.own_channel = 'Direct / unknown' AND (o.ft ? 'gclid' OR o.ft ? 'msclkid') THEN 'Paid'
        WHEN o.own_channel = 'Direct / unknown' AND o.ft IS NOT NULL THEN public.traffic_channel(
          CASE WHEN o.ft ->> 'referrer_host' IS NOT NULL THEN 'https://' || (o.ft ->> 'referrer_host') END,
          o.ft ->> 'utm_source', o.ft ->> 'utm_medium')
        ELSE o.own_channel
      END AS channel,
      CASE
        WHEN o.gclid IS NOT NULL THEN COALESCE(NULLIF(btrim(o.utm_source), ''), 'google ads')
        WHEN o.msclkid IS NOT NULL THEN COALESCE(NULLIF(btrim(o.utm_source), ''), 'microsoft ads')
        WHEN o.own_channel = 'Direct / unknown' AND o.ft IS NOT NULL THEN COALESCE(NULLIF(o.ft ->> 'utm_source', ''),
          CASE WHEN o.ft ? 'gclid' THEN 'google ads' WHEN o.ft ? 'msclkid' THEN 'microsoft ads' END, o.ft ->> 'referrer_host', '(no referrer)')
        ELSE o.own_source
      END AS source
    FROM own o
  ),
  ext AS (SELECT * FROM labelled WHERE NOT internal),
  by_source AS (
    SELECT channel, source,
      count(*) AS sessions,
      count(*) FILTER (WHERE n_events > 1) AS engaged,
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
      'direct_unknown', (SELECT count(*) FROM ext WHERE channel = 'Direct / unknown'),
      'recovered_by_first_touch', (SELECT count(*) FROM ext WHERE via_first_touch),
      'engaged', (SELECT count(*) FROM ext WHERE n_events > 1)
    ),
    'channels', COALESCE((
      SELECT jsonb_agg(c ORDER BY (c->>'sessions')::int DESC)
      FROM (
        SELECT jsonb_build_object(
          'channel', channel,
          'sessions', sum(sessions),
          'engaged', sum(engaged),
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
