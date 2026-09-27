// ============================================
// UNIVERSAL BUSINESS FINANCIAL ANALYSIS SYSTEM
// ============================================

import type { ArchetypeId } from '@/config/business-archetypes';

// Validation Result Interface
export interface ValidationCorrection {
  field: string;
  original: number;
  corrected: number;
  reason: string;
}

export interface ValidationWarning {
  field: string;
  value: number | string;
  expected: string;
  severity: 'warning' | 'error';
  message: string;
}

export interface CalculationAuditEntry {
  formula: string;
  inputs: Record<string, number>;
  result: number;
  isValid: boolean;
  notes?: string;
}

// Confidence Breakdown for transparent scoring
export interface ConfidenceBreakdown {
  input_completeness: number;    // 0-100 score
  data_quality: number;          // 0-100 score
  validation_score: number;      // 0-100 score
  industry_relevance: number;    // 0-100 score
  details: string[];             // Explanation of score factors
}

// Accuracy session 2026-08-04 (Confidence semantics, Priority 1): the
// mirror of supabase/functions/_shared/quality-dimensions.ts's types.
// Decomposes the single blended reliability_score into separately-labeled
// dimensions so no UI surface has to present one percentage as if it
// measured forecast accuracy. See that file for which dimensions are real
// signals vs. explicitly UNVERIFIED/NOT_AVAILABLE.
export type QualityStatus = 'PASS' | 'WARN' | 'FAIL' | 'UNVERIFIED' | 'NOT_AVAILABLE' | 'CORRECTED';

export interface QualityDimensions {
  input_completeness: number;
  source_coverage: number;
  benchmark_match_quality: QualityStatus;
  scenario_reconciliation: QualityStatus;
  narrative_reconciliation: QualityStatus;
  formula_reconciliation: QualityStatus;
  outcome_calibration: QualityStatus;
  evidence: {
    source_coverage: string;
    benchmark_match_quality: string;
    scenario_reconciliation: string;
    narrative_reconciliation: string;
    formula_reconciliation: string;
    outcome_calibration: string;
  };
}

export interface ValidationResult {
  is_realistic: boolean;
  is_profitable: boolean;
  was_auto_corrected: boolean;
  reliability_score: number;
  corrections: ValidationCorrection[];
  warnings: ValidationWarning[];
  calculation_audit: CalculationAuditEntry[];
  break_even_revenue: number;
  revenue_for_45k_profit: number;
  industry_detected?: string;
  confidence_breakdown?: ConfidenceBreakdown;
  quality_dimensions?: QualityDimensions;
  improvement_suggestions?: string[];
  summary: string;
}

// Input Variables (12 Universal Variables)
export interface BusinessInputVariables {
  // Revenue Variables
  price_per_unit: number;        // P - Price per unit
  units_sold_monthly: number;    // N - Number of units/customers per month
  purchase_frequency: number;    // F - Average purchase frequency
  upsell_per_customer: number;   // U - Upsell or extras per customer

  // Cost Variables
  cogs_per_unit: number;         // C - COGS per unit
  fixed_opex: number;            // O - Fixed operating expenses
  marketing_budget: number;      // M - Marketing budget per month
  cac: number;                   // A - Customer acquisition cost

  // Investment Variables
  startup_investment: number;    // I - Initial investment
  capex: number;                 // K - Capital expenditures

  // Retention Variables
  ltv: number;                   // L - Lifetime value
  churn_rate: number;            // H - Monthly churn rate (decimal)
}

// Scenario Analysis
export interface ScenarioMetrics {
  revenue: number;
  variable_costs: number;
  fixed_costs: number;
  gross_profit: number;
  net_profit: number;
  gross_margin: number;
  net_margin: number;
}

export interface ScenarioAnalysis {
  pessimistic: ScenarioMetrics;
  base: ScenarioMetrics;
  optimistic: ScenarioMetrics;
}

// Unit Economics
export interface UnitEconomics {
  contribution_margin: number;      // CM = P - C
  contribution_margin_ratio: number; // CMR = (P - C) / P
  cac: number;                       // A - Customer Acquisition Cost
  cac_payback_months: number;        // PP = A / CM
  ltv: number;                       // L = (P - C) / H
  ltv_cac_ratio: number;            // LTV:CAC ratio
}

// Breakeven Analysis
export interface BreakevenAnalysis {
  breakeven_units: number;          // N_BE = OPEX / (P - C)
  breakeven_revenue: number;        // R_BE = N_BE * P
  breakeven_months: number;         // Time to reach breakeven
}

