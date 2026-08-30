/**
 * Real end-to-end render smoke test for createExecutiveReport()
 * (src/hooks/usePdfExport.ts) -- actually calls @react-pdf/renderer's
 * pdf().toBuffer(), not a regex match against source text.
 *
 * Earns its place: this exact test caught a real, would-have-shipped
 * bug while building the GTM-audit item #7 fix (2026-08-25) -- the new
 * quality-dimensions chip combined fontFamily:'Helvetica-Bold' with
 * fontStyle:'italic' for a "not evaluated" dimension, asking react-pdf
 * for a font variant that isn't a registered standard-14 font
 * ("Could not resolve font for Helvetica-Bold, fontWeight 400, fontStyle
 * italic"). Since outcome_calibration is unconditionally NOT_AVAILABLE
 * today (no outcome-ingestion system exists yet -- see
 * quality-dimensions.ts), that code path runs on every single analysis,
 * so this would have crashed EVERY PDF export. None of the source-pattern
 * -matching tests elsewhere in this suite could have caught it -- only
 * an actual render does.
 */
import { describe, it, expect } from 'vitest';
import { pdf } from '@react-pdf/renderer';
import { createExecutiveReport } from '../hooks/usePdfExport';
import type { BusinessAnalysisResult } from '../types/analysis';

const baseFinancial: any = {
  mrr: 10000,
  arr: 120000,
  scenarios: {
    pessimistic: { revenue: 8000, variable_costs: 3000, fixed_costs: 2000, gross_profit: 5000, net_profit: 3000, gross_margin: 62, net_margin: 37 },
    base: { revenue: 10000, variable_costs: 3500, fixed_costs: 2000, gross_profit: 6500, net_profit: 4500, gross_margin: 65, net_margin: 45 },
    optimistic: { revenue: 13000, variable_costs: 4000, fixed_costs: 2000, gross_profit: 9000, net_profit: 7000, gross_margin: 69, net_margin: 54 },
  },
  unit_economics: { contribution_margin: 100, contribution_margin_ratio: 0.7, cac: 150, cac_payback_months: 3, ltv: 900, ltv_cac_ratio: 6 },
  breakeven: { breakeven_units: 100, breakeven_revenue: 5000, breakeven_months: 4 },
  returns: { payback_period_months: 8, roi_year_1: 40, roi_year_3: 120, npv_3_years: 50000 },
  startup_investment: { total: 20000, breakdown: { equipment: 8000, working_capital: 12000 }, reasoning: 'test' },
  monthly_expenses: { total: 5500, variable_costs: 3500, fixed_costs: 2000, breakdown: { rent: 500, utilities: 200, salaries: 3000, marketing: 1000, other: 800 } },
  monthly_profit: 4500,
  payback_period_months: 8,
};

const result: BusinessAnalysisResult = {
  financial_analysis: baseFinancial,
  business_plan: { executive_summary: 'test', product_description: 'test', target_audience: 'test', competitive_advantages: 'test', operations: 'test', launch_steps: [], risks: [] },
  marketing_plan: { positioning: 'test', pricing_strategy: 'test', channels: [], cac: 150, ltv: 900, first_3_months_plan: 'test' },
  market_analysis: { market_size: { tam: '1', sam: '2', som: '3' }, trends: [], competition: { main_competitors: [], competitive_landscape: 'test', market_gaps: 'test' }, barriers_to_entry: 'test', growth_opportunities: 'test' },
  confidence_score: 72,
  data_sources: ['test source'],
  limitations: ['test limitation'],
  metadata: { idea: 'Test business', location: 'Austin, TX', generated_at: new Date().toISOString(), model: 'test', version: '1' },
  validation: {
    quality_dimensions: {
      input_completeness: 80,
      source_coverage: 55,
      benchmark_match_quality: 'PASS',
      scenario_reconciliation: 'PASS',
      narrative_reconciliation: 'CORRECTED',
      formula_reconciliation: 'PASS',
      outcome_calibration: 'NOT_AVAILABLE',
      evidence: {
        source_coverage: 'test', benchmark_match_quality: 'test', scenario_reconciliation: 'test',
        narrative_reconciliation: 'test', formula_reconciliation: 'test', outcome_calibration: 'test',
      },
    },
  } as any,
} as any;

describe('createExecutiveReport render smoke test', () => {
  it('renders to a PDF buffer without throwing, with quality_dimensions present', async () => {
    const doc = createExecutiveReport(result);
    const instance = pdf(doc as any);
    const buffer = await instance.toBuffer();
    expect(buffer).toBeTruthy();
  });

  it('renders to a PDF buffer without throwing, WITHOUT quality_dimensions (legacy fallback path)', async () => {
    const legacyResult = { ...result, validation: undefined };
    const doc = createExecutiveReport(legacyResult as any);
    const instance = pdf(doc as any);
    const buffer = await instance.toBuffer();
    expect(buffer).toBeTruthy();
  });

  // Phase 7 (Paid Decision Workflow Validation, 2026-08-30): the Decision
  // Memo page is new react-pdf markup with its own font/style combinations
  // -- exactly the class of bug this file's own header comment describes
  // (a font-variant mismatch that only a real render, not a source-pattern
  // match, can catch).
  it('renders to a PDF buffer without throwing, WITH engagementContext (Decision Memo page)', async () => {
    const doc = createExecutiveReport(result, undefined, [], {
      preparedFor: 'Jane Founder, CFO',
      decisionQuestion: 'Should we open a second location in Q1?',
      consultantNotes: 'Reviewed unit economics against the last 6 months of actuals; margins hold up.',
    });
    const instance = pdf(doc as any);
    const buffer = await instance.toBuffer();
    expect(buffer).toBeTruthy();
  });

  it('renders to a PDF buffer without throwing, with a partial engagementContext (single field only)', async () => {
    const doc = createExecutiveReport(result, undefined, [], { decisionQuestion: 'Is this worth pursuing?' });
    const instance = pdf(doc as any);
    const buffer = await instance.toBuffer();
    expect(buffer).toBeTruthy();
  });
});
