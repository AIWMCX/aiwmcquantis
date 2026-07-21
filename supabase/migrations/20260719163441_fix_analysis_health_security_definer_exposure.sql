-- Reconciliation file (2026-07-21): this migration was applied via the
-- Supabase Management API earlier this session (before a context
-- compaction) under exactly this version/name, but no matching local .sql
-- file was ever committed -- confirmed via a `supabase db push` failure
-- that flagged this version as "remote, no local file". Content below is
-- reconstructed from the CURRENT live definition of public.analysis_health
-- (verified via direct query 2026-07-21), not the original diff, since
-- that text is not recoverable after compaction. This file is a faithful
-- CREATE OR REPLACE of what is genuinely live today -- idempotent, safe
-- to run against the current database with no effective change.
--
-- Original fix: analysis_health (an aggregated per-day/per-tier health
-- metrics view over analysis_attempts) was exposed to anon/authenticated
-- roles. Closed by ensuring only service_role/postgres can select from it.

CREATE OR REPLACE VIEW public.analysis_health AS
SELECT
  date_trunc('day', created_at)::date AS day,
  tier,
  count(*) AS total,
  count(*) FILTER (WHERE status = 'succeeded') AS succeeded,
  count(*) FILTER (WHERE degraded = true) AS degraded,
  count(*) FILTER (WHERE status = 'failed') AS failed,
  round(count(*) FILTER (WHERE status = 'succeeded')::numeric * 100.0 / NULLIF(count(*), 0)::numeric, 1) AS ok_rate_pct,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms::double precision) AS p50_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms::double precision) AS p95_ms
FROM public.analysis_attempts
GROUP BY date_trunc('day', created_at)::date, tier
ORDER BY date_trunc('day', created_at)::date DESC, tier;

COMMENT ON VIEW public.analysis_health IS
  'Aggregated per-day/per-tier analysis health metrics. Restricted to service_role/postgres -- no anon/authenticated grant (2026-06/07 security exposure fix, reconciled 2026-07-21).';

REVOKE ALL ON public.analysis_health FROM PUBLIC, anon, authenticated;
