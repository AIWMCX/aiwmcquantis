// Financial Analysis Types
export interface FinancialBreakdown {
  rent_deposit: number;
  equipment: number;
  inventory: number;
  legal: number;
  marketing_initial: number;
  working_capital: number;
}

export interface ExpenseBreakdown {
  rent: number;
  utilities: number;
  salaries: number;
  inventory_replenishment: number;
  marketing: number;
  other: number;
}

export interface FinancialAnalysis {
  startup_investment: {
    total: number;
    breakdown: FinancialBreakdown;
    reasoning: string;
  };
  monthly_revenue: {
    conservative: number;
    realistic: number;
    optimistic: number;
    reasoning: string;
  };
  monthly_expenses: {
    total: number;
    breakdown: ExpenseBreakdown;
    reasoning: string;
  };
  monthly_profit: number;
  payback_period_months: number;
  break_even_months: number;
  roi_year_1: number;
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
export interface MarketAnalysis {
  market_size: {
    tam: string;
    sam: string;
    som: string;
  };
  trends: string[];
  competition: {
    main_competitors: string[];
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
  confidence_score: number;
  data_sources: string[];
  limitations: string[];
  metadata: {
    idea: string;
    location: string;
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

// Request types
export interface AnalysisRequest {
  idea: string;
  location: string;
}
