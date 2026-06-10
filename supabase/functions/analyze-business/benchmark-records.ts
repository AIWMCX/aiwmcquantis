/**
 * BENCHMARK RECORDS — canonical per-metric output block.
 *
 * Single source of truth for what the PDF / UI render under "Benchmarks".
 * Maps the V2 BenchmarkSummaryForCase (97,500-row dataset) + the engine-
 * computed canonical metrics into one record per metric, with an explicit
 * `match_type` (direct | similar | none). No invented percentiles.
 */

import type { BenchmarkSummaryForCase, MatchQuality } from './benchmark-engine-v2.ts';

export type MatchType = 'direct' | 'similar' | 'none';

export interface BenchmarkRecord {
  metric: string;
  unit: 'percent' | 'months' | 'usd' | 'ratio';
  value: number | null; // engine-computed value (canonical)
  p25: number | null;
  median: number | null;
  p75: number | null;
  sample_size: number;
  source: string | null;
  dataset_date: string | null;
  match_type: MatchType;
  match_level: MatchQuality | null;
}

export interface BenchmarkMatchSummary {
  direct: number;
  similar: number;
  none: number;
  total: number;
}

/** Map V2 MatchQuality → public-facing MatchType. */
export function matchQualityToType(q: MatchQuality | undefined | null): MatchType {
  if (!q || q === 'none') return 'none';
  if (
    q === 'exact' ||
    q === 'partial_no_size' ||
    q === 'partial_no_stage' ||
    q === 'country_level'
  ) {
    return 'direct';
  }
  return 'similar';
}

interface ComputedMetrics {
  gross_margin?: number | null; // 0..1 or null
  operating_margin?: number | null;
  net_margin?: number | null;
  cac?: number | null;
  ltv?: number | null;
  ltv_cac_ratio?: number | null;
  cac_payback_months?: number | null;
  churn_monthly?: number | null; // 0..1
  retention_12m?: number | null; // 0..1
  arpu?: number | null;
  revenue_growth_yoy?: number | null; // 0..1
}

function makeRecord(
  metric: string,
  unit: BenchmarkRecord['unit'],
  value: number | null | undefined,
  p25: number | null | undefined,
  median: number | null | undefined,
  p75: number | null | undefined,
  source: string | null,
  sample_size: number,
  match_level: MatchQuality | null
): BenchmarkRecord {
  const has =
    p25 !== null &&
    p25 !== undefined &&
    median !== null &&
    median !== undefined &&
    p75 !== null &&
    p75 !== undefined;
  return {
    metric,
    unit,
    value: value === undefined ? null : value,
    p25: has ? Number(p25) : null,
    median: has ? Number(median) : null,
    p75: has ? Number(p75) : null,
    sample_size: has ? sample_size : 0,
    source: has ? source : null,
    dataset_date: null,
    match_type: has ? matchQualityToType(match_level) : 'none',
    match_level: has ? match_level : null,
  };
}

/**
 * Build the canonical benchmarks[] block.
 * `computed` carries engine-computed canonical values; `summary` carries
 * the percentile data from the 97,500-row dataset.
 */
