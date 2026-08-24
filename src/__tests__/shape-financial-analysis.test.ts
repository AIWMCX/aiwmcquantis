/**
 * Proves shapeFinancialAnalysis()'s output — the exact shape run-scenario
 * wraps as a ScenarioRunRef.output — satisfies every KEY_DEFS path in
 * canonical-document-mapper.ts, matching the plan's "zero mapper changes
 * needed" claim. Only market_analysis/tam/sam/som and confidenceScore are
 * expected to be unavailable (scenarios vary financial assumptions only).
 */
import { describe, it, expect } from 'vitest';
import { calculateStrictFinancials } from '../../supabase/functions/analyze-business/financial-calculator.ts';
import { shapeFinancialAnalysis } from '../../supabase/functions/analyze-business/financial-analysis-shape.ts';
import type { IndustryBenchmarks } from '../../supabase/functions/analyze-business/index.ts';
import type { LocationMultiplierResult } from '../../supabase/functions/analyze-business/location-intelligence.ts';
import { mapCanonicalModelToDocumentVariables } from '../lib/canonical-document-mapper';
import type { ScenarioRunRef } from '../types/canonical-document-model';
import type { BusinessAnalysisResult } from '../types/analysis';

const LOCATION: LocationMultiplierResult = {
  overall: 1, salary: 1, rent: 1, utility: 1, marketing: 1,
  matched: false, matchedCity: null, region: 'default', confidence: 0,
};

const BENCHMARKS: IndustryBenchmarks = {
  id: 'saas', name: 'SaaS / Software',
  cac_min: 50, cac_max: 500, cac_typical: 150,
  average_check_min: 20, average_check_max: 500,
  orders_per_client: 1, client_lifetime_months: 24,
  ltv_cac_min: 3, ltv_cac_max: 8,
  net_margin_min: 15, net_margin_max: 40,
  cogs_percent: 20, salaries_fixed: 8000, rent_fixed: 500, utilities_fixed: 200, other_fixed: 1000,
  keywords: [],
};

const EXPECTED_UNAVAILABLE = new Set(['tam', 'sam', 'som', 'confidenceScore', 'industryDetected']);

describe('shapeFinancialAnalysis → canonical mapper compatibility', () => {
  it('resolves every KEY_DEFS path except the ones scenarios legitimately omit', () => {
    const calc = calculateStrictFinancials(20000, 60000, 150, 3600, 100, BENCHMARKS, LOCATION, null);
    const { financialAnalysis } = shapeFinancialAnalysis(calc, BENCHMARKS);

    const scenarioRun: ScenarioRunRef = {
      scenarioRunId: 'test-run',
      outputHash: 'test-hash',
      engineVersion: '2.0.0-precision',
      formulaVersion: '1.0.0',
      output: { financial_analysis: financialAnalysis } as Partial<BusinessAnalysisResult>,
    };

    const variables = mapCanonicalModelToDocumentVariables(
      {
        snapshotId: 'unused',
        analysisId: 'unused',
        engineVersion: '2.0.0-precision',
        formulaVersion: '1.0.0',
        datasetVersion: 'unused',
        numericOutputHash: 'unused',
        result: {} as BusinessAnalysisResult,
      },
      scenarioRun,
    );

    for (const [key, variable] of Object.entries(variables)) {
      if (EXPECTED_UNAVAILABLE.has(key)) continue;
      expect(variable.renderedValue, `expected ${key} (${variable.sourcePath}) to resolve`).not.toBeNull();
    }

    // The intentionally-omitted keys should indeed be marked unavailable, not silently zero.
    for (const key of EXPECTED_UNAVAILABLE) {
      expect(variables[key].renderedValue).toBeNull();
      expect(variables[key].unavailableReason).toBeTruthy();
    }
  });
});

