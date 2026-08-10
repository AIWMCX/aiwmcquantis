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

-- RECONSTRUCTED 2026-08-10: analysis_attempts is never created by any
-- migration in this repo's tracked history (confirmed by grep across the
-- whole chain), yet it IS a real, confirmed-live production table -- unlike
-- the four earlier reconstructions this session (analysis_run_logs,
-- rvce_cache, analysis_self_learning, quantis_learning_config), which were
-- confirmed via generated types, this one is confirmed via a real
-- `pg_policies` query captured live during the original P0 incident
-- investigation (docs/security/2026-08-03-p0-access/01_RAW_POLICY_EVIDENCE.sql:
-- "analysis_attempts | analysis_attempts_self | PERMISSIVE | {public} | ALL
-- | true | true") and referenced by this branch's own core security
-- migration (20260804000000_p0_access_control_hardening.sql). Not in
-- src/integrations/supabase/types.ts at all -- that generator apparently
-- doesn't surface this table, for reasons not investigated here.
--
-- Columns below are NOT guessed: the view this file creates was itself
-- reconstructed from a direct live query against production on 2026-07-21
-- (see this file's own header comment) -- created_at/tier/status/degraded/
-- latency_ms are therefore real, confirmed column names, not inferred.
-- `id` follows this repo's universal uuid-PK convention. The 2026-08-03
-- incident audit describes this as an "idempotency ledger" with zero real
-- callers -- this table may have additional columns beyond what this one
-- view happens to select; this reconstruction covers exactly what's
-- provably real and needed for both this view and the P0 hardening
-- migration's REVOKE/POLICY statements (which are column-agnostic) to
-- succeed on a fresh replay.
CREATE TABLE IF NOT EXISTS public.analysis_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text,
  status text,
  degraded boolean NOT NULL DEFAULT false,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.analysis_attempts ENABLE ROW LEVEL SECURITY;

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
