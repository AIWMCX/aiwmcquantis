-- Growth sync: GA4 + Search Console (+ optional Clarity) daily metrics next to
-- the first-party funnel, for /admin/growth (supabase/functions/growth-sync).
--
--   * public.ext_metrics_daily  one row per (source, day, report, dims_key)
--   * public.ext_sync_runs      one row per source per growth-sync run
--   * admin_growth_summary()    daily first-party sessions + ext overview rows
--   * admin_growth_breakdown()  one report summed over a window
--   * pg_cron 'growth-sync-daily' 13:15 UTC, x-cron-secret read from Vault
--
-- Access: admin read only, public.has_role(auth.uid(), 'admin'::app_role), the
-- same check admin_traffic_sources() uses. Only the service role writes.
-- Rollback:
--   SELECT cron.unschedule('growth-sync-daily');
--   DROP FUNCTION public.admin_growth_breakdown(text, integer, integer);
--   DROP FUNCTION public.admin_growth_summary(date, date);
--   DROP TABLE public.ext_sync_runs; DROP TABLE public.ext_metrics_daily;

-- ─────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ext_metrics_daily (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source text NOT NULL CHECK (source IN ('ga4', 'gsc', 'clarity')),
  day date NOT NULL,
  report text NOT NULL CHECK (report IN (
    'ga4_overview', 'ga4_channel', 'ga4_landing_page', 'ga4_source_medium', 'ga4_country', 'ga4_device',
    'gsc_overview', 'gsc_query', 'gsc_page', 'gsc_country', 'gsc_device',
    'clarity_overview'
  )),
  dims jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL,
  -- Stable string of dims (sorted keys, JSON): _shared/growth/rows.ts dimsKey().
  dims_key text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ext_metrics_daily_source_report CHECK (split_part(report, '_', 1) = source),
  CONSTRAINT ext_metrics_daily_unique UNIQUE (source, day, report, dims_key)
);

CREATE INDEX IF NOT EXISTS ext_metrics_daily_report_day_idx
  ON public.ext_metrics_daily (report, day);

COMMENT ON TABLE public.ext_metrics_daily IS
  'GA4 / Search Console / Clarity daily metrics written by the growth-sync edge function. Admin read only.';

CREATE TABLE IF NOT EXISTS public.ext_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  mode text NOT NULL CHECK (mode IN ('daily', 'backfill')),
  source text NOT NULL CHECK (source IN ('ga4', 'gsc', 'clarity')),
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'ok', 'partial', 'error', 'skipped', 'not_configured')),
  rows_upserted integer NOT NULL DEFAULT 0,
  error text,
  -- Range, GA4 thresholding/sampling flags, truncation, next_from for a resumed backfill.
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ext_sync_runs_source_started_idx
  ON public.ext_sync_runs (source, started_at DESC);

COMMENT ON TABLE public.ext_sync_runs IS
  'One row per source per growth-sync run. Admin read only.';

-- ─────────────────────────────────────────────────────────────────────────
-- RLS: admin read, service role writes
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.ext_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ext_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_ext_metrics_daily"
  ON public.ext_metrics_daily FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_read_ext_sync_runs"
  ON public.ext_sync_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

