-- P0 SECURITY — RELEASE-BLOCKING GATE.
-- docs/security/2026-08-03-p0-access/ — round-2 review, Blocker 8.
--
-- This is the CI-failing half of the split invariant check. It is
-- deliberately narrow: it only re-checks the exact incident boundary (the
-- ten remediated tables plus the SECURITY DEFINER functions that write to
-- them or were found in the same incident) against the exact post-P0-
-- migration baseline. It returns ZERO ROWS once the P0 migration is
-- applied, and stays at zero indefinitely -- it is a regression lock, not
-- an open-ended scan. Broader schema findings (the ~60+ table TRUNCATE
-- grant sprawl, search_path gaps on unrelated functions, etc.) belong in
-- db-security-advisory.sql, which reports but never fails CI.
--
-- Every finding below is a real regression: if this returns any row, the
-- exact P0 that was proven exploitable via live PostgREST calls has come
-- back, either on the original table/grant vector or the SECURITY-DEFINER-
-- RPC alternate-path vector caught in round 2. Zero rows = PASS.
--
-- Run manually via:
--   psql "$SUPABASE_DB_URL" -f scripts/security/db-security-gate-p0.sql
-- Wired into .github/workflows/db-security-invariant.yml as the failing
-- step; db-security-advisory.sql runs alongside as a non-failing report.

WITH incident_tables AS (
  SELECT * FROM (VALUES
    ('usage_counters'), ('analysis_attempts'), ('leads'), ('quote_gen_usage'),
    ('analysis_cases'), ('invoices'), ('export_jobs'), ('shared_reports'),
    ('referral_codes'), ('funnel_events')
  ) AS t(tablename)
),

-- Expected post-P0-migration grants to anon/authenticated on the incident
-- tables. Every row here was deliberately chosen in the P0 migration; any
-- grant found in role_table_grants that isn't in this list is a
-- regression back toward the original incident, not a false positive.
--
-- Fixed 2026-08-10: confirmed live via the isolated CI P0 gate run --
-- this list only allowlisted funnel_events' authenticated SELECT and
-- treated every other authenticated grant as a violation, but
-- invoices/export_jobs/shared_reports/referral_codes are owner-scoped
-- tables the SAME P0 migration (20260804000000_p0_access_control_
-- hardening.sql) deliberately grants authenticated SELECT/INSERT/UPDATE/
-- DELETE on (RLS then scopes to auth.uid()) -- only usage_counters/
-- analysis_attempts/leads/quote_gen_usage/analysis_cases are genuinely
-- service-role-only with zero anon/authenticated grants. Expanded to
-- match that migration's own GRANT statements exactly.
expected_grants AS (
  SELECT * FROM (VALUES
    ('funnel_events', 'authenticated', 'SELECT'),
    ('invoices', 'authenticated', 'SELECT'),
    ('invoices', 'authenticated', 'INSERT'),
    ('export_jobs', 'authenticated', 'SELECT'),
    ('export_jobs', 'authenticated', 'INSERT'),
    ('export_jobs', 'authenticated', 'UPDATE'),
    ('shared_reports', 'authenticated', 'SELECT'),
    ('shared_reports', 'authenticated', 'INSERT'),
    ('shared_reports', 'authenticated', 'UPDATE'),
    ('shared_reports', 'authenticated', 'DELETE'),
    ('referral_codes', 'authenticated', 'SELECT')
    -- usage_counters/analysis_attempts/leads/quote_gen_usage/analysis_cases
    -- expect ZERO anon/authenticated grants of any kind (service-role-only).
  ) AS t(tablename, grantee, privilege_type)
),

