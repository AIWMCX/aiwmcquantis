/**
 * LAYER 4 — Monte Carlo & Scenario Engine Tests
 * Tests PRNG determinism, distribution correctness, and scenario directional consistency.
 */
import { describe, it, expect } from 'vitest';
import { runMonteCarlo, type MonteCarloConfig } from '@/lib/monte-carlo';
import { applyScenario, BUILT_IN_SCENARIOS, type AnalysisParams } from '@/services/scenario-engine';

// ── Monte Carlo ──

describe('Monte Carlo — PRNG Determinism', () => {
  const config: MonteCarloConfig = {
    iterations: 500,
    seed: 42,
    params: [
      { name: 'revenue', baseValue: 10000, minValue: 8000, maxValue: 12000, distribution: 'uniform' },
    ],
    outputFn: (p) => p.revenue,
  };

  it('same seed produces identical results', async () => {
    const r1 = await runMonteCarlo(config);
    const r2 = await runMonteCarlo(config);
    expect(r1.mean).toBe(r2.mean);
    expect(r1.median).toBe(r2.median);
    expect(r1.p10).toBe(r2.p10);
    expect(r1.p90).toBe(r2.p90);
  });

  it('different seeds produce different results', async () => {
    const r1 = await runMonteCarlo(config);
    const r2 = await runMonteCarlo({ ...config, seed: 99 });
    expect(r1.mean).not.toBe(r2.mean);
  });
});

describe('Monte Carlo — Uniform Distribution', () => {
  it('p50 ≈ midpoint within ±5%', async () => {
    const result = await runMonteCarlo({
      iterations: 2000,
      seed: 123,
      params: [
        { name: 'x', baseValue: 500, minValue: 0, maxValue: 1000, distribution: 'uniform' },
      ],
      outputFn: (p) => p.x,
    });
    expect(result.median).toBeGreaterThan(450);
    expect(result.median).toBeLessThan(550);
  });

  it('min/max within bounds', async () => {
    const result = await runMonteCarlo({
      iterations: 1000,
      seed: 456,
      params: [
        { name: 'x', baseValue: 100, minValue: 50, maxValue: 150, distribution: 'uniform' },
      ],
      outputFn: (p) => p.x,
    });
    expect(result.min).toBeGreaterThanOrEqual(50);
    expect(result.max).toBeLessThanOrEqual(150);
  });
});

describe('Monte Carlo — Normal Distribution', () => {
  it('mean ≈ baseValue within ±5%', async () => {
    const result = await runMonteCarlo({
      iterations: 2000,
      seed: 789,
      params: [
        { name: 'x', baseValue: 1000, minValue: 500, maxValue: 1500, distribution: 'normal' },
      ],
      outputFn: (p) => p.x,
    });
    expect(result.mean).toBeGreaterThan(950);
    expect(result.mean).toBeLessThan(1050);
  });
});

describe('Monte Carlo — Triangular Distribution', () => {
  it('mode ≈ peak (baseValue)', async () => {
    const result = await runMonteCarlo({
      iterations: 2000,
      seed: 321,
      params: [
        { name: 'x', baseValue: 800, minValue: 500, maxValue: 1000, distribution: 'triangular' },
      ],
      outputFn: (p) => p.x,
    });
    // Median should be near the mode for a right-skewed triangular
    expect(result.median).toBeGreaterThan(700);
    expect(result.median).toBeLessThan(900);
  });
});

describe('Monte Carlo — probabilityPositive', () => {
  it('100% when all outputs positive', async () => {
    const result = await runMonteCarlo({
      iterations: 500,
      seed: 111,
      params: [
        { name: 'x', baseValue: 100, minValue: 50, maxValue: 150, distribution: 'uniform' },
      ],
      outputFn: (p) => p.x, // always positive
    });
    expect(result.probabilityPositive).toBe(100);
  });

  it('~50% when centered at 0', async () => {
    const result = await runMonteCarlo({
      iterations: 2000,
      seed: 222,
      params: [
        { name: 'x', baseValue: 0, minValue: -100, maxValue: 100, distribution: 'uniform' },
      ],
      outputFn: (p) => p.x,
    });
    expect(result.probabilityPositive).toBeGreaterThan(40);
    expect(result.probabilityPositive).toBeLessThan(60);
  });
});

describe('Monte Carlo — Edge Cases', () => {
  it('single iteration runs without error', async () => {
    const result = await runMonteCarlo({
      iterations: 1,
      seed: 1,
      params: [
        { name: 'x', baseValue: 100, minValue: 50, maxValue: 150, distribution: 'uniform' },
      ],
      outputFn: (p) => p.x,
    });
    expect(result.iterations).toBe(1);
    expect(Number.isFinite(result.mean)).toBe(true);
  });

  it('zero-range params return constant', async () => {
    const result = await runMonteCarlo({
      iterations: 100,
      seed: 5,
      params: [
        { name: 'x', baseValue: 42, minValue: 42, maxValue: 42, distribution: 'uniform' },
      ],
      outputFn: (p) => p.x,
    });
    expect(result.min).toBe(42);
    expect(result.max).toBe(42);
    expect(result.stdDev).toBe(0);
  });

  it('stores raw samples when requested', async () => {
    const result = await runMonteCarlo({
      iterations: 50,
      seed: 10,
      storeSamples: true,
      params: [
        { name: 'x', baseValue: 100, minValue: 0, maxValue: 200, distribution: 'uniform' },
      ],
      outputFn: (p) => p.x,
    });
    expect(result.rawSamples).toBeDefined();
    expect(result.rawSamples!.length).toBe(50);
  });
});

