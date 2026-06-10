/**
 * Canonical data sources injected into EVERY analysis endpoint
 * (mirror of src/lib/canonical-data-sources.ts so all tiers cite
 * the same provenance — Free, Plus, Pro, and legacy LLM endpoints).
 */

export interface CanonicalDataSource {
  name: string;
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
    usage: 'Cross-country SME cost structures, employment and sales benchmarks.',
  },
  {
    name: 'JPMorgan Chase Institute SME Cash Flow',
    license: 'Academic reference',
    dataset_type: 'SME survey',
    records: 10_000,
    period: '2015 → 2023',
    usage: 'Cash buffer, runway and revenue volatility distributions for SMBs.',
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
    records: 97_500,
    period: 'Continuously refreshed',
    usage: 'P25/Median/P75 ranges per industry × geography × metric used in every metric badge.',
  },
];

export function canonicalDataSourcesAsStrings(): string[] {
  return CANONICAL_DATA_SOURCES.map(
    (s) => `${s.name} — ${s.records.toLocaleString()} records · ${s.period} · ${s.license}`,
  );
}

export function mergeCanonicalDataSources(incoming?: string[] | null): string[] {
  const canonical = canonicalDataSourcesAsStrings();
  const extras = (incoming ?? []).filter(
    (item) => typeof item === 'string' && item.trim().length > 0 && !canonical.includes(item),
  );
  return [...canonical, ...extras];
}

/** Concise prompt block that legacy LLM endpoints inject before user content. */
export const CANONICAL_DATA_SOURCES_PROMPT = `
## CANONICAL DATA PROVENANCE (ALWAYS CITE)
Every AIWMC Quantis analysis is grounded in these ingested datasets.
You MUST reference them in the "sources" field (comma-separated, short names) and
treat them as authoritative provenance — not generic "industry research":

${CANONICAL_DATA_SOURCES.map(
  (s) => `- ${s.name} (${s.records.toLocaleString()} records, ${s.period}, ${s.license}) — ${s.usage}`,
).join('\n')}
`.trim();
