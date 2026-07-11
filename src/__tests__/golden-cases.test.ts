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
  it('SaaS B2B (healthy, exercises the B2B enterprise CAC floor)', () => {
    // rawCac=800 is deliberately below the $2,000 B2B enterprise floor the
    // real engine enforces once benchmarks.name contains "saas" (see
    // financial-calculator.ts's B2B_CAC_FLOOR_KEYWORDS check) — this case
    // intentionally exercises that correction rather than avoiding it.
    // averageCheck is tuned high enough that the business is still healthy
    // once CAC is corrected up to $2,000.
    const b = benchmarks({
      name: 'saas_b2b', cogs_percent: 20, salaries_fixed: 12000, rent_fixed: 2000, utilities_fixed: 500, other_fixed: 1500,
      cac_min: 300, cac_max: 3000, cac_typical: 800, average_check_min: 50, average_check_max: 500,
      orders_per_client: 1, client_lifetime_months: 24, ltv_cac_min: 3, ltv_cac_max: 6,
      net_margin_min: 10, net_margin_max: 30,
    });
    const r = calculateStrictFinancials(50000, 150000, 800, 8640, 450, b, NO_LOCATION_ADJUSTMENT, null);

    expect(r.mrr).toBe(50000);
    expect(r.expenses.cogs).toBe(10000);
    expect(r.cac).toBe(2000); // corrected up from rawCac=800 by the B2B floor
    expect(r.corrections.some((c) => c.field === 'cac')).toBe(true);
    expect(r.expenses.marketing).toBe(18000);
    expect(r.totalExpenses).toBe(44000);
    expect(r.netProfit).toBe(6000);
    expect(r.netMarginPercent).toBe(12);
    expect(r.grossProfit).toBe(40000);
    expect(r.grossMarginPercent).toBe(80);
    expect(r.ltv).toBe(8640);
    expect(r.ltvCacRatio).toBe(4.3); // QMath.ltvCacRatio rounds to 1 decimal
    expect(r.paybackMonths).toBe(17);
    expect(r.roiYear1Percent).toBe(27);
    expect(r.npv3Years).toBe(37119);
    expect(r.breakEvenRevenue).toBe(36364);
    expect(r.revenueFor45kProfit).toBe(138636);
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

    expect(r.expenses.cogs).toBe(7500);
    expect(r.expenses.marketing).toBe(4000);
    expect(r.totalExpenses).toBe(35000);
    expect(r.netProfit).toBe(15000);
    expect(r.netMarginPercent).toBe(30);
    expect(r.grossMarginPercent).toBe(85);
    expect(r.ltv).toBe(40800);
    expect(r.ltvCacRatio).toBe(20.4);
    expect(r.paybackMonths).toBe(10);
    expect(r.roiYear1Percent).toBe(182);
    expect(r.npv3Years).toBe(387797);
    expect(r.breakEvenRevenue).toBe(29221);
    expect(r.revenueFor45kProfit).toBe(87662);
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

    expect(r.expenses.cogs).toBe(19200);
    expect(r.clientsActive).toBe(469);
    expect(r.newClientsNeeded).toBe(38);
    expect(r.expenses.marketing).toBe(950);
    expect(r.totalExpenses).toBe(49800);
    expect(r.netProfit).toBe(10200);
    expect(r.netMarginPercent).toBe(17);
    expect(r.grossMarginPercent).toBe(68);
    expect(r.ltv).toBe(1567);
    expect(r.ltvCacRatio).toBe(62.7); // QMath.ltvCacRatio rounds to 1 decimal
    expect(r.paybackMonths).toBe(17);
    expect(r.roiYear1Percent).toBe(38);
    expect(r.npv3Years).toBe(98102);
    expect(r.breakEvenRevenue).toBe(39147);
    expect(r.revenueFor45kProfit).toBe(106901);
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

    expect(r.expenses.cogs).toBe(22500);
    expect(r.clientsActive).toBe(257);
    expect(r.newClientsNeeded).toBe(21);
    expect(r.expenses.marketing).toBe(735);
    expect(r.totalExpenses).toBe(40000);
    expect(r.netProfit).toBe(10000);
    expect(r.netMarginPercent).toBe(20);
    expect(r.grossMarginPercent).toBe(55);
    expect(r.ltv).toBe(1609);
    expect(r.ltvCacRatio).toBe(46); // QMath.ltvCacRatio rounds to 1 decimal
    expect(r.paybackMonths).toBe(13);
    expect(r.roiYear1Percent).toBe(87);
    expect(r.npv3Years).toBe(211865);
    expect(r.breakEvenRevenue).toBe(28956);
    expect(r.revenueFor45kProfit).toBe(113021);
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
    expect(r.newClientsNeeded).toBe(20);
    expect(r.expenses.marketing).toBe(1400);
    expect(r.totalExpenses).toBe(34000);
    expect(r.netProfit).toBe(11000);
    expect(r.netMarginPercent).toBe(24);
    expect(r.grossMarginPercent).toBe(90);
    expect(r.ltv).toBe(3240);
    expect(r.ltvCacRatio).toBe(46.3); // QMath.ltvCacRatio rounds to 1 decimal
    expect(r.paybackMonths).toBe(16);
    expect(r.roiYear1Percent).toBe(57);
    expect(r.npv3Years).toBe(163051);
    expect(r.breakEvenRevenue).toBe(32340);
    expect(r.revenueFor45kProfit).toBe(84130);
    expect(r.isProfitable).toBe(true);
  });
});
