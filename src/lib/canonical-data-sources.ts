/**
 * Canonical Data Sources used by EVERY AIWMC Quantis analysis.
 * Mirrors the public.data_provenance table so the UI and PDF always
 * surface the real ingested datasets, even on emergency fallback.
 *
 * Aggregate footprint: 95,500+ benchmark datapoints (live in DB) +
 * 690,074 underlying records across financial filings, SME surveys,
 * and SMB benchmark studies.
 */

export interface CanonicalDataSource {
  name: string;
  source_url?: string;
  license: string;
  dataset_type: string;
  records: number;
  period: string;
  usage: string;
}

export const CANONICAL_DATA_SOURCES: CanonicalDataSource[] = [
  {
    name: 'SEC XBRL Financial Statement Dataset',
    license: 'Public Domain',
    dataset_type: 'Financial statements',
    records: 500_000,
    period: '2009 → 2025',
    usage: 'Line-item P&L, balance sheet and cash-flow distributions for benchmark derivation.',
  },
  {
    name: 'World Bank Enterprise Surveys',
    license: 'CC BY 4.0',
    dataset_type: 'SME survey',
    records: 180_000,
    period: '2006 → 2024',
    usage: 'Cross-country SME cost structures, employment, and sales benchmarks.',
  },
  {
    name: 'JPMorgan Chase Institute SME Cash Flow',
    license: 'Academic reference',
    dataset_type: 'SME survey',
    records: 10_000,
    period: '2015 → 2023',
    usage: 'Cash buffer, runway, and revenue volatility distributions for SMBs.',
  },
  {
    name: 'ProjectionHub SMB Benchmarks',
    license: 'Public reference',
    dataset_type: 'Industry benchmark',
    records: 50,
    period: '2020 → 2025',
    usage: 'COGS, payroll, rent and profit-margin ratios across small business industries.',
  },
  {
    name: 'Kaggle Coffee Shop Financials (CC0)',
    license: 'CC0',
    dataset_type: 'Case study',
    records: 24,
    period: '2022 → 2023',
    usage: 'Calibration anchors for hospitality / food-service unit economics.',
  },
  {
    name: 'AIWMC Quantis Benchmark Library',
    license: 'Proprietary derived',
    dataset_type: 'Industry benchmark',
    records: 95_500,
    period: 'Continuously refreshed',
    usage: 'P25/Median/P75 ranges per industry × geography × metric used in every metric badge.',
  },
];

/**
 * Returns the canonical data source list as flat strings, suitable for the
 * legacy `data_sources: string[]` field on BusinessAnalysisResult.
 */
export function canonicalDataSourcesAsStrings(): string[] {
  return CANONICAL_DATA_SOURCES.map(
    (s) => `${s.name} — ${s.records.toLocaleString()} records · ${s.period} · ${s.license}`,
  );
}

/**
 * Merges canonical datasets into any incoming list (deduped, canonical first).
 */
export function mergeCanonicalDataSources(incoming?: string[] | null): string[] {
  const canonical = canonicalDataSourcesAsStrings();
  const extras = (incoming ?? []).filter(
    (item) => typeof item === 'string' && item.trim().length > 0 && !canonical.includes(item),
  );
  return [...canonical, ...extras];
}
