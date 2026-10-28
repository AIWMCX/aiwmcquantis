/**
 * How the report talks about LTV:CAC. One place, so no template calls an
 * implausible ratio "healthy".
 *
 * Live 2026-10-26: a grooming-van run printed "LTV:CAC 79.3x indicates healthy
 * unit economics". Above ~20x the ratio almost always means CAC was understated
 * (same threshold as bulletproof-validator's UNREALISTIC_LTV_CAC rule).
 * Pure module: vitest imports it.
 */

/** Above this, the ratio is treated as an input problem, not a strength. */
export const LTV_CAC_IMPLAUSIBLE = 20;
/** The usual "healthy" floor. */
export const LTV_CAC_HEALTHY_MIN = 3;

export type LtvCacReading = 'not_computable' | 'implausible' | 'healthy' | 'weak';

export function ltvCacReading(ratio: number): LtvCacReading {
  if (!Number.isFinite(ratio) || ratio <= 0) return 'not_computable';
  if (ratio > LTV_CAC_IMPLAUSIBLE) return 'implausible';
  if (ratio >= LTV_CAC_HEALTHY_MIN) return 'healthy';
  return 'weak';
}

/** Completes "The LTV:CAC ratio of Nx …". */
export function ltvCacPhrase(ratio: number): string {
  switch (ltvCacReading(ratio)) {
    case 'not_computable': return 'cannot be judged because acquisition cost is zero or missing';
    case 'implausible': return 'is far above what businesses usually achieve, which usually means the acquisition cost is understated; check CAC before relying on it';
    case 'healthy': return 'indicates healthy unit economics';
    default: return 'suggests customer acquisition costs need optimization';
  }
}

/** Short status label for the narrator prompt. */
export function ltvCacStatusLabel(ratio: number): string {
  switch (ltvCacReading(ratio)) {
    case 'implausible': return '⚠️ IMPLAUSIBLY HIGH (likely understated CAC; do not call it healthy)';
    case 'healthy': return '✅ HEALTHY';
    case 'not_computable': return '⚠️ NOT COMPUTABLE (no CAC)';
    default: return '⚠️ NEEDS IMPROVEMENT';
  }
}
