import { describe, it, expect } from 'vitest';
import {
  mergeScenarioIntoAnalysisResult,
  getMonthlyProfitMirror,
  getPaybackMonthsMirror,
} from '../../supabase/functions/_shared/scenario-analysis-promotion.ts';

describe('mergeScenarioIntoAnalysisResult', () => {
  it('replaces only financial_analysis, keeps everything else from the original', () => {
    const original = {
      financial_analysis: { mrr: 1000, scenarios: { base: { net_profit: -500 } } },
      business_plan: { executive_summary: 'Original plan' },
      market_analysis: { market_size: { tam: 'Big' } },
      confidence_score: 80,
    };
    const scenarioFA = { mrr: 1500, scenarios: { base: { net_profit: 200 } } };

    const merged = mergeScenarioIntoAnalysisResult(original, scenarioFA);

    expect(merged.financial_analysis).toBe(scenarioFA);
    expect(merged.business_plan).toBe(original.business_plan);
    expect(merged.market_analysis).toBe(original.market_analysis);
    expect(merged.confidence_score).toBe(80);
  });
});

describe('getMonthlyProfitMirror / getPaybackMonthsMirror (mirrors src/types/analysis.ts)', () => {
  it('prefers scenarios.base.net_profit', () => {
    expect(getMonthlyProfitMirror({ scenarios: { base: { net_profit: 42 } }, monthly_profit: 999 })).toBe(42);
  });
  it('falls back to monthly_profit', () => {
    expect(getMonthlyProfitMirror({ monthly_profit: 7 })).toBe(7);
  });
  it('defaults to 0', () => {
    expect(getMonthlyProfitMirror(undefined)).toBe(0);
  });
  it('reads returns.payback_period_months', () => {
    expect(getPaybackMonthsMirror({ returns: { payback_period_months: 11 } })).toBe(11);
  });
  it('defaults to 0', () => {
    expect(getPaybackMonthsMirror(undefined)).toBe(0);
  });
});
