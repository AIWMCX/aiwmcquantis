/**
 * BENCHMARK ENGINE V2
 *
 * Queries the 97,500-row benchmark dataset with hierarchical fallback.
 * Provides 5 query functions for core, unit_econ, geo, risk, and invoice benchmarks.
 * Each result includes match_quality for transparency.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { detectSectorFromIdea, detectGeoFromLocation } from './benchmark-keywords.ts';
export { detectSectorFromIdea, detectGeoFromLocation } from './benchmark-keywords.ts';

// ─── Types ───

export interface BenchmarkQuery {
  sector_level1: string;
  sector_level2?: string;
  business_model?: string;
  geo_region?: string;
  country?: string;
  city_tier?: string;
  company_stage?: string;
  size_bucket?: string;
}

export type MatchQuality =
  | 'exact'
  | 'partial_no_size'
  | 'partial_no_stage'
  | 'country_level'
  | 'region_level'
  | 'sector_fallback'
  | 'none';

export interface CoreBenchmarkResult {
  gm_margin_p25: number;
  gm_margin_p50: number;
  gm_margin_p75: number;
  op_margin_p50: number;
  ebitda_margin_p50: number;
  revenue_growth_yoy_p50: number;
  revenue_volatility: number;
  rent_pct_rev_p50: number;
  payroll_pct_rev_p50: number;
  marketing_pct_rev_p50: number;
  days_receivable: number;
  days_payable: number;
  inventory_turnover: number | null;
  match_quality: MatchQuality;
}

export interface UnitEconBenchmarkResult {
  cac_p25: number;
  cac_p50: number;
  cac_p75: number;
  ltv_p25: number;
  ltv_p50: number;
  ltv_p75: number;
  ltv_cac_ratio_p25: number;
  ltv_cac_ratio_p50: number;
  ltv_cac_ratio_p75: number;
  cac_payback_p25: number;
  cac_payback_p50: number;
  cac_payback_p75: number;
  churn_monthly_p25: number;
  churn_monthly_p50: number;
  churn_monthly_p75: number;
  retention_12m: number;
  arpu_median: number;
  match_quality: MatchQuality;
}

export interface GeoBenchmarkResult {
  cost_of_living_index: number;
  wage_multiplier: number;
  rent_multiplier: number;
  consumer_spend_index: number;
  match_quality: MatchQuality;
}

export interface RiskBenchmarkResult {
  risk_market_volatility: number;
  risk_regulatory: number;
  risk_operational: number;
  risk_customer_concentration: number;
  median_survival_years: number;
  failure_mode_1: string;
  failure_mode_2: string;
  failure_mode_3: string;
  match_quality: MatchQuality;
}

export interface InvoiceBenchmarkResult {
  avg_invoice_terms_days: number;
  late_payment_rate: number;
  bad_debt_pct_rev: number;
  safe_dscr_threshold: number;
  max_safe_invoice_to_rev_ratio: number;
  match_quality: MatchQuality;
}

export interface CalibrationAdjustment {
  sample_size: number;
  bias_pct: number | null;
  mape: number | null;
  confidence_adjustment: number;
  last_updated: string | null;
}

export interface BenchmarkSummaryForCase {
  core: CoreBenchmarkResult | null;
  unit_econ: UnitEconBenchmarkResult | null;
  geo: GeoBenchmarkResult | null;
  risk: RiskBenchmarkResult | null;
  invoice: InvoiceBenchmarkResult | null;
  sector_label: string;
  geo_label: string;
  overall_match_quality: MatchQuality;
  /** Self-learning calibration: shrinks confidence when reality has diverged from past predictions. */
  calibration?: CalibrationAdjustment | null;
}

// ─── Hierarchical Fallback Query ───

interface FallbackLevel {
  label: MatchQuality;
  filter: (q: BenchmarkQuery) => Record<string, string>;
}

