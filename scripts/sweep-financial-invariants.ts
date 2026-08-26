#!/usr/bin/env -S deno run --allow-net --allow-env
/**
 * Financial-invariants historical sweep.
 *
 * GTM-audit item #10 (2026-08-25): item #4 found and flagged 5 historical
 * analyses violating operating_profit <= gross_profit <= revenue via a
 * one-off SQL query typed directly into a chat session. That's not
 * repeatable, not reviewable, and not schedulable. This script makes the
 * SAME check reusable: it imports the REAL checkFinancialInvariants()
 * from payback-contract.ts (the exact function PR #87 wired into every
 * new analysis's runtime gate) rather than reimplementing the two
 * inequalities a second time -- one canonical definition, checked both
 * going forward (the live gate) and backward (this sweep).
 *
 * Read-only by default: prints a report of every violation found and
 * exits non-zero if any exist, so it can be dropped into a scheduled job
 * (cron, GitHub Actions on a schedule, etc.) as a pure health check
 * without risking an accidental write. Pass --apply to additionally
 * flag violating rows with report_integrity='BLOCK' (the exact same
 * additive, numbers-untouched remediation used for the original 5 rows),
 * skipping any row that's already flagged.
 *
 * Uses the Supabase Management API (same pattern as
 * scripts/apply-pending-migrations.mjs), not a direct Postgres
 * connection -- no new secret/connection type introduced.
 *
 * Run with:
 *   SUPABASE_ACCESS_TOKEN=sbp_... deno run --allow-net --allow-env scripts/sweep-financial-invariants.ts
 *   SUPABASE_ACCESS_TOKEN=sbp_... deno run --allow-net --allow-env scripts/sweep-financial-invariants.ts --apply
 *
 * Scheduling this (frequency, alert channel on failure) is a product/ops
 * decision left to the team -- this script is the reusable primitive,
 * not a cron wiring. A natural next step: a GitHub Actions workflow on a
 * `schedule:` trigger running this in report-only mode and failing the
 * job (hence alerting via existing CI notification channels) if any
 * violation is found.
 */
import { checkFinancialInvariants } from "../supabase/functions/analyze-business/payback-contract.ts";

const PROJECT_REF = "dmlxrvfyqsakyjomsvdj";
const TOKEN = Deno.env.get("SUPABASE_ACCESS_TOKEN");
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const APPLY = Deno.args.includes("--apply");

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

interface CandidateRow {
  id: string;
  scenarios: {
    pessimistic: { revenue: number; gross_profit: number; net_profit: number };
    base: { revenue: number; gross_profit: number; net_profit: number };
    optimistic: { revenue: number; gross_profit: number; net_profit: number };
  };
  already_blocked: boolean;
}

async function main() {
  console.log(`Financial-invariants sweep -- mode: ${APPLY ? "APPLY (will write flags)" : "REPORT-ONLY (no writes)"}`);

  const rows = (await runSql(`
    SELECT id,
      result->'financial_analysis'->'scenarios' AS scenarios,
      (result->>'report_integrity') = 'BLOCK' AS already_blocked
    FROM public.analyses
    WHERE result->'financial_analysis'->'scenarios'->'base' IS NOT NULL;
  `)) as CandidateRow[];

  console.log(`Scanned ${rows.length} analyses with scenario data.`);

  const violations: Array<{ id: string; issues: ReturnType<typeof checkFinancialInvariants> }> = [];
  for (const row of rows) {
    const issues = checkFinancialInvariants(row.scenarios);
    if (issues.length > 0) violations.push({ id: row.id, issues });
  }

  console.log(`\nFound ${violations.length} analyses violating operating_profit <= gross_profit <= revenue:`);
  for (const v of violations) {
    console.log(`  - ${v.id}: ${v.issues.map((i) => `[${i.scope}] ${i.code}`).join(", ")}`);
  }

  if (violations.length === 0) {
    console.log("\nPASS: no financial-invariant violations found.");
    Deno.exit(0);
  }

  if (!APPLY) {
    console.log("\nReport-only mode -- no rows written. Re-run with --apply to flag these for review.");
    Deno.exit(1); // non-zero so a scheduled job alerts on any violation found
  }

  const toFlag = violations
    .filter((v) => !rows.find((r) => r.id === v.id)?.already_blocked)
    .map((v) => v.id);

  if (toFlag.length === 0) {
    console.log("\nAll violating rows are already flagged (report_integrity='BLOCK'). Nothing to apply.");
    Deno.exit(1);
    return;
  }

  console.log(`\nApplying report_integrity='BLOCK' to ${toFlag.length} not-yet-flagged row(s)...`);
  const idList = toFlag.map((id) => `'${id}'`).join(",");
  await runSql(`
    UPDATE public.analyses
    SET result = jsonb_set(
      jsonb_set(result, '{report_integrity}', '"BLOCK"', true),
      '{report_integrity_issues}',
      COALESCE(result->'report_integrity_issues', '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'code', 'RETROACTIVE_INVARIANT_VIOLATION',
          'message', 'Retroactively flagged by scripts/sweep-financial-invariants.ts: at least one scenario in this report violates operating_profit <= gross_profit <= revenue. Treat all scenario figures as unverified until this analysis is re-run.'
        )
      ),
      true
    )
    WHERE id IN (${idList});
  `);
  console.log("Done.");
  Deno.exit(1); // still non-zero: violations existed, even though now flagged
}

main();
