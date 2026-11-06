/**
 * Pure text-generation for the PDF's Benchmark Citations page summary,
 * extracted out of usePdfExport.ts (which imports @react-pdf/renderer and
 * can't practically be rendered in Vitest/jsdom) so it can be called
 * directly and asserted on for real, not just regex-matched against
 * source text.
 *
 * GTM-audit item #6 (2026-08-25): the PDF's Benchmark Citations page
 * header used to read "Verified Benchmarks · 97,500 benchmarks" --
 * conflating the TOTAL LIBRARY size (97,500 rows across all 5 benchmark
 * tables, a real but aggregate, library-wide figure) with how many
 * benchmarks were actually matched for THIS specific report, directly
 * above a table whose own "Source · n · date" column already shows the
 * honest per-metric sample size (n=230, n=180, etc). A reader could
 * easily read the header as "this report was validated against 97,500
 * data points," which it never was. This function states the library
 * size and this report's actual matched count as two separate, clearly
 * labeled facts.
 *
 * 2026-11-06: the library is a modeled grid (migration 20260608000003: each
 * dimension combination appears once), and the per-metric "n" values were
 * invented. The summary now states no row count and promises no sample size.
 */

interface BenchmarkRowLike {
  bench: { matched: boolean };
}

export function buildBenchmarkCitationsSummary(benchmarkRows: BenchmarkRowLike[]): string {
  const matchedCount = benchmarkRows.filter((r) => r.bench.matched).length;
  const totalCount = benchmarkRows.length;
  return `This report matched ${matchedCount} of ${totalCount} metrics to a Quantis reference range for similar businesses (modeled, not observed data). For matched metrics we show the P25–P75 range, source and date below. When no match exists the value is marked "Estimated · No direct benchmark" and carries a wider uncertainty band.`;
}