function buildFallbackLevels(q: BenchmarkQuery): FallbackLevel[] {
  return [
    // Level 1: Exact match
    {
      label: 'exact',
      filter: () => ({
        sector_level1: q.sector_level1,
        sector_level2: q.sector_level2 || '',
        business_model: q.business_model || '',
        geo_region: q.geo_region || '',
        country: q.country || '',
        city_tier: q.city_tier || '',
        company_stage: q.company_stage || '',
        size_bucket: q.size_bucket || '',
      }),
    },
    // Level 2: Drop size_bucket
    {
      label: 'partial_no_size',
      filter: () => ({
        sector_level1: q.sector_level1,
        sector_level2: q.sector_level2 || '',
        business_model: q.business_model || '',
        geo_region: q.geo_region || '',
        country: q.country || '',
        city_tier: q.city_tier || '',
        company_stage: q.company_stage || '',
      }),
    },
    // Level 3: Drop stage + size
    {
      label: 'partial_no_stage',
      filter: () => ({
        sector_level1: q.sector_level1,
        sector_level2: q.sector_level2 || '',
        business_model: q.business_model || '',
        geo_region: q.geo_region || '',
        country: q.country || '',
        city_tier: q.city_tier || '',
      }),
    },
    // Level 4: Country level (drop city_tier)
    {
      label: 'country_level',
      filter: () => ({
        sector_level1: q.sector_level1,
        sector_level2: q.sector_level2 || '',
        geo_region: q.geo_region || '',
        country: q.country || '',
      }),
    },
    // Level 5: Region level (drop country)
    {
      label: 'region_level',
      filter: () => ({
        sector_level1: q.sector_level1,
        sector_level2: q.sector_level2 || '',
        geo_region: q.geo_region || '',
      }),
    },
    // Level 6: Sector only
    {
      label: 'sector_fallback',
      filter: () => ({
        sector_level1: q.sector_level1,
      }),
    },
  ];
}

async function queryWithFallback<T>(
  supabase: SupabaseClient,
  table: string,
  query: BenchmarkQuery,
  selectCols: string
): Promise<{ data: T | null; match_quality: MatchQuality }> {
  const levels = buildFallbackLevels(query);

  for (const level of levels) {
    const filters = level.filter(query);
    let q = supabase.from(table).select(selectCols);

    for (const [key, value] of Object.entries(filters)) {
      q = q.eq(key, value);
    }

    const { data, error } = await q.limit(1).single();
    if (!error && data) {
      return { data: data as T, match_quality: level.label };
    }
  }

  return { data: null, match_quality: 'none' };
}

// ─── Public API ───

export async function getCoreBenchmarks(
  supabase: SupabaseClient,
  query: BenchmarkQuery
): Promise<CoreBenchmarkResult | null> {
  const cols =
    'gm_margin_p25,gm_margin_p50,gm_margin_p75,op_margin_p50,ebitda_margin_p50,revenue_growth_yoy_p50,revenue_volatility,rent_pct_rev_p50,payroll_pct_rev_p50,marketing_pct_rev_p50,days_receivable,days_payable,inventory_turnover';
  const { data, match_quality } = await queryWithFallback(
    supabase,
    'benchmark_master_core',
    query,
    cols
  );
  if (!data) return null;
  return { ...data, match_quality } as CoreBenchmarkResult;
}

export async function getUnitEconBenchmarks(
  supabase: SupabaseClient,
  query: BenchmarkQuery
): Promise<UnitEconBenchmarkResult | null> {
  const cols =
    'cac_p25,cac_p50,cac_p75,ltv_p25,ltv_p50,ltv_p75,ltv_cac_ratio_p25,ltv_cac_ratio_p50,ltv_cac_ratio_p75,cac_payback_p25,cac_payback_p50,cac_payback_p75,churn_monthly_p25,churn_monthly_p50,churn_monthly_p75,retention_12m,arpu_median';
  const { data, match_quality } = await queryWithFallback(
    supabase,
    'benchmark_master_unit_econ',
    query,
    cols
  );
  if (!data) return null;
  return { ...data, match_quality } as UnitEconBenchmarkResult;
}

export async function getGeoBenchmarks(
  supabase: SupabaseClient,
  query: BenchmarkQuery
): Promise<GeoBenchmarkResult | null> {
  const cols = 'cost_of_living_index,wage_multiplier,rent_multiplier,consumer_spend_index';
  const { data, match_quality } = await queryWithFallback(
    supabase,
    'benchmark_master_geo',
    query,
    cols
  );
  if (!data) return null;
  return { ...data, match_quality } as GeoBenchmarkResult;
}

export async function getRiskProfile(
  supabase: SupabaseClient,
  query: BenchmarkQuery
): Promise<RiskBenchmarkResult | null> {
  const cols =
    'risk_market_volatility,risk_regulatory,risk_operational,risk_customer_concentration,median_survival_years,failure_mode_1,failure_mode_2,failure_mode_3';
  const { data, match_quality } = await queryWithFallback(
    supabase,
    'benchmark_master_risk',
    query,
    cols
  );
  if (!data) return null;
  return { ...data, match_quality } as RiskBenchmarkResult;
}

