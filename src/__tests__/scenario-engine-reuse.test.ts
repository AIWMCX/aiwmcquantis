/**
 * Golden-case style: proves run-scenario's compute path (apply a delta,
 * then call calculateStrictFinancials) doesn't alter numbers versus calling
 * the engine directly — a zero-delta scenario run must equal the same call
 * made with the frozen base input verbatim.
 */
import { describe, it, expect } from 'vitest';
import { calculateStrictFinancials } from '../../supabase/functions/analyze-business/financial-calculator.ts';
import { applyScenarioDelta } from '../../supabase/functions/_shared/scenario-delta.ts';
import type { IndustryBenchmarks } from '../../supabase/functions/analyze-business/index.ts';
import type { LocationMultiplierResult } from '../../supabase/functions/analyze-business/location-intelligence.ts';

const LOCATION: LocationMultiplierResult = {
  overall: 1, salary: 1, rent: 1, utility: 1, marketing: 1,
  matched: false, matchedCity: null, region: 'default', confidence: 0,
};

const BENCHMARKS: IndustryBenchmarks = {
  id: 'saas', name: 'SaaS / Software',
  cac_min: 50, cac_max: 500, cac_typical: 150,
  average_check_min: 20, average_check_max: 500,
  orders_per_client: 1, client_lifetime_months: 24,
  ltv_cac_min: 3, ltv_cac_max: 8,
  net_margin_min: 15, net_margin_max: 40,
  cogs_percent: 20, salaries_fixed: 8000, rent_fixed: 500, utilities_fixed: 200, other_fixed: 1000,
  keywords: [],
};

const FROZEN_BASE = {
  rawMrr: 20000,
  rawInvestment: 60000,
  rawCac: 150,
  rawLtv: 3600,
  rawAvgCheck: 100,
  userProvidedCosts: undefined as number | undefined,
  userProvidedChurnRate: undefined as number | undefined,
  userProvidedCustomers: undefined as number | undefined,
  locationMultipliers: { ...LOCATION },
};

describe('scenario engine reuse — zero-delta parity', () => {
  it('produces identical output to a direct calculateStrictFinancials call', () => {
    const direct = calculateStrictFinancials(
      FROZEN_BASE.rawMrr,
      FROZEN_BASE.rawInvestment,
      FROZEN_BASE.rawCac,
      FROZEN_BASE.rawLtv,
      FROZEN_BASE.rawAvgCheck,
      BENCHMARKS,
      LOCATION,
      null,
      FROZEN_BASE.userProvidedCosts,
      FROZEN_BASE.userProvidedChurnRate,
      FROZEN_BASE.userProvidedCustomers,
    );

    const effective = applyScenarioDelta(FROZEN_BASE, []);
    const viaScenarioPath = calculateStrictFinancials(
      effective.rawMrr,
      effective.rawInvestment,
      effective.rawCac,
      FROZEN_BASE.rawLtv,
      effective.rawAvgCheck,
      BENCHMARKS,
      effective.locationMultipliers as LocationMultiplierResult,
      null,
      effective.userProvidedCosts,
      effective.userProvidedChurnRate,
      effective.userProvidedCustomers,
    );

    expect(viaScenarioPath).toEqual(direct);
  });

  it('a non-trivial delta changes the numbers in the expected direction', () => {
    const effective = applyScenarioDelta(FROZEN_BASE, [
      { assumption_key: 'cac', operation: 'increase_pct', value: 20 },
    ]);
    const result = calculateStrictFinancials(
      effective.rawMrr,
      effective.rawInvestment,
      effective.rawCac,
      FROZEN_BASE.rawLtv,
      effective.rawAvgCheck,
      BENCHMARKS,
      effective.locationMultipliers as LocationMultiplierResult,
      null,
      effective.userProvidedCosts,
      effective.userProvidedChurnRate,
      effective.userProvidedCustomers,
    );

    expect(effective.rawCac).toBeCloseTo(180, 5);
    // Higher CAC with everything else held constant means worse LTV:CAC.
    expect(result.ltvCacRatio).toBeLessThan(FROZEN_BASE.rawLtv / FROZEN_BASE.rawCac);
  });
});
