/**
 * Unit tests for the live reconciliation check
 * (supabase/functions/analyze-business/reconciliation-check.ts).
 *
 * Per this repo's established convention (see bulletproof-validator.test.ts,
 * which has zero Deno-specific imports yet still isn't cross-imported from
 * src/ into a Deno-only edge function module), the rule logic is mirrored
 * here rather than imported across the Vite/Deno boundary.
 */
import { describe, it, expect } from 'vitest';

interface ReconciliationCheckItem {
  rule: string;
  label: string;
  pass: boolean;
  skipped?: boolean;
  note?: string;
}

interface ReconciliationResult {
  checks: ReconciliationCheckItem[];
  all_passed: boolean;
  passed_count: number;
  failed_count: number;
  skipped_count: number;
  engine_version: string;
}

interface ReconciliationInput {
  mrr: number;
  grossProfit: number;
  netProfit: number;
  totalExpenses: number;
  grossMarginPercent: number;
  clientsActive: number;
  ltv: number;
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
  scenarioCoherent: boolean;
}

const SUM_TOLERANCE = 2;
function approxEqual(a: number, b: number, tolerance = SUM_TOLERANCE): boolean {
  return Math.abs(a - b) <= tolerance;
}

function runReconciliationCheck(input: ReconciliationInput): ReconciliationResult {
  const checks: ReconciliationCheckItem[] = [];

  const revenueSum = input.expenses.cogs + input.grossProfit;
  checks.push({ rule: 'R-001', label: 'Sum Integrity — Revenue', pass: approxEqual(revenueSum, input.mrr) });

  if (input.expenseSource === 'calculated') {
    const itemizedSum =
      input.expenses.cogs + input.expenses.salaries + input.expenses.rent +
      input.expenses.utilities + input.expenses.marketing + input.expenses.other;
    checks.push({ rule: 'R-002', label: 'Sum Integrity — Expenses', pass: approxEqual(itemizedSum, input.totalExpenses) });
  } else {
    checks.push({ rule: 'R-002', label: 'Sum Integrity — Expenses', pass: true, skipped: true });
  }

  checks.push({ rule: 'R-003', label: 'Sum Integrity — Net Profit', pass: approxEqual(input.mrr - input.totalExpenses, input.netProfit) });
  checks.push({ rule: 'R-004', label: 'Sign Consistency — Revenue', pass: input.mrr >= 0 });

  const negativeCostFields = Object.values({
    totalExpenses: input.totalExpenses, cogs: input.expenses.cogs, salaries: input.expenses.salaries,
    rent: input.expenses.rent, utilities: input.expenses.utilities, marketing: input.expenses.marketing,
    other: input.expenses.other,
  }).filter((v) => v < 0);
  checks.push({ rule: 'R-005', label: 'Sign Consistency — Costs', pass: negativeCostFields.length === 0 });

  checks.push({ rule: 'R-006', label: 'Logical Constraint — Active Clients', pass: input.clientsActive >= 0 });

  const gmFraction = input.grossMarginPercent / 100;
  checks.push({ rule: 'R-007', label: 'Logical Constraint — Gross Margin Range', pass: gmFraction >= -1 && gmFraction <= 1 });

  checks.push({ rule: 'R-008', label: 'Benchmark Boundary — LTV', pass: input.ltv >= 100 && input.ltv <= 50000 });

  if (input.cacPaybackMonths === null) {
    checks.push({ rule: 'R-009', label: 'Benchmark Boundary — CAC Payback', pass: true, skipped: true });
  } else {
    checks.push({ rule: 'R-009', label: 'Benchmark Boundary — CAC Payback', pass: input.cacPaybackMonths >= 1 && input.cacPaybackMonths <= 36 });
  }

  checks.push({ rule: 'R-010', label: 'Benchmark Boundary — LTV:CAC Ratio', pass: input.ltvCacRatio >= 0.5 && input.ltvCacRatio <= 15 });
  checks.push({ rule: 'R-011', label: 'Scenario Coherence', pass: input.scenarioCoherent });

  const passedCount = checks.filter((c) => c.pass).length;
  const skippedCount = checks.filter((c) => c.skipped).length;
  const failedCount = checks.length - passedCount;

  return {
    checks,
    all_passed: failedCount === 0,
    passed_count: passedCount,
    failed_count: failedCount,
    skipped_count: skippedCount,
    engine_version: '1.0.0-live',
  };
}

function baseInput(overrides: Partial<ReconciliationInput> = {}): ReconciliationInput {
  return {
    mrr: 10000,
    grossProfit: 6000,
    netProfit: 2000,
    totalExpenses: 8000,
    grossMarginPercent: 60,
    clientsActive: 100,
    ltv: 1400,
    cacPaybackMonths: 4,
    ltvCacRatio: 5,
    expenses: { cogs: 4000, salaries: 2000, rent: 1000, utilities: 300, marketing: 700, other: 0 },
    expenseSource: 'calculated',
    scenarioCoherent: true,
    ...overrides,
  };
}

describe('reconciliation-check: healthy input', () => {
  it('passes all checks with internally-consistent numbers', () => {
    const report = runReconciliationCheck(baseInput());
    expect(report.all_passed).toBe(true);
    expect(report.failed_count).toBe(0);
    expect(report.checks).toHaveLength(11);
  });
});

