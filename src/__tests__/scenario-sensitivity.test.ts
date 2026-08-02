/**
 * Verifies sensitivity ranking + breakpoint solving against the REAL
 * production bundle that exposed the net_profit contradiction bug earlier
 * (analyses.id dab0bcb8-7ff0-4a27-b262-427423600e4d — a real Pro analysis).
 * That analysis has `userProvidedCosts` set, which means totalExpenses (and
 * therefore netProfit) is fixed to the user's stated total regardless of
 * cac/price/churn/customers/rent — a real, honest consequence of the
 * engine's own design (see financial-analysis-shape.ts's P0 fix comment).
 * The tool must surface that truthfully, not fabricate differentiated
 * importance where none exists.
 */
import { describe, it, expect } from 'vitest';
import { computeSensitivityRanking, findBreakpoint } from '../../supabase/functions/_shared/scenario-sensitivity.ts';

const REAL_BASE = {
  rawMrr: 3402,
  rawInvestment: 47500,
  rawCac: 100,
  rawLtv: 4158,
  rawAvgCheck: 189,
  userProvidedCosts: 7200,
  userProvidedChurnRate: 2,
  userProvidedCustomers: 18,
  locationMultipliers: { rent: 1, region: 'global', salary: 1, matched: false, overall: 1, utility: 1, marketing: 1, confidence: 40, matchedCity: null },
};

const REAL_BENCHMARKS: any = {
  id: 'saas', name: 'SaaS / Software', cac_max: 24762, cac_min: 1615, cac_typical: 6210,
  rent_fixed: 180, other_fixed: 1000, salaries_fixed: 8000, utilities_fixed: 200,
  cogs_percent: 42, net_margin_max: -8, net_margin_min: -4, average_check_max: 687, average_check_min: 295,
  orders_per_client: 1, client_lifetime_months: 22, ltv_cac_max: 0.85, ltv_cac_min: 0.47, keywords: [],
};

const REAL_SUBINDUSTRY: any = {
  modifiers: { cac_multiplier: 1, ltv_multiplier: 1, churn_multiplier: 1, margin_multiplier: 1, sales_cycle_months: 1 },
  confidence: 50, targetScale: 'smb', pricingModel: 'subscription', businessModel: 'hybrid',
  subIndustryId: 'saas', baseIndustryId: 'saas', subIndustryName: 'General', detectedKeywords: [],
};

describe('computeSensitivityRanking (real production bundle)', () => {
  const ranking = computeSensitivityRanking(REAL_BASE, REAL_BENCHMARKS, REAL_SUBINDUSTRY, 'netProfit');

  it('returns all 8 assumption keys', () => {
    expect(ranking).toHaveLength(8);
  });

  it('sorts descending by dollar_impact_per_10pct', () => {
    for (let i = 1; i < ranking.length; i++) {
      expect(ranking[i - 1].dollar_impact_per_10pct).toBeGreaterThanOrEqual(ranking[i].dollar_impact_per_10pct);
    }
  });

  it('ranks monthly_costs and monthly_revenue as the only real levers on net profit', () => {
    const top2 = ranking.slice(0, 2).map((r) => r.assumption_key).sort();
    expect(top2).toEqual(['monthly_costs', 'monthly_revenue']);
    // ~10% of userProvidedCosts (7200) and rawMrr (3402) respectively.
    expect(ranking.find((r) => r.assumption_key === 'monthly_costs')!.dollar_impact_per_10pct).toBeCloseTo(720, -1);
    expect(ranking.find((r) => r.assumption_key === 'monthly_revenue')!.dollar_impact_per_10pct).toBeCloseTo(340, -1);
  });

  it('honestly reports ~zero impact for cac/price/churn/customers/rent — userProvidedCosts absorbs them', () => {
    for (const key of ['cac', 'average_price', 'churn_rate', 'expected_customers', 'rent'] as const) {
      const result = ranking.find((r) => r.assumption_key === key)!;
      expect(result.dollar_impact_per_10pct).toBeLessThan(1);
    }
  });

  it('reports elasticity as null when the base metric is below the safe floor', () => {
    // base netProfit here is -3798, well above the $10 floor, so elasticity should be numeric for real levers.
    const revenueLever = ranking.find((r) => r.assumption_key === 'monthly_revenue')!;
    expect(revenueLever.elasticity).not.toBeNull();
  });
});

describe('findBreakpoint (real production bundle)', () => {
  it('finds the real revenue breakpoint where net profit crosses zero', () => {
    const result = findBreakpoint(REAL_BASE, REAL_BENCHMARKS, REAL_SUBINDUSTRY, 'monthly_revenue', 'netProfit', 0);
    expect(result.status).toBe('FOUND');
    if (result.status === 'FOUND') {
      // Needs mrr to reach $7200 (userProvidedCosts) from $3402 -> +111.6%.
      expect(result.breakpoint_pct).toBeCloseTo(111.6, 0);
    }
  });

  it('honestly reports NOT_FOUND_IN_RANGE for a driver with zero effect on the target metric', () => {
    const result = findBreakpoint(REAL_BASE, REAL_BENCHMARKS, REAL_SUBINDUSTRY, 'cac', 'netProfit', 0);
    expect(result.status).toBe('NOT_FOUND_IN_RANGE');
  });

  it('reports ALREADY_AT_TARGET when the base metric already equals the target', () => {
    const baseCalcNetProfit = -3798;
    const result = findBreakpoint(REAL_BASE, REAL_BENCHMARKS, REAL_SUBINDUSTRY, 'monthly_revenue', 'netProfit', baseCalcNetProfit);
    expect(result.status).toBe('ALREADY_AT_TARGET');
  });
});
