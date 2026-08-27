#!/usr/bin/env -S deno run --allow-net --allow-env
/**
 * P0 10-table effective-access regression gate.
 *
 * Closes out the 2026-08-03/04 incident (docs/security/2026-08-03-p0-access/,
 * PR #26 -- never merged, superseded) and its live fix, migration
 * 20260816010000_p0_10table_exposure_fix.sql (merged via PR #32,
 * 2026-08-16T23:02:01Z). All 10 tables below had `anon` holding SELECT/
 * INSERT/UPDATE/DELETE via a policy named `*_svc`/`*_self` that read as
 * service-role/owner-only but was actually `USING (true) FOR ALL TO
 * {public}` -- live-exploitable through the real PostgREST API with just
 * the anon key. None of those permissive policies were ever migration-
 * tracked (confirmed by grep across supabase/migrations/ -- zero hits
 * before the fix migration itself): they existed only as production drift,
 * so a fresh-environment migration replay would never reproduce the
 * vulnerability, and git history alone cannot date when it began. This
 * gate is the permanent regression lock for that boundary.
 *
 * Ported from PR #26's scripts/security/db-security-gate-p0.sql, adapted
 * to this repo's actual CI pattern: PR #26 assumed a raw `SUPABASE_DB_URL`
 * connection-string secret and ran the check via `psql`, but no workflow
 * in this repo has ever used that secret -- the real, working pattern
 * (scripts/check-stuck-ai-calls.ts, scripts/sweep-financial-invariants.ts)
 * is a Deno script calling the Supabase Management API's /database/query
 * endpoint with SUPABASE_ACCESS_TOKEN. Porting the SQL as a raw psql
 * script would have silently failed every scheduled run with a missing-
 * secret error -- this version actually runs.
 *
 * Deliberately narrow, matching PR #26's own stated design: it re-checks
 * only the exact incident boundary (grants + wide-open policies on these
 * 10 tables) against the exact post-fix baseline. Zero rows = PASS, and
 * it is expected to stay at zero indefinitely. The broader 88-table /
 * SECURITY DEFINER function audit is separate, ongoing work -- see
 * get_advisors output flagging increment_quote_gen_usage/
 * decrement_quote_gen_usage's anon EXECUTE grant, deliberately NOT fixed
 * here to keep this gate scoped to the proven incident.
 *
 * Run with:
 *   SUPABASE_ACCESS_TOKEN=sbp_... deno run --allow-net --allow-env scripts/check-p0-10table-regression.ts
 */
const PROJECT_REF = "dmlxrvfyqsakyjomsvdj";
const TOKEN = Deno.env.get("SUPABASE_ACCESS_TOKEN");
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

if (!TOKEN) {
  console.error("SUPABASE_ACCESS_TOKEN not set");
  Deno.exit(1);
}

async function runSql(query: string): Promise<unknown[]> {
  const resp = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${text.slice(0, 500)}`);
  return JSON.parse(text) as unknown[];
}

interface Violation {
  violation: string;
  tablename: string;
  detail: string;
}

// The exact post-fix baseline this migration deliberately grants (RLS then
// scopes each to auth.uid()/identity_key). Any anon/authenticated grant on
// these 10 tables outside this list is a regression toward the incident.
const GATE_SQL = `
WITH incident_tables AS (
  SELECT * FROM (VALUES
    ('usage_counters'), ('analysis_attempts'), ('leads'), ('quote_gen_usage'),
    ('analysis_cases'), ('invoices'), ('export_jobs'), ('shared_reports'),
    ('referral_codes'), ('funnel_events')
  ) AS t(tablename)
),
expected_grants AS (
  SELECT * FROM (VALUES
    ('funnel_events', 'authenticated', 'SELECT'),
    ('invoices', 'authenticated', 'SELECT'),
    ('invoices', 'authenticated', 'INSERT'),
    ('invoices', 'authenticated', 'UPDATE'),
    ('export_jobs', 'authenticated', 'SELECT'),
    ('export_jobs', 'authenticated', 'INSERT'),
    ('export_jobs', 'authenticated', 'UPDATE'),
    ('shared_reports', 'authenticated', 'SELECT'),
    ('shared_reports', 'authenticated', 'INSERT'),
    ('shared_reports', 'authenticated', 'UPDATE'),
    ('shared_reports', 'authenticated', 'DELETE'),
    ('referral_codes', 'authenticated', 'SELECT'),
    ('quote_gen_usage', 'authenticated', 'SELECT'),
    ('usage_counters', 'authenticated', 'SELECT')
    -- analysis_attempts/leads/analysis_cases expect ZERO anon/authenticated
    -- grants of any kind (service-role-only, no client caller).
  ) AS t(tablename, grantee, privilege_type)
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
)
SELECT * FROM unexpected_wide_open_policy
UNION ALL
SELECT * FROM unexpected_table_grant
ORDER BY violation, tablename;
`;

async function main() {
  const rows = (await runSql(GATE_SQL)) as Violation[];

  if (rows.length === 0) {
    console.log("PASS: zero findings on the 10-table P0 incident boundary (anon fully denied, authenticated matches the post-fix baseline).");
    Deno.exit(0);
  }

  console.log(`FAIL: ${rows.length} regression(s) found on the 10-table P0 incident boundary:`);
  for (const r of rows) {
    console.log(`  - [${r.violation}] ${r.tablename}: ${r.detail}`);
  }
  console.log(
    "\nThis is the exact class of exposure closed by migration " +
    "20260816010000_p0_10table_exposure_fix.sql. Do not weaken these grants/" +
    "policies without updating expected_grants in this script deliberately."
  );
  Deno.exit(1);
}

main();
