import { describe, it, expect } from 'vitest';
import { mapCanonicalModelToDocumentVariables } from '@/lib/canonical-document-mapper';
import type { CanonicalModelSnapshot, ScenarioRunRef } from '@/types/canonical-document-model';
import type { BusinessAnalysisResult } from '@/types/analysis';

function makeResult(overrides: Partial<BusinessAnalysisResult> = {}): BusinessAnalysisResult {
  return {
    financial_analysis: {
      mrr: 5200,
      arr: 62400,
      scenarios: {
        pessimistic: { revenue: 3900, variable_costs: 1200, fixed_costs: 2000, gross_profit: 2700, net_profit: 700, gross_margin: 69, net_margin: 18 },
        base: { revenue: 5200, variable_costs: 1600, fixed_costs: 2000, gross_profit: 3600, net_profit: 1600, gross_margin: 69, net_margin: 30.7 },
        optimistic: { revenue: 6500, variable_costs: 2000, fixed_costs: 2000, gross_profit: 4500, net_profit: 2500, gross_margin: 69, net_margin: 38.4 },
      },
      unit_economics: { contribution_margin: 45, contribution_margin_ratio: 0.6, cac: 120, cac_payback_months: 2.6, ltv: 900, ltv_cac_ratio: 7.5 },
      breakeven: { breakeven_units: 800, breakeven_revenue: 41600, breakeven_months: 8 },
      returns: { payback_period_months: 14, roi_year_1: 22.5, roi_year_3: 68, npv_3_years: 21000 },
      startup_investment: { total: 85000, breakdown: { rent_deposit: 15300, equipment: 27200, inventory: 12750, legal: 4250, marketing_initial: 10200, working_capital: 15300 }, reasoning: 'x' },
      monthly_expenses: { total: 3600, variable_costs: 1600, fixed_costs: 2000, breakdown: { rent: 500, utilities: 160, salaries: 1512, inventory_replenishment: 1600, marketing: 540, other: 360 } },
      monthly_profit: 1600,
      payback_period_months: 14,
      break_even_months: 8,
      roi_year_1: 22.5,
      calculations_summary: 'x',
    },
    business_plan: {} as BusinessAnalysisResult['business_plan'],
    marketing_plan: {} as BusinessAnalysisResult['marketing_plan'],
    market_analysis: {
      market_size: { tam: 'Requires benchmark refresh.', sam: 'Local opportunity in Austin, TX.', som: 'Initial obtainable market modeled at $748,800 annual revenue.' },
      trends: [],
      competition: { main_competitors: [], competitive_landscape: '', market_gaps: '' },
      barriers_to_entry: '',
      growth_opportunities: '',
    },
    confidence_score: 80,
    data_sources: [],
    limitations: [],
    metadata: { idea: 'Coffee shop', location: 'Austin, TX', industry_detected: 'Coffee Shop', generated_at: '2026-07-30T00:00:00Z', model: 'v2', version: '1' },
    ...overrides,
  } as BusinessAnalysisResult;
}

const SNAPSHOT: CanonicalModelSnapshot = {
  snapshotId: '42',
  analysisId: 'analysis-1',
  engineVersion: 'v2.0',
  formulaVersion: 'f1',
  datasetVersion: 'd1',
  numericOutputHash: 'hash-abc',
  result: makeResult(),
};

