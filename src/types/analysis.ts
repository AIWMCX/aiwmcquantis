// ============================================
// UNIVERSAL BUSINESS FINANCIAL ANALYSIS SYSTEM
// ============================================

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
  if (financial.returns?.payback_period_months !== undefined) {
    return financial.returns.payback_period_months;
  }
  return financial.payback_period_months ?? 0;
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

// Complete Analysis Response
export interface BusinessAnalysisResult {
  financial_analysis: FinancialAnalysis;
  business_plan: BusinessPlan;
  marketing_plan: MarketingPlan;
  market_analysis: MarketAnalysis;
  actionable_insights?: ActionableInsightsAnalysis;
  confidence_score: number;
  data_sources: string[];
  limitations: string[];
  validation?: ValidationResult;
  metadata: {
    idea: string;
    location: string;
    industry_detected?: string;
    location_cost_multiplier?: number;
    generated_at: string;
    model: string;
    version: string;
  };
}

// API Response wrapper
export interface AnalysisAPIResponse {
  success: boolean;
  data?: BusinessAnalysisResult;
  error?: string;
  code?: string;
}

// History Entry for localStorage
export interface AnalysisHistoryEntry {
  id: string;
  idea: string;
  location: string;
  result: BusinessAnalysisResult;
  created_at: string;
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

// Request types
export interface AnalysisRequest {
  idea: string;
  location: string;
  financial_inputs?: OptionalFinancialInputs;
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