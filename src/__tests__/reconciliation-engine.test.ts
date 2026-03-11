/**
 * LAYER 2 — Reconciliation Engine Tests
 * Tests 10-rule reconciliation engine with deliberate mismatches and edge cases.
 */
import { describe, it, expect } from 'vitest';
import { reconcileFinancialOutput, type ReconciliationCheck } from '@/lib/reconciliation-engine';
import type { PLStatement, CashFlowStatement, UnitEconomicsResult } from '@/lib/financial-engine';

// ── Helpers to build minimal mock objects ──

function makePL(overrides: Partial<PLStatement> = {}): PLStatement {
  return {
    month: 1, year: 1,
    activeCustomers: 100, newCustomers: 10, churnedCustomers: 5,
    grossRevenue: 10000, discountsAndRefunds: 0, netRevenue: 7000,
    cogs: 3000, grossProfit: 4000,
    grossMarginPct: 0.57,
    rent: 1000, salaries: 2000, marketingSpend: 500, softwareAndTools: 200, otherOpex: 300,
    totalOpex: 4000, ebitda: 0, ebitdaMarginPct: 0, netIncome: 0, netMarginPct: 0,
    reconciled: false,
    ...overrides,
  };
}

function makeCF(overrides: Partial<CashFlowStatement> = {}): CashFlowStatement {
  return {
    month: 1, operatingCashFlow: 1000, capitalExpenditures: 0,
    fundingReceived: 0, loanRepayment: 0, ownerDraw: 0,
    netCashFlow: 1000, cumulativeCash: 5000, cashRunwayMonths: 10,
    isCashPositive: true, breakEvenReached: false,
    ...overrides,
  };
}

function makeUE(overrides: Partial<UnitEconomicsResult> = {}): UnitEconomicsResult {
  return {
    arpu: 100, marginPerCustomer: 70, lifetimeMonths: 20,
    ltv: 1400, ltvNpv: 1200, ltvCacRatio: 5.0, cacPaybackMonths: 4,
    benchmarkComparison: { ltvRange: [980, 1820], ltvCacHealthLabel: 'excellent' },
    ...overrides,
  };
}

function findChecks(report: ReturnType<typeof reconcileFinancialOutput>, field: string): ReconciliationCheck[] {
  return report.checks.filter(c => c.field.includes(field));
}

function findChecksByType(report: ReturnType<typeof reconcileFinancialOutput>, type: ReconciliationCheck['checkType']): ReconciliationCheck[] {
  return report.checks.filter(c => c.checkType === type);
}

// ── R-001 to R-003: Sum Integrity ──

describe('R-001: COGS + Gross Profit = Net Revenue', () => {
  it('auto-corrects when cogs + grossProfit ≠ netRevenue', () => {
    const pl = makePL({ netRevenue: 9999, cogs: 3000, grossProfit: 4000 });
    const report = reconcileFinancialOutput([pl], [makeCF()], makeUE());
    const revenueChecks = findChecks(report, 'netRevenue');
    expect(revenueChecks.some(c => c.autoResolved)).toBe(true);
    expect(pl.netRevenue).toBe(7000); // auto-corrected to cogs + grossProfit
  });

  it('passes when sums match', () => {
    const pl = makePL({ netRevenue: 7000, cogs: 3000, grossProfit: 4000 });
    const report = reconcileFinancialOutput([pl], [makeCF()], makeUE());
    const revenueChecks = findChecks(report, 'netRevenue');
    expect(revenueChecks.every(c => c.severity === 'pass')).toBe(true);
  });
});

describe('R-002: Itemized OpEx = Total OpEx', () => {
  it('auto-corrects when itemized sum ≠ totalOpex', () => {
    // rent(1000) + salaries(2000) + marketing(500) + sw(200) + other(300) = 4000
    const pl = makePL({ totalOpex: 5000 }); // deliberate mismatch
    const report = reconcileFinancialOutput([pl], [makeCF()], makeUE());
    expect(pl.totalOpex).toBe(4000); // corrected
  });
});

