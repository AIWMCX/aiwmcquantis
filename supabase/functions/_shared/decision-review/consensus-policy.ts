/**
 * Decision Consensus Policy — deterministic, versioned reconciliation of
 * the canonical Quantis verdict + JEV's independent review + integrity
 * state. Pure logic, no second LLM vote (contract §8).
 *
 * Reconciles against the BACKEND's canonical verdict only
 * (`deriveInvestmentVerdict()`, surfaced on `analyses.result` — see
 * `docs/decision-intelligence/VERIFICATION_AUTHORITY_MATRIX.md`'s note on
 * `DecisionSummary.tsx`'s independent frontend classifier), never against
 * the frontend's separate `computeVerdict()` UI-tone classifier — avoiding
 * a three-way disagreement surface (backend vs. frontend vs. JEV) the
 * reconciliation doc flagged.
 *
 * `DECISION_CONSENSUS_POLICY_VERSION` (contracts.ts) must bump whenever
 * this file's rules change, so every persisted `decision_consensus_runs`
 * row stays attributable to the exact rule set that produced it.
 */
import { DECISION_CONSENSUS_POLICY_VERSION } from './contracts.ts';
import type { DecisionReviewOutcome, IndependentDecisionPacket } from './contracts.ts';

export type ConsensusState =
  | 'DECISION_READY'
  | 'CONDITIONAL'
  | 'REVIEW_REQUIRED'
  | 'DEFER_AND_VALIDATE'
  | 'BLOCKED'
  | 'INDEPENDENT_REVIEW_UNAVAILABLE';

/** The backend's canonical verdict taxonomy (investment-verdict.ts), not the frontend's independent `computeVerdict()` classifier. */
export type QuantisDecision = 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK' | 'PROMISING' | string;

export interface ConsensusResult {
  policyVersion: typeof DECISION_CONSENSUS_POLICY_VERSION;
  consensusState: ConsensusState;
  reasonCodes: string[];
  criticalAssumption: string | null;
  nextValidationAction: string | null;
  agreement: boolean | null; // null when JEV is unavailable — never coerced to true or false
}

const PROCEED_LIKE = new Set(['PROMISING', 'LOW_RISK']);

/** Maps a JEV recommendedState onto the same proceed/defer/block axis as the Quantis decision, for an agreement check — never a numeric comparison. */
function jevAgreesWithProceeding(jevState: string): boolean | null {
  if (jevState === 'proceed' || jevState === 'proceed_with_conditions') return true;
  if (jevState === 'defer_and_validate' || jevState === 'do_not_proceed') return false;
  return null; // 'insufficient_evidence' is neither agreement nor disagreement
}

/**
 * Pure function. `quantisDecision` must be the backend's canonical verdict
 * string; `integrity.reportIntegrity` comes from the same packet JEV saw
 * (so a BLOCK state is checked identically regardless of whether JEV ran).
 */
export function reconcileDecision(args: {
  quantisDecision: QuantisDecision;
  integrity: IndependentDecisionPacket['integrity'];
  criticalAssumptionLabel: string | null;
  reviewOutcome: DecisionReviewOutcome;
}): ConsensusResult {
  const { quantisDecision, integrity, criticalAssumptionLabel, reviewOutcome } = args;
  const reasonCodes: string[] = [];

  // Integrity is checked first and identically whether or not JEV ran —
  // a BLOCK state is never something an independent review can override.
  if (integrity.reportIntegrity === 'BLOCK') {
    reasonCodes.push('report_integrity_block');
    return {
      policyVersion: DECISION_CONSENSUS_POLICY_VERSION,
      consensusState: 'BLOCKED',
      reasonCodes,
      criticalAssumption: criticalAssumptionLabel,
      nextValidationAction: 'Resolve the flagged integrity issue before treating this analysis as decision-ready.',
      agreement: null,
    };
  }

  if (reviewOutcome.status === 'unavailable') {
    // Fail open: JEV being unavailable must still return a usable state
    // from the canonical verdict + integrity alone — never silently
    // treated as agreement (contract §8's explicit requirement).
    reasonCodes.push(`independent_review_unavailable:${reviewOutcome.reason}`);
    const proceeding = PROCEED_LIKE.has(quantisDecision);
    return {
      policyVersion: DECISION_CONSENSUS_POLICY_VERSION,
      consensusState:
        integrity.reportIntegrity === 'NEEDS_REVIEW'
          ? 'REVIEW_REQUIRED'
          : proceeding
            ? 'CONDITIONAL'
            : 'DEFER_AND_VALIDATE',
      reasonCodes,
      criticalAssumption: criticalAssumptionLabel,
      nextValidationAction: 'Independent review is temporarily unavailable — treat this result with the same care as before independent review existed.',
      agreement: null,
    };
  }

  const review = reviewOutcome.review;

  if (review.materialContradiction === 'yes') {
    reasonCodes.push('material_contradiction');
    return {
      policyVersion: DECISION_CONSENSUS_POLICY_VERSION,
      consensusState: 'DEFER_AND_VALIDATE',
      reasonCodes,
      criticalAssumption: criticalAssumptionLabel,
      nextValidationAction: 'Resolve the material contradiction the independent review flagged before proceeding.',
      agreement: false,
    };
  }

  if (review.evidenceSufficiency === 'insufficient' || review.evidenceSufficiency === 'contradicted') {
    reasonCodes.push(`evidence_${review.evidenceSufficiency}`);
    return {
      policyVersion: DECISION_CONSENSUS_POLICY_VERSION,
      consensusState: 'CONDITIONAL',
      reasonCodes,
      criticalAssumption: criticalAssumptionLabel,
      nextValidationAction: 'Validate the weakest supported assumption before treating this decision as ready.',
      agreement: null,
    };
  }

  const jevProceeding = jevAgreesWithProceeding(review.recommendedState);
  const quantisProceeding = PROCEED_LIKE.has(quantisDecision);
  const agreement = jevProceeding === null ? null : jevProceeding === quantisProceeding;

  if (agreement === false) {
    reasonCodes.push('quantis_jev_disagreement');
    return {
      policyVersion: DECISION_CONSENSUS_POLICY_VERSION,
      consensusState: 'REVIEW_REQUIRED',
      reasonCodes,
      criticalAssumption: criticalAssumptionLabel,
      nextValidationAction: 'Quantis and the independent review disagree — review both before acting.',
      agreement,
    };
  }

  if (review.humanReviewRequired === 'yes') {
    reasonCodes.push('human_review_required');
    return {
      policyVersion: DECISION_CONSENSUS_POLICY_VERSION,
      consensusState: 'CONDITIONAL',
      reasonCodes,
      criticalAssumption: criticalAssumptionLabel,
      nextValidationAction: 'The independent review recommends human review before proceeding.',
      agreement,
    };
  }

  reasonCodes.push('agreement');
  return {
    policyVersion: DECISION_CONSENSUS_POLICY_VERSION,
    consensusState: 'DECISION_READY',
    reasonCodes,
    criticalAssumption: criticalAssumptionLabel,
    nextValidationAction: null,
    agreement,
  };
}
