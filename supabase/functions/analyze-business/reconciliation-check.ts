/**
 * RECONCILIATION CHECK — server-side, live-wired.
 *
 * 2026-07-29 technical accuracy audit found the previously-shipped inline
 * `reconciliation_status` block in index.ts had three real bugs: R-002 was
 * coded identically to R-004 (both just `revenue >= 0`, no actual itemized-
 * expense sum check existed), the R-006 margin/risk check read
 * `healthScores.overall`, a field that doesn't exist on HealthScores (always
 * fell back to the literal string 'medium', so the check could never fire),
 * and it never covered the LTV / CAC-payback / LTV:CAC benchmark bounds or
 * any cross-scenario coherence at all.
 *
 * This module replaces that block with checks built directly against the
 * real fields `calculateStrictFinancials()` (financial-calculator.ts) --
 * the function that actually produces `calc`, the always-present result
 * every live analysis is built from -- actually returns. No monthly P&L/
 * cash-flow series exists anywhere in production for this engine
 * (financial-engine.ts's generate12MonthProjections, a *different* and
 * unused engine, has no call sites at all), so this operates on the single
 * computed snapshot, not a month-by-month series. The margin/risk-coherence
 * rule was dropped rather than faked -- no independent "risk level" signal
 * exists anywhere in the live pipeline to check margin against
 * (analyzeRisks() is likewise never called), and deriving one from the same
 * margin value being checked would be circular. In its place: a
 * cross-scenario coherence check (R-011 below), reusing the coherence
 * signal index.ts already computes for a real, previously flagged risk --
 * the three scenarios (pessimistic/base/optimistic) reducing to identical
 * narratives over the same numbers.
 *
 * Contract preserved for the live UI consumer (AnalysisResults.tsx's
 * "Reliability & Validation" section, which server-verifies against exactly
 * this shape): { checks: [{ rule, label, pass }], all_passed }.
 *
 * Scenario coherence is NOT recomputed here: index.ts already runs
 * checkScenarioMonotonicity() on every request (the P0-6/P0-7 fix) and
 * exposes it as `report_integrity`/`report_integrity_issues` on the
 * response. This module takes that result as a plain boolean input rather
 * than re-deriving it, to avoid two independently-maintained copies of the
 * same signal drifting apart.
 */

export interface ReconciliationCheckItem {
  rule: string;
  label: string;
  pass: boolean;
  skipped?: boolean;
  note?: string;
}

export interface ReconciliationResult {
  checks: ReconciliationCheckItem[];
  all_passed: boolean;
  passed_count: number;
  failed_count: number;
  skipped_count: number;
  engine_version: string;
}

export interface ReconciliationInput {
  mrr: number;
  grossProfit: number;
  netProfit: number;
  totalExpenses: number;
  grossMarginPercent: number;
  clientsActive: number;
  ltv: number;
  /** Null when the business is unprofitable or contribution per order is
   *  non-positive -- CAC payback isn't a meaningful figure in that case,
   *  not "0.1 months" or "999 months". The R-009 check skips, not fails,
   *  on null. */
  cacPaybackMonths: number | null;
  ltvCacRatio: number;
  expenses: {
    cogs: number;
    salaries: number;
    rent: number;
    utilities: number;
    marketing: number;
    other: number;
  };
  expenseSource: 'user' | 'calculated';
  /** Result of index.ts's existing checkScenarioMonotonicity() call --
   *  true when no contradiction was found across pessimistic/base/optimistic. */
  scenarioCoherent: boolean;
}

const RECONCILIATION_ENGINE_VERSION = '1.0.0-live';

/** Whole-dollar rounding accumulates across several adds — ±$2 tolerance
 *  absorbs that without masking a genuine formula break. */
const SUM_TOLERANCE = 2;

function approxEqual(a: number, b: number, tolerance = SUM_TOLERANCE): boolean {
  return Math.abs(a - b) <= tolerance;
}

