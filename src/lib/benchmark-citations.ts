/**
 * Benchmark citation layer: says where a benchmark number comes from, and never
 * more than can be backed (no third-party names or sample sizes for modeled cells).
 */

import type { IndustryBenchmark } from '@/lib/benchmark-calibrator';

export interface BenchmarkCitation {
  source: string;
  reportName: string;
  reportDate: string;
  /** null when no real sample stands behind the number. */
  sampleSize: number | null;
  geographicScope: string;
  lastRefreshed: Date;
  dataVersion: string;
}

export interface SourcedMetric<T> {
  value: T;
  citation: BenchmarkCitation;
  isEstimated: boolean;
  isStale: boolean;
  confidence: number;
}

// Every benchmark comes from the Quantis modeled grid (see /methodology:
// "97,500 does not mean 97,500 observed companies"; no displayed number maps to
// a named source record). This file used to attach third-party names and
// invented sample sizes ("IBISWorld OD6113 · n=1,247", "CoStar Group · n=3,200")
// by the record's `source` key. Removed 2026-10-25: a citation now says what the
// number is, with no sample size it cannot back.
const MODELED_SOURCE = 'Quantis modeled benchmark';

/**
 * Build a BenchmarkCitation from an IndustryBenchmark record
 */
export function buildCitation(benchmark: IndustryBenchmark): BenchmarkCitation {
  return {
    source: MODELED_SOURCE,
    reportName: benchmark.industryType,
    reportDate: extractReportDate(benchmark.lastUpdated),
    sampleSize: null,
    geographicScope: 'Rule-generated grid',
    lastRefreshed: new Date(benchmark.lastUpdated),
    dataVersion: 'grid',
  };
}

/**
 * Full citation: "Quantis modeled benchmark · coffee_shop · Q1 2025"
 */
export function formatCitation(citation: BenchmarkCitation): string {
  const n = citation.sampleSize ? ` · n=${citation.sampleSize.toLocaleString('en-US')}` : '';
  return `${citation.source} · ${citation.reportName} · ${citation.reportDate}${n}`;
}

/**
 * Compact citation for table footers: "Quantis modeled benchmark · Q1 2025"
 */
export function formatCitationCompact(citation: BenchmarkCitation): string {
  const n = citation.sampleSize ? ` · n=${citation.sampleSize.toLocaleString('en-US')}` : '';
  return `${citation.source} · ${citation.reportDate}${n}`;
}

function extractReportDate(lastUpdated: string): string {
  try {
    const date = new Date(lastUpdated);
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    return `Q${quarter} ${date.getFullYear()}`;
  } catch {
    return '2025';
  }
}
