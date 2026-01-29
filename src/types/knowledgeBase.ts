/**
 * Knowledge Base Type Definitions for AIWMC Quantis
 * These types power the deterministic financial calculations and AI recommendations
 */

// ============================================
// LOCATION DATA TYPES
// ============================================

export interface LocationData {
  id: string;
  city_id: string;
  city: string;
  country: string;
  region: LocationRegion;
  
  // Cost indices (1.0 = US average)
  overall_cost_index: number;
  salary_multiplier: number;
  rent_multiplier: number;
  utility_multiplier: number;
  
  // Business environment
  tax_burden: number | null;
  regulatory_complexity: number | null;
  market_maturity: number | null;
  
  // Locale information
  currency_code: string;
  currency_symbol: string;
  locale_code: string;
  timezone: string;
  primary_language: string;
  
  // Metadata
  keywords: string[];
  confidence_score: number;
  source: string;
  created_at: string;
  last_updated: string;
}

export type LocationRegion = 
  | 'north_america' 
  | 'europe' 
  | 'asia_pacific' 
  | 'middle_east' 
  | 'latin_america' 
  | 'africa' 
  | 'cis';

export interface LocationInsert extends Omit<LocationData, 'id' | 'created_at' | 'last_updated'> {}

// ============================================
// SCENARIO LIBRARY TYPES
// ============================================

export interface ScenarioLibrary {
  id: string;
  scenario_id: string;
  category: ScenarioCategory;
  subcategory: string | null;
  business_type: string;
  
  business_context: BusinessContext;
  user_query: string;
  expert_analysis: ExpertAnalysis;
  recommendations: ScenarioRecommendation[];
  industry_benchmarks: IndustryBenchmarkReference;
  
  tags: string[];
  difficulty_level: DifficultyLevel | null;
  urgency: UrgencyLevel | null;
  
  confidence_score: number;
  source: string;
  created_at: string;
}

export type ScenarioCategory = 
  | 'financial_planning' 
  | 'growth_strategy' 
  | 'operations' 
  | 'marketing' 
  | 'product';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
export type BusinessStage = 'pre_seed' | 'seed' | 'series_a' | 'series_b' | 'growth' | 'mature';

export interface BusinessContext {
  type: string;
  mrr?: number;
  growth_rate?: number;
  churn_rate?: number;
  customers?: number;
  team_size?: number;
  stage?: BusinessStage;
}

export interface ExpertAnalysis {
  situation_assessment: string;
  key_insights: string[];
  priority_level: UrgencyLevel;
}

export interface ScenarioRecommendation {
  priority: number;
  category: string;
  action: string;
  expected_impact: string;
  implementation: string;
  timeline: string;
}

export interface IndustryBenchmarkReference {
  healthy_growth_rate?: string;
  acceptable_churn?: string;
  target_ltv_cac_ratio?: string;
  gross_margin_target?: string;
}

// ============================================
// RISK FACTORS TYPES
// ============================================

export interface RiskFactor {
  id: string;
  risk_id: string;
  risk_category: RiskCategory;
  risk_name: string;
  description: string;
  
  applicable_industries: string[];
  applicable_stages: string[];
  applicable_regions: string[];
  
  probability: number | null;
  financial_impact: FinancialImpact | null;
  time_to_materialize: TimeToMaterialize | null;
  
  mitigation_strategies: MitigationStrategy[];
  warning_signs: string[];
  related_risks: string[];
  
  confidence_score: number;
  created_at: string;
}

export type RiskCategory = 
  | 'market' 
  | 'financial' 
  | 'operational' 
  | 'regulatory' 
  | 'competitive' 
  | 'technology';

export type FinancialImpact = 'low' | 'medium' | 'high' | 'critical';
export type TimeToMaterialize = 'immediate' | 'short_term' | 'medium_term' | 'long_term';

export interface MitigationStrategy {
  strategy: string;
  cost_estimate: number;
  effectiveness: number;
  implementation_time: string;
}

// ============================================
// LAUNCH CHECKLISTS TYPES
// ============================================

export interface LaunchChecklist {
  id: string;
  template_id: string;
  industry_id: string;
  template_name: string;
  
