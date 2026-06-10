/**
 * BENCHMARK ENGINE V2
 *
 * Queries the 95,500-row benchmark dataset with hierarchical fallback.
 * Provides 5 query functions for core, unit_econ, geo, risk, and invoice benchmarks.
 * Each result includes match_quality for transparency.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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

// ─── Sector Detection Helper ───

const SECTOR_KEYWORDS: Record<string, { level1: string; level2: string; model: string }> = {
  saas: { level1: 'SaaS', level2: 'B2B SMB SaaS', model: 'subscription' },
  software: { level1: 'SaaS', level2: 'B2B SMB SaaS', model: 'subscription' },
  app: { level1: 'SaaS', level2: 'B2C Consumer SaaS', model: 'subscription' },
  platform: { level1: 'SaaS', level2: 'B2B SMB SaaS', model: 'subscription' },
  enterprise: { level1: 'SaaS', level2: 'B2B Enterprise SaaS', model: 'subscription' },
  devtools: { level1: 'SaaS', level2: 'DevTools / API-first', model: 'usage_based' },
  api: { level1: 'SaaS', level2: 'DevTools / API-first', model: 'usage_based' },
  proptech: { level1: 'SaaS', level2: 'Vertical SaaS (PropTech)', model: 'subscription' },
  healthtech: { level1: 'SaaS', level2: 'Vertical SaaS (Healthcare)', model: 'subscription' },
  coffee: { level1: 'Food & Beverage', level2: 'Coffee Shop / Café', model: 'transactional' },
  cafe: { level1: 'Food & Beverage', level2: 'Coffee Shop / Café', model: 'transactional' },
  restaurant: {
    level1: 'Food & Beverage',
    level2: 'Casual Dining Restaurant',
    model: 'transactional',
  },
  'fine dining': {
    level1: 'Food & Beverage',
    level2: 'Fine Dining Restaurant',
    model: 'transactional',
  },
  'food truck': {
    level1: 'Food & Beverage',
    level2: 'Food Truck / Ghost Kitchen',
    model: 'transactional',
  },
  'ghost kitchen': {
    level1: 'Food & Beverage',
    level2: 'Food Truck / Ghost Kitchen',
    model: 'transactional',
  },
  bakery: { level1: 'Food & Beverage', level2: 'Coffee Shop / Café', model: 'transactional' },
  beverage: { level1: 'Food & Beverage', level2: 'Beverage CPG / DTC', model: 'hybrid' },
  ecommerce: { level1: 'Retail', level2: 'DTC Ecommerce', model: 'transactional' },
  'e-commerce': { level1: 'Retail', level2: 'DTC Ecommerce', model: 'transactional' },
  'online store': { level1: 'Retail', level2: 'DTC Ecommerce', model: 'transactional' },
  retail: { level1: 'Retail', level2: 'Brick & Mortar Specialty Retail', model: 'transactional' },
  marketplace: { level1: 'Marketplace', level2: 'B2C Service Marketplace', model: 'marketplace' },
  amazon: { level1: 'Retail', level2: 'Marketplace Seller (Amazon/eBay)', model: 'transactional' },
  consulting: {
    level1: 'Services',
    level2: 'B2B Consulting (Strategy/Mgmt)',
    model: 'transactional',
  },
  agency: { level1: 'Services', level2: 'Marketing / Creative Agency', model: 'transactional' },
  'marketing agency': {
    level1: 'Services',
    level2: 'Marketing / Creative Agency',
    model: 'transactional',
  },
  'it services': { level1: 'Services', level2: 'IT Services / MSP', model: 'subscription' },
  msp: { level1: 'Services', level2: 'IT Services / MSP', model: 'subscription' },
  staffing: { level1: 'Services', level2: 'HR / Staffing Agency', model: 'transactional' },
  legal: { level1: 'Services', level2: 'Legal Services (SMB)', model: 'transactional' },
  accounting: { level1: 'Services', level2: 'Accounting / Bookkeeping', model: 'subscription' },
  bookkeeping: { level1: 'Services', level2: 'Accounting / Bookkeeping', model: 'subscription' },
  dental: { level1: 'Healthcare', level2: 'Dental Practice', model: 'transactional' },
  clinic: {
    level1: 'Healthcare',
    level2: 'Primary Care / Family Medicine',
    model: 'transactional',
  },
  doctor: {
    level1: 'Healthcare',
    level2: 'Primary Care / Family Medicine',
    model: 'transactional',
  },
  therapy: { level1: 'Healthcare', level2: 'Mental Health Practice', model: 'transactional' },
  'mental health': {
    level1: 'Healthcare',
    level2: 'Mental Health Practice',
    model: 'transactional',
  },
  telehealth: { level1: 'Healthcare', level2: 'Telehealth Platform', model: 'hybrid' },
  'home health': {
    level1: 'Healthcare',
    level2: 'Home Health / Care Agency',
    model: 'transactional',
  },
  manufacturing: {
    level1: 'Manufacturing',
    level2: 'Light / Custom Manufacturing',
    model: 'transactional',
  },
  'food manufacturing': {
    level1: 'Manufacturing',
    level2: 'Food Manufacturing / Co-packing',
    model: 'transactional',
  },
  electronics: {
    level1: 'Manufacturing',
    level2: 'Electronics / Contract Mfg',
    model: 'transactional',
  },
  contractor: {
    level1: 'Construction',
    level2: 'General Contractor (Residential)',
    model: 'transactional',
  },
  construction: {
    level1: 'Construction',
    level2: 'General Contractor (Residential)',
    model: 'transactional',
  },
  hvac: {
    level1: 'Construction',
    level2: 'Specialty Contractor (HVAC/Elec/Plumb)',
    model: 'transactional',
  },
  plumbing: {
    level1: 'Construction',
    level2: 'Specialty Contractor (HVAC/Elec/Plumb)',
    model: 'transactional',
  },
  electrical: {
    level1: 'Construction',
    level2: 'Specialty Contractor (HVAC/Elec/Plumb)',
    model: 'transactional',
  },
  'property management': {
    level1: 'Real Estate',
    level2: 'Property Management',
    model: 'subscription',
  },
  'real estate': {
    level1: 'Real Estate',
    level2: 'Real Estate Agency / Brokerage',
    model: 'transactional',
  },
  course: { level1: 'Education', level2: 'Online Course / EdTech Platform', model: 'hybrid' },
  edtech: { level1: 'Education', level2: 'Online Course / EdTech Platform', model: 'hybrid' },
  tutoring: { level1: 'Education', level2: 'Tutoring / Test Prep (B2C)', model: 'transactional' },
  training: { level1: 'Education', level2: 'Corporate Training / L&D', model: 'subscription' },
  delivery: { level1: 'Logistics', level2: 'Last-Mile Delivery (B2C)', model: 'transactional' },
  freight: { level1: 'Logistics', level2: 'Freight Brokerage', model: 'transactional' },
  logistics: { level1: 'Logistics', level2: 'Last-Mile Delivery (B2C)', model: 'transactional' },
  fintech: { level1: 'Fintech', level2: 'Payments / Payment Processing', model: 'transactional' },
  payments: { level1: 'Fintech', level2: 'Payments / Payment Processing', model: 'transactional' },
  lending: {
    level1: 'Fintech',
    level2: 'SMB Lending / Revenue-Based Finance',
    model: 'transactional',
  },
  newsletter: { level1: 'Media', level2: 'Newsletter / Content Media', model: 'subscription' },
  podcast: {
    level1: 'Media',
    level2: 'Podcast / Video Creator (Ad + Subscription)',
    model: 'hybrid',
  },
  media: { level1: 'Media', level2: 'Newsletter / Content Media', model: 'subscription' },
  salon: { level1: 'Beauty & Wellness', level2: 'Hair Salon / Barbershop', model: 'transactional' },
  barbershop: {
    level1: 'Beauty & Wellness',
    level2: 'Hair Salon / Barbershop',
    model: 'transactional',
  },
  'med spa': {
    level1: 'Beauty & Wellness',
    level2: 'Med Spa / Aesthetics Clinic',
    model: 'transactional',
  },
  aesthetics: {
    level1: 'Beauty & Wellness',
    level2: 'Med Spa / Aesthetics Clinic',
    model: 'transactional',
  },
  gym: { level1: 'Beauty & Wellness', level2: 'Fitness Studio / Gym', model: 'subscription' },
  fitness: { level1: 'Beauty & Wellness', level2: 'Fitness Studio / Gym', model: 'subscription' },
  yoga: { level1: 'Beauty & Wellness', level2: 'Fitness Studio / Gym', model: 'subscription' },
  'personal training': {
    level1: 'Beauty & Wellness',
    level2: 'Personal Training / Coaching',
    model: 'transactional',
  },
  coaching: {
    level1: 'Beauty & Wellness',
    level2: 'Personal Training / Coaching',
    model: 'transactional',
  },
  agritech: {
    level1: 'Agriculture',
    level2: 'AgriTech SaaS / Farm Management',
    model: 'subscription',
  },
  farm: { level1: 'Agriculture', level2: 'AgriTech SaaS / Farm Management', model: 'subscription' },
  'auto repair': {
    level1: 'Transportation',
    level2: 'Auto Repair / Service Center',
    model: 'transactional',
  },
  mechanic: {
    level1: 'Transportation',
    level2: 'Auto Repair / Service Center',
    model: 'transactional',
  },
  nonprofit: { level1: 'Non-profit', level2: '501(c)(3) / Charitable Org', model: 'hybrid' },
  charity: { level1: 'Non-profit', level2: '501(c)(3) / Charitable Org', model: 'hybrid' },
};

// Location keyword → geo mapping
const GEO_KEYWORDS: Record<string, { region: string; country: string; tier: string }> = {
  'new york': { region: 'US', country: 'US', tier: 'T1' },
  nyc: { region: 'US', country: 'US', tier: 'T1' },
  'los angeles': { region: 'US', country: 'US', tier: 'T1' },
  la: { region: 'US', country: 'US', tier: 'T1' },
  chicago: { region: 'US', country: 'US', tier: 'T1' },
  'san francisco': { region: 'US', country: 'US', tier: 'T1' },
  sf: { region: 'US', country: 'US', tier: 'T1' },
  boston: { region: 'US', country: 'US', tier: 'T1' },
  seattle: { region: 'US', country: 'US', tier: 'T1' },
  miami: { region: 'US', country: 'US', tier: 'T1' },
  denver: { region: 'US', country: 'US', tier: 'T2' },
  austin: { region: 'US', country: 'US', tier: 'T2' },
  dallas: { region: 'US', country: 'US', tier: 'T2' },
  atlanta: { region: 'US', country: 'US', tier: 'T2' },
  phoenix: { region: 'US', country: 'US', tier: 'T2' },
  portland: { region: 'US', country: 'US', tier: 'T2' },
  nashville: { region: 'US', country: 'US', tier: 'T2' },
  charlotte: { region: 'US', country: 'US', tier: 'T2' },
  london: { region: 'EU', country: 'UK', tier: 'T1' },
  berlin: { region: 'EU', country: 'DE', tier: 'T1' },
  paris: { region: 'EU', country: 'FR', tier: 'T1' },
  munich: { region: 'EU', country: 'DE', tier: 'T2' },
  'sao paulo': { region: 'LATAM', country: 'BR', tier: 'T1' },
  'mexico city': { region: 'LATAM', country: 'MX', tier: 'T1' },
  singapore: { region: 'APAC', country: 'SG', tier: 'T1' },
  mumbai: { region: 'APAC', country: 'IN', tier: 'T1' },
  sydney: { region: 'APAC', country: 'AU', tier: 'T1' },
  tokyo: { region: 'APAC', country: 'JP', tier: 'T1' },
  dubai: { region: 'MENA', country: 'AE', tier: 'T1' },
  toronto: { region: 'CA', country: 'CA', tier: 'T1' },
  vancouver: { region: 'CA', country: 'CA', tier: 'T1' },
};

/**
 * Detect sector from business idea text.
 */
