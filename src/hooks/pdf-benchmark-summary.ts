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
 */

interface BenchmarkRowLike {
  bench: { matched: boolean };
}

export function buildBenchmarkCitationsSummary(
  benchmarkRows: BenchmarkRowLike[],
  benchmarkCountDisplay: string,
): string {
  const matchedCount = benchmarkRows.filter((r) => r.bench.matched).length;
  const totalCount = benchmarkRows.length;
  return `This report matched ${matchedCount} of ${totalCount} metrics against a direct benchmark row, drawn from the AIWMC Quantis Benchmark Master library (${benchmarkCountDisplay} rows across sector, geography, invoice, risk, and unit-economics tables). When a direct row matches your sector, geography, and stage we cite P25–P75 ranges, source, sample size, and dataset date below. When no direct match exists the value is marked "Estimated · No direct benchmark" and carries a wider uncertainty band.`;
}
