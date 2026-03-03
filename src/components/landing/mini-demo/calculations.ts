// Pure calculation functions for MiniDemo
// All math routed through FormulaRegistry for precision and audit trail

import { CalculatedMetrics, FinancialInputs, Verdict, VerdictInfo } from './types';
import { FormulaRegistry } from '@/lib/formula-registry';
import { QuantisMath } from '@/lib/quantis-math';

export function calculateMetrics(inputs: FinancialInputs): CalculatedMetrics {
  const { investment, monthlyRevenue, monthlyCosts } = inputs;
  
  const monthlyProfit = QuantisMath.round(QuantisMath.subtract(monthlyRevenue, monthlyCosts));
  
  const annualRoi = FormulaRegistry.execute('mini_annual_roi', monthlyProfit, investment).output;
  const paybackMonths = FormulaRegistry.execute('mini_payback', investment, monthlyProfit).output;
  const netMargin = FormulaRegistry.execute('mini_net_margin', monthlyProfit, monthlyRevenue).output;

  return {
    monthlyProfit,
    annualRoi,
    paybackMonths,
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
