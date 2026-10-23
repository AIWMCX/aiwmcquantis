/**
 * Golden Test Vector live-engine runner — 2026-08-02.
 *
 * Closes the accuracy-audit finding that "regression-tested against
 * canonical business archetypes" was not true as a running system:
 * GOLDEN_VECTORS existed as well-structured data, and
 * validateAgainstGoldenVector() existed to check a result against them,
 * but nothing in the codebase ever fed a vector's `inputs` through the
 * real deterministic engine and checked the output. This module is that
 * missing link — a pure function that maps a GoldenVector's loose,
 * archetype-specific inputs onto calculateStrictFinancials' real argument
 * contract and returns a BusinessAnalysisResult-shaped object
 * validateAgainstGoldenVector() can actually check.
 *
 * Per-archetype input mapping (the vectors don't specify this precisely —
 * these are the explicit, documented choices made here):
 *
 * - Subscription-with-churn (arpu + churn + newPerMonth present): steady-
 *   state active customers = newPerMonth / churn (standard SaaS identity:
 *   at equilibrium, new customers = churned customers = active x churn).
 *   rawMrr = activeCustomers x arpu.
 * - Project/flow, no churn (arpu + newPerMonth, no churn field): revenue
 *   is a direct flow, not a customer stock — rawMrr = arpu x newPerMonth
 *   (e.g. a digital agency's "4 clients/mo x $8k/project").
 * - Daily-transaction (dailyCustomers + avgTicket present): rawMrr =
 *   dailyCustomers x avgTicket x 30. Churn/LTV are not meaningful for a
 *   walk-in/one-off-transaction business model, so none of these vectors'
 *   expectedRanges check ltvCac and none is computed from a customer-stock
 *   assumption here.
 *
 * Benchmark fixtures below are REAL rows from the production
 * `industry_benchmarks` table (Supabase project dmlxrvfyqsakyjomsvdj),
 * queried 2026-08-02 — not invented. `food_truck` has no matching row in
 * that (39-row) reference table, so it maps to `restaurant` as the
 * closest real category — disclosed, not silent.
 */
import { calculateStrictFinancials, type StrictFinancialResult } from '../../supabase/functions/analyze-business/financial-calculator.ts';
import { shapeFinancialAnalysis } from '../../supabase/functions/analyze-business/financial-analysis-shape.ts';
import type { GoldenVector } from './golden-test-vectors';

// deno-lint-ignore no-explicit-any
type AnyBenchmarks = any;

/** Real rows from industry_benchmarks, queried 2026-08-02. orders_per_client
 *  is null in that table for every row; defaulted to 1 here (disclosed). */
const REAL_ARCHETYPE_BENCHMARKS: Record<string, AnyBenchmarks> = {
  gym_fitness: {
    id: 'gym_fitness', name: 'Gym & Fitness', cogs_percent: 25, net_margin_min: 10, net_margin_max: 25,
    cac_min: 30, cac_max: 150, cac_typical: 70, average_check_min: 40, average_check_max: 150,
    orders_per_client: 1, client_lifetime_months: 10,
    salaries_fixed: 6000, rent_fixed: 4000, utilities_fixed: 800, other_fixed: 1000,
  },
  cafe_bakery: {
    id: 'cafe_bakery', name: 'Cafe & Bakery', cogs_percent: 30, net_margin_min: 5, net_margin_max: 15,
    cac_min: 5, cac_max: 20, cac_typical: 10, average_check_min: 8, average_check_max: 25,
    orders_per_client: 1, client_lifetime_months: 10,
    salaries_fixed: 5000, rent_fixed: 2500, utilities_fixed: 600, other_fixed: 1000,
  },
  saas_startup: {
    id: 'saas_startup', name: 'SaaS Startup', cogs_percent: 20, net_margin_min: 10, net_margin_max: 25,
    cac_min: 100, cac_max: 500, cac_typical: 200, average_check_min: 50, average_check_max: 500,
    orders_per_client: 1, client_lifetime_months: 24,
    salaries_fixed: 10000, rent_fixed: 500, utilities_fixed: 200, other_fixed: 1500,
  },
  b2b_saas: {
    id: 'b2b_saas', name: 'B2B SaaS', cogs_percent: 18, net_margin_min: 12, net_margin_max: 28,
    cac_min: 150, cac_max: 600, cac_typical: 300, average_check_min: 100, average_check_max: 1000,
    orders_per_client: 1, client_lifetime_months: 30,
    salaries_fixed: 12000, rent_fixed: 600, utilities_fixed: 200, other_fixed: 2000,
  },
  restaurant: {
    id: 'restaurant', name: 'Restaurant', cogs_percent: 35, net_margin_min: 3, net_margin_max: 12,
    cac_min: 8, cac_max: 30, cac_typical: 15, average_check_min: 15, average_check_max: 50,
    orders_per_client: 1, client_lifetime_months: 8,
    salaries_fixed: 8000, rent_fixed: 3500, utilities_fixed: 800, other_fixed: 1500,
  },
  ecommerce_retail: {
    id: 'ecommerce_retail', name: 'E-commerce Retail', cogs_percent: 55, net_margin_min: 5, net_margin_max: 15,
    cac_min: 15, cac_max: 80, cac_typical: 35, average_check_min: 30, average_check_max: 150,
    orders_per_client: 1, client_lifetime_months: 12,
    salaries_fixed: 4000, rent_fixed: 1500, utilities_fixed: 300, other_fixed: 1000,
  },
  dropshipping: {
    id: 'dropshipping', name: 'Dropshipping', cogs_percent: 65, net_margin_min: 3, net_margin_max: 12,
    cac_min: 10, cac_max: 50, cac_typical: 25, average_check_min: 25, average_check_max: 100,
    orders_per_client: 1, client_lifetime_months: 8,
    salaries_fixed: 2000, rent_fixed: 500, utilities_fixed: 100, other_fixed: 500,
  },
  agency: {
    id: 'agency', name: 'Digital Agency', cogs_percent: 30, net_margin_min: 15, net_margin_max: 35,
    cac_min: 200, cac_max: 1500, cac_typical: 600, average_check_min: 1000, average_check_max: 10000,
    orders_per_client: 1, client_lifetime_months: 18,
    salaries_fixed: 15000, rent_fixed: 2000, utilities_fixed: 300, other_fixed: 1500,
  },
};

