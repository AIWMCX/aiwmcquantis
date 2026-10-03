/**
 * Run: deno test --allow-env supabase/functions/_shared/decision-review/consensus-policy.test.ts
 *
 * Every branch of reconcileDecision() per contract §8/§33: agreement,
 * disagreement, insufficient evidence, material contradiction, integrity
 * BLOCK, and JEV-unavailable fail-open (never silently coerced to
 * agreement).
 */
import assertMod from 'node:assert/strict';
const assertEquals = (a: unknown, b: unknown, msg?: string) => assertMod.deepStrictEqual(a, b, msg);

import { reconcileDecision } from './consensus-policy.ts';
import type { DecisionReviewOutcome, IndependentDecisionPacket, IndependentDecisionReview } from './contracts.ts';
import { DECISION_REVIEW_VERSION } from './contracts.ts';

const OK_INTEGRITY: IndependentDecisionPacket['integrity'] = {
  reportIntegrity: 'OK',
  reconciliationStatus: 'OK',
  sourceCoverageStatus: 'SUFFICIENT',
};

function completedOutcome(overrides: Partial<IndependentDecisionReview> = {}): DecisionReviewOutcome {
  return {
    status: 'completed',
    review: {
      schemaVersion: DECISION_REVIEW_VERSION,
      provider: 'quantis_internal_test',
      providerModel: 'fixture-v1',
      evidenceSufficiency: 'sufficient',
      recommendedState: 'proceed',
      materialContradiction: 'no',
      criticalAssumptionSupported: 'sufficient',
      humanReviewRequired: 'no',
      rationale: 'test',
      requestId: 'r1',
      latencyMs: 1,
      inputHash: 'a',
      outputHash: 'b',
      costUsd: 0,
      ...overrides,
    },
  };
}

Deno.test('agreement: Quantis PROMISING + JEV proceed => DECISION_READY', () => {
  const result = reconcileDecision({
    quantisDecision: 'PROMISING',
    integrity: OK_INTEGRITY,
    criticalAssumptionLabel: 'monthly customers',
    reviewOutcome: completedOutcome(),
  });
  assertEquals(result.consensusState, 'DECISION_READY');
  assertEquals(result.agreement, true);
});

Deno.test('disagreement: Quantis HIGH_RISK + JEV proceed => REVIEW_REQUIRED', () => {
  const result = reconcileDecision({
    quantisDecision: 'HIGH_RISK',
    integrity: OK_INTEGRITY,
    criticalAssumptionLabel: null,
    reviewOutcome: completedOutcome({ recommendedState: 'proceed' }),
  });
  assertEquals(result.consensusState, 'REVIEW_REQUIRED');
  assertEquals(result.agreement, false);
});

Deno.test('disagreement: Quantis PROMISING + JEV do_not_proceed => REVIEW_REQUIRED', () => {
  const result = reconcileDecision({
    quantisDecision: 'PROMISING',
    integrity: OK_INTEGRITY,
    criticalAssumptionLabel: null,
    reviewOutcome: completedOutcome({ recommendedState: 'do_not_proceed' }),
  });
  assertEquals(result.consensusState, 'REVIEW_REQUIRED');
  assertEquals(result.agreement, false);
});

Deno.test('insufficient evidence => CONDITIONAL, agreement null (not coerced)', () => {
  const result = reconcileDecision({
    quantisDecision: 'PROMISING',
    integrity: OK_INTEGRITY,
    criticalAssumptionLabel: 'cac',
    reviewOutcome: completedOutcome({ evidenceSufficiency: 'insufficient' }),
  });
  assertEquals(result.consensusState, 'CONDITIONAL');
  assertEquals(result.agreement, null);
});

Deno.test('material contradiction => DEFER_AND_VALIDATE regardless of recommendedState', () => {
  const result = reconcileDecision({
    quantisDecision: 'PROMISING',
    integrity: OK_INTEGRITY,
    criticalAssumptionLabel: null,
    reviewOutcome: completedOutcome({ materialContradiction: 'yes', recommendedState: 'proceed' }),
  });
  assertEquals(result.consensusState, 'DEFER_AND_VALIDATE');
  assertEquals(result.agreement, false);
});

Deno.test('integrity BLOCK => BLOCKED even when JEV agrees', () => {
  const result = reconcileDecision({
    quantisDecision: 'PROMISING',
    integrity: { ...OK_INTEGRITY, reportIntegrity: 'BLOCK' },
    criticalAssumptionLabel: null,
    reviewOutcome: completedOutcome(),
  });
  assertEquals(result.consensusState, 'BLOCKED');
});

Deno.test('JEV unavailable + Quantis proceeding => CONDITIONAL, agreement null, never coerced to agree', () => {
  const result = reconcileDecision({
    quantisDecision: 'PROMISING',
    integrity: OK_INTEGRITY,
    criticalAssumptionLabel: null,
    reviewOutcome: { status: 'unavailable', reason: 'timeout', detail: 'test timeout' },
  });
  assertEquals(result.consensusState, 'CONDITIONAL');
  assertEquals(result.agreement, null);
});

Deno.test('JEV unavailable + Quantis not proceeding => DEFER_AND_VALIDATE, never coerced to agree', () => {
  const result = reconcileDecision({
    quantisDecision: 'HIGH_RISK',
    integrity: OK_INTEGRITY,
    criticalAssumptionLabel: null,
    reviewOutcome: { status: 'unavailable', reason: 'not_configured', detail: 'no key' },
  });
  assertEquals(result.consensusState, 'DEFER_AND_VALIDATE');
  assertEquals(result.agreement, null);
});

Deno.test('human review required but otherwise agreeing => CONDITIONAL, not DECISION_READY', () => {
  const result = reconcileDecision({
    quantisDecision: 'PROMISING',
    integrity: OK_INTEGRITY,
    criticalAssumptionLabel: null,
    reviewOutcome: completedOutcome({ humanReviewRequired: 'yes' }),
  });
  assertEquals(result.consensusState, 'CONDITIONAL');
  assertEquals(result.agreement, true);
});

Deno.test('policy never averages or numerically blends Quantis and JEV outputs', () => {
  const result = reconcileDecision({
    quantisDecision: 'PROMISING',
    integrity: OK_INTEGRITY,
    criticalAssumptionLabel: null,
    reviewOutcome: completedOutcome(),
  });
  // deno-lint-ignore no-explicit-any
  const anyResult = result as any;
  assertEquals(anyResult.consensusScore, undefined);
  assertEquals(anyResult.overallConfidence, undefined);
  assertEquals(anyResult.weightedScore, undefined);
});