export function runReconciliationCheck(input: ReconciliationInput): ReconciliationResult {
  const checks: ReconciliationCheckItem[] = [];

  // R-001: Sum Integrity — Revenue. grossProfit = mrr - cogs by construction;
  // this is a redundant safety net against a future formula regression, not
  // expected to ever fail today.
  const revenueSum = input.expenses.cogs + input.grossProfit;
  checks.push({
    rule: 'R-001',
    label: 'Sum Integrity — Revenue',
    pass: approxEqual(revenueSum, input.mrr),
    note: `COGS ($${input.expenses.cogs}) + Gross Profit ($${input.grossProfit}) vs MRR ($${input.mrr})`,
  });

  // R-002: Sum Integrity — Expenses. Only meaningful when totalExpenses was
  // itself derived from the itemized breakdown; when the user supplied a
  // total directly, the itemized fields are not expected to sum to it.
  if (input.expenseSource === 'calculated') {
    const itemizedSum =
      input.expenses.cogs +
      input.expenses.salaries +
      input.expenses.rent +
      input.expenses.utilities +
      input.expenses.marketing +
      input.expenses.other;
    checks.push({
      rule: 'R-002',
      label: 'Sum Integrity — Expenses',
      pass: approxEqual(itemizedSum, input.totalExpenses),
      note: `Itemized ($${itemizedSum}) vs Total Expenses ($${input.totalExpenses})`,
    });
  } else {
    checks.push({
      rule: 'R-002',
      label: 'Sum Integrity — Expenses',
      pass: true,
      skipped: true,
      note: 'Skipped — total expenses were user-provided, not derived from the itemized breakdown',
    });
  }

  // R-003: Sum Integrity — Net Profit. netProfit = mrr - totalExpenses by
  // construction; redundant safety net, same rationale as R-001.
  checks.push({
    rule: 'R-003',
    label: 'Sum Integrity — Net Profit',
    pass: approxEqual(input.mrr - input.totalExpenses, input.netProfit),
    note: `MRR ($${input.mrr}) - Total Expenses ($${input.totalExpenses}) vs Net Profit ($${input.netProfit})`,
  });

  // R-004: Sign Consistency — Revenue.
  checks.push({
    rule: 'R-004',
    label: 'Sign Consistency — Revenue',
    pass: input.mrr >= 0,
    note: `MRR = $${input.mrr}`,
  });

  // R-005: Sign Consistency — Costs. No individual expense line item should
  // ever be negative.
  const negativeCostFields = Object.entries({
    totalExpenses: input.totalExpenses,
    cogs: input.expenses.cogs,
    salaries: input.expenses.salaries,
    rent: input.expenses.rent,
    utilities: input.expenses.utilities,
    marketing: input.expenses.marketing,
    other: input.expenses.other,
  }).filter(([, v]) => v < 0);
  checks.push({
    rule: 'R-005',
    label: 'Sign Consistency — Costs',
    pass: negativeCostFields.length === 0,
    note: negativeCostFields.length > 0
      ? `Negative cost field(s): ${negativeCostFields.map(([k, v]) => `${k}=$${v}`).join(', ')}`
      : 'All cost fields non-negative',
  });

  // R-006: Logical Constraint — Active Clients.
  checks.push({
    rule: 'R-006',
    label: 'Logical Constraint — Active Clients',
    pass: input.clientsActive >= 0,
    note: `Active clients = ${input.clientsActive}`,
  });

  // R-007: Logical Constraint — Gross Margin Range. A margin outside
  // [-100%, 100%] is a data error, not a plausible business outcome.
  const gmFraction = input.grossMarginPercent / 100;
  checks.push({
    rule: 'R-007',
    label: 'Logical Constraint — Gross Margin Range',
    pass: gmFraction >= -1 && gmFraction <= 1,
    note: `Gross margin = ${input.grossMarginPercent}%`,
  });

  // R-008: Benchmark Boundary — LTV. Thresholds match the client-side
  // reconciliation-engine.ts precedent (not currently wired into any
  // production path itself, but its bounds are a reasonable, already-
  // reviewed reference).
  checks.push({
    rule: 'R-008',
    label: 'Benchmark Boundary — LTV',
    pass: input.ltv >= 100 && input.ltv <= 50000,
    note: `LTV = $${input.ltv} (expected [$100, $50,000])`,
  });

  // R-009: Benchmark Boundary — CAC Payback. Null means not meaningful
  // (unprofitable, or non-positive contribution per order) -- skip, don't fail.
  if (input.cacPaybackMonths === null) {
    checks.push({
      rule: 'R-009',
      label: 'Benchmark Boundary — CAC Payback',
      pass: true,
      skipped: true,
      note: 'Skipped — not applicable (business is unprofitable or contribution per order is non-positive)',
    });
  } else {
    checks.push({
      rule: 'R-009',
      label: 'Benchmark Boundary — CAC Payback',
      pass: input.cacPaybackMonths >= 1 && input.cacPaybackMonths <= 36,
      note: `CAC payback = ${input.cacPaybackMonths} months (expected [1, 36])`,
    });
  }

  // R-010: Benchmark Boundary — LTV:CAC Ratio.
  checks.push({
    rule: 'R-010',
    label: 'Benchmark Boundary — LTV:CAC Ratio',
    pass: input.ltvCacRatio >= 0.5 && input.ltvCacRatio <= 15,
    note: `LTV:CAC = ${input.ltvCacRatio}x (expected [0.5x, 15x])`,
  });

  // R-011: Scenario Coherence. Backed by index.ts's existing
  // checkScenarioMonotonicity() result -- see module header.
  checks.push({
    rule: 'R-011',
    label: 'Scenario Coherence',
    pass: input.scenarioCoherent,
    note: input.scenarioCoherent
      ? 'Pessimistic / base / optimistic scenarios move coherently'
      : 'Scenario monotonicity issue detected — see report_integrity_issues',
  });

  const passedCount = checks.filter((c) => c.pass).length;
  const skippedCount = checks.filter((c) => c.skipped).length;
  const failedCount = checks.length - passedCount;

  return {
    checks,
    all_passed: failedCount === 0,
    passed_count: passedCount,
    failed_count: failedCount,
    skipped_count: skippedCount,
    engine_version: RECONCILIATION_ENGINE_VERSION,
  };
}
