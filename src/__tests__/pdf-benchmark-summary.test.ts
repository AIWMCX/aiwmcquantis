/**
 * Real runtime tests for buildBenchmarkCitationsSummary()
 * (src/hooks/pdf-benchmark-summary.ts).
 *
 * GTM-audit item #6 (2026-08-25): a real production PDF's Benchmark
 * Citations page header read "Verified Benchmarks · 97,500 benchmarks" --
 * the total library size, not how many benchmarks were actually matched
 * for that specific report -- directly above a table whose own rows
 * already showed the honest per-metric n=230/n=180-style sample sizes.
 */
import { describe, it, expect } from 'vitest';
import { buildBenchmarkCitationsSummary } from '../hooks/pdf-benchmark-summary';

describe('buildBenchmarkCitationsSummary', () => {
  it('never states the library size as if it were this report\'s matched count', () => {
    const summary = buildBenchmarkCitationsSummary(
      [{ bench: { matched: true } }, { bench: { matched: false } }],
      '97,500',
    );
    // The library figure must appear only inside its own qualified phrase
    // ("library (97,500 rows...)"), never as a bare "97,500" standing in
    // for a per-report count.
    expect(summary).toContain('library (97,500 rows');
    expect(summary).not.toMatch(/matched 97,500/);
  });

  it('states the real matched-vs-total count for this specific report', () => {
    const summary = buildBenchmarkCitationsSummary(
      [{ bench: { matched: true } }, { bench: { matched: true } }, { bench: { matched: false } }],
      '97,500',
    );
    expect(summary).toContain('This report matched 2 of 3 metrics');
  });

  it('reports zero matches honestly rather than omitting the count', () => {
    const summary = buildBenchmarkCitationsSummary(
      [{ bench: { matched: false } }, { bench: { matched: false } }],
      '97,500',
    );
    expect(summary).toContain('This report matched 0 of 2 metrics');
  });

  it('handles an empty benchmark row set without producing "NaN" or "undefined"', () => {
    const summary = buildBenchmarkCitationsSummary([], '97,500');
    expect(summary).toContain('This report matched 0 of 0 metrics');
    expect(summary).not.toMatch(/NaN|undefined/);
  });
});
