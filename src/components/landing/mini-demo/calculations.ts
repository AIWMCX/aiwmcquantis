// Pure calculation functions for MiniDemo

import { CalculatedMetrics, FinancialInputs, Verdict, VerdictInfo } from './types';

export function calculateMetrics(inputs: FinancialInputs): CalculatedMetrics {
  const { investment, monthlyRevenue, monthlyCosts } = inputs;
  
  const monthlyProfit = monthlyRevenue - monthlyCosts;
  const annualRoi = investment > 0 
    ? ((monthlyProfit * 12) / investment) * 100 
    : 0;
  const paybackMonths = monthlyProfit > 0 
    ? investment / monthlyProfit 
    : Infinity;
  const netMargin = monthlyRevenue > 0 
    ? (monthlyProfit / monthlyRevenue) * 100 
    : 0;

  return {
    monthlyProfit,
    annualRoi,
    paybackMonths: Math.min(paybackMonths, 999), // Cap for display
    netMargin,
  };
}

export function getVerdict(annualRoi: number): Verdict {
  if (annualRoi >= 100) return 'promising';
  if (annualRoi >= 50) return 'moderate';
  return 'risky';
}

export function getVerdictInfo(verdict: Verdict): VerdictInfo {
  switch (verdict) {
    case 'promising':
      return { label: 'Promising Business Model', color: 'text-success', bg: 'bg-success/10' };
    case 'moderate':
      return { label: 'Moderate Potential', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    case 'risky':
      return { label: 'Needs Refinement', color: 'text-destructive', bg: 'bg-destructive/10' };
  }
}

export function formatCurrency(value: number): string {
  if (!isFinite(value)) return '∞';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  if (value < 0) return `-$${Math.abs(value).toLocaleString()}`;
  return `$${value.toLocaleString()}`;
}

export function formatPercent(value: number): string {
  if (!isFinite(value)) return '∞';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatPayback(months: number): string {
  if (!isFinite(months) || months >= 999) return 'N/A';
  if (months < 1) return `${Math.round(months * 30)} days`;
  if (months < 12) return `${months.toFixed(1)} mo`;
  return `${(months / 12).toFixed(1)} yr`;
}
