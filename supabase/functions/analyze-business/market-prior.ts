/**
 * Market Prior Engine — Bayesian anomaly scoring
 * Turns static benchmarks into a probabilistic sanity engine.
 * 
 * For each user metric, computes z-score and percentile rank against
 * the industry distribution, then generates an "Anomaly Card."
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ========== TYPES ==========

export interface DistributionRecord {
  naics_code: string;
  segment: string;
  metric_name: string;
  mean: number;
  stddev: number;
  p10: number | null;
  p25: number | null;
  median: number | null;
  p75: number | null;
  p90: number | null;
  sample_size: number | null;
  source: string | null;
}

export interface AnomalyScore {
  metric: string;
  metricLabel: string;
  userValue: number;
  percentile: number;
  zScore: number;
  typicalRange: { p25: number; p75: number };
  fullRange: { p10: number; p90: number };
  severity: 'normal' | 'notable' | 'outlier';
  explanation: string;
}

export interface MarketPriorResult {
  anomaly_card: AnomalyScore[];
  industry_match: string;
  distributions_used: number;
  peer_group_label: string;
}

// ========== NAICS MAPPING ==========

const INDUSTRY_TO_NAICS: Record<string, string> = {
  'saas': 'saas', 'saas_startup': 'saas_startup', 'b2b_saas': 'b2b_saas',
  'ecommerce': 'ecommerce_retail', 'ecommerce_retail': 'ecommerce_retail',
  'dropshipping': 'dropshipping', 'marketplace': 'marketplace',
  'food_service': 'restaurant', 'restaurant': 'restaurant',
  'cafe_bakery': 'cafe_bakery', 'food_delivery': 'food_delivery',
  'consulting': 'consulting', 'agency': 'agency', 'freelance': 'freelance',
  'fitness': 'gym_fitness', 'gym_fitness': 'gym_fitness',
  'yoga_pilates': 'yoga_pilates', 'spa_beauty': 'spa_beauty',
  'education': 'online_education', 'online_education': 'online_education',
  'coaching': 'coaching',
  'healthcare': 'healthcare', 'fintech': 'fintech',
  'media': 'media', 'real_estate': 'real_estate',
  'logistics': 'logistics', 'general': 'general',
};

const METRIC_LABELS: Record<string, string> = {
  gross_margin: 'Gross Margin (%)',
  net_margin: 'Net Margin (%)',
  cac: 'Customer Acquisition Cost ($)',
  ltv: 'Lifetime Value ($)',
  ltv_cac_ratio: 'LTV:CAC Ratio',
  cogs_percent: 'COGS (%)',
  average_check: 'Average Transaction ($)',
  churn_rate_monthly: 'Monthly Churn (%)',
  salaries_fixed: 'Staff Costs ($/mo)',
  rent_fixed: 'Rent ($/mo)',
  growth_rate: 'Growth Rate (%)',
  client_lifetime_months: 'Client Lifetime (months)',
};

// ========== Z-SCORE & PERCENTILE ==========

/** Standard normal CDF approximation (Abramowitz & Stegun) */
function normalCDF(z: number): number {
  if (z < -6) return 0;
  if (z > 6) return 1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

function computeZScore(value: number, mean: number, stddev: number): number {
  if (stddev <= 0) return 0;
  return (value - mean) / stddev;
}

function computePercentile(z: number): number {
  return Math.round(normalCDF(z) * 100);
}

function classifySeverity(percentile: number): 'normal' | 'notable' | 'outlier' {
  if (percentile < 10 || percentile > 90) return 'outlier';
  if (percentile < 25 || percentile > 75) return 'notable';
  return 'normal';
}

// ========== EXPLANATION GENERATOR ==========

function generateExplanation(metric: string, label: string, userValue: number, percentile: number, p25: number, p75: number): string {
  const peerPosition = percentile <= 10 ? 'far below' :
    percentile <= 25 ? 'below' :
    percentile <= 75 ? 'within' :
    percentile <= 90 ? 'above' : 'far above';

  const direction = percentile < 50 ? 'lower than' : 'higher than';

  if (percentile <= 10 || percentile >= 90) {
    return `Your ${label.toLowerCase()} (${formatValue(metric, userValue)}) is in the ${ordinal(percentile)} percentile — ${direction} ${percentile < 50 ? 100 - percentile : percentile}% of similar businesses. Typical range: ${formatValue(metric, p25)}–${formatValue(metric, p75)}.`;
  }
  if (percentile <= 25 || percentile >= 75) {
    return `Your ${label.toLowerCase()} (${formatValue(metric, userValue)}) is ${peerPosition} the typical range (${formatValue(metric, p25)}–${formatValue(metric, p75)}) for your peer group.`;
  }
  return `Your ${label.toLowerCase()} (${formatValue(metric, userValue)}) is within the normal range for your peer group (${formatValue(metric, p25)}–${formatValue(metric, p75)}).`;
}

function formatValue(metric: string, value: number): string {
  if (metric.includes('margin') || metric.includes('percent') || metric.includes('churn') || metric.includes('growth')) {
    return `${value.toFixed(1)}%`;
  }
  if (metric.includes('cac') || metric.includes('ltv') || metric.includes('check') || metric.includes('salaries') || metric.includes('rent')) {
    return `$${Math.round(value).toLocaleString()}`;
  }
  if (metric.includes('ratio')) {
    return `${value.toFixed(1)}x`;
  }
  if (metric.includes('months')) {
    return `${Math.round(value)} mo`;
  }
  return value.toFixed(1);
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ========== MAIN FUNCTIONS ==========

export function mapToNAICS(industryId: string): string {
  return INDUSTRY_TO_NAICS[industryId] || industryId || 'general';
}

export async function fetchDistributions(
  supabase: SupabaseClient,
  naicsCode: string
): Promise<DistributionRecord[]> {
  // Try exact match first
  const { data, error } = await supabase
    .from('industry_distributions')
    .select('*')
    .eq('naics_code', naicsCode);

  if (!error && data && data.length > 0) return data;

  // Fallback: try 'general'
  const { data: fallback } = await supabase
    .from('industry_distributions')
    .select('*')
    .eq('naics_code', 'general');

  return fallback || [];
}

export function computeAnomalyScores(
  userMetrics: Record<string, number>,
  distributions: DistributionRecord[]
): AnomalyScore[] {
  const scores: AnomalyScore[] = [];

  for (const dist of distributions) {
    const userValue = userMetrics[dist.metric_name];
    if (userValue === undefined || userValue === null) continue;

    const z = computeZScore(userValue, dist.mean, dist.stddev);
    const percentile = computePercentile(z);
    const severity = classifySeverity(percentile);
    const label = METRIC_LABELS[dist.metric_name] || dist.metric_name;
    const p25 = dist.p25 ?? dist.mean - dist.stddev * 0.675;
    const p75 = dist.p75 ?? dist.mean + dist.stddev * 0.675;
    const p10 = dist.p10 ?? dist.mean - dist.stddev * 1.282;
    const p90 = dist.p90 ?? dist.mean + dist.stddev * 1.282;

    scores.push({
      metric: dist.metric_name,
      metricLabel: label,
      userValue,
      percentile,
      zScore: Math.round(z * 100) / 100,
      typicalRange: { p25, p75 },
      fullRange: { p10, p90 },
      severity,
      explanation: generateExplanation(dist.metric_name, label, userValue, percentile, p25, p75),
    });
  }

  // Sort: outliers first, then notable, then normal
  const severityOrder = { outlier: 0, notable: 1, normal: 2 };
  scores.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return scores;
}

export function generateMarketPrior(
  anomalyScores: AnomalyScore[],
  naicsCode: string,
  distributionsCount: number
): MarketPriorResult {
  return {
    anomaly_card: anomalyScores,
    industry_match: naicsCode,
    distributions_used: distributionsCount,
    peer_group_label: `${naicsCode.replace(/_/g, ' ')} sector peers`,
  };
}
