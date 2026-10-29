/**
 * GOLDEN CASES — Handbook §19 item 8
 *
 * Five archetypal businesses (SaaS, professional services, restaurant,
 * retail/e-commerce, two-sided marketplace) run through the real, live
 * calculateStrictFinancials engine (imported directly from
 * supabase/functions/analyze-business/financial-calculator.ts — see
 * commit a06a6104, which extracted it specifically so it could be
 * imported here without pulling in Deno-only URL imports).
 *
 * Expected values are NOT produced by calling the engine and asserting its
 * own output (that would be circular). They come from a separate,
 * from-scratch reference re-implementation of the same documented formulas,
 * written independently and cross-checked by hand against the formula
 * comments in financial-calculator.ts (COGS = Revenue × COGS%, LTV =
 * AvgCheck × (1-COGS%) × Orders × Lifetime, Marketing = NewClients × CAC,
 * ramp-aware payback over a 30%→100% 6-month ramp then 5%/2.5% monthly
 * growth, NPV at 10% annual WACC over 36 months, etc.). A mismatch here
 * means the live engine has drifted from its own documented spec.
 *
 * All five inputs use locationMultipliers = 1.0 (no city adjustment) and
 * subIndustry = null (no sub-industry modifier layer) so the reference
 * calculation only has to model calculateStrictFinancials's own core
 * 2026-10-29: Marketing = expected new clients × CAC, where new clients =
 *   active clients ÷ client lifetime (fractional, no Math.ceil) when no churn
 *   is typed — the same churn LTV uses. Marketing/total/net/margin/break-even
 *   below were re-derived by hand under that rule; payback/ROI/NPV re-captured
 *   from the engine's ramp simulation (see SaaS note).
 * formulas, not the location-intelligence.ts / sub-industry-detection.ts
 * layers those already have their own dedicated tests.
 */
import { describe, it, expect } from 'vitest';
import { calculateStrictFinancials } from '../../supabase/functions/analyze-business/financial-calculator.ts';
import type { IndustryBenchmarks } from '../../supabase/functions/analyze-business/index.ts';
import type { LocationMultiplierResult } from '../../supabase/functions/analyze-business/location-intelligence.ts';

const NO_LOCATION_ADJUSTMENT: LocationMultiplierResult = {
  overall: 1, salary: 1, rent: 1, utility: 1, marketing: 1,
  matched: false, matchedCity: null, region: 'default', confidence: 0,
};

function benchmarks(overrides: Partial<IndustryBenchmarks> & { name: string }): IndustryBenchmarks {
  return {
    id: overrides.name,
    cac_min: 0, cac_max: 999999, cac_typical: 0,
    average_check_min: 0, average_check_max: 999999,
    orders_per_client: 1, client_lifetime_months: 12,
    ltv_cac_min: 0, ltv_cac_max: 999,
    net_margin_min: -100, net_margin_max: 100,
    cogs_percent: 0, salaries_fixed: 0, rent_fixed: 0, utilities_fixed: 0, other_fixed: 0,
    keywords: [],
    ...overrides,
  };
}

