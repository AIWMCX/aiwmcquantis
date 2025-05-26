
export interface AnalysisResultData {
  payback_period_months: number;
  monthly_revenue_estimate: number;
  startup_investment: number;
  business_plan: string;
  marketing_plan: string;
  market_analysis: string;
}

export interface HistoryEntry {
  id: string;
  idea: string;
  location: string;
  result: AnalysisResultData;
  timestamp: Date;
}
