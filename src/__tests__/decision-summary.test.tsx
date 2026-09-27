/**
 * DecisionSummary (Activation-to-revenue Wave 5, PR B).
 *
 * Every field this component reads comes from the real, locked
 * BusinessAnalysisResult -- these tests exist specifically to catch a
 * regression that would make it read a field that doesn't exist, or fall
 * back to a fabricated number when a real one is genuinely absent
 * (assumption_graph is optional; older analyses predate it).
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { BusinessAnalysisResult } from '@/types/analysis';

const mockRecordFunnelEvent = vi.fn();
vi.mock('@/lib/analytics', () => ({
  recordFunnelEvent: (...args: unknown[]) => mockRecordFunnelEvent(...args),
}));

// IntersectionObserver doesn't exist in jsdom -- stub it so result_viewed's
// effect doesn't throw. Not asserted on directly here (that would just be
// testing jsdom's own IntersectionObserver stub, not this component).
class FakeIntersectionObserver {
  observe() {}
  disconnect() {}
}
// @ts-expect-error -- jsdom has no real IntersectionObserver
global.IntersectionObserver = FakeIntersectionObserver;

import { DecisionSummary } from '@/components/analysis/DecisionSummary';

function makeResult(overrides: Partial<BusinessAnalysisResult> = {}): BusinessAnalysisResult {
  return {
    financial_analysis: {
      scenarios: {
        pessimistic: { revenue: 0, variable_costs: 0, fixed_costs: 0, gross_profit: 0, net_profit: -1000, gross_margin: 0.4, net_margin: -0.1 },
        base: { revenue: 10000, variable_costs: 4000, fixed_costs: 3000, gross_profit: 6000, net_profit: 3000, gross_margin: 0.6, net_margin: 0.3 },
        optimistic: { revenue: 15000, variable_costs: 6000, fixed_costs: 3000, gross_profit: 9000, net_profit: 6000, gross_margin: 0.6, net_margin: 0.4 },
      },
      unit_economics: {
        contribution_margin: 100, contribution_margin_ratio: 0.6, cac: 200,
        cac_payback_months: 4, ltv: 800, ltv_cac_ratio: 4,
      },
      breakeven: { breakeven_units: 30, breakeven_revenue: 9000, breakeven_months: 6 },
      returns: { payback_period_months: 10, roi_year_1: 0.2, roi_year_3: 0.8, npv_3_years: 50000 },
      startup_investment: { total: 30000, breakdown: {} as never },
      monthly_expenses: { total: 3000, fixed_costs: 3000, variable_costs: 0 },
      risk_analysis: {
        revenue_drop_20: { scenario: 'x', description: 'x', impact_on_revenue: -20, impact_on_costs: 0, resulting_profit: -500, probability: 'средняя' },
        costs_rise_15: { scenario: 'x', description: 'x', impact_on_revenue: 0, impact_on_costs: 15, resulting_profit: 1000, probability: 'низкая' },
        cac_doubles: { scenario: 'x', description: 'x', impact_on_revenue: 0, impact_on_costs: 0, resulting_profit: 500, probability: 'низкая' },
        churn_increase: { scenario: 'x', description: 'x', impact_on_revenue: -10, impact_on_costs: 0, resulting_profit: -2000, probability: 'высокая' },
      },
    } as unknown as BusinessAnalysisResult['financial_analysis'],
    business_plan: {} as BusinessAnalysisResult['business_plan'],
    marketing_plan: {} as BusinessAnalysisResult['marketing_plan'],
    market_analysis: {} as BusinessAnalysisResult['market_analysis'],
    confidence_score: 75,
    metadata: { idea: 'test idea', location: 'Denver', generated_at: new Date().toISOString(), model: 'test', version: '1' },
    ...overrides,
  } as BusinessAnalysisResult;
}

describe('DecisionSummary', () => {
  it('renders the verdict headline from computeVerdict, not a fabricated one', () => {
    const result = makeResult();
    render(<DecisionSummary result={result} />);
    // Base case: net_profit 3000 > 0, payback 10 <= 18, ltv_cac 4 >= 3, confidence 75 >= 60 -> pass tone.
    expect(screen.getByText(/Profitable from month/i)).toBeInTheDocument();
  });

  it('falls back to risk_analysis (real field) for "what breaks first" when assumption_graph is absent', () => {
    const result = makeResult();
    render(<DecisionSummary result={result} />);
    // Most damaging by resulting_profit: churn_increase (-2000), then revenue_drop_20 (-500).
    expect(screen.getByText('Churn increases')).toBeInTheDocument();
    expect(screen.getByText(/high probability/i)).toBeInTheDocument(); // 'высокая' -> 'high'
  });

  it('uses the real assumption_graph.criticalPath when present, ranked by sensitivity', () => {
    const result = makeResult({
      assumption_graph: {
        nodes: [],
        edges: [],
        fragility_score: 0.7,
        criticalPath: [
          { assumption: 'CAC holds', sensitivity: 0.9, breakingThreshold: 250, currentValue: 200, direction: 'up', recommendation: 'Verify CAC with 5 real buyers.' },
          { assumption: 'Churn holds', sensitivity: 0.3, breakingThreshold: 0.1, currentValue: 0.05, direction: 'up', recommendation: 'Track cohort churn monthly.' },
        ],
      },
    });
    render(<DecisionSummary result={result} />);
    expect(screen.getByText('CAC holds')).toBeInTheDocument();
    expect(screen.getByText(/Verify CAC with 5 real buyers\./)).toBeInTheDocument();
  });

  it('shows "Not available" rather than a fabricated ranking when neither source exists', () => {
    const result = makeResult({
      financial_analysis: {
        ...makeResult().financial_analysis,
        risk_analysis: undefined,
      } as BusinessAnalysisResult['financial_analysis'],
    });
    render(<DecisionSummary result={result} />);
    expect(screen.getByText('Not available for this analysis.')).toBeInTheDocument();
  });

  it('shows a qualitative runway label at a profitable base case, never a fake precise month count', () => {
    const result = makeResult(); // base net_profit is positive
    render(<DecisionSummary result={result} />);
    expect(screen.getByText(/no runway constraint/i)).toBeInTheDocument();
  });

  it('derives a real runway figure from startup_investment/profit when the base case is unprofitable', () => {
    const result = makeResult({
      financial_analysis: {
        ...makeResult().financial_analysis,
        scenarios: {
          ...makeResult().financial_analysis.scenarios,
          base: { revenue: 1000, variable_costs: 2000, fixed_costs: 3000, gross_profit: -1000, net_profit: -3000, gross_margin: 0.1, net_margin: -3 },
        },
      } as BusinessAnalysisResult['financial_analysis'],
    });
    render(<DecisionSummary result={result} />);
    // startup_investment.total 30000 / abs(-3000) = 10 months.
    expect(screen.getByText(/10 months at current burn/i)).toBeInTheDocument();
  });

  it('fires driver_inspected with the real metric_name when a driver row is expanded', () => {
    const result = makeResult({
      actionable_insights: {
        generated_at: new Date().toISOString(),
        summary: { total_insights: 1, critical_count: 1, high_count: 0, medium_count: 0, low_count: 0, overall_health: 'critical', top_priority: 'CAC', quick_wins: [] },
        insights: [{
          id: 'a1', metric_name: 'CAC', current_value: 200, target_value: 150, gap: 50,
          priority: 'critical', status: 'danger', headline: 'CAC too high', explanation: 'x', why_it_matters: 'y',
          action_plan: { strategy: 's', tactics: [], expected_outcome: 'o', time_to_result: 't' },
        }],
      },
    });
    render(<DecisionSummary result={result} analysisId="abc-123" />);
    fireEvent.click(screen.getByText('CAC'));
    expect(mockRecordFunnelEvent).toHaveBeenCalledWith('driver_inspected', { analysis_id: 'abc-123', metric_name: 'CAC' });
  });

  it('fires result_rendered on mount', () => {
    const result = makeResult();
    render(<DecisionSummary result={result} analysisId="abc-123" />);
    expect(mockRecordFunnelEvent).toHaveBeenCalledWith('result_rendered', expect.objectContaining({ analysis_id: 'abc-123' }));
  });
});
