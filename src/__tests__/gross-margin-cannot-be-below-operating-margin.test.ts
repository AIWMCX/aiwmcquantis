/**
 * Regression test for the live financial-invariant-sweep finding
 * (2026-09-14): 5 production analyses flagged OPERATING_PROFIT_EXCEEDS_
 * GROSS_PROFIT, all from the same root cause and all sharing one exact
 * reproduction shape.
 *
 * Root cause: `cogs` is a pure industry-benchmark estimate
 * (mrr * cogs_percent / 100), computed independently of `userProvidedCosts`.
 * When a user's own reported total monthly costs come in below that
 * benchmark-implied COGS alone, grossProfit (mrr - cogs) ends up smaller
 * than netProfit (mrr - totalExpenses) -- and since this engine sets
 * operatingMargin = netMargin (no separate opex layer), gross margin comes
 * out lower than operating margin, an accounting impossibility.
 *
 * Fixed in financial-calculator.ts by capping the COGS value fed to the
 * gross-margin calculation (both the local grossProfit/grossMarginPercent
 * and the cogs argument to calculateProfitabilityMargins) at totalExpenses
 * whenever it would otherwise exceed it -- while leaving the raw
 * benchmark-derived `cogs` untouched everywhere else (expenses.cogs
 * breakdown, marketing reconciliation), and recording a `corrections[]`
 * entry so the discrepancy stays visible rather than silently vanishing.
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

describe('gross margin can never come out below operating margin (2026-09-14 invariant-sweep fix)', () => {
  it('caps effective COGS when the benchmark-implied COGS exceeds the users own reported total costs', () => {
    // Exact reproduction of the 5 live-flagged analyses: mrr=28000,
    // cogs_percent=50 (-> benchmark cogs=14000), user-reported total
    // monthly costs=12700 -- less than the benchmark COGS alone.
    const b = benchmarks({
      name: 'invariant_repro',
      cogs_percent: 50, salaries_fixed: 9200, rent_fixed: 780, utilities_fixed: 200, other_fixed: 1200,
    });

    const result = calculateStrictFinancials(
      28000, 68000, 17, 1300, 325,
      b, NO_LOCATION_ADJUSTMENT, null,
      12700, 0.13, 86,
    );

    // The actual invariant the production sweep enforces.
    expect(Number(result.profitabilityMargins.operatingMargin.value))
      .toBeLessThanOrEqual(Number(result.profitabilityMargins.grossMargin.value));

    // Both should have collapsed to the same value here, since totalExpenses
    // (12700) becomes the effective COGS ceiling and operatingIncome ==
    // netIncome == mrr - totalExpenses in this engine.
    expect(result.grossProfit).toBe(result.netProfit);
    expect(result.grossMarginPercent).toBe(result.netMarginPercent);

    // The correction must be recorded, not silently applied.
    const correction = result.corrections.find((c) => c.field === 'gross_margin_cogs');
    expect(correction).toBeDefined();
    expect(correction!.original).toBe(14000); // the raw benchmark COGS
    expect(correction!.corrected).toBe(12700); // capped at totalExpenses

    // The raw benchmark COGS must stay visible in the expense breakdown --
    // this fix must not silently rewrite the transparent, auditable figure,
    // only protect the two margin outputs from becoming inconsistent.
    expect(result.expenses.cogs).toBe(14000);
  });

  it('does not cap or add a correction when COGS is already within the users reported total costs', () => {
    const b = benchmarks({
      name: 'invariant_no_repro',
      cogs_percent: 20, salaries_fixed: 2000, rent_fixed: 500, utilities_fixed: 100, other_fixed: 200,
    });

    // mrr=10000 -> benchmark cogs=2000. userProvidedCosts=6000, comfortably
    // above cogs alone -- the normal, non-contradictory case.
    const result = calculateStrictFinancials(
      10000, 20000, 50, 2000, 200,
      b, NO_LOCATION_ADJUSTMENT, null,
      6000, 0.05, 50,
    );

    expect(result.corrections.find((c) => c.field === 'gross_margin_cogs')).toBeUndefined();
    expect(result.grossProfit).toBe(10000 - 2000);
    expect(Number(result.profitabilityMargins.operatingMargin.value))
      .toBeLessThanOrEqual(Number(result.profitabilityMargins.grossMargin.value));
  });

  it('does not apply the cap in the calculated (non-user-provided) expense path', () => {
    // expenseSource === 'calculated' path: totalExpenses = cogs + fixedCosts
    // + marketing, so cogs can never exceed totalExpenses by construction --
    // the cap must only engage for expenseSource === 'user'.
    const b = benchmarks({
      name: 'invariant_calculated_path',
      cogs_percent: 90, salaries_fixed: 100, rent_fixed: 0, utilities_fixed: 0, other_fixed: 0,
    });

    const result = calculateStrictFinancials(
      10000, 20000, 50, 2000, 200,
      b, NO_LOCATION_ADJUSTMENT, null,
      undefined, 0.05, 50,
    );

    expect(result.expenseSource).toBe('calculated');
    expect(result.corrections.find((c) => c.field === 'gross_margin_cogs')).toBeUndefined();
  });
});
