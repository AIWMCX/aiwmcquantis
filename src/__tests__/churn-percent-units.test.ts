// Iron stress test 2026-10-23: churn arrives as a PERCENT from every caller.
import { describe, expect, it } from 'vitest';
import { calculateStrictFinancials } from '../../supabase/functions/analyze-business/financial-calculator';
import type { IndustryBenchmarks } from '../../supabase/functions/analyze-business/index';
import type { LocationMultiplierResult } from '../../supabase/functions/analyze-business/location-intelligence';

const loc: LocationMultiplierResult = { overall: 1, salary: 1, rent: 1, utility: 1, marketing: 1, matched: false, matchedCity: null, region: 'test', confidence: 0 };
const bench: IndustryBenchmarks = {
  id: 'services', name: 'Professional services', cogs_percent: 40,
  salaries_fixed: 8000, rent_fixed: 1500, utilities_fixed: 300, other_fixed: 700,
  cac_min: 100, cac_max: 5000, cac_typical: 800, average_check_min: 200, average_check_max: 10000,
  orders_per_client: 1, client_lifetime_months: 18, ltv_cac_min: 1, ltv_cac_max: 10,
  net_margin_min: 5, net_margin_max: 25, keywords: [],
};
const run = (churn?: number) => calculateStrictFinancials(30000, 20000, 500, 0, 3000, bench, loc, null, undefined, churn, 10);

describe('churn is a percent', () => {
  it('5 (%) on 10 clients needs 0.5 new clients a month, not 50', () => {
    const r = run(5);
    expect(r.expenses.marketing).toBe(250); // 10 x 0.05 = 0.5 expected x $500 (no Math.ceil since 2026-10-29)
    expect(r.netProfit).toBe(7250);
  });
  it('no churn typed = 1 / industry lifetime (18 months = 5.56%)', () => {
    expect(run(100 / 18).expenses.marketing).toBe(run(undefined).expenses.marketing);
  });
  it('the audit note states the true percent', () => {
    const note = run(5).audit.find((a) => a.formula.startsWith('Marketing'))?.notes ?? '';
    expect(note).toContain('5.0% churn');
    expect(note).not.toContain('500.0% churn');
  });
  it('0 stays 0 (explicit zero is honoured) and out-of-range values are clamped', () => {
    expect(run(0).expenses.marketing).toBe(0);
    expect(run(250).expenses.marketing).toBe(run(100).expenses.marketing);
  });
});
