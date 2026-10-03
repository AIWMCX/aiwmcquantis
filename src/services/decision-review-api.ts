/**
 * Phase D — thin client wrapper around the review-decision edge function.
 * Mirrors scenario-sets-api.ts's invoke pattern. Founder/admin-only for
 * now (contract §23's rollout order: shadow -> internal UI -> controlled
 * external -> general) — see IndependentReviewPanel.tsx for the gate.
 */
import { supabase } from '@/integrations/supabase/client';

export type DecisionReviewProvider = 'typesafe_jev' | 'quantis_internal_test';

export type ConsensusState =
  | 'DECISION_READY'
  | 'CONDITIONAL'
  | 'REVIEW_REQUIRED'
  | 'DEFER_AND_VALIDATE'
  | 'BLOCKED'
  | 'INDEPENDENT_REVIEW_UNAVAILABLE';

export interface ConsensusResult {
  policyVersion: string;
  consensusState: ConsensusState;
  reasonCodes: string[];
  criticalAssumption: string | null;
  nextValidationAction: string | null;
  agreement: boolean | null;
}

export type RecommendedState =
  | 'proceed'
  | 'proceed_with_conditions'
  | 'defer_and_validate'
  | 'do_not_proceed'
  | 'insufficient_evidence';

export interface IndependentReviewRow {
  status: 'completed' | 'unavailable';
  decision_state?: RecommendedState | null;
  evidence_sufficiency?: string | null;
  rationale?: string | null;
  error_code?: string | null;
  error_detail?: string | null;
}

export type ReviewDecisionResponse =
  | { cached: boolean; review: IndependentReviewRow; consensus: ConsensusResult }
  | { status: 'unavailable'; reason: string; detail: string; consensus?: ConsensusResult };

export async function requestDecisionReview(
  analysisId: string,
  provider: DecisionReviewProvider = 'typesafe_jev',
): Promise<ReviewDecisionResponse> {
  const { data, error } = await supabase.functions.invoke('review-decision', {
    body: { analysis_id: analysisId, provider },
  });
  if (error) {
    throw new Error(error.message || 'review-decision failed');
  }
  return data as ReviewDecisionResponse;
}
