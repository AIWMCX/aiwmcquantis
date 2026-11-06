/**
 * Real runtime tests for buildBenchmarkCitationsSummary()
 * (src/hooks/pdf-benchmark-summary.ts).
 *
 * GTM-audit item #6 (2026-08-25): a real production PDF's Benchmark
 * Citations page header read "Verified Benchmarks · 97,500 benchmarks" --
 * the total library size, not how many benchmarks were actually matched
 * for that specific report -- directly above a table whose own rows
 * showed per-metric n=230/n=180-style "sample sizes". 2026-11-06: those n
 * values were invented (the grid is modeled), so the summary states neither.
 */
import { describe, it, expect } from 'vitest';
import { buildBenchmarkCitationsSummary } from '../hooks/pdf-benchmark-summary';

describe('buildBenchmarkCitationsSummary', () => {
  it('states no library row count and no sample size (the grid is modeled)', () => {
    const summary = buildBenchmarkCitationsSummary([
      { bench: { matched: true } },
      { bench: { matched: false } },
    ]);
    expect(summary).not.toMatch(/97,500|rows|sample size/i);
    expect(summary).toContain('modeled, not observed data');
  });

  it('states the real matched-vs-total count for this specific report', () => {
    const summary = buildBenchmarkCitationsSummary([
      { bench: { matched: true } },
      { bench: { matched: true } },
      { bench: { matched: false } },
    ]);
    expect(summary).toContain('This report matched 2 of 3 metrics');
  });

  it('reports zero matches honestly rather than omitting the count', () => {
    const summary = buildBenchmarkCitationsSummary([
      { bench: { matched: false } },
      { bench: { matched: false } },
    ]);
    expect(summary).toContain('This report matched 0 of 2 metrics');
  });

  it('handles an empty benchmark row set without producing "NaN" or "undefined"', () => {
    const summary = buildBenchmarkCitationsSummary([]);
    expect(summary).toContain('This report matched 0 of 0 metrics');
    expect(summary).not.toMatch(/NaN|undefined/);
  });
});
