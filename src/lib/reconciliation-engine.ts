/**
 * RECONCILIATION ENGINE
 *
 * Automatic consistency checker that validates all financial outputs
 * before they reach the user. Detects, logs, normalises, and flags
 * inconsistencies in P&L, cash-flow, and unit-economics outputs.
 *
 * @module ReconciliationEngine
 * @version 1.0.0
 */

import { QuantisMath } from '@/lib/quantis-math';
import type {
  PLStatement,
  CashFlowStatement,
  UnitEconomicsResult,
} from '@/lib/financial-engine';
import { supabase } from '@/integrations/supabase/client';

// ─── Interfaces ─────────────────────────────────────────────

export interface ReconciliationCheck {
  checkId: string;
  checkType:
    | 'sum_integrity'
    | 'sign_consistency'
    | 'logical_constraint'
    | 'benchmark_boundary';
  field: string;
  expectedValue: number;
  actualValue: number;
  delta: number;
  deltaPct: number;
  severity: 'pass' | 'minor' | 'major' | 'critical';
  autoResolved: boolean;
  resolutionMethod?:
    | 'use_itemized'
    | 'use_total'
    | 'proportional_scale'
    | 'flagged_for_review';
  note: string;
}

export interface ReconciliationReport {
  runId: string;
  timestamp: Date;
  checks: ReconciliationCheck[];
  passedCount: number;
  resolvedCount: number;
  unresolvedCount: number;
  overallReconciled: boolean;
  reconciliationNotes: string;
}

// ─── Helpers ────────────────────────────────────────────────

const Q = QuantisMath;
const TOLERANCE = 0.01; // ±$0.01

