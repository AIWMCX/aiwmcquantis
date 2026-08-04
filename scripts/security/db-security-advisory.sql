-- P0 SECURITY — HARDENING ADVISORY (non-blocking).
-- docs/security/2026-08-03-p0-access/ — round-2 review, Blocker 8.
--
-- This is the NEVER-FAILS half of the split invariant check. It reports
-- broader schema-hardening opportunities that are real but are not part of
-- the proven P0 incident boundary, so they must not gate CI or the P0
-- release (a permanently-red monitor is noise, not a control -- exactly
-- what this split exists to avoid). Track findings here as separate,
-- explicitly scoped follow-up tickets; do not silently allowlist them just
-- to make output disappear, and do not fold them into the P0 gate.
--
-- Run manually via:
--   psql "$SUPABASE_DB_URL" -f scripts/security/db-security-advisory.sql
-- Wired into .github/workflows/db-security-invariant.yml as a report-only
-- step (always exits 0; output goes to the job summary for visibility).

WITH incident_tables AS (
  SELECT * FROM (VALUES
    ('usage_counters'), ('analysis_attempts'), ('leads'), ('quote_gen_usage'),
    ('analysis_cases'), ('invoices'), ('export_jobs'), ('shared_reports'),
    ('referral_codes'), ('funnel_events')
  ) AS t(tablename)
),

-- BLOCKER 9 FIX: a policy-specific allowlist, not a table-wide one. A
-- future INSERT/UPDATE/DELETE/ALL policy on plan_entitlements with an open
-- qual would still be flagged below -- only this exact, reviewed SELECT
-- contract is excused.
approved_public_policies AS (
  SELECT * FROM (VALUES
    ('public', 'plan_entitlements', 'plan_entitlements public read', 'SELECT',
     ARRAY['public']::name[], 'true', NULL::text,
     'Public tier/pricing/feature matrix for the pricing page; verified 2026-08-04 (and again live during round-2 review) to have no anon/authenticated write grant and a separate correctly-scoped service_role write policy. Exact policy name confirmed live -- includes a literal space, not an underscore.')
  ) AS t(schemaname, tablename, policyname, cmd, roles, qual, with_check, justification)
),

-- Historical TRUNCATE grants outside the ten incident tables. Real
-- (TRUNCATE bypasses RLS entirely), broad (~60+ tables at last live check),
-- but not reachable via the app's actual PostgREST attack surface --
-- PostgREST has no TRUNCATE verb. Tracked as a separate hardening item,
-- not folded into the P0 gate.
truncate_outside_incident_boundary AS (
  SELECT
    'anon_or_authenticated_truncate_grant_outside_incident' AS finding,
    g.table_name AS object_name,
    g.grantee AS detail
  FROM information_schema.role_table_grants g
  WHERE g.table_schema = 'public'
    AND g.grantee IN ('anon', 'authenticated')
    AND g.privilege_type = 'TRUNCATE'
    AND g.table_name NOT IN (SELECT tablename FROM incident_tables)
),

-- Any wide-open PERMISSIVE policy outside the incident boundary, checked
-- against the policy-specific allowlist above (not a table-wide one).
wide_open_policy_outside_incident_boundary AS (
  SELECT
    'wide_open_policy_outside_incident_boundary' AS finding,
    p.tablename AS object_name,
    p.policyname AS detail
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.permissive = 'PERMISSIVE'
    AND p.roles @> ARRAY['public']::name[]
    AND p.qual = 'true'
    AND coalesce(p.with_check, 'true') = 'true'
    AND p.tablename NOT IN (SELECT tablename FROM incident_tables)
    AND NOT EXISTS (
      SELECT 1 FROM approved_public_policies ap
      WHERE ap.schemaname = p.schemaname
        AND ap.tablename = p.tablename
        AND ap.policyname = p.policyname
        AND ap.cmd = p.cmd
        AND ap.roles = p.roles
        AND ap.qual = p.qual
        AND coalesce(ap.with_check, 'true') = coalesce(p.with_check, 'true')
    )
),

-- SECURITY DEFINER functions missing search_path, outside the incident
-- boundary. BLOCKER 10 FIX: full schema-qualified regprocedure signature,
-- not bare proname -- overloads (like charge_free_analysis(text) vs.
-- charge_free_analysis(text, boolean), the exact ambiguity already hit
-- once) are now unambiguous.
search_path_gap_outside_incident_boundary AS (
  SELECT
    'security_definer_missing_search_path_outside_incident' AS finding,
    p.oid::regprocedure::text AS object_name,
    n.nspname AS detail
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND NOT EXISTS (
      SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
      WHERE cfg LIKE 'search_path=%'
    )
    AND p.oid::regprocedure::text NOT IN (
      'public.charge_free_analysis(text)',
      'public.charge_free_analysis(text, boolean)',
      'public.record_funnel_event(text, text, text, text, text, text, text, jsonb)'
    )
)

SELECT * FROM truncate_outside_incident_boundary
UNION ALL
SELECT * FROM wide_open_policy_outside_incident_boundary
UNION ALL
SELECT * FROM search_path_gap_outside_incident_boundary
ORDER BY finding, object_name;

-- CI convention: this script ALWAYS exits 0 regardless of row count. Rows
-- are informational -- surfaced in the job summary for a human to triage
-- into a tracked follow-up ticket, never used to fail the build.