describe('R-001/R-003: sum integrity', () => {
  it('fails R-001 when cogs + grossProfit does not match mrr', () => {
    const report = runReconciliationCheck(baseInput({ grossProfit: 1000 })); // 4000 + 1000 = 5000 != 10000
    const r001 = report.checks.find((c) => c.rule === 'R-001')!;
    expect(r001.pass).toBe(false);
    expect(report.all_passed).toBe(false);
  });

  it('fails R-003 when mrr - totalExpenses does not match netProfit', () => {
    const report = runReconciliationCheck(baseInput({ netProfit: 500 })); // 10000-8000=2000 != 500
    const r003 = report.checks.find((c) => c.rule === 'R-003')!;
    expect(r003.pass).toBe(false);
  });
});

describe('R-002: expense sum integrity, gated by expenseSource', () => {
  it('fails when itemized expenses do not sum to totalExpenses and expenseSource is calculated', () => {
    const report = runReconciliationCheck(baseInput({ totalExpenses: 9999 }));
    const r002 = report.checks.find((c) => c.rule === 'R-002')!;
    expect(r002.pass).toBe(false);
    expect(r002.skipped).toBeFalsy();
  });

  it('skips (never fails) when expenseSource is user, even with a mismatched sum', () => {
    const report = runReconciliationCheck(baseInput({ totalExpenses: 500, expenseSource: 'user' }));
    const r002 = report.checks.find((c) => c.rule === 'R-002')!;
    expect(r002.pass).toBe(true);
    expect(r002.skipped).toBe(true);
    expect(report.skipped_count).toBeGreaterThanOrEqual(1);
  });
});

describe('R-004/R-005: sign consistency', () => {
  it('fails R-004 on negative mrr', () => {
    const report = runReconciliationCheck(baseInput({ mrr: -100 }));
    expect(report.checks.find((c) => c.rule === 'R-004')!.pass).toBe(false);
  });

  it('fails R-005 when any cost field is negative', () => {
    const report = runReconciliationCheck(baseInput({ expenses: { cogs: 4000, salaries: -50, rent: 1000, utilities: 300, marketing: 700, other: 0 } }));
    expect(report.checks.find((c) => c.rule === 'R-005')!.pass).toBe(false);
  });
});

describe('R-006/R-007: logical constraints', () => {
  it('fails R-006 on negative active clients', () => {
    const report = runReconciliationCheck(baseInput({ clientsActive: -5 }));
    expect(report.checks.find((c) => c.rule === 'R-006')!.pass).toBe(false);
  });

  it('fails R-007 when gross margin exceeds 100%', () => {
    const report = runReconciliationCheck(baseInput({ grossMarginPercent: 150 }));
    expect(report.checks.find((c) => c.rule === 'R-007')!.pass).toBe(false);
  });

  it('fails R-007 when gross margin is below -100%', () => {
    const report = runReconciliationCheck(baseInput({ grossMarginPercent: -150 }));
    expect(report.checks.find((c) => c.rule === 'R-007')!.pass).toBe(false);
  });
});

describe('R-008/R-010: benchmark boundaries', () => {
  it('fails R-008 when LTV is below $100', () => {
    const report = runReconciliationCheck(baseInput({ ltv: 50 }));
    expect(report.checks.find((c) => c.rule === 'R-008')!.pass).toBe(false);
  });

  it('fails R-008 when LTV is above $50,000', () => {
    const report = runReconciliationCheck(baseInput({ ltv: 80000 }));
    expect(report.checks.find((c) => c.rule === 'R-008')!.pass).toBe(false);
  });

  it('fails R-010 when LTV:CAC ratio is above 15x', () => {
    const report = runReconciliationCheck(baseInput({ ltvCacRatio: 25 }));
    expect(report.checks.find((c) => c.rule === 'R-010')!.pass).toBe(false);
  });

  it('fails R-010 when LTV:CAC ratio is below 0.5x', () => {
    const report = runReconciliationCheck(baseInput({ ltvCacRatio: 0.1 }));
    expect(report.checks.find((c) => c.rule === 'R-010')!.pass).toBe(false);
  });
});

describe('R-009: CAC payback, skipped when not applicable', () => {
  it('fails when CAC payback exceeds 36 months', () => {
    const report = runReconciliationCheck(baseInput({ cacPaybackMonths: 48 }));
    const r009 = report.checks.find((c) => c.rule === 'R-009')!;
    expect(r009.pass).toBe(false);
    expect(r009.skipped).toBeFalsy();
  });

  it('skips (never fails) when CAC payback is null (unprofitable / non-positive contribution)', () => {
    const report = runReconciliationCheck(baseInput({ cacPaybackMonths: null }));
    const r009 = report.checks.find((c) => c.rule === 'R-009')!;
    expect(r009.pass).toBe(true);
    expect(r009.skipped).toBe(true);
  });
});

describe('R-011: scenario coherence, sourced from checkScenarioMonotonicity', () => {
  it('fails when the caller reports a scenario contradiction', () => {
    const report = runReconciliationCheck(baseInput({ scenarioCoherent: false }));
    expect(report.checks.find((c) => c.rule === 'R-011')!.pass).toBe(false);
    expect(report.all_passed).toBe(false);
  });
});

describe('report aggregation', () => {
  it('counts passed, failed, and skipped checks correctly with multiple simultaneous failures', () => {
    const report = runReconciliationCheck(baseInput({ mrr: -100, clientsActive: -5, expenseSource: 'user', totalExpenses: 1 }));
    expect(report.checks.find((c) => c.rule === 'R-004')!.pass).toBe(false);
    expect(report.checks.find((c) => c.rule === 'R-006')!.pass).toBe(false);
    expect(report.checks.find((c) => c.rule === 'R-002')!.skipped).toBe(true);
    expect(report.all_passed).toBe(false);
    expect(report.failed_count).toBeGreaterThanOrEqual(2);
  });
});
