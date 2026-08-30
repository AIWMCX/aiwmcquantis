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
 * Pure logic (scenario validation, category-breakdown aggregation, run-
 * record shape) lives in scripts/invariant-sweep-core.ts, imported here
 * and tested directly in scripts/invariant-sweep-core.test.ts (charter
 * 5.7) -- this file itself stays untestable under Vitest (it reads
 * Deno.env at module scope by design, matching every other script in
 * this repo), so the split is what makes the logic testable at all.
 *
 * Run with:
 *   SUPABASE_ACCESS_TOKEN=sbp_... deno run --allow-net --allow-env scripts/sweep-financial-invariants.ts
 *   SUPABASE_ACCESS_TOKEN=sbp_... deno run --allow-net --allow-env scripts/sweep-financial-invariants.ts --apply
 */
import { checkFinancialInvariants } from "../supabase/functions/analyze-business/payback-contract.ts";
import { ENGINE_VERSION } from "../supabase/functions/analyze-business/financial-engine.ts";
import {
  isValidScenarioSet,
  buildCompletedRunRecord,
  buildInterruptedRunRecord,
  type ViolationRecord,
  type SweepRunRecord,
} from "./invariant-sweep-core.ts";

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
  scenarios: unknown;
  already_blocked: boolean;
}

/**
 * GTM-audit item #18 (2026-08-27, Q19) + #22 (2026-08-29, charter 5.2/5.3):
 * records a summary of this run so an admin page (/admin/invariant-sweeps)
 * can show run history at a glance. Written via the same Management API
 * connection as the rest of this script (full database privileges, not
 * subject to PostgREST/RLS).
 *
 * Returns success/failure (2026-08-29 fix, charter 5.6) rather than
 * swallowing a write failure -- a persistence failure is itself the kind
 * of thing this whole mechanism exists to catch, not something to catch
 * and then hide.
 */