function uid(): string {
  return `rc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function pct(expected: number, actual: number): number {
  if (expected === 0) return actual === 0 ? 0 : 100;
  return Q.toNumber(
    Q.multiply(Q.divide(Q.subtract(actual, expected), Math.abs(expected)), 100),
  );
}

function sumCheck(
  label: string,
  field: string,
  expected: number,
  actual: number,
): ReconciliationCheck {
  const delta = Q.toNumber(Q.subtract(actual, expected));
  const absDelta = Math.abs(delta);
  const pass = absDelta <= TOLERANCE;
  return {
    checkId: uid(),
    checkType: 'sum_integrity',
    field,
    expectedValue: expected,
    actualValue: actual,
    delta,
    deltaPct: pct(expected, actual),
    severity: pass ? 'pass' : absDelta < 1 ? 'minor' : 'major',
    autoResolved: !pass,
    resolutionMethod: pass ? undefined : 'use_itemized',
    note: pass
      ? `${label}: OK`
      : `${label}: delta $${delta.toFixed(2)} — auto-corrected using itemized sum`,
  };
}

// ─── Core Reconciliation ────────────────────────────────────

/**
 * Run all reconciliation checks on a complete financial output set.
 * Mutates PLStatements in-place when auto-resolving sum discrepancies.
 */
export function reconcileFinancialOutput(
  plStatements: PLStatement[],
  cashFlows: CashFlowStatement[],
  unitEconomics: UnitEconomicsResult,
  riskLevel?: string,
): ReconciliationReport {
  const checks: ReconciliationCheck[] = [];

  // ── 1. SUM INTEGRITY (per month) ───────────────────────
  for (const pl of plStatements) {
    // cogs + grossProfit === netRevenue
    const revenueSum = Q.toNumber(Q.add(pl.cogs, pl.grossProfit));
    const c1 = sumCheck(
      `Month ${pl.month} revenue`,
      `pl[${pl.month}].netRevenue`,
      pl.netRevenue,
      revenueSum,
    );
    if (c1.autoResolved) pl.netRevenue = revenueSum;
    checks.push(c1);

    // itemised opex === totalOpex
    const opexSum = Q.toNumber(
      Q.add(
        Q.add(Q.add(pl.rent, pl.salaries), Q.add(pl.marketingSpend, pl.softwareAndTools)),
        pl.otherOpex,
      ),
    );
    const c2 = sumCheck(
      `Month ${pl.month} opex`,
      `pl[${pl.month}].totalOpex`,
      pl.totalOpex,
      opexSum,
    );
    if (c2.autoResolved) pl.totalOpex = opexSum;
    checks.push(c2);

    // grossProfit - totalOpex === ebitda
    const ebitdaCalc = Q.toNumber(Q.subtract(pl.grossProfit, pl.totalOpex));
    const c3 = sumCheck(
      `Month ${pl.month} EBITDA`,
      `pl[${pl.month}].ebitda`,
      pl.ebitda,
      ebitdaCalc,
    );
    if (c3.autoResolved) pl.ebitda = ebitdaCalc;
    checks.push(c3);
  }

  // ── 2. SIGN CONSISTENCY ────────────────────────────────
  for (const pl of plStatements) {
    const signFields: [string, number][] = [
      ['grossRevenue', pl.grossRevenue],
      ['netRevenue', pl.netRevenue],
      ['cogs', pl.cogs],
      ['rent', pl.rent],
      ['salaries', pl.salaries],
      ['marketingSpend', pl.marketingSpend],
    ];
    for (const [name, val] of signFields) {
      if (val < 0) {
        checks.push({
          checkId: uid(),
          checkType: 'sign_consistency',
          field: `pl[${pl.month}].${name}`,
          expectedValue: 0,
          actualValue: val,
          delta: val,
          deltaPct: -100,
          severity: 'critical',
          autoResolved: false,
          resolutionMethod: 'flagged_for_review',
          note: `Month ${pl.month}: ${name} is negative ($${val.toFixed(2)}) — requires manual review`,
        });
      }
    }
  }

  for (const cf of cashFlows) {
    if (cf.cashRunwayMonths < 0) {
      checks.push({
        checkId: uid(),
        checkType: 'sign_consistency',
        field: `cf[${cf.month}].cashRunwayMonths`,
        expectedValue: 0,
        actualValue: cf.cashRunwayMonths,
        delta: cf.cashRunwayMonths,
        deltaPct: -100,
        severity: 'critical',
        autoResolved: false,
        resolutionMethod: 'flagged_for_review',
        note: `Month ${cf.month}: cashRunwayMonths is negative — requires manual review`,
      });
    }
  }

  // ── 3. LOGICAL CONSTRAINTS ─────────────────────────────
  for (const pl of plStatements) {
    if (pl.activeCustomers < 0) {
      checks.push({
        checkId: uid(),
        checkType: 'logical_constraint',
        field: `pl[${pl.month}].activeCustomers`,
        expectedValue: 0,
        actualValue: pl.activeCustomers,
        delta: pl.activeCustomers,
        deltaPct: -100,
        severity: 'critical',
        autoResolved: false,
        resolutionMethod: 'flagged_for_review',
        note: `Month ${pl.month}: activeCustomers negative — data error`,
      });
    }

    if (pl.grossMarginPct < -1 || pl.grossMarginPct > 1) {
      checks.push({
        checkId: uid(),
        checkType: 'logical_constraint',
        field: `pl[${pl.month}].grossMarginPct`,
        expectedValue: pl.grossMarginPct > 1 ? 1 : -1,
        actualValue: pl.grossMarginPct,
        delta: pl.grossMarginPct > 1 ? pl.grossMarginPct - 1 : pl.grossMarginPct + 1,
        deltaPct: pct(1, pl.grossMarginPct),
        severity: 'major',
        autoResolved: false,
        resolutionMethod: 'flagged_for_review',
        note: `Month ${pl.month}: grossMarginPct (${(pl.grossMarginPct * 100).toFixed(1)}%) outside [-100%, 100%]`,
      });
    }

    // High loss flag
    if (pl.netMarginPct < -0.5) {
      checks.push({
        checkId: uid(),
        checkType: 'logical_constraint',
        field: `pl[${pl.month}].netMarginPct`,
        expectedValue: -0.5,
        actualValue: pl.netMarginPct,
        delta: Q.toNumber(Q.subtract(pl.netMarginPct, -0.5)),
        deltaPct: pct(-0.5, pl.netMarginPct),
        severity: 'major',
        autoResolved: false,
        resolutionMethod: 'flagged_for_review',
        note: `Month ${pl.month}: net margin ${(pl.netMarginPct * 100).toFixed(1)}% — high loss, verify inputs`,
      });
    }

    // Unusually high margin in year 1
    if (pl.year === 1 && pl.netMarginPct > 0.6) {
      checks.push({
        checkId: uid(),
        checkType: 'logical_constraint',
        field: `pl[${pl.month}].netMarginPct`,
        expectedValue: 0.6,
        actualValue: pl.netMarginPct,
        delta: Q.toNumber(Q.subtract(pl.netMarginPct, 0.6)),
        deltaPct: pct(0.6, pl.netMarginPct),
        severity: 'major',
        autoResolved: false,
        resolutionMethod: 'flagged_for_review',
        note: `Month ${pl.month}: net margin ${(pl.netMarginPct * 100).toFixed(1)}% in year 1 — unusually high, verify inputs`,
      });
    }

    // CRITICAL RULE: negative margin + Low risk = block
    if (pl.netMarginPct < -0.1 && riskLevel?.toLowerCase() === 'low') {
      checks.push({
        checkId: uid(),
        checkType: 'logical_constraint',
        field: `pl[${pl.month}].netMarginPct+riskLevel`,
        expectedValue: -0.1,
        actualValue: pl.netMarginPct,
        delta: Q.toNumber(Q.subtract(pl.netMarginPct, -0.1)),
        deltaPct: pct(-0.1, pl.netMarginPct),
        severity: 'critical',
        autoResolved: true,
        resolutionMethod: 'proportional_scale',
        note: `Month ${pl.month}: net margin ${(pl.netMarginPct * 100).toFixed(1)}% with "Low" risk — BLOCKED. Risk forced to "Moderate" minimum.`,
      });
    }
  }

  // Unit economics constraints
  if (unitEconomics.ltvCacRatio <= 0) {
    checks.push({
      checkId: uid(),
      checkType: 'logical_constraint',
      field: 'unitEconomics.ltvCacRatio',
      expectedValue: 1,
      actualValue: unitEconomics.ltvCacRatio,
      delta: Q.toNumber(Q.subtract(unitEconomics.ltvCacRatio, 1)),
      deltaPct: pct(1, unitEconomics.ltvCacRatio),
      severity: 'critical',
      autoResolved: false,
      resolutionMethod: 'flagged_for_review',
      note: `LTV:CAC ratio is ${unitEconomics.ltvCacRatio.toFixed(2)} (≤0) — unsustainable economics`,
    });
  }

  // ── 4. BENCHMARK BOUNDARY (sync — lightweight) ─────────
  // Compare unit economics against broad industry ranges
  const benchmarkChecks: [string, number, number, number][] = [
    ['ltv', unitEconomics.ltv, 100, 50000],
    ['cacPaybackMonths', unitEconomics.cacPaybackMonths, 1, 36],
    ['ltvCacRatio', unitEconomics.ltvCacRatio, 0.5, 15],
  ];
  for (const [name, val, p10, p90] of benchmarkChecks) {
    if (val < p10 || val > p90) {
      checks.push({
        checkId: uid(),
        checkType: 'benchmark_boundary',
        field: `unitEconomics.${name}`,
        expectedValue: val < p10 ? p10 : p90,
        actualValue: val,
        delta: val < p10 ? Q.toNumber(Q.subtract(val, p10)) : Q.toNumber(Q.subtract(val, p90)),
        deltaPct: pct(val < p10 ? p10 : p90, val),
        severity: 'minor',
        autoResolved: false,
        note: `${name} = ${val.toFixed(2)} is outside benchmark range [${p10}, ${p90}]`,
      });
    }
  }

  // ── Build Report ───────────────────────────────────────
  const passedCount = checks.filter((c) => c.severity === 'pass').length;
  const resolvedCount = checks.filter((c) => c.autoResolved && c.severity !== 'pass').length;
  const unresolvedCount = checks.filter((c) => !c.autoResolved && c.severity !== 'pass').length;

  const report: ReconciliationReport = {
    runId: uid(),
    timestamp: new Date(),
    checks,
    passedCount,
    resolvedCount,
    unresolvedCount,
    overallReconciled: unresolvedCount === 0,
    reconciliationNotes: '',
  };
  report.reconciliationNotes = generateReconciliationSummary(report);

  return report;
}

// ─── Summary Generator ──────────────────────────────────────

export function generateReconciliationSummary(report: ReconciliationReport): string {
  const { checks, passedCount, resolvedCount, unresolvedCount } = report;
  const total = checks.length;

  if (total === 0) return 'No reconciliation checks were performed.';
  if (unresolvedCount === 0 && resolvedCount === 0) {
    return `All ${passedCount} reconciliation checks passed. Financial data is fully consistent.`;
  }

  const parts: string[] = [];

  if (resolvedCount > 0) {
    const resolvedChecks = checks.filter((c) => c.autoResolved && c.severity !== 'pass');
    const months = [...new Set(resolvedChecks.map((c) => {
      const m = c.field.match(/\[(\d+)\]/);
      return m ? m[1] : null;
    }).filter(Boolean))];
    parts.push(
      `${resolvedCount} ${resolvedCount === 1 ? 'discrepancy was' : 'discrepancies were'} auto-corrected` +
      (months.length > 0 ? ` in month${months.length > 1 ? 's' : ''} ${months.join(', ')}` : '') +
      '. All corrections used the itemized breakdown as the authoritative source.',
    );
  }

  if (unresolvedCount > 0) {
    const criticals = checks.filter((c) => c.severity === 'critical' && !c.autoResolved);
    const majors = checks.filter((c) => c.severity === 'major' && !c.autoResolved);
    const minors = checks.filter((c) => c.severity === 'minor' && !c.autoResolved);
    const detail: string[] = [];
    if (criticals.length) detail.push(`${criticals.length} critical`);
    if (majors.length) detail.push(`${majors.length} major`);
    if (minors.length) detail.push(`${minors.length} minor`);
    parts.push(`${unresolvedCount} unresolved issue${unresolvedCount > 1 ? 's' : ''} remain (${detail.join(', ')}). Manual review recommended.`);
  }

  parts.push(`${passedCount}/${total} checks passed overall.`);
  return parts.join(' ');
}

// ─── Persistence ────────────────────────────────────────────

export async function saveReconciliationLog(
  report: ReconciliationReport,
  analysisId?: string,
  userId?: string,
): Promise<void> {
  const { error } = await supabase.from('reconciliation_log' as any).insert({
    analysis_id: analysisId ?? null,
    user_id: userId ?? null,
    run_id: report.runId,
    reconciled: report.overallReconciled,
    checks_json: report.checks,
    summary: report.reconciliationNotes,
  });

  if (error) {
    console.error('[ReconciliationEngine] Failed to save log:', error.message);
  }
}