-- Functions proven or reasonably suspected to write to an incident table,
-- enumerated explicitly (not inferred from function-body parsing, which is
-- unreliable) from the source investigation in 00_EXECUTIVE_SUMMARY.md and
-- the round-2 charge_free_analysis finding. Expected EXECUTE grantees are
-- the post-remediation baseline -- anon/authenticated should hold EXECUTE
-- here ONLY where a real, reviewed, intentional caller needs it.
-- Fixed 2026-08-10: confirmed live via the isolated CI rollback rehearsal
-- -- 'public.charge_free_analysis(text)'::regprocedure hard-errors
-- "function ... does not exist" (the same out-of-band-only function
-- documented and guarded elsewhere in this branch), which crashed this
-- entire query under -v ON_ERROR_STOP=1. Because the crash produces empty
-- stdout, and this gate's own pass condition is "empty output = zero
-- findings = PASS," the crash was silently indistinguishable from a
-- genuine clean pass -- this gate had never actually evaluated a single
-- real check in this CI environment; it was passing by accident every
-- time. Switched to to_regprocedure(), which resolves the same signature
-- but returns NULL instead of erroring when the function is absent;
-- filtered out below so a genuinely-missing function is correctly treated
-- as "nothing to check here" rather than crashing the whole gate.
incident_functions AS (
  SELECT * FROM (VALUES
    (to_regprocedure('public.charge_free_analysis(text)'),          ARRAY[]::name[]),
    (to_regprocedure('public.charge_free_analysis(text, boolean)'), ARRAY[]::name[]),
    (to_regprocedure('public.record_funnel_event(text, text, text, text, text, text, text, jsonb)'),
                                                                   ARRAY['anon','authenticated']::name[])
  ) AS t(function_signature, expected_execute_grantees)
  WHERE t.function_signature IS NOT NULL
),

unexpected_wide_open_policy AS (
  SELECT
    'incident_table_wide_open_policy' AS violation,
    p.tablename,
    p.policyname AS detail
  FROM pg_policies p
  JOIN incident_tables it ON it.tablename = p.tablename
  WHERE p.schemaname = 'public'
    AND p.permissive = 'PERMISSIVE'
    AND p.roles @> ARRAY['public']::name[]
    AND p.qual = 'true'
    AND coalesce(p.with_check, 'true') = 'true'
),

unexpected_table_grant AS (
  SELECT
    'incident_table_unexpected_grant' AS violation,
    g.table_name AS tablename,
    (g.grantee || ':' || g.privilege_type) AS detail
  FROM information_schema.role_table_grants g
  JOIN incident_tables it ON it.tablename = g.table_name
  WHERE g.table_schema = 'public'
    AND g.grantee IN ('anon', 'authenticated')
    AND NOT EXISTS (
      SELECT 1 FROM expected_grants eg
      WHERE eg.tablename = g.table_name
        AND eg.grantee = g.grantee
        AND eg.privilege_type = g.privilege_type
    )
),

unexpected_function_execute AS (
  SELECT
    'incident_function_unexpected_execute_grant' AS violation,
    fn.function_signature::text AS tablename,
    grantee.grantee_name AS detail
  FROM incident_functions fn
  CROSS JOIN LATERAL unnest(ARRAY['anon','authenticated']::name[]) AS grantee(grantee_name)
  WHERE has_function_privilege(grantee.grantee_name, fn.function_signature, 'EXECUTE')
    AND NOT (grantee.grantee_name = ANY(fn.expected_execute_grantees))
),

incident_function_missing_search_path AS (
  SELECT
    'incident_function_missing_search_path' AS violation,
    fn.function_signature::text AS tablename,
    'no search_path in proconfig' AS detail
  FROM incident_functions fn
  JOIN pg_proc p ON p.oid = fn.function_signature::regprocedure::oid
  WHERE NOT EXISTS (
    SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
    WHERE cfg LIKE 'search_path=%'
  )
)

SELECT * FROM unexpected_wide_open_policy
UNION ALL
SELECT * FROM unexpected_table_grant
UNION ALL
SELECT * FROM unexpected_function_execute
UNION ALL
SELECT * FROM incident_function_missing_search_path
ORDER BY violation, tablename;

-- CI convention: zero rows = PASS, exit 0. Any row = FAIL, print the
-- result set (metadata only, never customer data) and exit non-zero. This
-- gate is expected to return zero rows immediately after the P0 migration
-- is applied and to stay at zero indefinitely -- a permanently-red gate
-- here would itself be a bug in the gate, not an accepted baseline.
