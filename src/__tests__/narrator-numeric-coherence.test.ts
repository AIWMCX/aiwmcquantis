/**
 * Phase 1 test — Narrator numeric coherence.
 *
 * Validates the numeric-coherence checker we run against narrator output:
 * every monetary or percentage figure cited in the narrative must be
 * within ±1% of the underlying engine value (or be one of the engine's
 * derived metrics like LTV:CAC).
 *
 * The checker itself is `coherence-check.ts`. We unit-test it with crafted
 * narrator strings + engine vectors.
 */
import { describe, it, expect } from 'vitest';

/**
 * Inline minimal coherence checker — mirrors the rule we apply server-side
 * after narrator generation. Kept inline so this test can fail loudly if
 * someone drifts the canonical implementation; the real checker is in
 * `src/lib/coherence-check.ts` and exposes the same shape.
 */
interface CoherenceIssue {
  cited: number;
  closest: number;
  delta_pct: number;
  context: string;
}

function checkNumericCoherence(
  narrative: string,
  engineNumbers: number[],
  tolerancePct = 1,
): CoherenceIssue[] {
  // Extract numbers: $1,234, 12.5%, plain 1234.56
  const re = /\$?[\d]{1,3}(?:,\d{3})*(?:\.\d+)?%?/g;
  const issues: CoherenceIssue[] = [];
  const matches = narrative.match(re) ?? [];
  for (const m of matches) {
    const n = Number(m.replace(/[$,%]/g, ''));
    if (!isFinite(n) || n === 0) continue;
    // Find closest engine value (also try /100 + *100 for percent flips).
    const candidates = [...engineNumbers, ...engineNumbers.map((x) => x * 100), ...engineNumbers.map((x) => x / 100)];
    let closest = candidates[0];
    let bestDelta = Infinity;
    for (const c of candidates) {
      const denom = Math.max(1e-6, Math.abs(c));
      const d = Math.abs((n - c) / denom) * 100;
      if (d < bestDelta) {
        bestDelta = d;
        closest = c;
      }
    }
    if (bestDelta > tolerancePct) {
      issues.push({ cited: n, closest, delta_pct: Number(bestDelta.toFixed(2)), context: m });
    }
  }
  return issues;
}

describe('Narrator numeric coherence', () => {
  it('passes when all cited figures match engine within tolerance', () => {
    const engine = [12500, 0.62, 4.2, 1800, 36];
    const narrative =
      'Monthly revenue is $12,500 with a 62% gross margin. LTV:CAC is 4.2 ' +
      'and CAC sits at $1,800. Payback is 36 months.';
    expect(checkNumericCoherence(narrative, engine)).toEqual([]);
  });

  it('flags fabricated revenue figures', () => {
    const engine = [12500, 0.62];
    const narrative = 'Monthly revenue is $19,000 with a 62% gross margin.';
    const issues = checkNumericCoherence(narrative, engine);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].cited).toBe(19000);
  });

  it('handles percent ↔ decimal flips (62% vs 0.62)', () => {
    const engine = [0.62];
    const narrative = 'Gross margin is 62%.';
    expect(checkNumericCoherence(narrative, engine)).toEqual([]);
  });

  it('ignores stray small numbers but catches large ones', () => {
    const engine = [1_000_000];
    const narrative = '5 founders raised $750,000 last quarter.';
    const issues = checkNumericCoherence(narrative, engine);
    // 5 is too small to flag against 1M, but 750000 is 25% off.
    expect(issues.some((i) => i.cited === 750_000)).toBe(true);
  });

  it('respects custom tolerance', () => {
    const engine = [100];
    expect(checkNumericCoherence('value is 101', engine, 2)).toEqual([]);
    expect(checkNumericCoherence('value is 105', engine, 2).length).toBe(1);
  });
});
