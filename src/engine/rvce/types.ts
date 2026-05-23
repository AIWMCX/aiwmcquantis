/**
 * RVCE — Reality Validation & Calibration Engine (Layer 8)
 * Type definitions shared between client + edge function.
 */

export type ValidationStatus = 'OK' | 'WARN' | 'OUTLIER' | 'NO_DATA';
export type FlagSeverity = 'high' | 'medium' | 'low';
export type RvceRunStatus = 'COMPLETED' | 'PARTIAL' | 'UNAVAILABLE';

export interface ReferenceClass {
  id: string;
  description: string;
  industry?: string;
  geo_region?: string;
  business_model?: string;
  sample_size: number;
}

export interface MetricValidation {
  original_value: number;
  external_median: number | null;
  p25: number | null;
  p75: number | null;
  status: ValidationStatus;
  discrepancy_score: number;
  recommended_value?: number;
  notes: string;
  observation_count: number;
  web_search_fired?: boolean;
  sources_used?: number;
}

export interface ValidationFlag {
  severity: FlagSeverity;
  metric: string;
  message: string;
  impacted_sections: string[];
}

export interface EvidenceSample {
  metric: string;
  source: string;
  summary: string;
  value: number;
  url?: string;
}

export interface AnalysisCorePayload {
  analysis_id: string;
  business_profile: {
    title: string;
    description: string;
    industry: string;
    business_model: string;
    location_city: string;
    location_country: string;
    stage: string;
  };
  core_metrics: Record<string, number>;
}

export interface SearchHealth {
  total_metrics_searched: number;
  web_search_fired_count: number;
  web_search_fired_ratio: number;
  total_observations_collected: number;
  total_source_urls: number;
  fallback_queries_used: number;
  metrics_with_zero_observations: number;
}

export interface SearchDiagnosticEntry {
  metric: string;
  queries_sent: string[];
  web_search_tool_fired: boolean;
  tool_use_count: number;
  tool_result_count: number;
  raw_results_found: number;
  parsed_observations: number;
  fallback_used: boolean;
  source_urls: string[];
  error: string | null;
}

export interface AnalysisValidationPayload {
  analysis_id: string;
  rvce_version: string;
  global_confidence_score: number;
  reference_classes: ReferenceClass[];
  metrics_validation: Record<string, MetricValidation>;
  flags: ValidationFlag[];
  evidence_samples: EvidenceSample[];
  latency_ms: number;
  status: RvceRunStatus;
  search_health?: SearchHealth;
  search_diagnostics?: SearchDiagnosticEntry[];
}

export const METRICS_TO_VALIDATE = [
  'revenue_monthly',
  'gross_margin_pct',
  'total_opex_monthly',
  'opex_marketing_monthly',
  'opex_rent_monthly',
  'opex_payroll_monthly',
  'ltv',
  'cac',
  'ltv_cac_ratio',
  'cac_payback_months',
  'startup_investment_total',
  'som_year1_revenue',
] as const;

export type ValidatableMetric = (typeof METRICS_TO_VALIDATE)[number];

export const METRIC_LABELS: Record<string, string> = {
  revenue_monthly: 'Monthly Revenue',
  gross_margin_pct: 'Gross Margin %',
  total_opex_monthly: 'Total OPEX',
  opex_marketing_monthly: 'Marketing Spend',
  opex_rent_monthly: 'Rent',
  opex_payroll_monthly: 'Payroll',
  ltv: 'Customer LTV',
  cac: 'Customer Acquisition Cost',
  ltv_cac_ratio: 'LTV:CAC Ratio',
  cac_payback_months: 'CAC Payback Period',
  startup_investment_total: 'Startup Investment',
  som_year1_revenue: 'Year 1 Revenue (SOM)',
};

export const RVCE_VERSION = 'rvce-0.2.0';
