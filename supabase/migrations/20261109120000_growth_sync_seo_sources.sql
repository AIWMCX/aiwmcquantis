-- Growth sync phase 2: SEO / GEO / AEO sources in the same tables as #439
-- (supabase/functions/growth-sync, /admin/growth).
--
--   new sources  psi       PageSpeed Insights (Lighthouse lab + CrUX field), report psi_url
--                indexing  Search Console sitemaps.list + URL Inspection,
--                          reports indexing_sitemap, indexing_url
--                indexnow  one row per IndexNow ping from production-deploy.yml,
--                          report indexnow_ping
--                bing      Bing Webmaster GetRankAndTrafficStats / GetCrawlStats,
--                          reports bing_traffic, bing_crawl
--   ext_sync_runs.status  + 'permission_denied' (a Google 403 for the
--                          service account's Search Console permission level)
--   ext_sync_runs.mode    + 'ping' (the IndexNow summary posted after a deploy)
--
-- Only CHECK constraints change. No new table, function, grant or cron job:
-- the page reads these rows through the existing admin-only RLS policies, and
-- the existing pg_cron job 'growth-sync-daily' runs the new sources too.
-- The report/source pairing constraint (split_part(report, '_', 1) = source)
-- already holds for every new report name.
--
-- Rollback (delete the new rows first, or the old constraints will not apply):
--   DELETE FROM public.ext_metrics_daily WHERE source IN ('psi', 'indexing', 'indexnow', 'bing');
--   DELETE FROM public.ext_sync_runs WHERE source IN ('psi', 'indexing', 'indexnow', 'bing')
--     OR status = 'permission_denied' OR mode = 'ping';
--   then re-create the four constraints with the value lists of
--   20261108120000_growth_sync_ext_metrics.sql.

-- Drop the single-column CHECK constraint(s) on one column, whatever Postgres
-- named them (the originals were inline, so <table>_<column>_check). The
-- two-column ext_metrics_daily_source_report constraint is left alone.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'c'
      AND array_length(c.conkey, 1) = 1
      AND (
        (c.conrelid = 'public.ext_metrics_daily'::regclass AND a.attname IN ('source', 'report'))
        OR (c.conrelid = 'public.ext_sync_runs'::regclass AND a.attname IN ('source', 'status', 'mode'))
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

ALTER TABLE public.ext_metrics_daily
  ADD CONSTRAINT ext_metrics_daily_source_check CHECK (source IN (
    'ga4', 'gsc', 'clarity', 'psi', 'indexing', 'indexnow', 'bing'
  )),
  ADD CONSTRAINT ext_metrics_daily_report_check CHECK (report IN (
    'ga4_overview', 'ga4_channel', 'ga4_landing_page', 'ga4_source_medium', 'ga4_country', 'ga4_device',
    'gsc_overview', 'gsc_query', 'gsc_page', 'gsc_country', 'gsc_device',
    'clarity_overview',
    'psi_url',
    'indexing_url', 'indexing_sitemap',
    'indexnow_ping',
    'bing_traffic', 'bing_crawl'
  ));

ALTER TABLE public.ext_sync_runs
  ADD CONSTRAINT ext_sync_runs_source_check CHECK (source IN (
    'ga4', 'gsc', 'clarity', 'psi', 'indexing', 'indexnow', 'bing'
  )),
  ADD CONSTRAINT ext_sync_runs_status_check CHECK (status IN (
    'running', 'ok', 'partial', 'error', 'skipped', 'not_configured', 'permission_denied'
  )),
  ADD CONSTRAINT ext_sync_runs_mode_check CHECK (mode IN ('daily', 'backfill', 'ping'));

COMMENT ON TABLE public.ext_metrics_daily IS
  'GA4 / Search Console / Clarity / PageSpeed Insights / Search Console indexing / IndexNow / Bing metrics written by the growth-sync edge function. Admin read only.';
