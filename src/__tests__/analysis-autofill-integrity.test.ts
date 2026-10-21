import { describe, expect, it } from 'vitest';
import { toAutoFillData, type AnalysisSummary } from '@/hooks/useAnalysisAutoFill';
import type { DocumentVariable } from '@/types/canonical-document-model';

const analysis: AnalysisSummary = {
  id: 'analysis-1',
  idea: 'Synthetic company',
  location: 'Austin, TX',
  created_at: '2026-10-20T00:00:00.000Z',
  result: {},
  monthly_profit: 1600,
};

function variable(canonicalKey: string, renderedValue: number): DocumentVariable {
  return {
    canonicalKey,
    renderedValue,
    unit: 'USD',
    period: 'month',
    sourcePath: 'financial_analysis.scenarios.base.revenue',
    modelSnapshotId: 'snapshot-1',
    numericOutputHash: 'hash-1',
    engineVersion: 'engine-1',
    formulaVersion: 'formula-1',
  };
}

describe('analysis document auto-fill financial integrity', () => {
  it('does not substitute monthly profit when canonical revenue is unavailable', () => {
    const result = toAutoFillData(analysis, {});
    expect(result.monthly_revenue).toBeUndefined();
    expect(result.quarterly_revenue).toBeUndefined();
    expect(result.annual_revenue).toBeUndefined();
    expect(result.monthly_profit).toBe(1600);
  });

  it('preserves zero as a real canonical revenue value', () => {
    const result = toAutoFillData(analysis, { baseRevenue: variable('baseRevenue', 0) });
    expect(result.monthly_revenue).toBe(0);
    expect(result.quarterly_revenue).toBe(0);
    expect(result.annual_revenue).toBe(0);
  });
});
