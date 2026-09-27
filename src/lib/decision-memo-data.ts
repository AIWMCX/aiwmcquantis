/**
 * Pure selection logic for the "decision-first" surfaces of a
 * BusinessAnalysisResult: what has to be true, what breaks first, and what
 * to test before committing capital.
 *
 * Stage 4 (Reports Consolidation): extracted out of DecisionSummary.tsx so
 * the Decision Memo PDF (usePdfExport.ts's createDecisionMemoReport) can
 * select the EXACT same rows the on-screen "Decision" tab already shows,
 * instead of re-deriving them independently. No new calculation happens
 * here -- every function below only sorts/slices/labels fields the engine
 * already computed (result.actionable_insights, result.assumption_graph,
 * financial_analysis.risk_analysis, financial_analysis.scenarios).
 * DecisionSummary.tsx was refactored to call these same functions so the
 * dashboard and the PDF can never independently drift.
 */

import type { BusinessAnalysisResult, FinancialAnalysis } from '@/types/analysis';

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export const PROBABILITY_LABEL: Record<string, string> = {
  'низкая': 'low',
  'средняя': 'medium',
  'высокая': 'high',
};

export function normalizePercent(value?: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return value <= 1 ? value * 100 : value;
}

/** B. "What has to be true" -- top N actionable insights by priority. */
export function selectCriticalAssumptions(result: BusinessAnalysisResult, limit = 5) {
  const insights = result.actionable_insights?.insights ?? [];
  return [...insights]
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9))
    .slice(0, limit);
}

export type WhatBreaksFirst =
  | { source: 'assumption_graph'; items: Array<{ assumption: string; sensitivity: number; breakingThreshold: number; currentValue: number; direction: string; recommendation: string }> }
  | { source: 'risk_analysis'; items: Array<{ label: string } & Record<string, unknown>> }
  | null;

/** C. "What breaks first" -- real assumption_graph, else real risk_analysis. */
export function selectWhatBreaksFirst(result: BusinessAnalysisResult, limit = 3): WhatBreaksFirst {
  const criticalPath = result.assumption_graph?.criticalPath;
  if (criticalPath && criticalPath.length > 0) {
    return {
      source: 'assumption_graph',
      items: [...criticalPath].sort((a, b) => (b.sensitivity ?? 0) - (a.sensitivity ?? 0)).slice(0, limit),
    };
  }
  const risk = result.financial_analysis?.risk_analysis;
  if (!risk) return null;
  const named = (
    [
      ['Revenue drops 20%', risk.revenue_drop_20],
      ['Costs rise 15%', risk.costs_rise_15],
      ['CAC doubles', risk.cac_doubles],
      ['Churn increases', risk.churn_increase],
    ] as const
  ).filter(([, s]) => typeof s?.resulting_profit === 'number');
  return {
    source: 'risk_analysis',
    items: named
      .sort((a, b) => a[1].resulting_profit - b[1].resulting_profit)
      .slice(0, limit)
      .map(([label, s]) => ({ label, ...s })),
  };
}

/** E. "Test before committing capital" -- grounded in the same real drivers. */
export function selectNextActions(result: BusinessAnalysisResult, breaksFirst: WhatBreaksFirst, limit = 3): string[] {
  const criticalPath = result.assumption_graph?.criticalPath;
  if (criticalPath && criticalPath.length > 0) {
    return criticalPath
      .filter((c) => c.recommendation)
      .slice(0, limit)
      .map((c) => c.recommendation);
  }
  const drivers = selectCriticalAssumptions(result, limit);
  return drivers.map((d) => `Verify: ${d.metric_name} (currently ${d.current_value}, target ${d.target_value})`);
}

/** D. Cash runway label -- derived from real monthlyProfit/requiredCapital, never invented. */
export function computeRunwayLabel(fa: FinancialAnalysis | undefined, monthlyProfit: number): string {
  const requiredCapital = fa?.startup_investment?.total;
  if (monthlyProfit >= 0) return 'Profitable at base case — no runway constraint';
  if (requiredCapital) {
    return `${Math.max(1, Math.floor(requiredCapital / Math.abs(monthlyProfit)))} months at current burn`;
  }
  return 'Not available — startup investment not modeled';
}
