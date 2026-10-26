/**
 * Benchmark Lookup Service
 * Fetches P25/P50/P75 from the 97,500-row Benchmark Master library
 * via the `benchmark_lookup` RPC. Falls back to "Estimated · No direct
 * benchmark" when no row matches.
 */
import { supabase } from '@/integrations/supabase/client';

export type BenchmarkMetric =
  | 'gross_margin'
  | 'operating_margin'
  | 'ebitda_margin'
  | 'revenue_growth_yoy'
  | 'rent_pct_rev'
  | 'payroll_pct_rev'
  | 'marketing_pct_rev'
  | 'cac'
  | 'ltv'
  | 'ltv_cac_ratio'
  | 'cac_payback'
  | 'churn_monthly'
  | 'retention_12m'
  | 'arpu'
  | 'wage_multiplier'
  | 'rent_multiplier'
  | 'cost_of_living_index'
  | 'survival_years'
  | 'invoice_terms_days'
  | 'late_payment_rate'
  | 'bad_debt_pct_rev';

export interface BenchmarkContext {
  sector?: string | null;
  businessModel?: string | null;
  country?: string | null;
  cityTier?: string | null;
  stage?: string | null;
  size?: string | null;
}

export interface BenchmarkResult {
  matched: boolean;
  metric: BenchmarkMetric;
  matchLevel?: 'exact' | 'no_size' | 'no_city' | 'sector_model' | 'sector_only';
  p25?: number;
  p50?: number;
  p75?: number;
  source?: string;
  sampleSize?: number;
  dataVersion?: string;
  dataDate?: string;
  reason?: string;
}

/**
 * Normalize the sector name from analyze-business (e.g. "SaaS / Software")
 * to the sector_level1 used in benchmark_master tables (e.g. "SaaS").
 *
 * Handbook §19 Wave 4 — this map previously only covered an older "/"-style
 * label set (e.g. "SaaS / Software") that does not match what the engine
 * actually sends. result.metadata.industry_detected is calc.industryDetected,
 * which traces back to embedded-benchmarks.ts's `industry_name` field (e.g.
 * "SaaS Startup", "Restaurant", "Digital Agency") — only 3 of those 37 values
 * (Fintech, Manufacturing, Real Estate) happened to already match a
 * sector_level1 value verbatim. The other 34 fell through `?? s` unchanged
 * and were sent to the benchmark_lookup RPC as an unrecognized sector
 * string, which cannot match any row even at the loosest tier — this is very
 * likely the actual mechanism behind the corpus's near-universal "Engine
 * fallback" / "100% fallback benchmarks" finding: not a data-coverage gap or
 * a missing disclosure UI (BenchmarkCitations already renders per-metric
 * matched/fallback status honestly), but a sector-name mismatch between two
 * independently-evolved parts of the codebase. Server-side ground truth for
 * sector_level1 is benchmark-engine-v2.ts's SECTOR_KEYWORDS map.
 */
const SECTOR_MAP: Record<string, string> = {
  // Legacy "/"-style labels (older dropdown source, kept for compatibility)
  'SaaS / Software': 'SaaS',
  'E-commerce / Retail': 'Retail',
  'Consulting / Professional Services': 'Services',
  'Fitness / Wellness': 'Beauty & Wellness',
  'Education / Online Courses': 'Education',
  'Healthcare / Medical': 'Healthcare',
  'Fintech / Financial Services': 'Fintech',
  'Media / Content / Entertainment': 'Media',
  'Real Estate / Property': 'Real Estate',
  'Logistics / Delivery': 'Logistics',
  'General Business': 'Services',
  // embedded-benchmarks.ts industry_name values (what calc.industryDetected /
  // result.metadata.industry_detected actually contains in production)
  'AgriTech': 'Agriculture',
  'B2B SaaS': 'SaaS',
  'Cafe & Bakery': 'Food & Beverage',
  'Cleaning Services': 'Services',
  'Coaching & Mentoring': 'Services',
  'Consulting': 'Services',
  'Content Creator': 'Media',
  'D2C Brand': 'Retail',
  'Dental Clinic': 'Healthcare',
  'Digital Agency': 'Services',
  'Dropshipping': 'Retail',
  'E-commerce Retail': 'Retail',
  'Event Planning': 'Services',
  'Food Delivery': 'Food & Beverage',
  'Freelance Services': 'Services',
  'Gaming': 'Media',
  'Gym & Fitness': 'Beauty & Wellness',
  'Hotel & Hospitality': 'Services',
  'HR & Recruiting': 'Services',
  'InsurTech': 'Fintech',
  'Legal Services': 'Services',
  'Logistics & Delivery': 'Logistics',
  'Newsletter Business': 'Media',
  'Online Education': 'Education',
  'Online Marketplace': 'Marketplace',
  'Pet Services': 'Services',
  'Photography': 'Services',
  'PropTech': 'Real Estate',
  'Restaurant': 'Food & Beverage',
  'SaaS Startup': 'SaaS',
  'Security Services': 'Services',
  'Spa & Beauty': 'Beauty & Wellness',
  'Telehealth': 'Healthcare',
  'Travel & Booking': 'Services',
  'Yoga & Pilates Studio': 'Beauty & Wellness',
};

