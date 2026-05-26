/**
 * Service Job Quoting — pricing math.
 * Pure, no I/O. All financial arithmetic goes through QuantisMath.
 *
 * Convention: PricingProfile percentages are stored as whole-number percent
 * (e.g. 22 = 22%). `pct()` normalizes to decimal fraction; values <= 1 are
 * treated as already-decimal to be forgiving.
 *
 * Labor-context multipliers (additive premiums, hard-capped):
 *   emergency    +0.50  (urgent same-day callout)
 *   after_hours  +0.25  (weeknight, outside 8a–6p)
 *   weekend      +0.40  (Sat/Sun)
 *   total premium clamped to [1.0, MAX_LABOR_PREMIUM] (= 2.5×)
 *
 * Site-context multiplier (access × height), each clamped to [1.0, 1.5],
 * combined clamped to MAX_SITE_PREMIUM (= 1.8×). Difficulty per scope item is
 * additionally clamped to [0.5, 2.0] in the calculator before any multiplication.
 */

import { QuantisMath as QM } from '@/lib/quantis-math';
import type { PricingProfile, JobModifiers, PriceBand } from './types';

/** Additive labor premiums (applied as 1 + Σ premium, capped). */
export const LABOR_PREMIUMS = {
  emergency: 0.5,
  after_hours: 0.25,
  weekend: 0.4,
} as const;

/** Legacy multiplier export (kept for back-compat in any external test); these
 *  are now reference labels only — the math uses LABOR_PREMIUMS above. */
export const LABOR_MULTIPLIERS = {
  emergency: 1 + LABOR_PREMIUMS.emergency,
  after_hours: 1 + LABOR_PREMIUMS.after_hours,
  weekend: 1 + LABOR_PREMIUMS.weekend,
} as const;

export const MAX_LABOR_PREMIUM = 2.5;
export const MAX_SITE_PREMIUM = 1.8;
export const SITE_CLAMP_MIN = 1.0;
export const SITE_CLAMP_MAX = 1.5;

/** Normalize a percent value: 22 -> 0.22, 0.22 -> 0.22. Clamps to [0, 0.95]. */
export function pct(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const decimal = value > 1 ? value / 100 : value;
  return Math.min(0.95, decimal);
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Combined labor-context premium multiplier from modifiers.
 * Additive premiums, capped at MAX_LABOR_PREMIUM. Always >= 1.0.
 *
 * Example: emergency + after_hours + weekend
 *   = min(1 + 0.5 + 0.25 + 0.4, 2.5) = 2.15×   (was 2.625× under multiplicative)
 */
export function laborContextMultiplier(modifiers: JobModifiers): number {
  let premium = 0;
  if (modifiers.emergency) premium += LABOR_PREMIUMS.emergency;
  if (modifiers.after_hours) premium += LABOR_PREMIUMS.after_hours;
  if (modifiers.weekend) premium += LABOR_PREMIUMS.weekend;
  const total = 1 + premium;
  return Math.min(MAX_LABOR_PREMIUM, Math.max(1, total));
}

/**
 * Site-context multiplier from access & height sliders.
 * Each clamped to [1.0, 1.5]; their product is capped at MAX_SITE_PREMIUM.
 * Returns 1.0 when both are at baseline. Applied to labor hours only.
 */
export function siteContextMultiplier(modifiers: JobModifiers): number {
  const access = clamp(Number(modifiers.access_difficulty ?? 1), SITE_CLAMP_MIN, SITE_CLAMP_MAX);
  const height = clamp(Number(modifiers.height_factor ?? 1), SITE_CLAMP_MIN, SITE_CLAMP_MAX);
  return Math.min(MAX_SITE_PREMIUM, access * height);
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