// Investment Returns
export interface InvestmentReturns {
  payback_period_months: number;    // T = I / NP
  roi_year_1: number;               // ROI = (NP * 12) / I
  roi_year_3: number;
  npv_3_years: number;
}

// Risk Scenario Analysis
export interface RiskScenario {
  scenario: string;
  description: string;
  impact_on_revenue: number;        // % change
  impact_on_costs: number;          // % change
  resulting_profit: number;
  probability: 'низкая' | 'средняя' | 'высокая';
}

export interface RiskAnalysis {
  revenue_drop_20: RiskScenario;
  costs_rise_15: RiskScenario;
  cac_doubles: RiskScenario;
  churn_increase: RiskScenario;
}

// Financial Analysis (Universal with backward compatibility)
export interface FinancialAnalysis {
  // Input variables used
  inputs?: BusinessInputVariables;
  
  // Revenue calculations
  mrr?: number;
  arr?: number;
  
  // 3 Scenario Analysis
  scenarios?: ScenarioAnalysis;
  
  // Unit Economics
  unit_economics?: UnitEconomics;
  
  // Breakeven
  breakeven?: BreakevenAnalysis;
  
  // Investment Returns
  returns?: InvestmentReturns;
  
  // Startup Investment Breakdown
  startup_investment: {
    total: number;
    breakdown: {
      rent_deposit: number;
      equipment: number;
      inventory: number;
      legal: number;
      marketing_initial: number;
      working_capital: number;
    };
    reasoning: string;
  };
  
  // Monthly Expenses Breakdown
  monthly_expenses: {
    total: number;
    variable_costs?: number;
    fixed_costs?: number;
    breakdown: {
      rent: number;
      utilities: number;
      salaries: number;
      inventory_replenishment: number;
      marketing: number;
      other: number;
    };
  };
  
  // Risk Analysis
  risk_analysis?: RiskAnalysis;
  
  // Summary calculations
  calculations_summary?: string;

  // BACKWARD COMPATIBILITY - old fields (deprecated)
  monthly_revenue?: {
    conservative: number;
    realistic: number;
    optimistic: number;
    reasoning: string;
  };
  monthly_profit?: number;
  payback_period_months?: number;
  break_even_months?: number;
  roi_year_1?: number;
}

// Helper functions for backward compatibility
export function getMonthlyProfit(financial: FinancialAnalysis): number {
  if (financial.scenarios?.base?.net_profit !== undefined) {
    return financial.scenarios.base.net_profit;
  }
  return financial.monthly_profit ?? 0;
}

export function getPaybackMonths(financial: FinancialAnalysis): number {
  const raw = financial.returns?.payback_period_months ?? financial.payback_period_months ?? 0;
  return raw;
}

export function getMonthlyRevenue(financial: FinancialAnalysis): number {
  if (financial.mrr !== undefined) {
    return financial.mrr;
  }
  return financial.monthly_revenue?.realistic ?? 0;
}

// Business Plan Types
export interface LaunchStep {
  step: number;
  title: string;
  description: string;
  duration: string;
  cost: number;
}

export interface BusinessRisk {
  risk: string;
  probability: 'низкая' | 'средняя' | 'высокая';
  impact: 'низкий' | 'средний' | 'высокий';
  mitigation: string;
}

export interface BusinessPlan {
  executive_summary: string;
  product_description: string;
  target_audience: string;
  competitive_advantages: string;
  operations: string;
  launch_steps: LaunchStep[];
  risks: BusinessRisk[];
}

// Marketing Plan Types
export interface MarketingChannel {
  channel: string;
  description: string;
  budget_monthly: number;
  expected_roi: string;
}

export interface MarketingPlan {
  positioning: string;
  pricing_strategy: string;
  channels: MarketingChannel[];
  cac: number;
  ltv: number;
  first_3_months_plan: string;
}

// Market Analysis Types
export interface Competitor {
  name: string;
  strengths: string;
  weaknesses: string;
}

export interface MarketAnalysis {
  market_size: {
    tam: string;
    sam: string;
    som: string;
  };
  trends: string[];
  competition: {
    main_competitors: (string | Competitor)[];
    competitive_landscape: string;
    market_gaps: string;
  };
  barriers_to_entry: string;
  growth_opportunities: string;
}

// ========== MARKET PRIOR / ANOMALY CARD ==========
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

