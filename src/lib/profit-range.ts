// Monthly profit range for the report (2026-10-23).
//
// The site advertised a "1,000-iteration Monte Carlo" in ~60 places while no
// user-facing flow ran one (src/lib/monte-carlo.ts had no live caller). This
// runs that tested engine on the report's own monthly revenue and costs so
// the claim is true and the assumptions are stated next to the result.

import { runMonteCarlo, type MonteCarloParam, type MonteCarloResult } from '@/lib/monte-carlo';
import { MONTE_CARLO_ITERATIONS } from '@/config/canonical-facts';

/** Same ranges as services/scenario-engine.ts, so there is one definition of "uncertainty". */
export const PROFIT_RANGE_ASSUMPTIONS = {
  revenue: { min: 0.8, max: 1.2 },
  costs: { min: 0.9, max: 1.15 },
} as const;

export function seedFrom(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export interface ProfitRangeInput {
  monthlyRevenue: number;
  monthlyCosts: number;
  /** Stable per analysis, so the same report always shows the same range. */
  seedKey: string;
}

/** Null when the inputs can't support a meaningful range. */
export async function computeProfitRange(input: ProfitRangeInput): Promise<MonteCarloResult | null> {
  const { monthlyRevenue: rev, monthlyCosts: cost } = input;
  if (!Number.isFinite(rev) || !Number.isFinite(cost) || rev < 0 || cost < 0 || (rev === 0 && cost === 0)) return null;
  const params: MonteCarloParam[] = [
    { name: 'revenue', baseValue: rev, minValue: rev * PROFIT_RANGE_ASSUMPTIONS.revenue.min, maxValue: rev * PROFIT_RANGE_ASSUMPTIONS.revenue.max, distribution: 'triangular' },
    { name: 'costs', baseValue: cost, minValue: cost * PROFIT_RANGE_ASSUMPTIONS.costs.min, maxValue: cost * PROFIT_RANGE_ASSUMPTIONS.costs.max, distribution: 'triangular' },
  ];
  return runMonteCarlo({
    iterations: MONTE_CARLO_ITERATIONS,
    params,
    outputFn: (p) => p.revenue - p.costs,
    seed: seedFrom(input.seedKey),
  });
}