describe('mapCanonicalModelToDocumentVariables', () => {
  it('resolves real values from the correct paths', () => {
    const vars = mapCanonicalModelToDocumentVariables(SNAPSHOT);
    expect(vars.mrr.renderedValue).toBe(5200);
    expect(vars.mrr.sourcePath).toBe('financial_analysis.mrr');
    expect(vars.baseRevenue.renderedValue).toBe(5200);
    expect(vars.cacPaybackMonths.renderedValue).toBe(2.6);
    expect(vars.investmentPaybackMonths.renderedValue).toBe(14);
    expect(vars.breakEvenMonths.renderedValue).toBe(8);
    // operating break-even and investment payback must stay distinct
    expect(vars.breakEvenMonths.renderedValue).not.toBe(vars.investmentPaybackMonths.renderedValue);
  });

  it('carries full provenance on every variable', () => {
    const vars = mapCanonicalModelToDocumentVariables(SNAPSHOT);
    for (const v of Object.values(vars)) {
      expect(v.modelSnapshotId).toBe('42');
      expect(v.numericOutputHash).toBe('hash-abc');
      expect(v.engineVersion).toBe('v2.0');
      expect(v.formulaVersion).toBe('f1');
    }
  });

  it('returns null + a user-facing reason for missing values, never an unrelated metric', () => {
    const sparse: CanonicalModelSnapshot = {
      ...SNAPSHOT,
      result: makeResult({ financial_analysis: undefined as unknown as BusinessAnalysisResult['financial_analysis'] }),
    };
    const vars = mapCanonicalModelToDocumentVariables(sparse);
    expect(vars.mrr.renderedValue).toBeNull();
    expect(vars.mrr.unavailableReason).toMatch(/financial_analysis\.mrr/);
    expect(vars.mrr.unavailableReason).toMatch(/analysis snapshot/);
  });

  it('treats TAM/SAM/SOM as prose strings, not fabricated numbers', () => {
    const vars = mapCanonicalModelToDocumentVariables(SNAPSHOT);
    expect(typeof vars.tam.renderedValue).toBe('string');
    expect(vars.tam.unit).toBeUndefined();
  });

  it('never fabricates Year 2/3 revenue via a growth multiplier — no such key exists', () => {
    const vars = mapCanonicalModelToDocumentVariables(SNAPSHOT);
    const forbidden = ['year1Revenue', 'year2Revenue', 'year3Revenue', 'yearTwoRevenue', 'yearThreeRevenue'];
    for (const key of forbidden) {
      expect(vars).not.toHaveProperty(key);
    }
    // Every numeric revenue-shaped key must come straight from a real
    // scenario, not a *1.5/*2 multiplier of MRR.
    expect(vars.baseRevenue.renderedValue).toBe(SNAPSHOT.result.financial_analysis!.scenarios!.base.revenue);
  });

  it('prefers scenarioRun output over the base snapshot when provided', () => {
    const scenarioRun: ScenarioRunRef = {
      scenarioRunId: 'run-1',
      outputHash: 'hash-scenario',
      engineVersion: 'v2.1',
      formulaVersion: 'f2',
      output: {
        financial_analysis: {
          ...SNAPSHOT.result.financial_analysis,
          mrr: 4000,
        } as BusinessAnalysisResult['financial_analysis'],
      },
    };
    const vars = mapCanonicalModelToDocumentVariables(SNAPSHOT, scenarioRun);
    expect(vars.mrr.renderedValue).toBe(4000);
    expect(vars.mrr.scenarioRunId).toBe('run-1');
    expect(vars.mrr.numericOutputHash).toBe('hash-scenario');
    expect(vars.mrr.engineVersion).toBe('v2.1');
  });

  it('refuses to map a scenario run against a different analysis snapshot', () => {
    const scenarioRun: ScenarioRunRef = {
      scenarioRunId: 'run-1',
      analysisId: 'analysis-2',
      outputHash: 'hash-scenario',
      engineVersion: 'v2.1',
      formulaVersion: 'f2',
      output: {},
    };
    expect(() => mapCanonicalModelToDocumentVariables(SNAPSHOT, scenarioRun))
      .toThrow(/different analysis/);
  });

  it('threads quoteVersionId through when provided', () => {
    const vars = mapCanonicalModelToDocumentVariables(SNAPSHOT, undefined, { quoteVersionId: 'qv-1' });
    expect(vars.mrr.quoteVersionId).toBe('qv-1');
  });
});

describe('document currency comes from the analysis, USD only as engine basis (F06)', () => {
  it('uses a currency recorded on the analysis', async () => {
    const { mapCanonicalModelToDocumentVariables } = await import('../lib/canonical-document-mapper');
    const vars = mapCanonicalModelToDocumentVariables({
      analysisId: 'a1', snapshotId: 's1', engineVersion: 'e', formulaVersion: 'f', numericOutputHash: 'h',
      result: { currency: 'EUR', financial_analysis: { mrr: 1000 } } as never,
    } as never);
    expect(vars.mrr.currency).toBe('EUR');
  });
  it('falls back to USD (the engine basis) when nothing is recorded, and rejects junk codes', async () => {
    const { mapCanonicalModelToDocumentVariables } = await import('../lib/canonical-document-mapper');
    const mk = (result: unknown) => mapCanonicalModelToDocumentVariables({ analysisId: 'a1', snapshotId: 's1', engineVersion: 'e', formulaVersion: 'f', numericOutputHash: 'h', result } as never);
    expect(mk({ financial_analysis: { mrr: 1000 } }).mrr.currency).toBe('USD');
    expect(mk({ currency: 'dollars', financial_analysis: { mrr: 1000 } }).mrr.currency).toBe('USD');
  });
});
