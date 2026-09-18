/**
 * Canonical Data Sources used by EVERY AIWMC Quantis analysis.
 * This IS the source of truth `public.data_provenance` is seeded from
 * (migration 20260721000000_seed_data_provenance.sql) -- found 2026-07-21
 * that the table this file's docblock claimed to "mirror" had never
 * actually been created, so the Methodology page's "Verified Data
 * Sources" section was silently rendering nothing in production.
 *
 * Public footprint: 690,074 records across dataset-level references plus
 * 97,500 rule-generated benchmark grid cells. The reference registry does
 * not provide per-cell lineage; never describe those records as 1:1 inputs
 * or the grid cells as observed businesses.
 */

import { BENCHMARK_COUNT } from '@/config/canonical-facts';

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
    usage: 'Dataset-level reference for financial-statement structure and range calibration; not linked to individual benchmark cells.',
  },
  {
    name: 'World Bank Enterprise Surveys',
    license: 'CC BY 4.0',
    dataset_type: 'SME survey',
    records: 180_000,
    period: '2006 → 2024',
    usage: 'Dataset-level reference for SME cost, employment, and sales calibration; not linked to individual benchmark cells.',
  },
  {
    name: 'JPMorgan Chase Institute SME Cash Flow',
    license: 'Academic reference',
    dataset_type: 'SME survey',
    records: 10_000,
    period: '2015 → 2023',
    usage: 'Published SME cash-buffer, runway, and volatility findings used as calibration references; raw records are not redistributed.',
  },
  {
    name: 'ProjectionHub SMB Benchmarks',
    license: 'Public reference',
    dataset_type: 'Industry benchmark',
    records: 50,
    period: '2020 → 2025',
    usage: 'Public ratio reference used for reasonableness checks across common small-business categories.',
  },
  {
    name: 'Kaggle Coffee Shop Financials (CC0)',
    license: 'CC0',
    dataset_type: 'Case study',
    records: 24,
    period: '2022 → 2023',
    usage: 'Small case-study reference for hospitality and food-service reasonableness checks.',
  },
  {
    name: 'AIWMC Quantis Benchmark Library',
    license: 'Proprietary derived',
    dataset_type: 'Industry benchmark',
    records: BENCHMARK_COUNT,
    period: 'Grid versioned; no per-cell source date',
    usage: 'Rule-generated coverage grid across business type, model, city tier, stage, and size. Modeled cells, not observed companies.',
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
