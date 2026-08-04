-- P0 SECURITY — recurrence-prevention invariant check.
-- docs/security/2026-08-03-p0-access/ — Blocker 10.
--
-- Fails (returns >0 rows) if any public-schema table exhibits the exact
-- defect class proven exploitable in this incident, UNLESS the object is
-- explicitly named in the allowlist CTE below. Read-only: SELECT only,
-- safe to run against production at any time.
--
-- Run manually via:
--   psql "$SUPABASE_DB_URL" -f scripts/security/db-security-invariants.sql
-- Wired into .github/workflows/db-security-invariant.yml (scheduled +
-- manual dispatch, reuses the existing SUPABASE_ACCESS_TOKEN /
-- SUPABASE_DB_PASSWORD secrets already present for production-deploy.yml
-- — no new secret required).

WITH allowlist AS (
  -- Intentionally public, read-only objects. Add a row here ONLY with a
  -- one-line justification comment, reviewed the same way any RLS change
  -- would be.
  --
  -- plan_entitlements: verified 2026-08-04 -- has a genuine, intentional
  -- `FOR SELECT TO public USING (true)` policy (the tier/pricing/feature
  -- matrix shown on the public pricing page, not sensitive) PLUS a
  -- separate, correctly-scoped `FOR ALL ... auth.role() = 'service_role'`
  -- policy for writes. anon/authenticated hold no write grant on this
  -- table. This is the allowlist mechanism's first confirmed-safe case,
  -- not an unreviewed exception.
  SELECT unnest(ARRAY['plan_entitlements']::text[]) AS tablename
),
permissive_wide_open AS (
  SELECT
    'permissive_wide_open_policy' AS violation,
    p.tablename,
    p.policyname AS detail
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.permissive = 'PERMISSIVE'
    AND p.roles @> ARRAY['public']::name[]
    AND p.qual = 'true'
    AND coalesce(p.with_check, 'true') = 'true'
    AND p.tablename NOT IN (SELECT tablename FROM allowlist)
),
anon_or_auth_truncate AS (
  SELECT
    'anon_or_authenticated_truncate_grant' AS violation,
    g.table_name AS tablename,
    g.grantee AS detail
  FROM information_schema.role_table_grants g
  WHERE g.table_schema = 'public'
    AND g.grantee IN ('anon', 'authenticated')
    AND g.privilege_type = 'TRUNCATE'
    AND g.table_name NOT IN (SELECT tablename FROM allowlist)
),
-- NOTE (2026-08-04): an earlier version of this check flagged any table
-- where `anon` held a raw UPDATE/DELETE grant, on the theory that no
-- legitimate anon write should ever bypass an RPC boundary. Tested live
-- against production and found to be a false-positive generator: many
-- tables (`analyses`, `api_keys`, `admin_notifications`, `anonymous_usage`,
-- etc.) hold that grant for historical/tooling reasons but are fully
-- protected by an explicit RESTRICTIVE `USING (false)` deny-anon policy,
-- which blocks every row regardless of the underlying grant. A grant
-- check alone cannot distinguish "dangerous" from "redundant but harmless"
-- without also modeling RESTRICTIVE policy interaction, which needs more
-- design than this pass -- so this check was removed rather than shipped
-- noisy. The permissive_wide_open_policy check above is the one that
-- actually caught the real incident with zero false positives (it found
-- exactly the 10 known tables, no more, no fewer, on first run) and
-- remains the primary signal. TRUNCATE, below, is unaffected by this
-- caveat: TRUNCATE is not subject to RLS at all in Postgres, so a grant
-- of it to anon/authenticated is *always* meaningful regardless of any
-- policy, and remains checked directly.
security_definer_without_search_path AS (
  SELECT
    'security_definer_missing_search_path' AS violation,
    p.proname AS tablename,
    n.nspname AS detail
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND NOT EXISTS (
      SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
      WHERE cfg LIKE 'search_path=%'
    )
)
SELECT * FROM permissive_wide_open
UNION ALL
SELECT * FROM anon_or_auth_truncate
UNION ALL
SELECT * FROM security_definer_without_search_path
ORDER BY violation, tablename;

-- Wrapper script convention: zero rows returned = PASS. Any row = FAIL,
-- print the full result set (it is metadata only, never customer data)
-- and exit non-zero.
