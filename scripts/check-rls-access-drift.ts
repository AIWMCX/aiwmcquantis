#!/usr/bin/env -S deno run --allow-net --allow-env
/**
 * Schema-wide RLS access-drift gate (charter 2.13/2.14, GTM Phase 2).
 *
 * Generalizes the two exhaustive checks that closed out the 10-table
 * incident's regression risk (see check-p0-10table-regression.ts) to the
 * ENTIRE public schema, not just the 10 previously-incident tables:
 *
 *   1. Any policy granted to `public`/`anon` with a wide-open condition
 *      (`qual='true'` or `with_check='true'`) on a write-capable command
 *      (INSERT/UPDATE/DELETE/ALL) -- the 10-table incident's exact
 *      signature. A `SELECT`-only wide-open policy is allowed ONLY if
 *      it's in the exceptions register (docs/execution/2026-08-27-rls-
 *      exceptions-register.md) -- e.g. public benchmark reference data.
 *   2. Any UPDATE/DELETE policy for `authenticated`/`public` with a NULL
 *      USING clause -- a mutation policy that forgot to scope itself at
 *      all, regardless of what the WITH CHECK says.
 *
 * Both queries were run manually and by hand during the 2026-08-27 audit
 * (see docs/execution/2026-08-27-phase2-88table-inventory.md) and came
 * back clean across all 78 GRANT-reachable tables at that time. This
 * script is the permanent, scheduled version of that manual check --
 * exactly the kind of out-of-band drift the 10-table incident itself was
 * (a dangerous policy that existed in production but was never migration-
 * tracked) is what this exists to catch going forward, on a recurring
 * cadence rather than only when a human remembers to re-run the query.
 *
 * ALLOWLIST must be kept in sync with docs/execution/2026-08-27-rls-
 * exceptions-register.md by hand -- add a row there FIRST (with
 * justification), then add the matching entry here. A policy not on this
 * list that matches either check above is a new, unreviewed exception
 * and fails the job.
 *
 * Run with:
 *   SUPABASE_ACCESS_TOKEN=sbp_... deno run --allow-net --allow-env scripts/check-rls-access-drift.ts
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

// Source of truth: docs/execution/2026-08-27-rls-exceptions-register.md.
// Keyed by "tablename.policyname" -- exact match required, so a renamed
// policy re-triggers review rather than silently inheriting an old
// allowance.
const ALLOWLIST = new Set([
  "benchmark_master_core.Public read access",
  "benchmark_master_geo.Public read access",
  "benchmark_master_invoice.Public read access",
  "benchmark_master_risk.Public read access",
  "benchmark_master_unit_econ.Public read access",
  "data_provenance.data_provenance public read",
  "public_metrics.public_metrics_read_all",
  "plan_entitlements.plan_entitlements public read",
  "self_learned_priors.self_learned_priors_read_authenticated",
  "doc_templates.doc_templates_public_read",
  "service_job_assemblies.Anyone can read active assemblies",
  "service_job_trades.Anyone can read active trades",
  "status_incidents.Anyone can read status incidents",
]);

interface WideOpenRow {
  tablename: string;
  policyname: string;
  cmd: string;
  roles: string;
}

interface UnscopedMutationRow {
  tablename: string;
  policyname: string;
  cmd: string;
}

const WIDE_OPEN_SQL = `
  SELECT tablename, policyname, cmd, roles::text
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (roles @> ARRAY['public']::name[] OR roles @> ARRAY['anon']::name[])
    AND (qual = 'true' OR with_check = 'true')
  ORDER BY tablename, cmd;
`;

const UNSCOPED_MUTATION_SQL = `
  SELECT tablename, policyname, cmd
  FROM pg_policies
  WHERE schemaname = 'public'
    AND cmd IN ('UPDATE', 'DELETE')
    AND (roles @> ARRAY['authenticated']::name[] OR roles @> ARRAY['public']::name[])
    AND qual IS NULL
  ORDER BY tablename, cmd;
`;

async function main() {
  const wideOpen = (await runSql(WIDE_OPEN_SQL)) as WideOpenRow[];
  const unscopedMutation = (await runSql(UNSCOPED_MUTATION_SQL)) as UnscopedMutationRow[];

  const violations: string[] = [];

  for (const row of wideOpen) {
    const key = `${row.tablename}.${row.policyname}`;
    if (ALLOWLIST.has(key)) continue;
    violations.push(
      `WIDE_OPEN_POLICY: ${row.tablename}."${row.policyname}" (${row.cmd}, roles=${row.roles}) ` +
      `is granted to public/anon with a wide-open condition and is NOT in the exceptions register. ` +
      `If this is intentional public data, add it to docs/execution/2026-08-27-rls-exceptions-register.md ` +
      `and the ALLOWLIST in this script. If not, this is a live regression -- fix it now.`
    );
  }

  for (const row of unscopedMutation) {
    // Unscoped mutation policies are never allowlisted -- there is no
    // legitimate "any row, any user" UPDATE/DELETE case for a client role.
    violations.push(
      `UNSCOPED_MUTATION_POLICY: ${row.tablename}."${row.policyname}" (${row.cmd}) has no USING clause -- ` +
      `it does not scope which rows a client role can mutate at all.`
    );
  }

  if (violations.length === 0) {
    console.log(
      `PASS: zero unreviewed wide-open policies (${wideOpen.length} allowlisted exceptions matched) ` +
      `and zero unscoped mutation policies, schema-wide.`
    );
    Deno.exit(0);
  }

  console.log(`FAIL: ${violations.length} RLS access-drift finding(s):`);
  for (const v of violations) console.log(`  - ${v}`);
  Deno.exit(1);
}

main();
