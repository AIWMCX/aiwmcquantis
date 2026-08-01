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
