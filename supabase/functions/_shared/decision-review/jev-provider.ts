/**
 * TypesafeJevProvider — `DecisionReviewer` implementation for JEV
 * (https://api.typesafe.ai/v1/systemone).
 *
 * ⚠️ NOT YET VERIFIED AGAINST A LIVE CALL. `TYPESAFE_API_KEY` has not been
 * provisioned as a Supabase secret as of this writing (see
 * docs/decision-intelligence/JEV_IMPLEMENTATION_DECISION.md, "Two real
 * external blockers"). The request/response shape below follows the bounded
 * `choice`/`score`/`noul` question contract described in the implementation
 * spec; it is deliberately defensive (schema-validated via `r3Validate`,
 * single retry, hard timeout, fail-open on any shape mismatch) precisely
 * because it has not been confirmed against the real vendor response yet.
 * The first real production call must be diffed against this mapping and
 * this file updated if the vendor's actual shape differs — tracked as a P1
 * in the final report, not silently assumed correct.
 *
 * Non-negotiables this file must never violate (contract §2):
 *   - Never originates or modifies a canonical financial number.
 *   - Never produces a customer-facing generic confidence percentage.
 *   - A failure here must resolve to `{status:'unavailable'}`, never throw.
 */
import { z } from 'npm:zod@3.23.8';
import { r3Validate } from '../r3-validator.ts';
import type {
  DecisionReviewer,
  DecisionReviewOutcome,
  IndependentDecisionPacket,
  IndependentDecisionReview,
} from './contracts.ts';
import { DECISION_REVIEW_VERSION } from './contracts.ts';
import { DEFAULT_REVIEW_TIMEOUT_MS, unavailable, withSingleRetry, withTimeout } from './provider.ts';
import { hashPacketInput, hashReviewOutput } from './hashes.ts';

const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const JEV_MODEL_LABEL = 'typesafe-jev-systemone';

const choiceSchema = z.enum(['sufficient', 'partial', 'insufficient', 'contradicted']);
const stateSchema = z.enum([
  'proceed',
  'proceed_with_conditions',
  'defer_and_validate',
  'do_not_proceed',
  'insufficient_evidence',
]);
const noulSchema = z.enum(['yes', 'no', 'unknown']);

const jevResponseSchema = z.object({
  request_id: z.string().optional(),
  model: z.string().optional(),
  cost_usd: z.number().nullable().optional(),
  answers: z.object({
    evidence_sufficiency: z.object({ value: choiceSchema }),
    recommended_state: z.object({ value: stateSchema }),
    material_contradiction: z.object({ value: noulSchema }),
    critical_assumption_supported: z.object({ value: choiceSchema }),
    human_review_required: z.object({ value: noulSchema }),
  }),
  rationale: z.string().max(4000).optional(),
});
type JevResponse = z.infer<typeof jevResponseSchema>;

function buildRequestBody(packet: IndependentDecisionPacket) {
  return {
    questions: {
      evidence_sufficiency: {
        type: 'choice',
        prompt: 'Is the available evidence sufficient to support the decision?',
        options: {
          sufficient: 'The evidence strongly supports the critical assumptions.',
          partial: 'Some evidence exists but material gaps remain.',
          insufficient: 'Evidence is too thin to support the critical assumptions.',
          contradicted: 'Available evidence contradicts a critical assumption.',
        },
      },
      recommended_state: {
        type: 'choice',
        prompt:
          'Given the supplied financial state, evidence, and constraints, what decision state is best supported? Do not estimate missing financial fields, produce a forecast, or state a probability of success — answer only from the bounded options.',
        options: {
          proceed: 'The decision is adequately supported to proceed.',
          proceed_with_conditions: 'Proceed only if specific conditions are first validated.',
          defer_and_validate: 'Defer the decision until key assumptions are validated.',
          do_not_proceed: 'The evidence does not support proceeding.',
          insufficient_evidence: 'There is not enough evidence to classify this decision.',
        },
      },
      material_contradiction: {
        type: 'noul',
        prompt:
          'Is there a material contradiction that should prevent the current decision from being treated as decision-ready?',
      },
      critical_assumption_supported: {
        type: 'choice',
        prompt: 'Is the single most decision-sensitive assumption supported by the evidence provided?',
        options: {
          sufficient: 'Strongly supported.',
          partial: 'Partially supported.',
          insufficient: 'Not adequately supported.',
          contradicted: 'Contradicted by the evidence provided.',
        },
      },
      human_review_required: {
        type: 'noul',
        prompt: 'Does this decision require human review before being treated as ready?',
      },
    },
    context: packet,
  };
}

