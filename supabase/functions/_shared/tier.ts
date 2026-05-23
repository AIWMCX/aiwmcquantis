/**
 * AIWMC Quantis — Edge-side tier helpers for RVCE fan-out, narrator routing,
 * and per-tier compute caps. Single source of truth — do not duplicate.
 *
 * Locked product decisions (Master Spec):
 *   FREE → 20 RVCE web observations / variable
 *   PLUS → 40 RVCE web observations / variable
 *   PRO  → 100 RVCE web observations / variable
 *
 * Cost ceilings (USD per analysis, used by Phase 2 cost guard):
 *   FREE ≈ $0.03   PLUS ≈ $0.12   PRO ≈ $0.40
 */

import { planToTier, type Tier } from './tier-spec.ts';

export type { Tier };
export { planToTier };

/** Per-variable web-observation cap for RVCE fan-out. */
export const RVCE_OBS_CAP: Record<Tier, number> = {
  FREE: 20,
  PLUS: 40,
  PRO: 100,
};

/** Hard cost ceiling per analysis (USD). Phase 2 uses this for the cost guard. */
export const COST_CEILING_USD: Record<Tier, number> = {
  FREE: 0.03,
  PLUS: 0.12,
  PRO: 0.4,
};

/**
 * Concurrency for RVCE DeepSeek fan-out (per analysis).
 * Tuned to stay under DeepSeek per-account rate limits while keeping
 * a Pro analysis (12 vars × 100 obs = 1200 calls) under ~3 minutes wall-clock.
 */
export const RVCE_FANOUT_CONCURRENCY = 8;

/** TTL for rvce_cache rows (ms). Mirrors DB default of 24h. */
export const RVCE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Feature flag — only when true does rvce-validate use the fan-out path. */
export function isRvceFanoutEnabled(): boolean {
  const v = (Deno.env.get('RVCE_FANOUT_ENABLED') ?? 'false').toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/**
 * Resolve the tier for an analysis from any of the inputs we typically have.
 * Order of precedence:
 *   1. explicit `tier_at_creation` (already a canonical FREE/PLUS/PRO string)
 *   2. `plan_id` from a subscription record (free/plus/pro/enterprise)
 *   3. `user_tier` legacy field
 *   4. fallback: FREE
 */
export function getTierForAnalysis(input: {
  tier_at_creation?: string | null;
  plan_id?: string | null;
  user_tier?: string | null;
} | null | undefined): Tier {
  if (!input) return 'FREE';

  const explicit = input.tier_at_creation?.toUpperCase();
  if (explicit === 'FREE' || explicit === 'PLUS' || explicit === 'PRO') {
    return explicit;
  }

  if (input.plan_id) {
    return planToTier(input.plan_id);
  }

  const legacy = input.user_tier?.toUpperCase();
  if (legacy === 'FREE' || legacy === 'PLUS' || legacy === 'PRO') {
    return legacy;
  }

  return 'FREE';
}

/** Build a stable cache key for the rvce_cache table. */
export function buildRvceCacheKey(parts: {
  variable: string;
  business_type?: string | null;
  location?: string | null;
  tier_cap: number;
}): string {
  const norm = (s: string | null | undefined) =>
    (s ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  return [
    parts.variable,
    norm(parts.business_type),
    norm(parts.location),
    `cap${parts.tier_cap}`,
  ].join('|');
}
