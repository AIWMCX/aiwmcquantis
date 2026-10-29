import { describe, expect, it } from 'vitest';
import { calculateStrictFinancials } from '../../supabase/functions/analyze-business/financial-calculator';
import type { IndustryBenchmarks } from '../../supabase/functions/analyze-business/index';
import type { LocationMultiplierResult } from '../../supabase/functions/analyze-business/location-intelligence';

// 2026-10-29 live run: Consulting, 12 clients × $650/mo, costs/CAC/churn blank.
// Acquisition spend used a generic 8% churn rounded up to one whole client a
// month, while LTV used the 24-month industry lifetime, so the same report
// said "LTV:CAC 4.7x, strong" next to a -5.1% contribution margin.
const consulting = {
  id: 'consulting', name: 'Consulting', cogs_percent: 49,
  salaries_fixed: 10740, rent_fixed: 1500, utilities_fixed: 200, other_fixed: 800,
  cac_min: 100, cac_max: 5000, cac_typical: 4374, average_check_min: 500, average_check_max: 5000,
  orders_per_client: 1, client_lifetime_months: 24, ltv_cac_min: 3, ltv_cac_max: 10,
  net_margin_min: 20, net_margin_max: 50, keywords: [],
} as unknown as IndustryBenchmarks;
const NO: LocationMultiplierResult = {
  overall: 1, salary: 1, rent: 1, utility: 1, marketing: 1,
  matched: false, matchedCity: null, region: 'default', confidence: 0,
};

describe('one churn figure drives both LTV and acquisition spend', () => {
  const r = calculateStrictFinancials(7800, 15000, 4374, 0, 650, consulting, NO, null, undefined, undefined, 12);

  it('blank churn = 1 / industry lifetime; expected (not rounded-up) new clients', () => {
    expect(r.newClientsNeeded).toBe(0.5); // 12 / 24
    expect(r.expenses.marketing).toBe(2187); // 0.5 × $4,374
  });

  it('LTV uses the same lifetime, so LTV:CAC agrees with the margin', () => {
    expect(r.ltv).toBe(7956); // $650 × 51% × 24
    expect(r.ltvCacRatio).toBe(1.8);
    expect(Number(r.cvp.contributionMarginRatio)).toBeGreaterThan(0);
    expect(r.cvp.breakEven.status).toBe('VALUE');
  });

  it('flags LTV:CAC below 1x in plain words', () => {
    const bad = calculateStrictFinancials(7800, 15000, 12000, 0, 650, consulting, NO, null, undefined, undefined, 12);
    const flag = bad.corrections.find((c) => c.field === 'ltv_cac_ratio' && c.reason.includes('costs more than the client earns'));
    expect(flag).toBeTruthy();
  });

  it('a typed churn still wins', () => {
    const typed = calculateStrictFinancials(7800, 15000, 4374, 0, 650, consulting, NO, null, undefined, 10, 12);
    expect(typed.newClientsNeeded).toBe(1.2); // 12 × 10%
    expect(typed.ltv).toBe(3315); // $650 × 51% × 10
  });
});