export interface MarketPrior {
  anomaly_card: AnomalyScore[];
  industry_match: string;
  distributions_used: number;
  peer_group_label: string;
}

// ========== SCORE COMPLIANCE ==========
export interface SCORECompliance {
  score: number;
  filledFields: string[];
  missingFields: string[];
  inconsistencies: Array<{ field: string; issue: string }>;
}

// Complete Analysis Response
export interface BusinessAnalysisResult {
  // Server-generated at analyze-business time (Handbook §19 item 9 follow-up).
  // Threaded into the analyses insert so analysis_snapshots.correlation_id
  // can be joined to analyses.analysis_correlation_id without ever mutating
  // the immutable snapshot row.
  analysis_correlation_id?: string;
  // Domain 5/12 audit (Q41/Q45/Q119/Q165/Q179): server-side detector flags
  // when the free-text idea's detected business archetype (see
  // src/config/business-archetypes.ts) has 'poor' fit against the
  // MRR-shaped engine. Frontend renders a prominent honest banner when
  // set. See supabase/functions/_shared/revenue-shape-detector.ts.
  // Informational business-archetype classification (may be absent if
  // unclassified) -- does not change which formulas ran. See
  // src/config/business-archetypes.ts.
  detected_archetype?: ArchetypeId;
  model_applicability_warning?: {
    detected_shape: ArchetypeId;
    engine_assumes: 'steady_monthly_transactions';
    severity: 'warn';
    matched_phrase: string;
    explanation: string;
  };
  financial_analysis: FinancialAnalysis;
  business_plan: BusinessPlan;
  marketing_plan: MarketingPlan;
  market_analysis: MarketAnalysis;
  actionable_insights?: ActionableInsightsAnalysis;
  confidence_score: number;
  data_sources: string[];
  limitations: string[];
  // CodeRabbit catch on PR #88: usePdfExport.ts's degraded-mode labeling
  // (GTM-audit item #2) reads this to know whether the AI narrator ran.
  // Set server-side in analyze-business/index.ts's response AND
  // client-side in analysisApi.ts's emergencyFallbackAnalysis() (the
  // separate fallback used when the analysis service call fails entirely
  // at the network level, not just when the AI step within it fails) --
  // both paths must set it so a PDF exported from either kind of fallback
  // gets the same "(DETERMINISTIC ONLY)" labeling, not just the server one.
  used_fallback?: boolean;
  validation?: ValidationResult;
  // Document tracking
  documents_used?: DocumentUsage[];
  document_analysis_summary?: DocumentAnalysisSummary;
  // CTO Architecture Upgrades
  assumption_graph?: {
    nodes: Array<{ id: string; label: string; value: number; source: string; confidence: number }>;
    edges: Array<{ from: string; to: string; weight: number }>;
    criticalPath: Array<{ assumption: string; sensitivity: number; breakingThreshold: number; currentValue: number; direction: string; recommendation: string }>;
    fragility_score: number;
  };
  sanity_flags?: Array<{ rule_id: string; severity: string; explanation: string; suggested_correction: string }>;
  model_confidence?: {
    confidence: number;
    assumption_risk: number;
    recommendation_level: 'safe' | 'caution' | 'high_risk';
    factors: Array<{ factor: string; score: number; weight: number; explanation: string }>;
    similar_cases_count?: number;
  };
  case_id?: string;
  // Market Prior Engine
  market_prior?: MarketPrior;
  // SCORE Compliance
  score_compliance?: SCORECompliance;
  metadata: {
    idea: string;
    location: string;
    industry_detected?: string;
    location_cost_multiplier?: number;
    generated_at: string;
    model: string;
    version: string;
    /** Access attached to the generated report, not the viewer's current plan. */
    access?: {
      decision_bundle: 'complimentary' | 'paid';
      includes?: Array<'full_analysis' | 'pre_mortem' | 'scenario_model'>;
      monthly_limit?: number;
      remaining_after_run?: number | null;
    };
    /**
     * The server's real Benchmark Master match (~97,500-row dataset),
     * computed once at analysis time. CodeRabbit catch (PR #100): this
     * field existed and was already read via an `any` cast in several
     * places (usePdfExport.ts, BeatMissEngine.tsx) -- declaring it here
     * means a future rename/omission fails typecheck instead of silently
     * falling back to a static estimate.
     */
    benchmarks?: ServerBenchmarkRecord[];
  };
}

