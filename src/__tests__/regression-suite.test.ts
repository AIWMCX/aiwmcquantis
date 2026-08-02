/**
 * LAYER 6 — Regression Suite (Integration Gate)
 *
 * This file checks structural invariants (formula registry self-tests,
 * QMath self-tests, vector-count/active-flag sanity, confidence->QSL
 * mapping) — it does NOT run GOLDEN_VECTORS through the real engine.
 * That real regression gate is golden-vectors-live-engine.test.ts
 * (added 2026-08-02) — this file's previous header claimed to "tie all
 * layers together... for engine consistency," which was never true; see
 * that test's own header for the full story of why.
 */
import { describe, it, expect } from 'vitest';
import { FormulaRegistry } from '@/lib/formula-registry';
import { QuantisMath } from '@/lib/quantis-math';
import { GOLDEN_VECTORS } from '@/lib/golden-test-vectors';
import { BUILT_IN_SCENARIOS } from '@/services/scenario-engine';
import { QSL, getQSLFromConfidence } from '@/lib/quantis-safety-levels';
import { calculateOutputConfidence, type ConfidenceInput } from '@/services/confidence-scorer';

describe('Regression Gate — FormulaRegistry', () => {
  it('testAll() has zero failures', () => {
    const { totalFailed, totalPassed } = FormulaRegistry.testAll();
    expect(totalFailed).toBe(0);
    expect(totalPassed).toBeGreaterThan(0);
  });

  it('registry has ≥ 15 formulas', () => {
    expect(FormulaRegistry.size).toBeGreaterThanOrEqual(15);
  });
});

describe('Regression Gate — QMath Self-Test', () => {
  it('QMath.runSelfTest passes with zero failures', () => {
    const result = QuantisMath.runSelfTest();
    expect(result.failed).toBe(0);
    expect(result.passed).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);
  });
});

describe('Regression Gate — Golden Vectors', () => {
  it('has ≥ 10 vectors', () => {
    expect(GOLDEN_VECTORS.length).toBeGreaterThanOrEqual(10);
  });

  it('all vectors are active', () => {
    expect(GOLDEN_VECTORS.every(v => v.isActive)).toBe(true);
  });
});

describe('Regression Gate — Scenarios', () => {
  it('has ≥ 8 built-in scenarios', () => {
    expect(BUILT_IN_SCENARIOS.length).toBeGreaterThanOrEqual(8);
  });
});

describe('Regression Gate — Confidence → QSL Mapping', () => {
  const profiles: Array<{ input: ConfidenceInput; expectedQSL: QSL }> = [
    {
      input: { consensusScore: 40, dataCompleteness: 30, benchmarkAlignment: 20, dataFreshnessHours: 0, sampleSize: 5 },
      expectedQSL: QSL.EXPLORATORY,
    },
    {
      input: { consensusScore: 80, dataCompleteness: 80, benchmarkAlignment: 70, dataFreshnessHours: 0, sampleSize: 20 },
      expectedQSL: QSL.PLANNING,
    },
    {
      input: { consensusScore: 95, dataCompleteness: 95, benchmarkAlignment: 90, dataFreshnessHours: 0, sampleSize: 50 },
      expectedQSL: QSL.INVESTOR, // or LOAN
    },
    {
      input: { consensusScore: 100, dataCompleteness: 100, benchmarkAlignment: 100, dataFreshnessHours: 0, sampleSize: 100 },
      expectedQSL: QSL.LOAN,
    },
    {
      input: { consensusScore: 50, dataCompleteness: 95, benchmarkAlignment: 30, dataFreshnessHours: 48, sampleSize: 10 },
      expectedQSL: QSL.EXPLORATORY,
    },
  ];

  profiles.forEach((p, i) => {
    it(`profile ${i + 1} maps to expected QSL tier`, () => {
      const result = calculateOutputConfidence(p.input);
      const qsl = getQSLFromConfidence(result.score);
      expect(qsl).toBeGreaterThanOrEqual(p.expectedQSL - 1);
      expect(qsl).toBeLessThanOrEqual(p.expectedQSL + 1);
    });
  });
});