REVOKE ALL ON public.ext_metrics_daily FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.ext_sync_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ext_metrics_daily TO authenticated;
GRANT SELECT ON public.ext_sync_runs TO authenticated;
GRANT ALL ON public.ext_metrics_daily TO service_role;
GRANT ALL ON public.ext_sync_runs TO service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- admin_growth_summary(p_from, p_to): per Denver day
--   first_party: external sessions (funnel_events_clean, NOT is_internal) and
--   those with 2+ distinct canonical events; a session counts on its first day.
--   ext: the ga4/gsc/clarity overview rows in the same range.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_growth_summary(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'America/Denver')::date;
  v_to date := LEAST(COALESCE(p_to, v_today), v_today);
  v_from date := GREATEST(COALESCE(p_from, v_to - 29), DATE '2025-01-01');
  v_first jsonb;
  v_ext jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  IF v_from > v_to THEN
    v_from := v_to;
  END IF;

  WITH sess AS (
    SELECT session_id,
      min(denver_day) AS day,
      bool_or(is_internal) AS internal,
      count(DISTINCT canonical_event) AS n_distinct
    FROM public.funnel_events_clean
    -- One day of slack so a session that started the evening before is still
    -- assigned to its own first day (and then dropped by the range below).
    WHERE created_at >= (v_from::timestamp AT TIME ZONE 'America/Denver') - interval '1 day'
      AND created_at < ((v_to + 1)::timestamp AT TIME ZONE 'America/Denver')
      AND session_id IS NOT NULL
    GROUP BY session_id
  ),
  daily AS (
    SELECT day,
      count(*) FILTER (WHERE NOT internal) AS sessions,
      count(*) FILTER (WHERE NOT internal AND n_distinct >= 2) AS engaged_sessions
    FROM sess
    WHERE day BETWEEN v_from AND v_to
    GROUP BY day
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'day', day, 'sessions', sessions, 'engaged_sessions', engaged_sessions) ORDER BY day), '[]'::jsonb)
    INTO v_first
  FROM daily;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'source', source, 'day', day, 'metrics', metrics, 'fetched_at', fetched_at) ORDER BY day, source), '[]'::jsonb)
    INTO v_ext
  FROM public.ext_metrics_daily
  WHERE report IN ('ga4_overview', 'gsc_overview', 'clarity_overview')
    AND day BETWEEN v_from AND v_to;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'denver_today', v_today,
    'from', v_from,
    'to', v_to,
    'first_party', v_first,
    'ext', v_ext
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_growth_summary(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_growth_summary(date, date) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- admin_growth_breakdown(p_report, p_days, p_limit): one breakdown report
-- summed over the last p_days days (NULL = all history), top p_limit rows.
--   GSC: clicks, impressions, ctr = clicks / impressions, position weighted
--        by impressions. GA4: summed daily values (users are NOT deduplicated
--        across days).
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_growth_breakdown(
  p_report text,
  p_days integer DEFAULT 28,
  p_limit integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from date;
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 500);
  v_rows jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  IF p_report NOT IN (
    'ga4_channel', 'ga4_landing_page', 'ga4_source_medium', 'ga4_country', 'ga4_device',
    'gsc_query', 'gsc_page', 'gsc_country', 'gsc_device'
  ) THEN
    RAISE EXCEPTION 'unknown report %', p_report USING ERRCODE = '22023';
  END IF;
  IF p_days IS NOT NULL THEN
    v_from := (now() AT TIME ZONE 'America/Denver')::date - LEAST(GREATEST(p_days, 1), 1000);
  END IF;

  WITH r AS (
    SELECT dims_key, dims, day, metrics
    FROM public.ext_metrics_daily
    WHERE report = p_report AND (v_from IS NULL OR day >= v_from)
  ),
  agg AS (
    SELECT dims_key,
      (array_agg(dims))[1] AS dims,
      count(DISTINCT day) AS days,
      min(day) AS first_day,
      max(day) AS last_day,
      sum(COALESCE((metrics ->> 'clicks')::numeric, 0)) AS clicks,
      sum(COALESCE((metrics ->> 'impressions')::numeric, 0)) AS impressions,
      sum(COALESCE((metrics ->> 'position')::numeric, 0) * COALESCE((metrics ->> 'impressions')::numeric, 0)) AS position_w,
      sum(COALESCE((metrics ->> 'activeUsers')::numeric, 0)) AS users,
      sum(COALESCE((metrics ->> 'sessions')::numeric, 0)) AS sessions,
      sum(COALESCE((metrics ->> 'engagedSessions')::numeric, 0)) AS engaged_sessions,
      sum(COALESCE((metrics ->> 'screenPageViews')::numeric, 0)) AS views,
      sum(COALESCE((metrics ->> 'keyEvents')::numeric, 0)) AS key_events
    FROM r
    GROUP BY dims_key
  ),
  ranked AS (
    SELECT * FROM agg
    ORDER BY
      CASE WHEN p_report LIKE 'gsc_%' THEN clicks ELSE sessions END DESC,
      CASE WHEN p_report LIKE 'gsc_%' THEN impressions ELSE users END DESC,
      dims_key
    LIMIT v_limit
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('dims', dims, 'days', days, 'first_day', first_day, 'last_day', last_day)
    || CASE WHEN p_report LIKE 'gsc_%' THEN jsonb_build_object(
         'clicks', clicks,
         'impressions', impressions,
         'ctr', CASE WHEN impressions > 0 THEN round(clicks / impressions, 4) END,
         'position', CASE WHEN impressions > 0 THEN round(position_w / impressions, 1) END)
       ELSE jsonb_build_object(
         'users', users, 'sessions', sessions, 'engaged_sessions', engaged_sessions,
         'views', views, 'key_events', key_events)
       END
    ORDER BY
      CASE WHEN p_report LIKE 'gsc_%' THEN clicks ELSE sessions END DESC,
      CASE WHEN p_report LIKE 'gsc_%' THEN impressions ELSE users END DESC,
      dims_key), '[]'::jsonb)
    INTO v_rows
  FROM ranked;

  RETURN jsonb_build_object(
    'report', p_report,
    'days', p_days,
    'from', v_from,
    'rows', v_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_growth_breakdown(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_growth_breakdown(text, integer, integer) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- pg_cron: daily at 13:15 UTC (GSC finalizes days with a 2-3 day lag; the
-- daily run re-fetches the last 5 days). Same Vault pattern as
-- 20261105120000_lead_intake_form_d_cron.sql.
-- ─────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'growth-sync-daily') THEN
    PERFORM cron.unschedule('growth-sync-daily');
  END IF;
  PERFORM cron.schedule(
    'growth-sync-daily',
    '15 13 * * *',
    $cron$
    select net.http_post(
      url := 'https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/growth-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'quantis_shared_cron_secret')
      ),
      body := '{"mode":"daily","source":"pg_cron"}'::jsonb,
      timeout_milliseconds := 150000
    ) as request_id;
    $cron$
  );
END $$;