describe('R-003: Gross Profit - Total OpEx = EBITDA', () => {
  it('auto-corrects EBITDA', () => {
    const pl = makePL({ grossProfit: 4000, totalOpex: 4000, ebitda: 999 });
    const report = reconcileFinancialOutput([pl], [makeCF()], makeUE());
    expect(pl.ebitda).toBe(0); // 4000 - 4000 = 0
  });
});

// ── R-004 to R-005: Sign Consistency ──

describe('R-004: Negative revenue flags critical', () => {
  it('flags negative grossRevenue', () => {
    const pl = makePL({ grossRevenue: -5000 });
    const report = reconcileFinancialOutput([pl], [makeCF()], makeUE());
    const signChecks = findChecksByType(report, 'sign_consistency');
    const revenueFlag = signChecks.find(c => c.field.includes('grossRevenue'));
    expect(revenueFlag).toBeDefined();
    expect(revenueFlag!.severity).toBe('critical');
  });

  it('flags negative COGS', () => {
    const pl = makePL({ cogs: -1000 });
    const report = reconcileFinancialOutput([pl], [makeCF()], makeUE());
    const signChecks = findChecksByType(report, 'sign_consistency');
    expect(signChecks.some(c => c.field.includes('cogs') && c.severity === 'critical')).toBe(true);
  });
});

describe('R-005: Negative cash runway', () => {
  it('flags negative cashRunwayMonths as critical', () => {
    const cf = makeCF({ cashRunwayMonths: -3 });
    const report = reconcileFinancialOutput([makePL()], [cf], makeUE());
    const signChecks = findChecksByType(report, 'sign_consistency');
    expect(signChecks.some(c => c.field.includes('cashRunwayMonths') && c.severity === 'critical')).toBe(true);
  });
});

// ── R-006: Margin/Risk Contradiction ──

describe('R-006: Net margin < -10% with Low risk → critical + force Moderate', () => {
  it('flags critical when net margin deeply negative with Low risk', () => {
    const pl = makePL({ netMarginPct: -0.25 }); // -25%
    const report = reconcileFinancialOutput([pl], [makeCF()], makeUE(), 'Low');
    const marginRisk = report.checks.filter(c => c.field.includes('netMarginPct+riskLevel'));
    expect(marginRisk.length).toBeGreaterThan(0);
    expect(marginRisk[0].severity).toBe('critical');
    expect(marginRisk[0].autoResolved).toBe(true);
    expect(marginRisk[0].note).toContain('Moderate');
  });

  it('does NOT flag when risk is already Moderate', () => {
    const pl = makePL({ netMarginPct: -0.25 });
    const report = reconcileFinancialOutput([pl], [makeCF()], makeUE(), 'Moderate');
    const marginRisk = report.checks.filter(c => c.field.includes('netMarginPct+riskLevel'));
    expect(marginRisk.length).toBe(0);
  });
});

// ── R-007 to R-008: Logical Constraints ──

describe('R-007: Negative active customers', () => {
  it('flags negative activeCustomers as critical', () => {
    const pl = makePL({ activeCustomers: -5 });
    const report = reconcileFinancialOutput([pl], [makeCF()], makeUE());
    const logicChecks = findChecksByType(report, 'logical_constraint');
    expect(logicChecks.some(c => c.field.includes('activeCustomers') && c.severity === 'critical')).toBe(true);
  });
});

describe('R-007: Gross margin > 100%', () => {
  it('flags grossMarginPct > 1 as major', () => {
    const pl = makePL({ grossMarginPct: 1.5 }); // 150%
    const report = reconcileFinancialOutput([pl], [makeCF()], makeUE());
    const logicChecks = findChecksByType(report, 'logical_constraint');
    expect(logicChecks.some(c => c.field.includes('grossMarginPct') && c.severity === 'major')).toBe(true);
  });
});