function mapToReview(parsed: JevResponse, inputHash: string, outputHash: string, requestId: string, latencyMs: number): IndependentDecisionReview {
  return {
    schemaVersion: DECISION_REVIEW_VERSION,
    provider: 'typesafe_jev',
    providerModel: parsed.model ?? JEV_MODEL_LABEL,
    evidenceSufficiency: parsed.answers.evidence_sufficiency.value,
    recommendedState: parsed.answers.recommended_state.value,
    materialContradiction: parsed.answers.material_contradiction.value,
    criticalAssumptionSupported: parsed.answers.critical_assumption_supported.value,
    humanReviewRequired: parsed.answers.human_review_required.value,
    rationale: (parsed.rationale ?? '').slice(0, 2000),
    requestId: parsed.request_id ?? requestId,
    latencyMs,
    inputHash,
    outputHash,
    costUsd: parsed.cost_usd ?? null,
  };
}

export class TypesafeJevProvider implements DecisionReviewer {
  readonly provider = 'typesafe_jev' as const;

  constructor(private readonly apiKey: string) {}

  async review(packet: IndependentDecisionPacket, opts?: { timeoutMs?: number }): Promise<DecisionReviewOutcome> {
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_REVIEW_TIMEOUT_MS;
    const inputHash = await hashPacketInput(packet);
    const requestId = `jev_${inputHash.slice(0, 16)}_${Date.now()}`;
    const body = buildRequestBody(packet);
    const start = Date.now();

    const attempt = async (): Promise<
      { ok: true; value: { parsed: JevResponse; raw: string } } | { ok: false; transient: boolean; detail: string }
    > => {
      const result = await withTimeout(async (signal) => {
        const res = await fetch(JEV_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal,
        });
        const raw = await res.text();
        return { status: res.status, raw };
      }, timeoutMs);

      if (result === null) {
        return { ok: false, transient: true, detail: 'timeout or network error' };
      }
      if (result.status === 429) {
        return { ok: false, transient: true, detail: '429 rate limited' };
      }
      if (result.status >= 500) {
        return { ok: false, transient: true, detail: `5xx: ${result.status}` };
      }
      if (result.status >= 400) {
        return { ok: false, transient: false, detail: `client error: ${result.status}` };
      }

      const r3 = r3Validate(result.raw, jevResponseSchema);
      if (!r3.ok) {
        return { ok: false, transient: false, detail: `invalid response shape: ${r3.reason} — ${r3.detail}` };
      }
      return { ok: true, value: { parsed: r3.data, raw: result.raw } };
    };

    const outcome = await withSingleRetry(attempt);
    const latencyMs = Date.now() - start;

    if (!outcome.ok) {
      const reason = outcome.detail.startsWith('429')
        ? 'rate_limited'
        : outcome.detail.startsWith('invalid response shape')
          ? 'invalid_response'
          : outcome.detail.includes('timeout')
            ? 'timeout'
            : 'provider_error';
      return unavailable(reason, outcome.detail);
    }

    const outputHash = await hashReviewOutput(outcome.value.parsed);
    return {
      status: 'completed',
      review: mapToReview(outcome.value.parsed, inputHash, outputHash, requestId, latencyMs),
    };
  }
}
