// Types for MiniDemo components

export interface FinancialInputs {
  investment: number;
  monthlyRevenue: number;
  monthlyCosts: number;
}

export interface CalculatedMetrics {
  monthlyProfit: number;
  annualRoi: number;
  paybackMonths: number;
  netMargin: number;
}

export interface PreviewResult {
  monthly_profit: number;
  payback_months: number;
  confidence_score: number;
  industry_detected: string;
}

export interface LockedFeature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}

export type Verdict = 'promising' | 'moderate' | 'risky';

export interface VerdictInfo {
  label: string;
  color: string;
  bg: string;
}