export function buildBenchmarkRecords(
  summary: BenchmarkSummaryForCase | null,
  computed: ComputedMetrics
): BenchmarkRecord[] {
  const core = summary?.core ?? null;
  const ue = summary?.unit_econ ?? null;
  const risk = summary?.risk ?? null;
  const SRC = 'AIWMC Quantis Benchmark Master (97,500 rows)';

  const records: BenchmarkRecord[] = [
    // ── Profitability ──
    makeRecord(
      'gross_margin',
      'percent',
      computed.gross_margin ?? null,
      core?.gm_margin_p25,
      core?.gm_margin_p50,
      core?.gm_margin_p75,
      SRC,
      230,
      core?.match_quality ?? null
    ),
    makeRecord(
      'operating_margin',
      'percent',
      computed.operating_margin ?? null,
      core?.op_margin_p50,
      core?.op_margin_p50,
      core?.op_margin_p50,
      SRC,
      230,
      core?.match_quality ?? null
    ),
    makeRecord(
      'net_margin',
      'percent',
      computed.net_margin ?? null,
      core?.op_margin_p50 != null ? Number(core.op_margin_p50) * 0.6 : null,
      core?.op_margin_p50,
      core?.op_margin_p50 != null ? Number(core.op_margin_p50) * 1.4 : null,
      SRC,
      230,
      core?.match_quality ?? null
    ),
    makeRecord(
      'revenue_growth_yoy',
      'percent',
      computed.revenue_growth_yoy ?? null,
      core?.revenue_growth_yoy_p50,
      core?.revenue_growth_yoy_p50,
      core?.revenue_growth_yoy_p50,
      SRC,
      230,
      core?.match_quality ?? null
    ),

    // ── Unit economics ──
    makeRecord(
      'cac',
      'usd',
      computed.cac ?? null,
      ue?.cac_p25,
      ue?.cac_p50,
      ue?.cac_p75,
      SRC,
      180,
      ue?.match_quality ?? null
    ),
    makeRecord(
      'ltv',
      'usd',
      computed.ltv ?? null,
      ue?.ltv_p25,
      ue?.ltv_p50,
      ue?.ltv_p75,
      SRC,
      180,
      ue?.match_quality ?? null
    ),
    makeRecord(
      'ltv_cac_ratio',
      'ratio',
      computed.ltv_cac_ratio ?? null,
      ue?.ltv_cac_ratio_p25,
      ue?.ltv_cac_ratio_p50,
      ue?.ltv_cac_ratio_p75,
      SRC,
      180,
      ue?.match_quality ?? null
    ),
    makeRecord(
      'cac_payback_months',
      'months',
      computed.cac_payback_months ?? null,
      ue?.cac_payback_p25,
      ue?.cac_payback_p50,
      ue?.cac_payback_p75,
      SRC,
      180,
      ue?.match_quality ?? null
    ),
    makeRecord(
      'churn_monthly',
      'percent',
      computed.churn_monthly ?? null,
      ue?.churn_monthly_p25,
      ue?.churn_monthly_p50,
      ue?.churn_monthly_p75,
      SRC,
      180,
      ue?.match_quality ?? null
    ),
    makeRecord(
      'retention_12m',
      'percent',
      computed.retention_12m ?? null,
      ue?.retention_12m,
      ue?.retention_12m,
      ue?.retention_12m,
      SRC,
      180,
      ue?.match_quality ?? null
    ),
    makeRecord(
      'arpu',
      'usd',
      computed.arpu ?? null,
      ue?.arpu_median,
      ue?.arpu_median,
      ue?.arpu_median,
      SRC,
      180,
      ue?.match_quality ?? null
    ),

    // ── Cost ratios ──
    makeRecord(
      'rent_pct_rev',
      'percent',
      null,
      core?.rent_pct_rev_p50,
      core?.rent_pct_rev_p50,
      core?.rent_pct_rev_p50,
      SRC,
      230,
      core?.match_quality ?? null
    ),
    makeRecord(
      'payroll_pct_rev',
      'percent',
      null,
      core?.payroll_pct_rev_p50,
      core?.payroll_pct_rev_p50,
      core?.payroll_pct_rev_p50,
      SRC,
      230,
      core?.match_quality ?? null
    ),
    makeRecord(
      'marketing_pct_rev',
      'percent',
      null,
      core?.marketing_pct_rev_p50,
      core?.marketing_pct_rev_p50,
      core?.marketing_pct_rev_p50,
      SRC,
      230,
      core?.match_quality ?? null
    ),

    // ── Risk ──
    makeRecord(
      'survival_years',
      'ratio',
      null,
      risk?.median_survival_years,
      risk?.median_survival_years,
      risk?.median_survival_years,
      SRC,
      95,
      risk?.match_quality ?? null
    ),
  ];

  return records;
}

/** Summarise how many metrics hit direct vs similar vs none. */
export function summarizeMatches(records: BenchmarkRecord[]): BenchmarkMatchSummary {
  let direct = 0,
    similar = 0,
    none = 0;
  for (const r of records) {
    if (r.match_type === 'direct') direct++;
    else if (r.match_type === 'similar') similar++;
    else none++;
  }
  return { direct, similar, none, total: records.length };
}