// ── Scenario Engine ──

const BASE_PARAMS: AnalysisParams = {
  monthlyRevenue: 20000,
  monthlyCosts: 15000,
  cac: 200,
  ltv: 1500,
  churnRate: 0.05,
  conversionRate: 0.03,
  trafficMonthly: 10000,
  marketingSpend: 3000,
  rent: 2000,
  startupInvestment: 50000,
  pricePerUnit: 100,
  unitsSoldMonthly: 200,
};

describe('Scenario Engine — Built-in Presets', () => {
  it('has at least 8 built-in scenarios', () => {
    expect(BUILT_IN_SCENARIOS.length).toBeGreaterThanOrEqual(8);
  });

  it('all scenarios have unique IDs', () => {
    const ids = BUILT_IN_SCENARIOS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Scenario: recession', () => {
  it('reduces revenue and increases CAC', () => {
    const recession = BUILT_IN_SCENARIOS.find(s => s.id === 'recession')!;
    const adjusted = applyScenario(BASE_PARAMS, recession);
    expect(adjusted.monthlyRevenue).toBeLessThan(BASE_PARAMS.monthlyRevenue);
    expect(adjusted.cac).toBeGreaterThan(BASE_PARAMS.cac);
    expect(adjusted.conversionRate).toBeLessThan(BASE_PARAMS.conversionRate);
  });
});

describe('Scenario: best_case', () => {
  it('increases revenue and decreases costs', () => {
    const bestCase = BUILT_IN_SCENARIOS.find(s => s.id === 'best_case')!;
    const adjusted = applyScenario(BASE_PARAMS, bestCase);
    expect(adjusted.monthlyRevenue).toBeGreaterThan(BASE_PARAMS.monthlyRevenue);
    expect(adjusted.monthlyCosts).toBeLessThan(BASE_PARAMS.monthlyCosts);
    expect(adjusted.cac).toBeLessThan(BASE_PARAMS.cac);
  });
});

describe('Scenario: worst_case', () => {
  it('decreases revenue and increases costs', () => {
    const worstCase = BUILT_IN_SCENARIOS.find(s => s.id === 'worst_case')!;
    const adjusted = applyScenario(BASE_PARAMS, worstCase);
    expect(adjusted.monthlyRevenue).toBeLessThan(BASE_PARAMS.monthlyRevenue);
    expect(adjusted.monthlyCosts).toBeGreaterThan(BASE_PARAMS.monthlyCosts);
    expect(adjusted.churnRate).toBeGreaterThan(BASE_PARAMS.churnRate);
  });
});

describe('Scenario: competitor_entry', () => {
  it('increases CAC and decreases traffic', () => {
    const competitor = BUILT_IN_SCENARIOS.find(s => s.id === 'competitor_entry')!;
    const adjusted = applyScenario(BASE_PARAMS, competitor);
    expect(adjusted.cac).toBeGreaterThan(BASE_PARAMS.cac);
    expect(adjusted.trafficMonthly).toBeLessThan(BASE_PARAMS.trafficMonthly);
  });
});

describe('Scenario: viral_moment', () => {
  it('significantly increases traffic', () => {
    const viral = BUILT_IN_SCENARIOS.find(s => s.id === 'viral_moment')!;
    const adjusted = applyScenario(BASE_PARAMS, viral);
    expect(adjusted.trafficMonthly).toBeGreaterThan(BASE_PARAMS.trafficMonthly * 2);
  });
});

describe('Scenario — Multiplier math', () => {
  it('applies multiplicative shocks correctly', () => {
    const scenario = BUILT_IN_SCENARIOS.find(s => s.id === 'rent_doubles')!;
    const adjusted = applyScenario(BASE_PARAMS, scenario);
    expect(adjusted.rent).toBeCloseTo(BASE_PARAMS.rent * 2, 0);
  });

  it('unchanged params remain identical', () => {
    const scenario = BUILT_IN_SCENARIOS.find(s => s.id === 'rent_doubles')!;
    const adjusted = applyScenario(BASE_PARAMS, scenario);
    expect(adjusted.monthlyRevenue).toBe(BASE_PARAMS.monthlyRevenue);
    expect(adjusted.cac).toBe(BASE_PARAMS.cac);
    expect(adjusted.churnRate).toBe(BASE_PARAMS.churnRate);
  });
});
