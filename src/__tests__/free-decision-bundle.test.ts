import { describe, expect, it } from 'vitest';
import { TIERS } from '@/config/tiers';
import {
  ENDPOINTS,
  FEATURE_MANIFEST,
  LLM_BUDGET,
  evaluateGate,
  hasFeature,
} from '@/lib/tier-spec';

describe('complimentary Decision Run contract', () => {
  it('provides five complete runs with full financial depth', () => {
    expect(TIERS.free.limits.analysesPerMonth).toBe(5);
    expect(TIERS.free.limits.projectionMonths).toBe(36);
    expect(TIERS.free.limits.monteCarloScenarios).toBeGreaterThan(0);
    expect(TIERS.free.features.depthFull).toBe(true);
    expect(TIERS.free.features.preMortem).toBe(true);
    expect(TIERS.free.features.actionPlan).toBe(true);
    expect(TIERS.free.limits.templates).toBe(3);
    expect(LLM_BUDGET.FREE.pnl_horizon_months).toBe(36);
    expect(LLM_BUDGET.FREE.monte_carlo_iterations).toBeGreaterThan(0);
  });

  it('includes one usable saved scenario set per analysis', () => {
    expect(TIERS.free.limits.scenarioSetsPerAnalysis).toBe(1);
    expect(TIERS.free.features.scenarioView).toBe(true);
    expect(TIERS.free.features.scenarioCustom).toBe(true);
    expect(TIERS.free.features.scenarioSave).toBe(true);
    expect(TIERS.free.features.scenarioCompare).toBe(true);
  });

  it('allows complete analysis and pre-mortem before the quota is used', () => {
    expect(
      evaluateGate({ tier: 'FREE', endpoint: ENDPOINTS.ANALYSE_MAIN, monthlyAnalysesUsed: 4 }).blocked,
    ).toBe(false);
    expect(
      evaluateGate({ tier: 'FREE', endpoint: ENDPOINTS.ANALYSE_PREMORTEM, monthlyAnalysesUsed: 4 }).blocked,
    ).toBe(false);
    expect(hasFeature('FREE', 'monte_carlo')).toBe(true);
    expect(hasFeature('FREE', 'pnl_36_month')).toBe(true);
    expect(hasFeature('FREE', 'pre_mortem')).toBe(true);
    expect(FEATURE_MANIFEST.FREE.allowed_output_fields).toContain('monte_carlo');
    expect(FEATURE_MANIFEST.FREE.allowed_output_fields).toContain('combined_shock');
  });

  it('places the paywall only after the fifth complete run', () => {
    expect(
      evaluateGate({ tier: 'FREE', endpoint: ENDPOINTS.ANALYSE_MAIN, monthlyAnalysesUsed: 5 }).blocked,
    ).toBe(true);
  });
});
