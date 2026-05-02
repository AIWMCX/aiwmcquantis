/**
 * Benchmark Lookup Service
 * Fetches P25/P50/P75 from the 95,500-row Benchmark Master library
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
      p_sector: ctx.sector ?? null,
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
  if (dollars.includes(metric)) return `$${Math.round(v).toLocaleString()}`;
  if (months.includes(metric)) return `${v.toFixed(0)} ${metric === 'invoice_terms_days' ? 'd' : 'mo'}`;
  if (ratio.includes(metric)) return `${v.toFixed(2)}x`;
  if (metric === 'survival_years') return `${v.toFixed(1)}y`;
  return v.toFixed(2);
}

/** Compact citation: "AIWMC Master v2.0 · n=19,500 · 2025-04" */
export function compactCitation(b: BenchmarkResult): string {
  if (!b.matched) return 'Estimated · No direct benchmark';
  const date = (b.dataDate ?? '').slice(0, 7);
  return `${b.source ?? 'AIWMC'} · n=${(b.sampleSize ?? 0).toLocaleString()} · ${date}`;
}