export async function getInvoiceBenchmarks(
  supabase: SupabaseClient,
  query: BenchmarkQuery
): Promise<InvoiceBenchmarkResult | null> {
  const cols =
    'avg_invoice_terms_days,late_payment_rate,bad_debt_pct_rev,safe_dscr_threshold,max_safe_invoice_to_rev_ratio';
  const { data, match_quality } = await queryWithFallback(
    supabase,
    'benchmark_master_invoice',
    query,
    cols
  );
  if (!data) return null;
  return { ...data, match_quality } as InvoiceBenchmarkResult;
}

// ─── Full Summary (for PRE/Narrator) ───

export async function getBenchmarkSummary(
  supabase: SupabaseClient,
  query: BenchmarkQuery
): Promise<BenchmarkSummaryForCase> {
  const [core, unit_econ, geo, risk, invoice] = await Promise.all([
    getCoreBenchmarks(supabase, query),
    getUnitEconBenchmarks(supabase, query),
    getGeoBenchmarks(supabase, query),
    getRiskProfile(supabase, query),
    getInvoiceBenchmarks(supabase, query),
  ]);

  // Determine overall match quality (worst of all)
  const qualities: MatchQuality[] = [
    core?.match_quality || 'none',
    unit_econ?.match_quality || 'none',
    geo?.match_quality || 'none',
    risk?.match_quality || 'none',
    invoice?.match_quality || 'none',
  ];
  const qualityOrder: MatchQuality[] = [
    'exact',
    'partial_no_size',
    'partial_no_stage',
    'country_level',
    'region_level',
    'sector_fallback',
    'none',
  ];
  const worst = qualities.reduce(
    (a, b) => (qualityOrder.indexOf(a) > qualityOrder.indexOf(b) ? a : b),
    'exact'
  );

  // Self-learning: pull calibration row for this slice (silent on miss / RLS denial)
  let calibration: CalibrationAdjustment | null = null;
  try {
    const { data: cal } = await supabase
      .from('benchmark_calibration')
      .select('sample_size, bias_pct, mape, confidence_adjustment, last_updated')
      .eq('sector_level1', query.sector_level1)
      .eq('sector_level2', query.sector_level2 || '')
      .eq('geo_region', query.geo_region || '')
      .eq('metric_name', 'op_margin_p50')
      .maybeSingle();
    if (cal) calibration = cal as CalibrationAdjustment;
  } catch (_) {
    /* table may not yet exist in older deploys */
  }

  return {
    core,
    unit_econ,
    geo,
    risk,
    invoice,
    sector_label: `${query.sector_level1}${query.sector_level2 ? ' > ' + query.sector_level2 : ''}`,
    geo_label: `${query.country || query.geo_region || 'Global'}${query.city_tier ? ' ' + query.city_tier : ''}`,
    overall_match_quality: worst,
    calibration,
  };
}

// Sector and location detection live in benchmark-keywords.ts (pure, tested).

/**
 * Build a complete BenchmarkQuery from business idea + location.
 */
export function buildQueryFromInput(
  idea: string,
  location: string,
  stage?: string,
  sizeBucket?: string
): BenchmarkQuery {
  const sector = detectSectorFromIdea(idea);
  const geo = detectGeoFromLocation(location);

  return {
    sector_level1: sector.level1,
    sector_level2: sector.level2,
    business_model: sector.model,
    geo_region: geo.region,
    country: geo.country,
    city_tier: geo.tier,
    company_stage: stage || 'idea',
    size_bucket: sizeBucket || '0_100k',
  };
}

/**
 * Compute user input percentile against p25/p50/p75 distribution.
 * Returns 0-100 percentile estimate and a label.
 */
export function computePercentile(
  value: number,
  p25: number,
  p50: number,
  p75: number
): { percentile: number; label: 'below_p25' | 'p25_p50' | 'p50_p75' | 'above_p75' } {
  if (value <= p25) {
    const pct = Math.max(0, Math.round((value / p25) * 25));
    return { percentile: pct, label: 'below_p25' };
  }
  if (value <= p50) {
    const pct = 25 + Math.round(((value - p25) / (p50 - p25)) * 25);
    return { percentile: pct, label: 'p25_p50' };
  }
  if (value <= p75) {
    const pct = 50 + Math.round(((value - p50) / (p75 - p50)) * 25);
    return { percentile: pct, label: 'p50_p75' };
  }
  const pct = Math.min(99, 75 + Math.round(((value - p75) / Math.max(1, p75 - p50)) * 25));
  return { percentile: pct, label: 'above_p75' };
}