describe('scenarios.base.net_profit never contradicts calc.netProfit (P0 regression)', () => {
  it('reports the same net profit the engine itself computed, even when the itemized expense breakdown does not sum to the user-provided total', () => {
    // Real production bundle (a real Pro-tier analysis, 2026-08-01) that
    // exposed this bug live: itemized fixedCosts+variableCosts summed to
    // $10,809 while the user-provided total monthly cost was $7,200 —
    // scenarios.base.net_profit previously re-derived from the itemized sum
    // ($-7,407) instead of the engine's own authoritative calc.netProfit
    // ($-3,798), so the dashboard and the engine silently disagreed about
    // the same analysis's headline profit.
    const benchmarks: IndustryBenchmarks = {
      id: 'saas', name: 'SaaS / Software',
      cac_min: 1615, cac_max: 24762, cac_typical: 6210,
      rent_fixed: 180, other_fixed: 1000, salaries_fixed: 8000, utilities_fixed: 200,
      cogs_percent: 42, net_margin_min: -4, net_margin_max: -8,
      average_check_min: 295, average_check_max: 687,
      orders_per_client: 1, client_lifetime_months: 22, ltv_cac_min: 0.47, ltv_cac_max: 0.85,
      keywords: [],
    };
    const calc = calculateStrictFinancials(3402, 47500, 100, 4158, 189, benchmarks, LOCATION, null, 7200, 2, 18);
    const { financialAnalysis } = shapeFinancialAnalysis(calc, benchmarks);

    expect(financialAnalysis.scenarios.base.net_profit).toBe(calc.netProfit);
    expect(financialAnalysis.scenarios.base.net_margin).toBe(calc.netMarginPercent);
    // Confirms the fixture actually reproduces the itemized/total mismatch
    // this test guards against, not a coincidentally-matching fixture.
    expect(calc.netProfit).toBe(-3798);
  });
});

describe('monthly_expenses reconciles to calc.totalExpenses (P0 regression, CashMatch AI incident 2026-08-24)', () => {
  it('reports a breakdown total that matches the same expense figure net_profit was computed from, even when itemized COGS alone exceeds the user-provided total', () => {
    // Real production analysis ("CashMatch AI — a subscription", user
    // c54bdd97-8fdf-4464-be3c-1c432e5c6984, analysis 57351fdd-cba7-4549-
    // b86f-18e2c6dbc18f, 2026-08-24) that shipped a mathematically
    // impossible PDF: monthly_expenses.total=$61,943 (unreconciled itemized
    // sum, including a $51,187 benchmark-derived "Infrastructure And
    // Hosting" line) next to scenarios.base.net_profit=$71,360 on $82,560
    // revenue — an 86% operating margin that implied a true cost base of
    // roughly $11,200, not $61,943. Ground-truthed via a direct query
    // against the stored analysis row, independent of any AI/Dahl failure.
    const benchmarks: IndustryBenchmarks = {
      id: 'saas', name: 'SaaS / Software',
      cac_min: 50, cac_max: 500, cac_typical: 110,
      average_check_min: 20, average_check_max: 500,
      orders_per_client: 1, client_lifetime_months: 24,
      ltv_cac_min: 3, ltv_cac_max: 8,
      net_margin_min: 15, net_margin_max: 40,
      cogs_percent: 62, salaries_fixed: 9200, rent_fixed: 156, utilities_fixed: 200, other_fixed: 1200,
      keywords: [],
    };
    // A user-provided monthly cost total far below what the benchmark's
    // cogs_percent (62%) would itemize against $82,560 MRR, reproducing the
    // real incident's divergence between calc.totalExpenses and the raw
    // itemized breakdown sum.
    const calc = calculateStrictFinancials(82560, 68000, 110, 391, 189, benchmarks, LOCATION, null, 11200);
    const { financialAnalysis } = shapeFinancialAnalysis(calc, benchmarks);

    expect(calc.expenseSource).toBe('user');

    const breakdownSum = Object.values(financialAnalysis.monthly_expenses.breakdown as Record<string, number>)
      .reduce((a, b) => a + b, 0);

    // The displayed total, and the sum of its own breakdown line items,
    // must both equal the authoritative figure that actually drove
    // net_profit -- never the raw, unreconciled itemized sum.
    expect(financialAnalysis.monthly_expenses.total).toBe(calc.totalExpenses);
    // Line items are rounded independently, so the reconciled breakdown may
    // land within a few dollars of calc.totalExpenses even though `total`
    // itself is exact -- this bounds that rounding drift, not correctness.
    expect(Math.abs(breakdownSum - calc.totalExpenses)).toBeLessThanOrEqual(5);

    // Cross-field invariant the incident violated: operating profit must
    // equal revenue minus the SAME expense total shown in the table.
    expect(financialAnalysis.scenarios.base.net_profit)
      .toBe(financialAnalysis.mrr - financialAnalysis.monthly_expenses.total);
  });
});
