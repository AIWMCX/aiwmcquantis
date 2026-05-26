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
 * Derive the three price bands. Semantics (matches industry convention):
 *
 *   aggressive = LOWEST price, thin margin, "win the bid"
 *                cost_p50 / (1 - τ/2)
 *   balanced   = TARGET-margin price at a p75 cost realization (recommended)
 *                cost_p75 / (1 - τ)
 *   defensive  = HIGHEST price, extra safety buffer
 *                cost_p95 / (1 - min(τ * 1.5, 0.60))
 *
 * Monotonic ordering is then enforced: aggressive < balanced < defensive,
 * with small minimum spreads so the three tiers always read distinctly.
 *
 * `margin_pct` on the returned band is a DECIMAL fraction (0.22 = 22%),
 * not a percentage value. UI multiplies by 100 for display.
 */
export function derivePriceBands(
  baselineCost: number,
  pricing: PricingProfile,
  costPercentile: (p: number) => number,
  winProbability: (price: number) => number,
): { aggressive: PriceBand; balanced: PriceBand; defensive: PriceBand } {
  const target = pct(pricing.target_margin_pct);
  const aggMarginCap = Math.max(0, target / 2);              // half of target
  const defMarginCap = Math.min(0.6, target * 1.5);          // 1.5× target, capped 60%

  const safeDivide = (numerator: number, marginDec: number, fallback: number): number => {
    const denom = QM.toNumber(QM.subtract(1, marginDec), 6);
    if (denom <= 0) return fallback;
    return QM.toNumber(QM.divide(numerator, denom), 2);
  };

  const cost50 = costPercentile(50);
  const cost75 = costPercentile(75);
  const cost95 = costPercentile(95);

  let aggressivePrice = safeDivide(cost50, aggMarginCap, cost50);
  let balancedPrice = safeDivide(cost75, target, cost75);
  let defensivePrice = safeDivide(cost95, defMarginCap, cost95);

  // Enforce monotonic ordering: aggressive ≤ balanced ≤ defensive,
  // with at least a 2% / 3% spread so the tiers are visually distinct.
  balancedPrice = Math.max(balancedPrice, aggressivePrice * 1.02);
  defensivePrice = Math.max(defensivePrice, balancedPrice * 1.03);
  aggressivePrice = Math.min(aggressivePrice, balancedPrice);

  const band = (label: string, price: number): PriceBand => {
    const rounded = QM.toNumber(QM.from(price), 2);
    return {
      label,
      price: rounded,
      // Decimal fraction (0.22 = 22%). Hard-clamped to [-0.99, 0.95] for sanity.
      margin_pct: clamp(marginAt(rounded, baselineCost), -0.99, 0.95),
      win_probability: QM.toNumber(QM.from(winProbability(rounded)), 4),
    };
  };

  return {
    aggressive: band('aggressive', aggressivePrice),
    balanced: band('balanced', balancedPrice),
    defensive: band('defensive', defensivePrice),
  };
}