describe('R-008: Year 1 net margin > 60%', () => {
  it('flags unusually high year-1 net margin', () => {
    const pl = makePL({ year: 1, netMarginPct: 0.75 }); // 75%
    const report = reconcileFinancialOutput([pl], [makeCF()], makeUE());
    const logicChecks = findChecksByType(report, 'logical_constraint');
    expect(logicChecks.some(c => c.field.includes('netMarginPct') && c.severity === 'major')).toBe(true);
  });
});

// ── R-009 to R-010: Benchmark Boundaries ──

describe('R-009: LTV outside [100, 50000]', () => {
  it('flags LTV below 100', () => {
    const ue = makeUE({ ltv: 50 });
    const report = reconcileFinancialOutput([makePL()], [makeCF()], ue);
    const benchChecks = findChecksByType(report, 'benchmark_boundary');
    expect(benchChecks.some(c => c.field.includes('ltv'))).toBe(true);
  });

  it('flags LTV above 50000', () => {
    const ue = makeUE({ ltv: 80000 });
    const report = reconcileFinancialOutput([makePL()], [makeCF()], ue);
    const benchChecks = findChecksByType(report, 'benchmark_boundary');
    expect(benchChecks.some(c => c.field.includes('ltv'))).toBe(true);
  });

  it('passes LTV within range', () => {
    const ue = makeUE({ ltv: 1400 });
    const report = reconcileFinancialOutput([makePL()], [makeCF()], ue);
    const ltvChecks = report.checks.filter(c => c.checkType === 'benchmark_boundary' && c.field.includes('ltv'));
    expect(ltvChecks.length).toBe(0);
  });
});

describe('R-010: CAC payback outside [1, 36] and LTV:CAC outside [0.5, 15]', () => {
  it('flags cacPaybackMonths > 36', () => {
    const ue = makeUE({ cacPaybackMonths: 48 });
    const report = reconcileFinancialOutput([makePL()], [makeCF()], ue);
    expect(report.checks.some(c => c.field.includes('cacPaybackMonths') && c.checkType === 'benchmark_boundary')).toBe(true);
  });

  it('flags ltvCacRatio > 15', () => {
    const ue = makeUE({ ltvCacRatio: 25 });
    const report = reconcileFinancialOutput([makePL()], [makeCF()], ue);
    expect(report.checks.some(c => c.field.includes('ltvCacRatio') && c.checkType === 'benchmark_boundary')).toBe(true);
  });

  it('flags ltvCacRatio ≤ 0 as logical_constraint critical', () => {
    const ue = makeUE({ ltvCacRatio: -1 });
    const report = reconcileFinancialOutput([makePL()], [makeCF()], ue);
    expect(report.checks.some(c => c.field.includes('ltvCacRatio') && c.severity === 'critical')).toBe(true);
  });
});

// ── Edge Cases ──

describe('Edge cases', () => {
  it('handles all-zero P&L without crashing', () => {
    const pl = makePL({
      grossRevenue: 0, netRevenue: 0, cogs: 0, grossProfit: 0,
      rent: 0, salaries: 0, marketingSpend: 0, softwareAndTools: 0, otherOpex: 0,
      totalOpex: 0, ebitda: 0, netMarginPct: 0, grossMarginPct: 0,
    });
    const report = reconcileFinancialOutput([pl], [makeCF()], makeUE());
    expect(report).toBeDefined();
    expect(report.checks.length).toBeGreaterThan(0);
  });

  it('handles multiple months', () => {
    const pls = [makePL({ month: 1 }), makePL({ month: 2 }), makePL({ month: 3 })];
    const report = reconcileFinancialOutput(pls, [makeCF()], makeUE());
    // 3 months × 3 sum checks each = at least 9 sum integrity checks
    const sumChecks = findChecksByType(report, 'sum_integrity');
    expect(sumChecks.length).toBeGreaterThanOrEqual(9);
  });

  it('report has correct counts', () => {
    const pl = makePL(); // sums match → all pass
    const report = reconcileFinancialOutput([pl], [makeCF()], makeUE());
    expect(report.passedCount + report.resolvedCount + report.unresolvedCount)
      .toBeLessThanOrEqual(report.checks.length);
  });
});
