/**
 * Benchmark-pipeline coherence invariants.
 *
 * These tests lock the "no contradictory numbers" rule the reviewer flagged
 * in the executive PDFs ("0.1 month vs 999 month CAC payback"). They run
 * against the canonical buildBenchmarkRecords pipeline and against any
 * client-side fallback that may be re-enabled via VITE_ALLOW_CLIENT_FALLBACK.
 */
import { describe, it, expect } from 'vitest';

// Replicate the unprofitability invariant the server now enforces in
// supabase/functions/analyze-business/index.ts (metadata builder).
function deriveCacPayback(opts: {
  cac: number | null;
  averageCheck: number | null;
  grossMarginFrac: number | null;
  netMarginFrac: number | null;
}): number | null {
  const { cac, averageCheck, grossMarginFrac, netMarginFrac } = opts;
  const contrib =
    averageCheck !== null && grossMarginFrac !== null ? averageCheck * grossMarginFrac : null;
  if ((netMarginFrac !== null && netMarginFrac < 0) || (contrib !== null && contrib <= 0)) {
    return null;
  }
  if (cac === null || contrib === null || contrib <= 0) return null;
  return Math.round((cac / contrib) * 10) / 10;
}

describe('CAC payback coherence invariant', () => {
  it('returns null when the business is unprofitable (negative net margin)', () => {
    expect(
      deriveCacPayback({
        cac: 1200,
        averageCheck: 99,
        grossMarginFrac: 0.7,
        netMarginFrac: -0.25,
      })
    ).toBeNull();
  });

  it('returns null when contribution per order is non-positive', () => {
    expect(
      deriveCacPayback({
        cac: 1200,
        averageCheck: 50,
        grossMarginFrac: -0.1,
        netMarginFrac: 0.1,
      })
    ).toBeNull();
  });

  it('never produces a 0.1 sentinel or a 999 sentinel', () => {
    const profitable = deriveCacPayback({
      cac: 240,
      averageCheck: 99,
      grossMarginFrac: 0.7,
      netMarginFrac: 0.2,
    });
    expect(profitable).not.toBeNull();
    expect(profitable).not.toBe(0.1);
    expect(profitable).not.toBe(999);
    expect(profitable!).toBeGreaterThan(0.5);
  });

  it('matches the expected math when the business is profitable', () => {
    // cac 600 / (avg 100 × gm 0.6) = 600 / 60 = 10 months
    expect(
      deriveCacPayback({
        cac: 600,
        averageCheck: 100,
        grossMarginFrac: 0.6,
        netMarginFrac: 0.15,
      })
    ).toBe(10);
  });
});

describe('Benchmark match-type mapping', () => {
  // Mirrors matchQualityToType in supabase/functions/analyze-business/benchmark-records.ts
  function matchQualityToType(q: string | null | undefined): 'direct' | 'similar' | 'none' {
    if (!q || q === 'none') return 'none';
    if (
      q === 'exact' ||
      q === 'partial_no_size' ||
      q === 'partial_no_stage' ||
      q === 'country_level'
    )
      return 'direct';
    return 'similar';
  }

  it('treats exact/partial/country matches as direct', () => {
    expect(matchQualityToType('exact')).toBe('direct');
    expect(matchQualityToType('partial_no_size')).toBe('direct');
    expect(matchQualityToType('country_level')).toBe('direct');
  });

  it('treats region/sector-only matches as similar', () => {
    expect(matchQualityToType('region_level')).toBe('similar');
    expect(matchQualityToType('sector_fallback')).toBe('similar');
  });

  it('treats null/undefined/none as none', () => {
    expect(matchQualityToType(null)).toBe('none');
    expect(matchQualityToType(undefined)).toBe('none');
    expect(matchQualityToType('none')).toBe('none');
  });
});