/** Shape of supabase/functions/analyze-business/benchmark-records.ts's BenchmarkRecord. */
export interface ServerBenchmarkRecord {
  metric: string;
  value: number | null;
  p25: number | null;
  median: number | null;
  p75: number | null;
  sample_size: number;
  source: string | null;
  match_type: 'direct' | 'similar' | 'none' | string;
}

// API Response wrapper
export interface AnalysisAPIResponse {
  success: boolean;
  data?: BusinessAnalysisResult;
  error?: string;
  code?: string;
  // Pro-depth async path: backend returns 202 with these instead of `data`.
  queued?: boolean;
  job_id?: string;
  request_id?: string;
}

// Returned by generateAnalysis() when the backend enqueued a Pro job
// instead of producing a synchronous result. The UI is expected to poll
// the analysis_jobs table via useProAnalysisJob until completion.
export interface QueuedAnalysisJob {
  kind: 'queued_job';
  job_id: string;
  request_id?: string;
  depth_requested: 'pro';
}

// Free/anonymous depth: the backend deliberately strips paid-tier fields
// (compute-leakage prevention layer 3, analyze-business/index.ts ~4320) and
// returns this slim shape instead of a full BusinessAnalysisResult. It has
// no `financial_analysis`, so it must be recognized as its own success kind
// rather than run through the full-report renderer or misread as a failure
// (BUG: previously every free/anon analysis was treated as a client error,
// silently retried 3x, then surfaced as ANALYSIS_UNAVAILABLE — fixed 2026-07-30).
export interface FreeTierAnalysisSummary {
  kind: 'free_tier_summary';
  // "score" (blended reliabilityScore) deprecated 2026-08-17 -- see
  // supabase/functions/analyze-business/index.ts wirePayload for the full
  // root-cause writeup. It defaulted unmeasured components to "healthy" and
  // produced misleadingly high numbers (e.g. 90) on zero-input requests.
  // input_completeness (0-100, from the PR #27 quality_dimensions
  // architecture) replaces it: it only measures how much real input the
  // user supplied, never business viability/accuracy.
  input_completeness: number | null;
  verdict: string | null;
  top_risks: unknown[];
  base_revenue: number | null;
  currency: string;
  industry_detected?: string;
  location: string;
  idea: string;
  upgrade_cta?: {
    message: string;
    features_locked: string[];
    plus_price_monthly: number;
    plus_trial_days: number;
    pro_trial_days: number;
  };
}

export type AnalysisGenerationResult =
  | BusinessAnalysisResult
  | QueuedAnalysisJob
  | FreeTierAnalysisSummary;

export function isQueuedAnalysisJob(
  v: AnalysisGenerationResult,
): v is QueuedAnalysisJob {
  return (v as QueuedAnalysisJob)?.kind === 'queued_job';
}

export function isFreeTierAnalysisSummary(
  v: AnalysisGenerationResult,
): v is FreeTierAnalysisSummary {
  return (v as FreeTierAnalysisSummary)?.kind === 'free_tier_summary';
}

// History Entry for localStorage
export interface AnalysisHistoryEntry {
  id: string;
  idea: string;
  location: string;
  result: BusinessAnalysisResult;
  created_at: string;
  // Client workspace (Stage 5): which client business-entity this Decision
  // Run was for, if any. Always optional -- a decision without a client_id
  // works exactly as before. client_name is denormalized in via the join in
  // getAnalyses() purely for display; the client_id/clients row remains the
  // one source of truth for the client's own fields.
  client_id?: string | null;
  client_name?: string | null;
}