async function recordSweepRun(record: SweepRunRecord): Promise<boolean> {
  try {
    const idsJson = JSON.stringify(record.violationIds).replace(/'/g, "''");
    const categoriesJson = JSON.stringify(record.violationCategories).replace(/'/g, "''");
    const failureSummarySql = record.failureSummary === null
      ? "NULL"
      : `'${record.failureSummary.replace(/'/g, "''")}'`;
    await runSql(`
      INSERT INTO public.financial_invariant_sweep_runs
        (mode, status, engine_version, environment, finished_at,
         scanned_count, violation_count, malformed_count, applied_count,
         violation_ids, violation_categories, failure_summary)
      VALUES (
        '${record.mode}',
        '${record.status}',
        '${record.engineVersion}',
        'production',
        now(),
        ${record.scanned},
        ${record.violationIds.length},
        ${record.malformedCount},
        ${record.appliedCount},
        '${idsJson}'::jsonb,
        '${categoriesJson}'::jsonb,
        ${failureSummarySql}
      );
    `);
    return true;
  } catch (err) {
    console.error(
      `PERSISTENCE FAILURE: could not write this run's summary to financial_invariant_sweep_runs. ` +
      `The invariant check below may have PASSED, but the admin dashboard at /admin/invariant-sweeps ` +
      `will NOT show this run -- treat this as a real alert, not a warning to ignore. Error: ${String(err)}`
    );
    return false;
  }
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

  const violations: ViolationRecord[] = [];
  const malformed: string[] = [];
  for (const row of rows) {
    if (!isValidScenarioSet(row.scenarios)) {
      // Report and move on -- never let one bad row stop the sweep from
      // covering every other row.
      malformed.push(row.id);
      continue;
    }
    try {
      const issues = checkFinancialInvariants(row.scenarios);
      if (issues.length > 0) violations.push({ id: row.id, issues });
    } catch (err) {
      // Defense-in-depth: checkFinancialInvariants() shouldn't throw for a
      // validated triple, but a sweep meant to run unattended must never
      // let a single row's unexpected error abort the whole scan.
      malformed.push(`${row.id} (checkFinancialInvariants threw: ${String(err)})`);
    }
  }

  if (malformed.length > 0) {
    console.log(`\n${malformed.length} row(s) had missing/malformed scenario data and were skipped (not counted as pass or fail):`);
    for (const id of malformed) console.log(`  - ${id}`);
  }

  console.log(`\nFound ${violations.length} analyses violating operating_profit <= gross_profit <= revenue:`);
  for (const v of violations) {
    console.log(`  - ${v.id}: ${v.issues.map((i) => `[${i.scope}] ${i.code}`).join(", ")}`);
  }

  if (violations.length === 0) {
    console.log(malformed.length > 0
      ? "\nPASS (with skipped rows): no financial-invariant violations found among the analyses that could be checked."
      : "\nPASS: no financial-invariant violations found.");
    const record = buildCompletedRunRecord({ mode: APPLY ? "apply" : "report-only", engineVersion: ENGINE_VERSION, scanned: rows.length, violations: [], malformedCount: malformed.length, appliedCount: 0 });
    const persisted = await recordSweepRun(record);
    // A clean invariant check does not mean a clean run: if the result
    // never made it into financial_invariant_sweep_runs, the admin
    // dashboard silently falls behind and nobody is told unless this
    // job itself goes red. Charter 5.6 requires alerting on persistence
    // failure specifically -- exit 0 here would hide exactly that.
    Deno.exit(persisted ? 0 : 1);
  }

  if (!APPLY) {
    console.log("\nReport-only mode -- no rows written. Re-run with --apply to flag these for review.");
    const record = buildCompletedRunRecord({ mode: "report-only", engineVersion: ENGINE_VERSION, scanned: rows.length, violations, malformedCount: malformed.length, appliedCount: 0 });
    const persisted = await recordSweepRun(record);
    if (!persisted) console.error("Additionally: this run's summary was NOT persisted (see PERSISTENCE FAILURE above).");
    Deno.exit(1); // non-zero so a scheduled job alerts on any violation found
  }

  const toFlag = violations
    .filter((v) => !rows.find((r) => r.id === v.id)?.already_blocked)
    .map((v) => v.id);

  if (toFlag.length === 0) {
    console.log("\nAll violating rows are already flagged (report_integrity='BLOCK'). Nothing to apply.");
    const record = buildCompletedRunRecord({ mode: "apply", engineVersion: ENGINE_VERSION, scanned: rows.length, violations, malformedCount: malformed.length, appliedCount: 0 });
    const persisted = await recordSweepRun(record);
    if (!persisted) console.error("Additionally: this run's summary was NOT persisted (see PERSISTENCE FAILURE above).");
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
  const record = buildCompletedRunRecord({ mode: "apply", engineVersion: ENGINE_VERSION, scanned: rows.length, violations, malformedCount: malformed.length, appliedCount: toFlag.length });
  const persisted = await recordSweepRun(record);
  if (!persisted) console.error("Additionally: this run's summary was NOT persisted (see PERSISTENCE FAILURE above).");
  Deno.exit(1); // still non-zero: violations existed, even though now flagged
}

// GTM-audit item #22 (2026-08-29, charter 5.3): previously, any error
// thrown before main() reached its own recordSweepRun() call (most
// notably the very first `runSql()` for the candidate-row SELECT) crashed
// the whole process with zero row ever written to
// financial_invariant_sweep_runs -- an interrupted run and a run that
// never happened were indistinguishable to the dashboard. This wrapper
// ensures SOME row is always written, with status='interrupted' and a
// sanitized failure_summary, whenever main() throws for any reason.
main().catch(async (err) => {
  console.error(`SWEEP INTERRUPTED before completing its scan: ${String(err)}`);
  const record = buildInterruptedRunRecord({ mode: APPLY ? "apply" : "report-only", engineVersion: ENGINE_VERSION, err });
  await recordSweepRun(record);
  Deno.exit(1);
});
