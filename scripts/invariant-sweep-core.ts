/**
 * Pure, runtime-independent logic for scripts/sweep-financial-invariants.ts.
 *
 * GTM-audit item #22 (2026-08-29, Phase 5 re-validation, charter 5.7):
 * "verify with seeded pass, violation, and interrupted-run fixtures" was a
 * confirmed gap because the sweep script itself had zero test coverage --
 * not from a lack of trying, but because the whole file reads Deno.env at
 * MODULE SCOPE (`const TOKEN = Deno.env.get(...)`, `if (!TOKEN) Deno.exit(1)`
 * executed immediately on import), which crashes instantly under
 * Vitest/Node, where `Deno` doesn't exist. This module contains every piece
 * of the sweep's logic that doesn't need Deno's runtime (network, env vars,
 * process exit) -- extracted so it can be imported and tested directly,
 * exactly like ai-safety-guardrails.ts already is by narrative-integrity.test.ts.
 * No import in this file, and no top-level statement, touches Deno.* --
 * verified by grep before this file was considered done.
 */
import type { checkFinancialInvariants } from "../supabase/functions/analyze-business/payback-contract.ts";

export interface ScenarioTriple {
  revenue: number;
  gross_profit: number;
  net_profit: number;
}

export interface ValidScenarioSet {
  pessimistic: ScenarioTriple;
  base: ScenarioTriple;
  optimistic: ScenarioTriple;
}

export function isScenarioTriple(v: unknown): v is ScenarioTriple {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Record<string, unknown>).revenue === "number" &&
    typeof (v as Record<string, unknown>).gross_profit === "number" &&
    typeof (v as Record<string, unknown>).net_profit === "number"
  );
}

export function isValidScenarioSet(scenarios: unknown): scenarios is ValidScenarioSet {
  if (typeof scenarios !== "object" || scenarios === null) return false;
  const s = scenarios as Record<string, unknown>;
  return isScenarioTriple(s.pessimistic) && isScenarioTriple(s.base) && isScenarioTriple(s.optimistic);
}

export interface ViolationRecord {
  id: string;
  issues: ReturnType<typeof checkFinancialInvariants>;
}

/**
 * Category breakdown for the admin dashboard (charter 5.4): counts the
 * number of DISTINCT ANALYSES with at least one issue of each code, not
 * the raw number of issue occurrences -- an analysis with the same
 * violation code in all three scenarios (pessimistic/base/optimistic)
 * counts once per code, not three times, so the breakdown answers "how
 * many analyses have this problem," which is the actionable question,
 * not "how many scenario-slots does this problem appear in."
 */
export function categorizeViolations(violations: ViolationRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of violations) {
    const codesInThisAnalysis = new Set(v.issues.map((i) => i.code));
    for (const code of codesInThisAnalysis) {
      counts[code] = (counts[code] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * Sanitized, single-line failure summary for a caught error -- suitable
 * for a database column an admin dashboard renders directly. Strips
 * multi-line stack traces (never shown to anyone reading the sweep
 * history) and truncates so one runaway error message can't blow out a
 * text column or the dashboard's layout.
 */
export function summarizeFailure(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const firstLine = message.split("\n")[0];
  return firstLine.length > 500 ? firstLine.slice(0, 500) + "…" : firstLine;
}

export interface SweepRunRecord {
  mode: "report-only" | "apply";
  status: "completed" | "interrupted";
  engineVersion: string;
  scanned: number;
  violationIds: string[];
  malformedCount: number;
  appliedCount: number;
  violationCategories: Record<string, number>;
  failureSummary: string | null;
}

/** Builds the record for a run that completed its scan (pass, or violations
 *  found and reported/applied) -- status is always 'completed' here; only
 *  main()'s top-level catch produces an 'interrupted' record, since that's
 *  the one case this pure function can't observe (it never runs at all if
 *  the sweep crashed before reaching this point). */
export function buildCompletedRunRecord(args: {
  mode: "report-only" | "apply";
  engineVersion: string;
  scanned: number;
  violations: ViolationRecord[];
  malformedCount: number;
  appliedCount: number;
}): SweepRunRecord {
  return {
    mode: args.mode,
    status: "completed",
    engineVersion: args.engineVersion,
    scanned: args.scanned,
    violationIds: args.violations.map((v) => v.id),
    malformedCount: args.malformedCount,
    appliedCount: args.appliedCount,
    violationCategories: categorizeViolations(args.violations),
    failureSummary: null,
  };
}

/** Builds the record for a run that crashed before completing its scan
 *  (charter 5.3's fix) -- scanned/violation counts are necessarily 0/empty
 *  since the crash happened before they could be computed; the point of
 *  this record existing at all is that the dashboard shows SOMETHING for
 *  this run instead of the silence a crash previously produced. */
export function buildInterruptedRunRecord(args: {
  mode: "report-only" | "apply";
  engineVersion: string;
  err: unknown;
}): SweepRunRecord {
  return {
    mode: args.mode,
    status: "interrupted",
    engineVersion: args.engineVersion,
    scanned: 0,
    violationIds: [],
    malformedCount: 0,
    appliedCount: 0,
    violationCategories: {},
    failureSummary: summarizeFailure(args.err),
  };
}

/**
 * Violations nobody has acknowledged yet. A row already flagged
 * report_integrity='BLOCK' is known and visible to its owner; only NEW
 * violations should turn the scheduled sweep red, otherwise a permanently
 * red job hides the next real regression among the old ones.
 */
export function unacknowledgedViolations(
  violations: ViolationRecord[],
  rows: Array<{ id: string; already_blocked?: boolean | null }>,
): ViolationRecord[] {
  const blocked = new Set(rows.filter((r) => r.already_blocked === true).map((r) => r.id));
  return violations.filter((v) => !blocked.has(v.id));
}
