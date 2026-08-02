/**
 * Dual-engine cross-validation root cause, 2026-08-02.
 *
 * engine-cross-validator.ts's agreement score has never once reached its
 * own >=95 "isDualEngineVerified" threshold in this system's production
 * history (0/87 stored analyses). Fresh query: of 7 analyses since
 * 2026-07-25, all 7 diverged on exactly one metric — roiYear1Percent —
 * and nothing else. Root cause, found by reading quantis-engine.ts
 * directly: its ROI calculation was gated behind `netProfit > 0`, so every
 * unprofitable analysis (the majority of real traffic all session) left
 * roiYear1Percent silently at its initialized value of 0, indistinguishable
 * from "this venture exactly breaks even," while the sibling
 * financial-calculator.ts engine correctly computes a real negative ROI
 * for the same case (gated only on `startupInvestment > 0`, no
 * profitability condition).
 *
 * This test proves the fix: processQuantisAnalysis must report a real
 * (negative) ROI for an unprofitable business with real investment,
 * matching financial-calculator.ts's own unconditional-on-sign behavior,
 * using the same real production bundle
 * (analyses.id dab0bcb8-7ff0-4a27-b262-427423600e4d) reused throughout
 * this session's engine tests.
 */
import { describe, it, expect } from 'vitest';
import { processQuantisAnalysis, type QuantisEngineInput } from '../../supabase/functions/analyze-business/quantis-engine.ts';

const REAL_BENCHMARKS: any = {
  id: 'saas', name: 'SaaS / Software', cac_max: 24762, cac_min: 1615, cac_typical: 6210,
  rent_fixed: 180, other_fixed: 1000, salaries_fixed: 8000, utilities_fixed: 200,
  cogs_percent: 42, net_margin_max: -8, net_margin_min: -4, average_check_max: 687, average_check_min: 295,
  orders_per_client: 1, client_lifetime_months: 22, ltv_cac_max: 0.85, ltv_cac_min: 0.47, keywords: [],
};

const REAL_LOCATION_MULTIPLIERS: any = {
  rent: 1, region: 'global', salary: 1, matched: false, overall: 1, utility: 1, marketing: 1, confidence: 40, matchedCity: null,
};

function buildInput(overrides: Partial<QuantisEngineInput['financialInputs']>): QuantisEngineInput {
  return {
    businessIdea: 'A SaaS product for real production parity testing',
    location: 'Remote',
    financialInputs: {
      startupInvestment: 47500,
      monthlyRevenue: 3402,
      cac: 100,
      averagePrice: 189,
      monthlyCosts: 7200,
      churnRate: 2,
      expectedCustomers: 18,
      ...overrides,
    },
    benchmarks: REAL_BENCHMARKS,
    locationMultipliers: REAL_LOCATION_MULTIPLIERS,
    subIndustry: null,
  };
}

describe('processQuantisAnalysis ROI — parity with financial-calculator.ts', () => {
  it('reports a real negative ROI for an unprofitable business with real investment, not a silent 0', () => {
    const output = processQuantisAnalysis(buildInput({}));
    expect(output.metrics.netProfit).toBeLessThan(0);
    expect(output.metrics.roiYear1Percent).not.toBe(0);
    expect(output.metrics.roiYear1Percent).toBeLessThan(0);
  });

  it('still reports 0 ROI only when there is no investment at all (not because of profit sign)', () => {
    const output = processQuantisAnalysis(buildInput({ startupInvestment: 0 }));
    expect(output.metrics.roiYear1Percent).toBe(0);
  });

  it('reports a real positive ROI for a profitable business, unchanged from prior behavior', () => {
    const output = processQuantisAnalysis(buildInput({
      monthlyRevenue: 50000,
      monthlyCosts: 15000,
      expectedCustomers: 200,
    }));
    expect(output.metrics.netProfit).toBeGreaterThan(0);
    expect(output.metrics.roiYear1Percent).toBeGreaterThan(0);
  });
});