function normalizeSector(s: string | null | undefined): string | null {
  if (!s) return null;
  return SECTOR_MAP[s] ?? s;
}

const cache = new Map<string, Promise<BenchmarkResult>>();

function ckey(m: BenchmarkMetric, c: BenchmarkContext): string {
  return `${m}|${c.sector ?? ''}|${c.businessModel ?? ''}|${c.country ?? ''}|${c.cityTier ?? ''}|${c.stage ?? ''}|${c.size ?? ''}`;
}

export async function lookupBenchmark(
  metric: BenchmarkMetric,
  ctx: BenchmarkContext = {}
): Promise<BenchmarkResult> {
  const k = ckey(metric, ctx);
  const cached = cache.get(k);
  if (cached) return cached;

  const promise = (async (): Promise<BenchmarkResult> => {
    const { data, error } = await supabase.rpc('benchmark_lookup', {
      p_metric: metric,
      p_sector: normalizeSector(ctx.sector),
      p_business_model: ctx.businessModel ?? null,
      p_country: ctx.country ?? null,
      p_city_tier: ctx.cityTier ?? null,
      p_stage: ctx.stage ?? null,
      p_size: ctx.size ?? null,
    });
    if (error || !data) {
      return { matched: false, metric, reason: error?.message ?? 'rpc_error' };
    }
    const d = data as Record<string, unknown>;
    return {
      matched: Boolean(d.matched),
      metric,
      matchLevel: d.match_level as BenchmarkResult['matchLevel'],
      p25: d.p25 as number | undefined,
      p50: d.p50 as number | undefined,
      p75: d.p75 as number | undefined,
      source: d.source as string | undefined,
      sampleSize: d.sample_size as number | undefined,
      dataVersion: d.data_version as string | undefined,
      dataDate: d.data_date as string | undefined,
      reason: d.reason as string | undefined,
    };
  })();

  cache.set(k, promise);
  return promise;
}

/** Format a value into the unit shown for that metric. */
export function formatBenchmarkValue(metric: BenchmarkMetric, v: number | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  const pct = ['gross_margin', 'operating_margin', 'ebitda_margin', 'revenue_growth_yoy',
    'rent_pct_rev', 'payroll_pct_rev', 'marketing_pct_rev', 'churn_monthly',
    'retention_12m', 'late_payment_rate', 'bad_debt_pct_rev'];
  const dollars = ['cac', 'ltv', 'arpu'];
  const months = ['cac_payback', 'invoice_terms_days'];
  const ratio = ['ltv_cac_ratio'];
  if (pct.includes(metric)) return `${(v * 100).toFixed(1)}%`;
  if (dollars.includes(metric)) return `$${Math.round(v).toLocaleString('en-US')}`;
  if (months.includes(metric)) return `${v.toFixed(0)} ${metric === 'invoice_terms_days' ? 'd' : 'mo'}`;
  if (ratio.includes(metric)) return `${v.toFixed(2)}x`;
  if (metric === 'survival_years') return `${v.toFixed(1)}y`;
  return v.toFixed(2);
}

/** Compact citation: "AIWMC Master v2.0 · n=19,500 · 2025-04" */
export function compactCitation(b: BenchmarkResult): string {
  if (!b.matched) return 'Estimated · No direct benchmark';
  const date = (b.dataDate ?? '').slice(0, 7);
  return `${b.source ?? 'AIWMC'} · n=${(b.sampleSize ?? 0).toLocaleString('en-US')} · ${date}`;
}