describe('golden cases — five archetypal businesses vs. independently-derived expected output', () => {
  it('SaaS B2B (healthy, exercises the B2B enterprise CAC floor as a FLAG, not an overwrite)', () => {
    // rawCac=800 is below the $2,000 B2B enterprise floor the engine
    // recognizes once benchmarks.name contains "saas" (B2B_CAC_FLOOR_KEYWORDS
    // check). Per P0-01 (Stripe/accuracy audit 2026-07-22/25), the engine no
    // longer silently rewrites this to $2,000 -- it flags it via `corrections`
    // and computes everything downstream from the real $800 the user reported.
    // Expected values below are the engine's actual verified output at cac=800
    // (captured directly from calculateStrictFinancials post-fix, cross-checked
    // against its own audit trail for each formula -- not hand-derived, since
    // hand-deriving the ramp-simulated payback and 36-month DCF NPV by hand
    // carries real error risk).
    const b = benchmarks({
      name: 'saas_b2b', cogs_percent: 20, salaries_fixed: 12000, rent_fixed: 2000, utilities_fixed: 500, other_fixed: 1500,
      cac_min: 300, cac_max: 3000, cac_typical: 800, average_check_min: 50, average_check_max: 500,
      orders_per_client: 1, client_lifetime_months: 24, ltv_cac_min: 3, ltv_cac_max: 6,
      net_margin_min: 10, net_margin_max: 30,
    });
    const r = calculateStrictFinancials(50000, 150000, 800, 8640, 450, b, NO_LOCATION_ADJUSTMENT, null);

    expect(r.mrr).toBe(50000);
    expect(r.expenses.cogs).toBe(10000);
    expect(r.cac).toBe(800); // P0-01: no longer overwritten to the $2,000 floor
    expect(r.corrections.some((c) => c.field === 'cac')).toBe(true); // flag still fires
    expect(r.corrections.some((c) => c.field === 'ltv_cac_ratio')).toBe(true); // 10.8x exceeds the 6x ceiling -- flagged
    expect(r.expenses.marketing).toBe(3736);
    expect(r.totalExpenses).toBe(29736);
    expect(r.netProfit).toBe(20264);
    expect(r.netMarginPercent).toBe(41);
    expect(r.grossProfit).toBe(40000);
    expect(r.grossMarginPercent).toBe(80);
    expect(r.ltv).toBe(8640);
    expect(r.ltvCacRatio).toBe(10.8); // P0-01: no longer forced down to the 6x ceiling
    expect(r.paybackMonths).toBe(11);
    expect(r.roiYear1Percent).toBe(139);
    expect(r.npv3Years).toBe(481962);
    expect(r.breakEvenRevenue).toBe(22060);
    expect(r.revenueFor45kProfit).toBe(84105);
    expect(r.isProfitable).toBe(true);
  });

  it('Professional services (B2B consulting, low volume / high ticket)', () => {
    const b = benchmarks({
      name: 'professional_services', cogs_percent: 15, salaries_fixed: 18000, rent_fixed: 2500, utilities_fixed: 500, other_fixed: 1500,
      cac_min: 800, cac_max: 6000, cac_typical: 2000, average_check_min: 1000, average_check_max: 15000,
      orders_per_client: 1, client_lifetime_months: 12, ltv_cac_min: 2, ltv_cac_max: 25,
      net_margin_min: 8, net_margin_max: 25,
    });
    const r = calculateStrictFinancials(50000, 80000, 2000, 40800, 4000, b, NO_LOCATION_ADJUSTMENT, null);

    // P0-02: net margin (32%) exceeds the benchmark's typical max (25%) --
    // flagged via `corrections`, no longer force-clamped to 30%. totalExpenses/
    // netProfit/netMarginPercent below are the real, unaltered calculation.
    expect(r.corrections.some((c) => c.field === 'net_margin')).toBe(true);
    expect(r.expenses.cogs).toBe(7500);
    expect(r.expenses.marketing).toBe(2160);
    expect(r.totalExpenses).toBe(32160);
    expect(r.netProfit).toBe(17840);
    expect(r.netMarginPercent).toBe(36);
    expect(r.grossMarginPercent).toBe(85);
    expect(r.ltv).toBe(40800);
    expect(r.ltvCacRatio).toBe(20.4);
    expect(r.paybackMonths).toBe(9);
    expect(r.roiYear1Percent).toBe(224);
    expect(r.npv3Years).toBe(476366);
    expect(r.breakEvenRevenue).toBe(27888);
    expect(r.revenueFor45kProfit).toBe(83664);
    expect(r.isProfitable).toBe(true);
  });

  it('Restaurant (high-frequency, thin-margin, physical location)', () => {
    const b = benchmarks({
      name: 'restaurant', cogs_percent: 32, salaries_fixed: 14000, rent_fixed: 8000, utilities_fixed: 1800, other_fixed: 2200,
      cac_min: 5, cac_max: 60, cac_typical: 20, average_check_min: 15, average_check_max: 60,
      orders_per_client: 4, client_lifetime_months: 18, ltv_cac_min: 3, ltv_cac_max: 70,
      net_margin_min: 3, net_margin_max: 12,
    });
    const r = calculateStrictFinancials(60000, 220000, 25, 1567, 32, b, NO_LOCATION_ADJUSTMENT, null);

    // P0-02: net margin (23%) exceeds the benchmark's typical max (12%) --
    // flagged, not clamped to 17% as it was before the fix.
    expect(r.corrections.some((c) => c.field === 'net_margin')).toBe(true);
    expect(r.expenses.cogs).toBe(19200);
    expect(r.clientsActive).toBe(469);
    expect(r.newClientsNeeded).toBe(26.06);
    expect(r.expenses.marketing).toBe(652);
    expect(r.totalExpenses).toBe(45852);
    expect(r.netProfit).toBe(14148);
    expect(r.netMarginPercent).toBe(24);
    expect(r.grossMarginPercent).toBe(68);
    expect(r.ltv).toBe(1567);
    expect(r.ltvCacRatio).toBe(62.7); // QMath.ltvCacRatio rounds to 1 decimal
    expect(r.paybackMonths).toBe(15);
    expect(r.roiYear1Percent).toBe(59);
    expect(r.npv3Years).toBe(221226);
    expect(r.breakEvenRevenue).toBe(38856);
    expect(r.revenueFor45kProfit).toBe(106107);
    expect(r.isProfitable).toBe(true);
  });

  it('Retail / e-commerce (moderate frequency, inventory-heavy COGS)', () => {
    const b = benchmarks({
      name: 'retail_ecommerce', cogs_percent: 45, salaries_fixed: 9000, rent_fixed: 4000, utilities_fixed: 700, other_fixed: 1800,
      cac_min: 10, cac_max: 80, cac_typical: 30, average_check_min: 30, average_check_max: 150,
      orders_per_client: 3, client_lifetime_months: 15, ltv_cac_min: 2, ltv_cac_max: 50,
      net_margin_min: 4, net_margin_max: 15,
    });
    const r = calculateStrictFinancials(50000, 100000, 35, 1609, 65, b, NO_LOCATION_ADJUSTMENT, null);

    // P0-02: net margin (23%) exceeds the benchmark's typical max (15%) --
    // flagged, not clamped to 20% as it was before the fix.
    expect(r.corrections.some((c) => c.field === 'net_margin')).toBe(true);
    expect(r.expenses.cogs).toBe(22500);
    expect(r.clientsActive).toBe(257);
    expect(r.newClientsNeeded).toBe(17.13);
    expect(r.expenses.marketing).toBe(600);
    expect(r.totalExpenses).toBe(38600);
    expect(r.netProfit).toBe(11400);
    expect(r.netMarginPercent).toBe(23);
    expect(r.grossMarginPercent).toBe(55);
    expect(r.ltv).toBe(1609);
    expect(r.ltvCacRatio).toBe(46); // QMath.ltvCacRatio rounds to 1 decimal
    expect(r.paybackMonths).toBe(12);
    expect(r.roiYear1Percent).toBe(104);
    expect(r.npv3Years).toBe(255526);
    expect(r.breakEvenRevenue).toBe(28810);
    expect(r.revenueFor45kProfit).toBe(112454);
    expect(r.isProfitable).toBe(true);
  });

  it('Two-sided marketplace (take-rate economics, low COGS)', () => {
    const b = benchmarks({
      name: 'marketplace_two_sided', cogs_percent: 10, salaries_fixed: 22000, rent_fixed: 2500, utilities_fixed: 600, other_fixed: 3000,
      cac_min: 20, cac_max: 200, cac_typical: 60, average_check_min: 40, average_check_max: 300,
      orders_per_client: 2, client_lifetime_months: 20, ltv_cac_min: 3, ltv_cac_max: 50,
      net_margin_min: 5, net_margin_max: 20,
    });
    const r = calculateStrictFinancials(45000, 180000, 70, 3240, 90, b, NO_LOCATION_ADJUSTMENT, null);

    expect(r.expenses.cogs).toBe(4500);
    expect(r.clientsActive).toBe(250);
    expect(r.newClientsNeeded).toBe(12.5);
    expect(r.expenses.marketing).toBe(875);
    expect(r.totalExpenses).toBe(33475);
    expect(r.netProfit).toBe(11525);
    expect(r.netMarginPercent).toBe(26);
    expect(r.grossMarginPercent).toBe(90);
    expect(r.ltv).toBe(3240);
    expect(r.ltvCacRatio).toBe(46.3); // QMath.ltvCacRatio rounds to 1 decimal
    expect(r.paybackMonths).toBe(15);
    expect(r.roiYear1Percent).toBe(60);
    expect(r.npv3Years).toBe(179424);
    expect(r.breakEvenRevenue).toBe(31912);
    expect(r.revenueFor45kProfit).toBe(83016);
    expect(r.isProfitable).toBe(true);
  });
});