  phases: LaunchPhase[];
  region_requirements: RegionRequirements;
  
  total_estimated_cost: number | null;
  total_estimated_weeks: number | null;
  
  confidence_score: number;
  created_at: string;
}

export interface LaunchPhase {
  phase_number: number;
  phase_name: string;
  duration_weeks: number;
  tasks: LaunchTask[];
}

export interface LaunchTask {
  task_id: string;
  task_name: string;
  description: string;
  estimated_cost: number;
  required_time_hours: number;
  dependencies: string[];
  regulatory_requirement: boolean;
  priority: TaskPriority;
}

export type TaskPriority = 'must_have' | 'should_have' | 'nice_to_have';

export interface RegionRequirements {
  us?: string[];
  eu?: string[];
  global?: string[];
  [key: string]: string[] | undefined;
}

// ============================================
// MARKETING CHANNELS TYPES
// ============================================

export interface MarketingChannel {
  id: string;
  channel_id: string;
  channel_name: string;
  channel_category: ChannelCategory;
  
  benchmarks_by_industry: ChannelIndustryBenchmark[];
  
  best_practices: string[];
  common_mistakes: string[];
  tools_recommended: string[];
  
  confidence_score: number;
  created_at: string;
}

export type ChannelCategory = 'paid' | 'organic' | 'referral' | 'partnerships' | 'outbound';

export interface ChannelIndustryBenchmark {
  industry_id: string;
  cac_range: { min: number; max: number };
  conversion_rate: { min: number; max: number };
  time_to_first_conversion_days: number;
  scalability: 'low' | 'medium' | 'high';
  recommended_budget_percent: number;
}

// ============================================
// INDUSTRY BENCHMARKS TYPES (extends existing)
// ============================================

export interface IndustryBenchmark {
  id: string;
  industry_id: string;
  industry_name: string;
  region: string | null;
  
  // Margins
  gross_margin_min: number | null;
  gross_margin_max: number | null;
  gross_margin_avg: number | null;
  net_margin_min: number | null;
  net_margin_max: number | null;
  net_margin_avg: number | null;
  cogs_percent_min: number | null;
  cogs_percent_max: number | null;
  cogs_percent_avg: number | null;
  
  // Unit economics
  cac_min: number | null;
  cac_max: number | null;
  cac_typical: number | null;
  ltv_min: number | null;
  ltv_max: number | null;
  ltv_typical: number | null;
  ltv_cac_ratio_min: number | null;
  ltv_cac_ratio_max: number | null;
  
  // Transaction metrics
  average_check_min: number | null;
  average_check_max: number | null;
  orders_per_client: number | null;
  client_lifetime_months: number | null;
  
  // Fixed costs
  salaries_fixed: number | null;
  rent_fixed: number | null;
  utilities_fixed: number | null;
  other_fixed: number | null;
  
  // Market context
  market_size_usd: number | null;
  growth_rate_percent: number | null;
  competition_level: string | null;
  
  // Churn
  churn_rate_monthly: number | null;
  churn_rate_annual: number | null;
  
  // Seasonality
  seasonality_coefficients: SeasonalityCoefficients | null;
  
  // Metadata
  keywords: string[] | null;
  sample_size: number | null;
  confidence_score: number | null;
  source: string | null;
  additional_metrics: Record<string, unknown> | null;
  created_at: string | null;
  last_updated: string | null;
}

export interface SeasonalityCoefficients {
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
}

// ============================================
// KNOWLEDGE BASE QUERY TYPES
// ============================================

export interface KnowledgeBaseQuery {
  table: KnowledgeBaseTable;
  action: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  filters?: Record<string, unknown>;
  data?: Record<string, unknown> | Record<string, unknown>[];
  limit?: number;
}

export type KnowledgeBaseTable = 
  | 'industry_benchmarks'
  | 'location_data'
  | 'scenario_library'
  | 'risk_factors'
  | 'launch_checklists'
  | 'marketing_channels';

export interface KnowledgeBaseStats {
  industry_benchmarks: number;
  location_data: number;
  scenario_library: number;
  risk_factors: number;
  launch_checklists: number;
  marketing_channels: number;
  total_records: number;
  last_updated: string;
}
