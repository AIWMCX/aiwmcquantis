/**
 * Regression (2026-11-05): a % change to an input the user never typed used to
 * start from 0. The Scenario Lab UI only sends increase_pct, so "+10% costs" on an
 * analysis without typed costs ran with total costs of $0, and the sensitivity
 * ranking gave costs and churn a $0 swing (ranked as not mattering).
 * Fix: start from the value the engine used (ResolvedScenarioBase); fail loudly
 * when it is unknown; reject "replace" on rent (it is a multiplier).
 */
import { describe, expect, it } from 'vitest';
import {
  applyScenarioDelta,
  needsResolvedBase,
  resolvedBaseFromCalc,
  ScenarioDeltaError,
} from '../../supabase/functions/_shared/scenario-delta.ts';
import { computeSensitivityRanking, findBreakpoint, resolveScenarioBase } from '../../supabase/functions/_shared/scenario-sensitivity.ts';
import { calculateStrictFinancials } from '../../supabase/functions/analyze-business/financial-calculator.ts';
import type { IndustryBenchmarks } from '../../supabase/functions/analyze-business/index.ts';

const benchmarks: IndustryBenchmarks = {
  id: 'saas_b2b', name: 'saas_b2b', cac_min: 300, cac_max: 3000, cac_typical: 800, average_check_min: 50, average_check_max: 500,
  orders_per_client: 1, client_lifetime_months: 24, ltv_cac_min: 3, ltv_cac_max: 6, net_margin_min: 10, net_margin_max: 30,
  cogs_percent: 20, salaries_fixed: 12000, rent_fixed: 2000, utilities_fixed: 500, other_fixed: 1500, keywords: [],
};
const loc = { overall: 1, salary: 1, rent: 1, utility: 1, marketing: 1, matched: false, matchedCity: null, region: 'default', confidence: 0 };

// An analysis where the user typed revenue, investment, CAC and price, but not costs, churn or customers.
const base = {
  rawMrr: 50000, rawInvestment: 150000, rawCac: 800, rawAvgCheck: 450, rawLtv: 8640,
  userProvidedCosts: undefined as number | undefined,
  userProvidedChurnRate: undefined as number | undefined,
  userProvidedCustomers: undefined as number | undefined,
  locationMultipliers: loc,
};

const run = (e: typeof base) => calculateStrictFinancials(
  e.rawMrr, e.rawInvestment, e.rawCac, e.rawLtv, e.rawAvgCheck, benchmarks, loc, null,
  e.userProvidedCosts, e.userProvidedChurnRate, e.userProvidedCustomers,
);

describe('scenario delta on inputs the user never typed', () => {
  const baseCalc = run(base);
  const resolved = resolvedBaseFromCalc(baseCalc);

  it('the engine reports the churn it used', () => {
    expect(baseCalc.churnRatePercentUsed).toBeCloseTo(100 / 24, 10);
    expect(resolved).toEqual({ monthlyCosts: baseCalc.totalExpenses, churnRatePercent: baseCalc.churnRatePercentUsed, customers: baseCalc.clientsActive });
    expect(resolveScenarioBase(base, benchmarks, null)).toEqual(resolved);
  });

  it('+10% costs raises total costs by 10% (was: costs became $0)', () => {
    const change = [{ assumption_key: 'monthly_costs' as const, operation: 'increase_pct' as const, value: 10 }];
    expect(needsResolvedBase(base, change)).toBe(true);
    const effective = applyScenarioDelta(base, change, resolved);
    const calc = run(effective);
    expect(calc.totalExpenses).toBeCloseTo(baseCalc.totalExpenses * 1.1, 0);
    expect(calc.netProfit).toBeLessThan(baseCalc.netProfit);
  });

  it('+10% churn raises churn by 10% (was: churn became 0%, lifetime 120 months)', () => {
    const effective = applyScenarioDelta(base, [{ assumption_key: 'churn_rate', operation: 'increase_pct', value: 10 }], resolved);
    expect(effective.userProvidedChurnRate).toBeCloseTo((100 / 24) * 1.1, 10);
    expect(run(effective).ltv).toBeLessThan(baseCalc.ltv);
  });

  it('+10% customers starts from the active clients the engine derived', () => {
    const effective = applyScenarioDelta(base, [{ assumption_key: 'expected_customers', operation: 'increase_pct', value: 10 }], resolved);
    expect(effective.userProvidedCustomers).toBeCloseTo(baseCalc.clientsActive * 1.1, 10);
  });

  it('throws instead of computing on 0 when the resolved base is missing', () => {
    expect(() => applyScenarioDelta(base, [{ assumption_key: 'monthly_costs', operation: 'increase_pct', value: 10 }]))
      .toThrow(ScenarioDeltaError);
    try {
      applyScenarioDelta(base, [{ assumption_key: 'churn_rate', operation: 'decrease_pct', value: 5 }]);
    } catch (e) {
      expect((e as ScenarioDeltaError).code).toBe('BASE_VALUE_UNKNOWN');
    }
  });

  it('typed values and replace operations behave as before', () => {
    const typed = { ...base, userProvidedCosts: 30000 };
    expect(needsResolvedBase(typed, [{ assumption_key: 'monthly_costs', operation: 'increase_pct', value: 10 }])).toBe(false);
    expect(applyScenarioDelta(typed, [{ assumption_key: 'monthly_costs', operation: 'increase_pct', value: 10 }]).userProvidedCosts).toBeCloseTo(33000, 6);
    expect(applyScenarioDelta(base, [{ assumption_key: 'monthly_costs', operation: 'replace', value: 25000 }]).userProvidedCosts).toBe(25000);
  });

  it('rent can only change by a percentage (it scales the benchmark rent)', () => {
    expect(applyScenarioDelta(base, [{ assumption_key: 'rent', operation: 'increase_pct', value: 10 }]).locationMultipliers.rent).toBeCloseTo(1.1, 10);
    expect(() => applyScenarioDelta(base, [{ assumption_key: 'rent', operation: 'replace', value: 3000 }])).toThrow(/percentage/);
  });
});

describe('sensitivity ranking no longer zeroes untyped drivers', () => {
  const ranking = computeSensitivityRanking(base, benchmarks, null, 'netProfit');
  const byKey = Object.fromEntries(ranking.map((r) => [r.assumption_key, r]));

  it('monthly costs have a real swing (about 10% of total costs)', () => {
    const totalCosts = run(base).totalExpenses;
    expect(byKey.monthly_costs.dollar_impact_per_10pct).toBeGreaterThan(totalCosts * 0.09);
    expect(byKey.monthly_costs.dollar_impact_per_10pct).toBeLessThan(totalCosts * 0.11);
  });

  it('churn has a non-zero swing', () => {
    expect(byKey.churn_rate.dollar_impact_per_10pct).toBeGreaterThan(0);
  });

  it('the breakpoint search on untyped costs finds where profit hits zero', () => {
    const r = findBreakpoint(base, benchmarks, null, 'monthly_costs', 'netProfit', 0);
    expect(r.status).not.toBe('ALREADY_AT_TARGET');
  });
});
