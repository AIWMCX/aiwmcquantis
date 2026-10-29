/**
 * Living Assumption Register — verifies the origin classifier mirrors
 * transformResponse()'s real userInputs?.x || fa.x || benchmark chain
 * (analyze-business/index.ts ~1677-1689), using the same real production
 * bundle (analyses.id dab0bcb8-7ff0-4a27-b262-427423600e4d) reused
 * throughout this session's scenario test suite.
 */
import { describe, it, expect } from 'vitest';
import { classifyAssumptionOrigins, withScenarioOverrideFlags } from '../../supabase/functions/_shared/assumption-origin.ts';

const REAL_BENCHMARKS = {
  cac_typical: 6210,
  cac_min: 1615,
  cac_max: 24762,
  average_check_min: 295,
  average_check_max: 687,
};

describe('classifyAssumptionOrigins', () => {
  it('marks a user-supplied value as USER_ACTUAL with full confidence', () => {
    const origins = classifyAssumptionOrigins({
      userInputs: { monthly_revenue: 3402, cac: 100 },
      fa: { mrr: 9999 },
      mp: {},
      benchmarks: REAL_BENCHMARKS,
      locationMultipliers: { confidence: 40 },
      subIndustry: { confidence: 50 },
    });
    expect(origins.monthly_revenue.origin).toBe('USER_ACTUAL');
    expect(origins.monthly_revenue.confidence).toBe(100);
    expect(origins.cac.origin).toBe('USER_ACTUAL');
  });

  it('falls back to DERIVED for revenue when only the AI-extracted value is present; CAC ignores the AI estimate (benchmark)', () => {
    const origins = classifyAssumptionOrigins({
      userInputs: {},
      fa: { mrr: 9999, cac: 5000 },
      mp: {},
      benchmarks: REAL_BENCHMARKS,
      locationMultipliers: { confidence: 40 },
      subIndustry: { confidence: 62 },
    });
    expect(origins.monthly_revenue.origin).toBe('DERIVED');
    expect(origins.monthly_revenue.confidence).toBe(62);
    // 2026-10-29: a blank CAC uses the benchmark, never fa.cac.
    expect(origins.cac.origin).toBe('MODELED_BENCHMARK_PRIOR');
    expect(origins.cac.evidence_range).toEqual([REAL_BENCHMARKS.cac_min, REAL_BENCHMARKS.cac_max]);
  });

  it('falls back to MODELED_BENCHMARK_PRIOR for CAC and average_price when nothing else is present', () => {
    const origins = classifyAssumptionOrigins({
      userInputs: {},
      fa: {},
      mp: {},
      benchmarks: REAL_BENCHMARKS,
      locationMultipliers: { confidence: 40 },
      subIndustry: { confidence: 50 },
    });
    expect(origins.cac.origin).toBe('MODELED_BENCHMARK_PRIOR');
    expect(origins.cac.evidence_range).toEqual([REAL_BENCHMARKS.cac_min, REAL_BENCHMARKS.cac_max]);
    expect(origins.average_price.origin).toBe('MODELED_BENCHMARK_PRIOR');
    expect(origins.average_price.evidence_range).toEqual([REAL_BENCHMARKS.average_check_min, REAL_BENCHMARKS.average_check_max]);
  });

  it('marks monthly_revenue as PLACEHOLDER when neither user nor AI supplied it', () => {
    const origins = classifyAssumptionOrigins({
      userInputs: {},
      fa: {},
      mp: {},
      benchmarks: REAL_BENCHMARKS,
      locationMultipliers: { confidence: 40 },
      subIndustry: null,
    });
    expect(origins.monthly_revenue.origin).toBe('PLACEHOLDER');
    expect(origins.monthly_revenue.confidence).toBeLessThan(30);
  });

  it('never invents an evidence_range for churn_rate or monthly_costs — no real benchmark backs them today', () => {
    const origins = classifyAssumptionOrigins({
      userInputs: {},
      fa: {},
      mp: {},
      benchmarks: REAL_BENCHMARKS,
      locationMultipliers: { confidence: 40 },
      subIndustry: { confidence: 50 },
    });
    expect(origins.churn_rate.evidence_range).toBeNull();
    expect(origins.monthly_costs.evidence_range).toBeNull();
  });

  it('always classifies rent as a benchmark/location prior', () => {
    const origins = classifyAssumptionOrigins({
      userInputs: {},
      fa: {},
      mp: {},
      benchmarks: REAL_BENCHMARKS,
      locationMultipliers: { confidence: 40 },
      subIndustry: { confidence: 50 },
    });
    expect(origins.rent.origin).toBe('MODELED_BENCHMARK_PRIOR');
    expect(origins.rent.confidence).toBe(40);
  });
});

describe('withScenarioOverrideFlags', () => {
  it('flags only the keys present in the current scenario delta', () => {
    const origins = classifyAssumptionOrigins({
      userInputs: { monthly_revenue: 3402 },
      fa: {},
      mp: {},
      benchmarks: REAL_BENCHMARKS,
      locationMultipliers: { confidence: 40 },
      subIndustry: { confidence: 50 },
    });
    const flagged = withScenarioOverrideFlags(origins, ['cac']);
    expect(flagged.cac.overridden_in_scenario).toBe(true);
    expect(flagged.monthly_revenue.overridden_in_scenario).toBe(false);
    // Base classification is preserved, not upgraded, by an override.
    expect(flagged.cac.origin).toBe(origins.cac.origin);
  });
});