export function detectSectorFromIdea(idea: string): {
  level1: string;
  level2: string;
  model: string;
} {
  const lower = idea.toLowerCase();

  // Try multi-word matches first (longer matches = more specific)
  const sortedKeys = Object.keys(SECTOR_KEYWORDS).sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeys) {
    if (lower.includes(keyword)) {
      return SECTOR_KEYWORDS[keyword];
    }
  }

  // Default fallback
  return { level1: 'Services', level2: 'B2B Consulting (Strategy/Mgmt)', model: 'transactional' };
}

/**
 * Detect geo from location text.
 */
export function detectGeoFromLocation(location: string): {
  region: string;
  country: string;
  tier: string;
} {
  const lower = location
    .toLowerCase()
    .replace(/[,.\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const sortedKeys = Object.keys(GEO_KEYWORDS).sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeys) {
    if (lower.includes(keyword)) {
      return GEO_KEYWORDS[keyword];
    }
  }

  // Infer region from country codes/names
  if (lower.includes('usa') || lower.includes('united states') || lower.includes('america')) {
    return { region: 'US', country: 'US', tier: 'T2' };
  }
  if (lower.includes('uk') || lower.includes('united kingdom') || lower.includes('england')) {
    return { region: 'EU', country: 'UK', tier: 'T1' };
  }
  if (lower.includes('germany') || lower.includes('deutschland')) {
    return { region: 'EU', country: 'DE', tier: 'T2' };
  }
  if (lower.includes('canada')) {
    return { region: 'CA', country: 'CA', tier: 'T1' };
  }

  // Default: US T3
  return { region: 'US', country: 'US', tier: 'T3' };
}

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
