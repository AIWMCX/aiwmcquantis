/**
 * SENSITIVITY ANALYZER — Tornado Chart Data Generator
 * 
 * Sweeps each key variable ±20% and measures the impact on net profit.
 * Produces tornado chart data showing which lever has the biggest effect.
 * 
 * This answers the user's #1 question: "What should I focus on?"
 */

import { QMath } from './quantis-math-server.ts';

export interface SensitivityVariable {
  variable: string;
  baseValue: number;
  profitAtMinus20: number;
  profitAtPlus20: number;
  profitSwing: number;        // absolute difference between +20% and -20%
  sensitivity: number;        // normalized 0-1 (1 = most sensitive)
  direction: 'positive' | 'negative' | 'mixed';  // does increasing help?
  recommendation: string;
}

export interface SensitivityResult {
  tornado: SensitivityVariable[];
  mostSensitiveVariable: string;
  leastSensitiveVariable: string;
  summary: string;
}

interface BaseMetrics {
  mrr: number;
  totalExpenses: number;
  netProfit: number;
  averageCheck: number;
  cac: number;
  cogsPercent: number;
  fixedCosts: number;    // salaries + rent + utilities + other
  clientsActive: number;
  ordersPerClient: number;
  churnRate: number;      // monthly fraction (e.g., 0.08)
}

/**
 * Recalculate net profit with one variable changed
 */
function recalcProfit(base: BaseMetrics, overrides: Partial<BaseMetrics>): number {
  const m = { ...base, ...overrides };
  
  // Recalculate MRR if price or customers changed
  const mrr = QMath.round(
    QMath.multiply(m.averageCheck, QMath.multiply(m.ordersPerClient, m.clientsActive))
  );
  
  // COGS
  const cogs = QMath.round(QMath.percentage(mrr, m.cogsPercent));
  
  // Marketing (churn-driven)
  const newClientsNeeded = Math.ceil(m.clientsActive * m.churnRate);
  const marketing = QMath.round(QMath.multiply(newClientsNeeded, m.cac));
  
  // Total expenses
  const totalExpenses = QMath.round(QMath.add(QMath.add(cogs, m.fixedCosts), marketing));
  
  return mrr - totalExpenses;
}

/**
 * Run sensitivity analysis across 6 key variables
 */
export function analyzeSensitivity(metrics: BaseMetrics): SensitivityResult {
  const variables: Array<{
    name: string;
    field: keyof BaseMetrics;
    low: Partial<BaseMetrics>;
    high: Partial<BaseMetrics>;
    recommendation: (dir: string) => string;
  }> = [
    {
      name: 'Price (Avg Check)',
      field: 'averageCheck',
      low: { averageCheck: QMath.round(QMath.multiply(metrics.averageCheck, 0.8)) },
      high: { averageCheck: QMath.round(QMath.multiply(metrics.averageCheck, 1.2)) },
      recommendation: (dir) => dir === 'positive' 
        ? 'Pricing has high leverage — test a 10-15% price increase with A/B testing'
        : 'Revenue is sensitive to price drops — protect margins through value-based pricing',
    },
    {
      name: 'Customer Count',
      field: 'clientsActive',
      low: { clientsActive: Math.max(1, QMath.round(QMath.multiply(metrics.clientsActive, 0.8))) },
      high: { clientsActive: QMath.round(QMath.multiply(metrics.clientsActive, 1.2)) },
      recommendation: () => 'Customer growth directly impacts profit — focus acquisition efforts',
    },
    {
      name: 'CAC',
      field: 'cac',
      low: { cac: QMath.round(QMath.multiply(metrics.cac, 0.8)) },
      high: { cac: QMath.round(QMath.multiply(metrics.cac, 1.2)) },
      recommendation: (dir) => dir === 'negative'
        ? 'CAC increases hurt profit significantly — optimize marketing channels and conversion funnels'
        : 'CAC has moderate impact — maintain current acquisition efficiency',
    },
    {
      name: 'Churn Rate',
      field: 'churnRate',
      low: { churnRate: metrics.churnRate * 0.8 },
      high: { churnRate: metrics.churnRate * 1.2 },
      recommendation: (dir) => dir === 'negative'
        ? 'Churn is a critical lever — invest in retention programs, onboarding, and customer success'
        : 'Churn impact is manageable at current levels',
    },
    {
      name: 'COGS %',
      field: 'cogsPercent',
      low: { cogsPercent: Math.max(1, metrics.cogsPercent - metrics.cogsPercent * 0.2) },
      high: { cogsPercent: Math.min(95, metrics.cogsPercent + metrics.cogsPercent * 0.2) },
      recommendation: (dir) => dir === 'negative'
        ? 'Cost of goods significantly impacts margins — negotiate supplier terms or optimize operations'
        : 'COGS has limited profit impact — focus on revenue growth instead',
    },
    {
      name: 'Fixed Costs',
      field: 'fixedCosts',
      low: { fixedCosts: QMath.round(QMath.multiply(metrics.fixedCosts, 0.8)) },
      high: { fixedCosts: QMath.round(QMath.multiply(metrics.fixedCosts, 1.2)) },
      recommendation: (dir) => dir === 'negative'
        ? 'Fixed costs are a major profit driver — consider remote work, renegotiating leases, or automation'
        : 'Fixed cost changes have moderate impact — prioritize revenue-side improvements',
    },
  ];

  const results: SensitivityVariable[] = [];

  for (const v of variables) {
    const profitLow = recalcProfit(metrics, v.low);
    const profitHigh = recalcProfit(metrics, v.high);
    const swing = Math.abs(profitHigh - profitLow);
    
    // Direction: does increasing the variable improve profit?
    let direction: SensitivityVariable['direction'] = 'mixed';
    if (profitHigh > profitLow) direction = 'positive';
    else if (profitHigh < profitLow) direction = 'negative';

    results.push({
      variable: v.name,
      baseValue: metrics[v.field] as number,
      profitAtMinus20: profitLow,
      profitAtPlus20: profitHigh,
      profitSwing: swing,
      sensitivity: 0, // normalized later
      direction,
      recommendation: v.recommendation(direction),
    });
  }

  // Normalize sensitivity 0-1
  const maxSwing = Math.max(...results.map(r => r.profitSwing), 1);
  for (const r of results) {
    r.sensitivity = Math.round((r.profitSwing / maxSwing) * 100) / 100;
  }

  // Sort by sensitivity descending
  results.sort((a, b) => b.sensitivity - a.sensitivity);

  const most = results[0]?.variable || 'Unknown';
  const least = results[results.length - 1]?.variable || 'Unknown';

  return {
    tornado: results,
    mostSensitiveVariable: most,
    leastSensitiveVariable: least,
    summary: `${most} has the highest impact on profitability (sensitivity: ${results[0]?.sensitivity || 0}). Focus optimization efforts here first. ${least} has the least impact.`,
  };
}
