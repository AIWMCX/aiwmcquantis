/**
 * Decision Review — shared type contracts.
 *
 * JEV ("typesafe_jev") is the first implementation of a reusable, bounded,
 * independent-review contract — not a hard-wired vendor integration. Nothing
 * here may originate or modify a canonical financial number: this module
 * only describes evidence/judgment exchange, never dollars.
 *
 * Bounded response shapes only (`choice` / `score` / `noul`), per the JEV
 * contract's own question-contract guidance — no free-form financial
 * forecasts, no probability-of-success numbers, no synthetic confidence
 * percentage.
 */

export const DECISION_PACKET_SCHEMA_VERSION = '1.0' as const;
export const DECISION_REVIEW_VERSION = '1.0' as const;
export const DECISION_CONSENSUS_POLICY_VERSION = '1' as const;

export type DecisionReviewProvider = 'typesafe_jev' | 'quantis_internal_test';

// ───────────────────────────────────────────────────────────────────────────
// Blinded independent decision packet (sent TO the reviewer)
// ───────────────────────────────────────────────────────────────────────────

export interface MoneyValue {
  amount: number;
  currency: string; // ISO 4217, e.g. 'USD'
}

export interface TypedFinancialMetric {
  key: string; // e.g. 'net_profit_monthly', 'ltv_cac_ratio', 'break_even_months'
  value: number;
  unit: 'usd' | 'usd_per_month' | 'months' | 'ratio' | 'percent' | 'count';
}

export interface ScenarioSummary {
  label: 'pessimistic' | 'base' | 'optimistic' | string;
  net_profit_monthly: number | null;
  mrr: number | null;
}

/** Evidence strength only — never raw URLs, raw search snippets, or PII. */
export interface EvidenceSummary {
  claim: string; // short, e.g. "typical CAC for this industry/location"
  strength: 'supported' | 'partial' | 'insufficient' | 'contradicted';
  sourceCount: number;
}

export interface CriticalAssumption {
  key: string;
  label: string;
  currentValue: number | null;
  provenance: 'USER_ACTUAL' | 'DERIVED' | 'MODELED_BENCHMARK_PRIOR' | 'SYSTEM_ASSUMPTION' | 'PLACEHOLDER' | 'UNKNOWN';
  evidenceStrength: 'supported' | 'partial' | 'insufficient' | 'contradicted' | 'unknown';
}

export interface ConstraintSummary {
  label: string;
  detail?: string;
}

/**
 * Deliberately excludes: email, name, raw uploaded documents, billing
 * information, any field not needed to answer the bounded questions below,
 * and — critically — the Quantis verdict itself (anchoring risk; see JEV
 * contract §6). `decision.description` is the user's free-text idea/decision
 * description with no identity fields attached to it.
 */
export interface IndependentDecisionPacket {
  schemaVersion: typeof DECISION_PACKET_SCHEMA_VERSION;

  decision: {
    type: string;
    description: string;
    capitalAtRisk?: MoneyValue | null;
    deadline?: string | null;
  };

  financialState: {
    canonicalResultHash: string;
    metrics: TypedFinancialMetric[];
    scenarios: ScenarioSummary[];
  };

  criticalAssumptions: CriticalAssumption[];
  evidence: EvidenceSummary[];
  constraints: ConstraintSummary[];

  integrity: {
    reportIntegrity: 'OK' | 'NEEDS_REVIEW' | 'BLOCK';
    reconciliationStatus: 'OK' | 'WARNING' | 'FAILED' | 'UNKNOWN';
    sourceCoverageStatus: 'SUFFICIENT' | 'PARTIAL' | 'INSUFFICIENT' | 'UNKNOWN';
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Bounded question/response contract (returned FROM the reviewer)
// ───────────────────────────────────────────────────────────────────────────

export type EvidenceSufficiency = 'sufficient' | 'partial' | 'insufficient' | 'contradicted';
export type RecommendedState =
  | 'proceed'
  | 'proceed_with_conditions'
  | 'defer_and_validate'
  | 'do_not_proceed'
  | 'insufficient_evidence';
/** "noul" per the JEV contract: a bounded tri-state, not a free-form boolean. */
export type NoulAnswer = 'yes' | 'no' | 'unknown';

export interface IndependentDecisionReview {
  schemaVersion: typeof DECISION_REVIEW_VERSION;
  provider: DecisionReviewProvider;
  providerModel: string | null;

  evidenceSufficiency: EvidenceSufficiency;
  recommendedState: RecommendedState;
  materialContradiction: NoulAnswer;
  criticalAssumptionSupported: EvidenceSufficiency;
  humanReviewRequired: NoulAnswer;
  /** Short bounded rationale string, NOT a financial forecast. Truncated defensively by the provider adapter. */
  rationale: string;

  requestId: string;
  latencyMs: number;
  inputHash: string;
  outputHash: string;
  costUsd: number | null;
}

export type DecisionReviewUnavailableReason =
  | 'feature_disabled'
  | 'timeout'
  | 'rate_limited'
  | 'provider_error'
  | 'invalid_response'
  | 'not_configured';

export type DecisionReviewOutcome =
  | { status: 'completed'; review: IndependentDecisionReview }
  | { status: 'unavailable'; reason: DecisionReviewUnavailableReason; detail: string };

/**
 * Every provider implementation must honor: JEV failure never destroys a
 * valid Quantis analysis (contract §5). `review()` therefore never throws —
 * it always resolves to a `DecisionReviewOutcome`, `completed` or
 * `unavailable`, so a caller can always fail open.
 */
export interface DecisionReviewer {
  readonly provider: DecisionReviewProvider;
  review(packet: IndependentDecisionPacket, opts?: { timeoutMs?: number }): Promise<DecisionReviewOutcome>;
}