/** Maps a GoldenVector's businessType to the real industry_benchmarks row to use. */
const VECTOR_BUSINESS_TYPE_TO_BENCHMARK: Record<string, string> = {
  fitness_boutique: 'gym_fitness',
  coffee_shop: 'cafe_bakery',
  saas: 'saas_startup',
  restaurant: 'restaurant',
  food_truck: 'restaurant', // no real row for food_truck; closest real category
  ecommerce: 'ecommerce_retail',
  consulting: 'agency',
};

const REAL_LOCATION_MULTIPLIERS: AnyBenchmarks = {
  rent: 1, salary: 1, utility: 1, marketing: 1, overall: 1, confidence: 50, region: 'global', matched: false, matchedCity: null,
};

export interface GoldenVectorEngineResult {
  financial_analysis: ReturnType<typeof shapeFinancialAnalysis>['financialAnalysis'];
  calc: StrictFinancialResult;
}

/** Maps a vector's loose per-archetype inputs onto real engine arguments. */
export function runVectorThroughEngine(vector: GoldenVector): GoldenVectorEngineResult {
  const benchmarkKey = VECTOR_BUSINESS_TYPE_TO_BENCHMARK[vector.businessType];
  const benchmarks = benchmarkKey ? REAL_ARCHETYPE_BENCHMARKS[benchmarkKey] : undefined;
  if (!benchmarks) {
    throw new Error(`No real benchmark fixture mapped for businessType "${vector.businessType}" (vector ${vector.vectorCode})`);
  }

  const { arpu, churn, newPerMonth, opex, cac, capital, dailyCustomers, avgTicket, monthlyOpex } = vector.inputs;

  let rawMrr: number;
  let userProvidedCustomers: number | undefined;
  let userProvidedChurnRate: number | undefined;
  let rawAvgCheck: number;
  let userProvidedCosts: number | undefined;

  if (dailyCustomers !== undefined && avgTicket !== undefined) {
    // Daily-transaction archetype (coffee, restaurant, food truck).
    rawMrr = dailyCustomers * avgTicket * 30;
    userProvidedCustomers = Math.round(dailyCustomers * 30);
    rawAvgCheck = avgTicket;
    userProvidedCosts = monthlyOpex;
  } else if (arpu !== undefined && newPerMonth !== undefined && churn !== undefined) {
    // Subscription-with-churn archetype (fitness, saas).
    const activeCustomers = newPerMonth / churn;
    rawMrr = activeCustomers * arpu;
    userProvidedCustomers = Math.round(activeCustomers);
    // Vectors store churn as a fraction (0.05); calculateStrictFinancials takes
    // a PERCENT like every production caller (#289), so convert here.
    userProvidedChurnRate = churn * 100;
    rawAvgCheck = arpu;
    userProvidedCosts = opex;
  } else if (arpu !== undefined && newPerMonth !== undefined) {
    // Project/flow archetype, no churn concept (agency, dropshipping).
    rawMrr = arpu * newPerMonth;
    userProvidedCustomers = newPerMonth;
    rawAvgCheck = arpu;
    userProvidedCosts = opex;
  } else {
    throw new Error(`Vector ${vector.vectorCode} has an input shape this runner doesn't recognize`);
  }

  const rawInvestment = capital ?? 0;
  const rawCac = cac ?? benchmarks.cac_typical;
  const rawLtv = rawAvgCheck * benchmarks.client_lifetime_months;

  const calc = calculateStrictFinancials(
    rawMrr, rawInvestment, rawCac, rawLtv, rawAvgCheck,
    benchmarks, REAL_LOCATION_MULTIPLIERS as AnyBenchmarks, null,
    userProvidedCosts, userProvidedChurnRate, userProvidedCustomers,
  );

  const { financialAnalysis } = shapeFinancialAnalysis(calc, benchmarks, console);

  return { financial_analysis: financialAnalysis, calc };
}
