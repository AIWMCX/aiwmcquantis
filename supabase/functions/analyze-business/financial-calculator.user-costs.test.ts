/**
 * Regression: user-provided monthly costs must reconcile every itemized
 * cost, so profit, break-even (legacy and CVP) and the expense breakdown all
 * use one cost basis. Numbers replay production report 08d75e2a
 * (2026-09-27): MRR $1,639, price $149, COGS 50%, benchmark fixed costs
 * $11,965, user-reported total $4,650. Before the fix the breakdown summed
 * to $12,785, break-even used $11,965 of fixed costs, and profit used $4,650.
 *
 * Run: deno test --allow-env supabase/functions/analyze-business/financial-calculator.user-costs.test.ts
 */
import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { calculateStrictFinancials } from "./financial-calculator.ts";
import type { IndustryBenchmarks } from "./index.ts";
import type { LocationMultiplierResult } from "./location-intelligence.ts";

const saas: IndustryBenchmarks = {
  id: "saas",
  name: "SaaS / Software",
  cogs_percent: 50,
  salaries_fixed: 9200,
  rent_fixed: 1295,
  utilities_fixed: 220,
  other_fixed: 1250,
  cac_min: 150,
  cac_max: 400,
  cac_typical: 279,
  average_check_min: 50,
  average_check_max: 500,
  orders_per_client: 1,
  client_lifetime_months: 8,
  ltv_cac_min: 1,
  ltv_cac_max: 5,
  net_margin_min: -50,
  net_margin_max: 40,
  keywords: [],
};

const noLocation: LocationMultiplierResult = {
  overall: 1, salary: 1, rent: 1, utility: 1, marketing: 1,
  matched: false, matchedCity: null, region: "US", confidence: 0,
};

function sumItems(e: { cogs: number; salaries: number; rent: number; utilities: number; marketing: number; other: number }) {
  return e.cogs + e.salaries + e.rent + e.utilities + e.marketing + e.other;
}

Deno.test("user total below benchmark items: breakdown sums exactly to the user's total", () => {
  const r = calculateStrictFinancials(1639, 14800, 279, 596, 149, saas, noLocation, null, 4650, undefined, 11);
  assertEquals(r.expenseSource, "user");
  assertEquals(r.totalExpenses, 4650);
  assertEquals(sumItems(r.expenses), 4650);
  assertEquals(r.netProfit, 1639 - 4650);
});

Deno.test("user total below benchmark items: legacy and CVP break-even share the reconciled cost basis", () => {
  const r = calculateStrictFinancials(1639, 14800, 279, 596, 149, saas, noLocation, null, 4650, undefined, 11);
  const fixed = r.expenses.salaries + r.expenses.rent + r.expenses.utilities + r.expenses.other;
  const variable = r.expenses.cogs + r.expenses.marketing;
  assert(fixed < 4650, `fixed costs ${fixed} must be within the user's total`);
  const expected = fixed / (1 - variable / 1639);
  assert(Math.abs(r.breakEvenRevenue - expected) <= 2, `legacy ${r.breakEvenRevenue} vs expected ${expected}`);
  assertEquals(r.cvp.breakEven.status, "VALUE");
  const cvpRevenue = Number(r.cvp.breakEven.breakEvenRevenue);
  assert(Math.abs(cvpRevenue - r.breakEvenRevenue) <= Math.max(2, r.breakEvenRevenue * 0.01),
    `CVP ${cvpRevenue} and legacy ${r.breakEvenRevenue} must agree`);
  // The pre-fix figures were $36,282 (legacy) and $23,945 (CVP); both were
  // built on $11,965 of benchmark fixed costs the user never reported.
  assert(r.breakEvenRevenue < 10000, `break-even ${r.breakEvenRevenue} must reflect the user's costs`);
});

Deno.test("user total above benchmark items: scales up, still exact", () => {
  const r = calculateStrictFinancials(1639, 14800, 279, 596, 149, saas, noLocation, null, 20000, undefined, 11);
  assertEquals(sumItems(r.expenses), 20000);
  assertEquals(r.totalExpenses, 20000);
});

Deno.test("no user total: itemized benchmark path unchanged", () => {
  const r = calculateStrictFinancials(1639, 14800, 279, 596, 149, saas, noLocation, null, undefined, undefined, 11);
  assertEquals(r.expenseSource, "calculated");
  assertEquals(r.totalExpenses, sumItems(r.expenses));
  assertEquals(r.expenses.salaries, 9200);
  assertEquals(r.expenses.rent, 1295);
});
