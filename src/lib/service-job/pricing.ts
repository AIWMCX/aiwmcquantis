/**
 * Service Job Quoting — pricing math.
 * Pure, no I/O. All financial arithmetic goes through QuantisMath.
 *
 * Convention: PricingProfile percentages are stored as whole-number percent
 * (e.g. 22 = 22%). `pct()` normalizes to decimal fraction; values <= 1 are
 * treated as already-decimal to be forgiving.
 *
 * Labor-context multipliers (per Prompt 2, Step 3 — all configurable):
 *   emergency    1.5x   (urgent same-day callout)
 *   after_hours  1.25x  (weeknight, outside 8a–6p)
 *   weekend      1.4x   (Sat/Sun)
 * Compounded multiplicatively when more than one applies.
 */

import { QuantisMath as QM } from '@/lib/quantis-math';
import type { PricingProfile, JobModifiers, PriceBand } from './types';

export const LABOR_MULTIPLIERS = {
  emergency: 1.5,
  after_hours: 1.25,
  weekend: 1.4,
} as const;

/** Normalize a percent value: 22 -> 0.22, 0.22 -> 0.22. Clamps to [0, 0.95]. */
export function pct(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const decimal = value > 1 ? value / 100 : value;
  return Math.min(0.95, decimal);
}

/** Combined labor-context multiplier from modifiers. Always >= 1.0. */
export function laborContextMultiplier(modifiers: JobModifiers): number {
  let m = 1;
  if (modifiers.emergency) m *= LABOR_MULTIPLIERS.emergency;
  if (modifiers.after_hours) m *= LABOR_MULTIPLIERS.after_hours;
  if (modifiers.weekend) m *= LABOR_MULTIPLIERS.weekend;
  return m;
}

/**
 * baseline_price = total_cost / (1 - target_margin_pct)
 * Returns total_cost itself when target_margin >= ~1 (defensive guard).
 */
export function priceFromCost(totalCost: number, targetMarginPct: number): number {
  const m = pct(targetMarginPct);
  const denom = QM.subtract(1, m);
  if (QM.toNumber(denom, 6) <= 0) return QM.toNumber(QM.from(totalCost), 2);
  return QM.toNumber(QM.divide(totalCost, denom), 2);
}

/** Realized margin given a price and a cost. */
export function marginAt(price: number, cost: number): number {
  if (price <= 0) return 0;
  return QM.toNumber(QM.divide(QM.subtract(price, cost), price), 6);
}

/**
 * Apply overhead pct to a sub-total (labor + materials + subs/fees).
 * overhead = subtotal * overhead_pct (returns the overhead amount only).
 */
export function overheadAmount(subtotal: number, overheadPct: number): number {
  return QM.toNumber(QM.multiply(subtotal, pct(overheadPct)), 2);
}

/**
 * Solve for the price band that satisfies a target probability constraint.
 *
 *  - aggressive: at price such that P(margin < target) == 0.25
 *    Equivalently: price * (1 - target) == cost_p75, so price = cost_p75 / (1 - target)
 *  - balanced:   at price such that P(margin < target) == 0.10
 *    price = cost_p90 / (1 - target)
 *  - defensive:  at price such that P(loss) == 0.02
 *    price = cost_p98 (cost percentile directly)
 *
 * `costPercentile(p)` accepts p in [0,100] and returns the cost at that quantile.
 */
export function derivePriceBands(
  baselineCost: number,
  pricing: PricingProfile,
  costPercentile: (p: number) => number,
  winProbability: (price: number) => number,
): { aggressive: PriceBand; balanced: PriceBand; defensive: PriceBand } {
  const target = pct(pricing.target_margin_pct);
  const oneMinusTarget = QM.toNumber(QM.subtract(1, target), 6);

  const aggressivePrice =
    oneMinusTarget > 0
      ? QM.toNumber(QM.divide(costPercentile(75), oneMinusTarget), 2)
      : costPercentile(75);
  const balancedPrice =
    oneMinusTarget > 0
      ? QM.toNumber(QM.divide(costPercentile(90), oneMinusTarget), 2)
      : costPercentile(90);
  const defensivePrice = QM.toNumber(QM.from(costPercentile(98)), 2);

  const band = (label: string, price: number): PriceBand => ({
    label,
    price,
    margin_pct: QM.toNumber(QM.multiply(marginAt(price, baselineCost), 100), 2),
    win_probability: QM.toNumber(QM.from(winProbability(price)), 4),
  });

  return {
    aggressive: band('aggressive', aggressivePrice),
    balanced: band('balanced', balancedPrice),
    defensive: band('defensive', defensivePrice),
  };
}
