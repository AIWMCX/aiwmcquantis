/**
 * LAYER 5 — QSL Tier Assignment & Confidence Scorer Tests
 * Tests QSL boundaries, shouldPulse, clamping, and confidence scoring behavior.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QSL, getQSLFromConfidence, getQSLConfig, shouldPulse, QSL_CONFIG } from '@/lib/quantis-safety-levels';
import { calculateOutputConfidence, type ConfidenceInput } from '@/services/confidence-scorer';

const ROOT = process.cwd();

// ── QSL Tier Assignment ──

describe('QSL — Tier Boundaries', () => {
  it('score 0 → EXPLORATORY', () => expect(getQSLFromConfidence(0)).toBe(QSL.EXPLORATORY));
  it('score 50 → EXPLORATORY', () => expect(getQSLFromConfidence(50)).toBe(QSL.EXPLORATORY));
  it('score 69 → EXPLORATORY', () => expect(getQSLFromConfidence(69)).toBe(QSL.EXPLORATORY));
  it('score 70 → PLANNING', () => expect(getQSLFromConfidence(70)).toBe(QSL.PLANNING));
  it('score 84 → PLANNING', () => expect(getQSLFromConfidence(84)).toBe(QSL.PLANNING));
  it('score 85 → INVESTOR', () => expect(getQSLFromConfidence(85)).toBe(QSL.INVESTOR));
  it('score 94 → INVESTOR', () => expect(getQSLFromConfidence(94)).toBe(QSL.INVESTOR));
  it('score 95 → LOAN', () => expect(getQSLFromConfidence(95)).toBe(QSL.LOAN));
  it('score 100 → LOAN', () => expect(getQSLFromConfidence(100)).toBe(QSL.LOAN));
});

describe('QSL — Clamping', () => {
  it('score -10 → EXPLORATORY (clamped to 0)', () => {
    expect(getQSLFromConfidence(-10)).toBe(QSL.EXPLORATORY);
  });

  it('score 150 → LOAN (clamped to 100)', () => {
    expect(getQSLFromConfidence(150)).toBe(QSL.LOAN);
  });
});

describe('QSL — shouldPulse', () => {
  it('EXPLORATORY → false', () => expect(shouldPulse(QSL.EXPLORATORY)).toBe(false));
  it('PLANNING → false', () => expect(shouldPulse(QSL.PLANNING)).toBe(false));
  it('INVESTOR → true', () => expect(shouldPulse(QSL.INVESTOR)).toBe(true));
  it('LOAN → true', () => expect(shouldPulse(QSL.LOAN)).toBe(true));
});

describe('QSL — Config', () => {
  it('getQSLConfig returns correct badge for score 90', () => {
    const config = getQSLConfig(90);
    expect(config.badge).toBe('QSL-3');
    expect(config.label).toBe('Investor Grade');
  });

  it('all QSL levels have defined config', () => {
    for (const level of [QSL.EXPLORATORY, QSL.PLANNING, QSL.INVESTOR, QSL.LOAN]) {
      expect(QSL_CONFIG[level]).toBeDefined();
      expect(QSL_CONFIG[level].badge).toBeTruthy();
      expect(QSL_CONFIG[level].label).toBeTruthy();
    }
  });
});

// ── Confidence Scorer ──

describe('Confidence Scorer — High confidence', () => {
  it('high inputs → confident or verified tier, score ≥ 80', () => {
    const input: ConfidenceInput = {
      consensusScore: 98,
      dataCompleteness: 98,
      benchmarkAlignment: 95,
      dataFreshnessHours: 0,
      sampleSize: 50,
    };
    const result = calculateOutputConfidence(input);
    // Weights sum to 0.85 so max base = 85 + 5 bonus = 90
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(['verified', 'confident']).toContain(result.tier);
    expect(result.warnings.length).toBe(0);
  });
});

describe('Confidence Scorer — Low confidence', () => {
  it('low inputs → blocked tier, score < 50', () => {
    const input: ConfidenceInput = {
      consensusScore: 40,
      dataCompleteness: 30,
      benchmarkAlignment: 20,
      dataFreshnessHours: 0,
      sampleSize: 50,
    };
    const result = calculateOutputConfidence(input);
    expect(result.score).toBeLessThan(50);
    expect(result.tier).toBe('blocked');
  });
});

describe('Confidence Scorer — Freshness Penalty', () => {
  it('72h stale data → penalty + warning', () => {
    const input: ConfidenceInput = {
      consensusScore: 90,
      dataCompleteness: 90,
      benchmarkAlignment: 85,
      dataFreshnessHours: 72,
      sampleSize: 30,
    };
    const result = calculateOutputConfidence(input);
    expect(result.warnings.some(w => w.includes('day'))).toBe(true);
    expect(result.breakdown.freshness_penalty).toBeLessThan(0);
  });

  it('fresh data → no freshness penalty', () => {
    const input: ConfidenceInput = {
      consensusScore: 90,
      dataCompleteness: 90,
      benchmarkAlignment: 85,
      dataFreshnessHours: 0,
      sampleSize: 30,
    };
    const result = calculateOutputConfidence(input);
    expect(Math.abs(result.breakdown.freshness_penalty)).toBeLessThanOrEqual(0.01);
  });
});

describe('Confidence Scorer — Sample Size', () => {
  it('small sample (5) → warning', () => {
    const input: ConfidenceInput = {
      consensusScore: 90,
      dataCompleteness: 90,
      benchmarkAlignment: 85,
      dataFreshnessHours: 0,
      sampleSize: 5,
    };
    const result = calculateOutputConfidence(input);
    expect(result.warnings.some(w => w.includes('sample size'))).toBe(true);
    expect(result.breakdown.sample_bonus).toBe(0);
  });

  it('large sample (30+) → bonus applied', () => {
    const input: ConfidenceInput = {
      consensusScore: 90,
      dataCompleteness: 90,
      benchmarkAlignment: 85,
      dataFreshnessHours: 0,
      sampleSize: 50,
    };
    const result = calculateOutputConfidence(input);
    expect(result.breakdown.sample_bonus).toBe(5);
  });
});

describe('Confidence Scorer — Consensus Warning', () => {
  it('consensus < 70 → AI disagreement warning', () => {
    const input: ConfidenceInput = {
      consensusScore: 55,
      dataCompleteness: 90,
      benchmarkAlignment: 85,
      dataFreshnessHours: 0,
      sampleSize: 30,
    };
    const result = calculateOutputConfidence(input);
    expect(result.warnings.some(w => w.includes('disagreement'))).toBe(true);
  });
});

describe('Confidence Scorer — Data Completeness Warning', () => {
  it('completeness < 60 → missing fields warning', () => {
    const input: ConfidenceInput = {
      consensusScore: 90,
      dataCompleteness: 40,
      benchmarkAlignment: 85,
      dataFreshnessHours: 0,
      sampleSize: 30,
    };
    const result = calculateOutputConfidence(input);
    expect(result.warnings.some(w => w.includes('missing'))).toBe(true);
  });
});

describe('Confidence Scorer — Benchmark Alignment Warning', () => {
  it('alignment < 50 → divergence warning', () => {
    const input: ConfidenceInput = {
      consensusScore: 90,
      dataCompleteness: 90,
      benchmarkAlignment: 30,
      dataFreshnessHours: 0,
      sampleSize: 30,
    };
    const result = calculateOutputConfidence(input);
    expect(result.warnings.some(w => w.includes('diverge'))).toBe(true);
  });
});

// ── Synthetic QSL Scenarios ──

describe('Synthetic QSL — Activation vs Leverage', () => {
  it('high completeness + low benchmark → PLANNING range, not INVESTOR', () => {
    const input: ConfidenceInput = {
      consensusScore: 80,
      dataCompleteness: 95,
      benchmarkAlignment: 30,
      dataFreshnessHours: 0,
      sampleSize: 30,
    };
    const result = calculateOutputConfidence(input);
    const qsl = getQSLFromConfidence(result.score);
    expect(qsl).toBeLessThanOrEqual(QSL.PLANNING);
  });

  it('high all → PLANNING or above', () => {
    const input: ConfidenceInput = {
      consensusScore: 95,
      dataCompleteness: 95,
      benchmarkAlignment: 90,
      dataFreshnessHours: 0,
      sampleSize: 50,
    };
    const result = calculateOutputConfidence(input);
    const qsl = getQSLFromConfidence(result.score);
    // Weights sum to 0.85 so max base ≈ 85 + bonus = 90 → INVESTOR
    expect(qsl).toBeGreaterThanOrEqual(QSL.PLANNING);
  });

  it('zero benchmark alignment → cannot reach QSL-4', () => {
    const input: ConfidenceInput = {
      consensusScore: 100,
      dataCompleteness: 100,
      benchmarkAlignment: 0,
      dataFreshnessHours: 0,
      sampleSize: 100,
    };
    const result = calculateOutputConfidence(input);
    const qsl = getQSLFromConfidence(result.score);
    expect(qsl).toBeLessThan(QSL.LOAN);
  });

  it('low consensus (dual-engine disagreement) → drops below INVESTOR', () => {
    const input: ConfidenceInput = {
      consensusScore: 45,
      dataCompleteness: 90,
      benchmarkAlignment: 85,
      dataFreshnessHours: 0,
      sampleSize: 30,
    };
    const result = calculateOutputConfidence(input);
    const qsl = getQSLFromConfidence(result.score);
    expect(qsl).toBeLessThan(QSL.INVESTOR);
  });
});

describe('Confidence Scorer — Breakdown', () => {
  it('returns all expected breakdown keys', () => {
    const input: ConfidenceInput = {
      consensusScore: 80,
      dataCompleteness: 80,
      benchmarkAlignment: 80,
      dataFreshnessHours: 0,
      sampleSize: 30,
    };
    const result = calculateOutputConfidence(input);
    expect(result.breakdown).toHaveProperty('consensus');
    expect(result.breakdown).toHaveProperty('completeness');
    expect(result.breakdown).toHaveProperty('benchmark');
    expect(result.breakdown).toHaveProperty('freshness_penalty');
    expect(result.breakdown).toHaveProperty('sample_bonus');
  });

  it('score is clamped to [0, 100]', () => {
    // Max everything
    const high: ConfidenceInput = {
      consensusScore: 100,
      dataCompleteness: 100,
      benchmarkAlignment: 100,
      dataFreshnessHours: 0,
      sampleSize: 100,
    };
    expect(calculateOutputConfidence(high).score).toBeLessThanOrEqual(100);

    // Min everything
    const low: ConfidenceInput = {
      consensusScore: 0,
      dataCompleteness: 0,
      benchmarkAlignment: 0,
      dataFreshnessHours: 720, // 30 days
      sampleSize: 1,
    };
    expect(calculateOutputConfidence(low).score).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// Accuracy-audit finding, 2026-08-02: "QSL silent-70 fallback" and the
// scale bug it was hiding alongside.
//
// AnalysisResults.tsx fed engine-cross-validator.ts's agreementScore (already
// 0-100, per DualEngineBadge.tsx's direct, unscaled read of the same field)
// into calculateOutputConfidence() as `agreement_score * 100` -- producing
// values like 8500, silently clamped to a fake 100 by this module's own
// Math.min(100, ...) floor. When cross-validation hadn't run at all, it fell
// back to `result.confidence_score || 70` -- confidence_score is a
// data-completeness/reliability metric (a different signal entirely, not
// model-agreement), and 70 made a never-computed number indistinguishable
// from a real one. QuantisHealth.tsx's admin KPI aggregate had the identical
// *100 scale bug, inflating its "Consensus Score" card ~100x and making its
// `good={v => v >= 70}` threshold meaningless. These are live-source-scan
// tests (not pure-function tests) because the bug lived in how a real
// UI/analytics consumer wired a correct field into a correct formula, not in
// either module itself -- exactly the class of bug a unit test on
// calculateOutputConfidence() alone could never catch.
// ============================================================================
describe('Consensus score wiring — live source scan', () => {
  it('AnalysisResults.tsx does not re-scale an already-0-100 agreement_score', () => {
    const src = readFileSync(join(ROOT, 'src/components/analysis/AnalysisResults.tsx'), 'utf8');
    expect(src).not.toMatch(/cross_validation\.agreement_score\s*\*\s*100/);
  });

  it('AnalysisResults.tsx does not substitute confidence_score for a missing consensus signal', () => {
    const src = readFileSync(join(ROOT, 'src/components/analysis/AnalysisResults.tsx'), 'utf8');
    expect(src).not.toMatch(/consensusScore:.*confidence_score\s*\|\|\s*70/s);
  });

  it('AnalysisResults.tsx shows an honest "not computed" state instead of a fabricated score', () => {
    const src = readFileSync(join(ROOT, 'src/components/analysis/AnalysisResults.tsx'), 'utf8');
    expect(src).toContain('Cross-model consensus not computed for this analysis');
  });

  it('QuantisHealth.tsx does not re-scale an already-0-100 agreement_score', () => {
    const src = readFileSync(join(ROOT, 'src/pages/admin/QuantisHealth.tsx'), 'utf8');
    expect(src).not.toMatch(/cross_validation\.agreement_score\s*\*\s*100/);
    expect(src).toMatch(/consensusSum\s*\+=\s*r\.cross_validation\.agreement_score;/);
  });
});