// Client workspace (Stage 5): a business-entity record so a consultant/CFO
// doing repeat decisions for the same client can group them together. See
// supabase/migrations/20260927050000_clients_table.sql. Deliberately NOT a
// full CRM record -- just enough identity + reusable context to link
// Decision Runs and pre-fill the next one.
export interface Client {
  id: string;
  owner_user_id: string;
  name: string;
  industry?: string | null;
  location?: string | null;
  baseline_assumptions?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Industry Option for selector
export interface IndustryOption {
  id: string;
  name: string;
  icon: string;
  description: string;
}

// Available industries (must match backend INDUSTRY_BENCHMARKS)
export const INDUSTRY_OPTIONS: IndustryOption[] = [
  { id: 'auto', name: 'Auto-detect', icon: '🔍', description: 'Let AI detect from your description' },
  { id: 'saas', name: 'SaaS / Software', icon: '💻', description: 'Software, apps, platforms, subscriptions' },
  { id: 'ecommerce', name: 'E-commerce / Retail', icon: '🛒', description: 'Online stores, marketplaces, dropshipping' },
  { id: 'food_service', name: 'Food & Beverage', icon: '🍽️', description: 'Restaurants, cafes, food delivery' },
  { id: 'consulting', name: 'Consulting / Professional', icon: '💼', description: 'Agencies, coaching, B2B services' },
  { id: 'fitness', name: 'Fitness / Wellness', icon: '💪', description: 'Gyms, yoga, personal training, spas' },
  { id: 'education', name: 'Education / Courses', icon: '📚', description: 'Online courses, tutoring, bootcamps' },
  { id: 'healthcare', name: 'Healthcare / Medical', icon: '🏥', description: 'Clinics, telehealth, wellness' },
  { id: 'fintech', name: 'Fintech / Financial', icon: '💳', description: 'Payments, investing, crypto, banking' },
  { id: 'media', name: 'Media / Content', icon: '📺', description: 'Streaming, podcasts, newsletters' },
  { id: 'real_estate', name: 'Real Estate / Property', icon: '🏠', description: 'Rentals, property management' },
  { id: 'logistics', name: 'Logistics / Delivery', icon: '🚚', description: 'Shipping, courier, fulfillment' },
  { id: 'general', name: 'General Business', icon: '📦', description: 'Other business types' },
];

// Optional Financial Inputs for higher confidence
export interface OptionalFinancialInputs {
  startup_investment?: number;      // Initial investment amount
  monthly_revenue?: number;         // Expected monthly revenue
  average_price?: number;           // Price per product/service
  expected_customers?: number;      // Monthly customer count
  monthly_costs?: number;           // Expected operating costs
  cac?: number;                     // Customer acquisition cost
  churn_rate?: number;              // Monthly churn (%)
  selected_industry?: string;       // User-selected industry (overrides auto-detection)
}

// Document data for file uploads
export interface ExtractedDocumentFinancials {
  revenue?: { total?: number; monthly?: number; quarterly?: number; annual?: number; breakdown?: Record<string, number> };
  costs?: { total?: number; monthly?: number; breakdown?: Record<string, number> };
  metrics?: { roi?: number; profit_margin?: number; net_profit?: number; conversion_rate?: number; customer_count?: number; mrr?: number; arr?: number; cac?: number; ltv?: number };
  investment?: { total?: number; breakdown?: Record<string, number> };
  document_type: string;
  confidence: number;
  key_findings: string[];
  source_document: string;
  extraction_notes: string[];
}

export interface DocumentData {
  name: string;
  type: string;
  parsedContent: string;
  extractedFinancials?: ExtractedDocumentFinancials;
}

// Document usage tracking in results
export interface DocumentUsage {
  source_document: string;
  document_type: string;
  confidence: number;
  metrics_extracted: string[];
}

export interface DocumentAnalysisSummary {
  totalDocuments: number;
  confidenceBoost: number;
  dataPointsUsed: number;
  primaryDataSource: string;
}

// Request types
export interface AnalysisRequest {
  idea: string;
  location: string;
  financial_inputs?: OptionalFinancialInputs;
  documents?: DocumentData[];
  analysis_depth?: 'quick' | 'full' | 'deep' | 'pro';
}

// 10 Key Outputs that every analysis must show
export interface AnalysisKeyOutputs {
  mrr: number;
  arr: number;
  gross_margin: number;
  net_margin: number;
  unit_economics_summary: string;
  cac_payback_months: number;
  ltv_cac_ratio: number;
  breakeven_units: number;
  monthly_profit: number;
  annual_roi: number;
  payback_months: number;
}

// ============================================
// ACTIONABLE INSIGHTS ENGINE TYPES
// ============================================

export interface ActionableTactic {
  action: string;
  expected_impact: string;
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
  cost_estimate?: string;
}

export interface ActionableInsight {
  id: string;
  metric_name: string;
  current_value: number | string;
  target_value: number | string;
  gap: number | string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'danger' | 'warning' | 'healthy' | 'excellent';
  headline: string;
  explanation: string;
  why_it_matters: string;
  action_plan: {
    strategy: string;
    tactics: ActionableTactic[];
    expected_outcome: string;
    time_to_result: string;
  };
}

export interface InsightsSummary {
  total_insights: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  overall_health: 'critical' | 'needs_work' | 'healthy' | 'excellent';
  top_priority: string;
  quick_wins: string[];
}

export interface ActionableInsightsAnalysis {
  summary: InsightsSummary;
  insights: ActionableInsight[];
  generated_at: string;
}
