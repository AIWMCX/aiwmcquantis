/**
 * Real runtime test for emergencyFallbackAnalysis() (src/services/analysisApi.ts).
 *
 * CodeRabbit catch on PR #88: this client-side fallback (used when the
 * analysis service call fails entirely at the network level -- a SEPARATE
 * path from the server-side generateDeterministicFallbackResult()) must
 * set used_fallback so a PDF exported from it gets the same
 * "(DETERMINISTIC ONLY)" labeling as a server-side fallback. The original
 * test only regex-matched analysisApi.ts's source for the literal string
 * "used_fallback: true" -- this calls the real, now-exported function and
 * asserts on its actual return value.
 */
import { describe, it, expect } from 'vitest';
import { emergencyFallbackAnalysis } from '../services/analysisApi';
import type { AnalysisRequest } from '../types/analysis';

const request: AnalysisRequest = {
  idea: 'A subscription box for artisanal coffee',
  location: 'Austin, TX',
  financial_inputs: { monthly_revenue: 5000, startup_investment: 20000 },
};

describe('emergencyFallbackAnalysis', () => {
  it('sets used_fallback so PDF export labels it as deterministic-only', () => {
    const result = emergencyFallbackAnalysis(request, 'analysis service unavailable');
    expect(result.used_fallback).toBe(true);
  });

  it('still produces a complete, usable financial_analysis shape', () => {
    const result = emergencyFallbackAnalysis(request, 'analysis service unavailable');
    expect(result.financial_analysis.mrr).toBeGreaterThan(0);
    expect(result.financial_analysis.scenarios?.base).toBeDefined();
    expect(Number.isFinite(result.confidence_score)).toBe(true);
  });

  it('records the failure reason in limitations so it is visible to a reviewer', () => {
    const result = emergencyFallbackAnalysis(request, 'timeout after 3 retries');
    expect(result.limitations.some((l) => l.includes('timeout after 3 retries'))).toBe(true);
  });

  it('uses the supplied monthly total costs once and reconciles the base case', () => {
    const result = emergencyFallbackAnalysis({
      ...request,
      financial_inputs: {
        monthly_revenue: 30_000,
        startup_investment: 60_000,
        monthly_costs: 22_000,
        average_price: 3_000,
        expected_customers: 10,
      },
    }, 'synthetic regression');
    const financial = result.financial_analysis;
    const base = financial.scenarios?.base;
    expect(financial.monthly_expenses?.total).toBe(22_000);
    expect(financial.monthly_profit).toBe(8_000);
    expect(base).toBeDefined();
    const baseCase = base!;
    expect(baseCase.revenue - baseCase.variable_costs - baseCase.fixed_costs).toBe(baseCase.net_profit);
    expect(baseCase.net_profit).toBe(8_000);
    expect(financial.breakeven?.breakeven_months).toBe(4);
    expect(financial.returns?.payback_period_months).toBe(11);
  });
});
