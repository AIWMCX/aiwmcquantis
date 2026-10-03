/**
 * `quantis_internal_test` — a fixture `DecisionReviewer`, NOT a second
 * production vendor. Used by unit/contract tests and as an explicit opt-in
 * dev-mode stand-in so Phase B/C/D code can be built and tested end-to-end
 * before `TYPESAFE_API_KEY` exists. Never selected by default in
 * production — a caller must pass `provider: 'quantis_internal_test'`
 * explicitly.
 */
import type { DecisionReviewer, DecisionReviewOutcome, IndependentDecisionPacket, IndependentDecisionReview } from './contracts.ts';
import { DECISION_REVIEW_VERSION } from './contracts.ts';
import { hashPacketInput, hashReviewOutput } from './hashes.ts';

export type FixtureBehavior =
  | { kind: 'agree' }
  | { kind: 'disagree' }
  | { kind: 'insufficient_evidence' }
  | { kind: 'material_contradiction' }
  | { kind: 'timeout' }
  | { kind: 'rate_limited' }
  | { kind: 'malformed' };

export class QuantisInternalTestProvider implements DecisionReviewer {
  readonly provider = 'quantis_internal_test' as const;

  constructor(private readonly behavior: FixtureBehavior = { kind: 'agree' }) {}

  async review(packet: IndependentDecisionPacket): Promise<DecisionReviewOutcome> {
    const inputHash = await hashPacketInput(packet);

    if (this.behavior.kind === 'timeout') {
      return { status: 'unavailable', reason: 'timeout', detail: 'fixture: simulated timeout' };
    }
    if (this.behavior.kind === 'rate_limited') {
      return { status: 'unavailable', reason: 'rate_limited', detail: 'fixture: simulated 429' };
    }
    if (this.behavior.kind === 'malformed') {
      return { status: 'unavailable', reason: 'invalid_response', detail: 'fixture: simulated malformed response' };
    }

    const base: Omit<IndependentDecisionReview, 'inputHash' | 'outputHash' | 'requestId' | 'latencyMs'> = {
      schemaVersion: DECISION_REVIEW_VERSION,
      provider: 'quantis_internal_test',
      providerModel: 'fixture-v1',
      evidenceSufficiency: 'sufficient',
      recommendedState: 'proceed',
      materialContradiction: 'no',
      criticalAssumptionSupported: 'sufficient',
      humanReviewRequired: 'no',
      rationale: 'fixture: deterministic agree response',
      costUsd: 0,
    };

    const review: Omit<IndependentDecisionReview, 'inputHash' | 'outputHash' | 'requestId' | 'latencyMs'> =
      this.behavior.kind === 'disagree'
        ? { ...base, recommendedState: 'do_not_proceed', rationale: 'fixture: deterministic disagree response' }
        : this.behavior.kind === 'insufficient_evidence'
          ? {
              ...base,
              evidenceSufficiency: 'insufficient',
              recommendedState: 'insufficient_evidence',
              criticalAssumptionSupported: 'insufficient',
              humanReviewRequired: 'yes',
              rationale: 'fixture: deterministic insufficient-evidence response',
            }
          : this.behavior.kind === 'material_contradiction'
            ? {
                ...base,
                materialContradiction: 'yes',
                recommendedState: 'defer_and_validate',
                humanReviewRequired: 'yes',
                rationale: 'fixture: deterministic material-contradiction response',
              }
            : base;

    const outputHash = await hashReviewOutput(review);
    return {
      status: 'completed',
      review: {
        ...review,
        inputHash,
        outputHash,
        requestId: `fixture_${inputHash.slice(0, 12)}`,
        latencyMs: 1,
      },
    };
  }
}
