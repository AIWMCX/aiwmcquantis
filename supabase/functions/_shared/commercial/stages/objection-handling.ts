/**
 * Commercial Ops workflow -- Objection Handling stage (spec section 7).
 *
 * "Never invent an answer when Quantis lacks supporting evidence. Return
 * INSUFFICIENT_EVIDENCE when appropriate." Enforced two ways: the Zod
 * schema's own refine() (insufficient_evidence=true requires response=null,
 * mirroring the DB CHECK constraint), and reconcileObjectionEvidence, which
 * rejects the whole generation if any FACT-status evidence_used entry isn't
 * actually approved -- same anti-fabrication mechanism as the Offer stage.
 */
import { z } from 'npm:zod@3.23.8';
import type { R3Reconciler } from '../../r3-validator.ts';
import { runCommercialAgent, type CommercialAgentRunResult } from '../agent-runtime.ts';
import { ProvenancedClaim, isClaimApproved, type CommercialFoundation } from '../contracts.ts';

export const ObjectionResponseOutput = z
  .object({
    interpretation: z.string().min(1),
    unresolved: z.string().nullable(),
    clarifying_question: z.string().nullable(),
    response: z.string().nullable(),
    evidence_used: z.array(ProvenancedClaim),
    unknowns: z.array(z.string()),
    recommended_next_step: z.string().min(1),
    insufficient_evidence: z.boolean(),
  })
  .refine((d) => d.insufficient_evidence || d.response !== null, {
    message: 'response must be non-null unless insufficient_evidence is true',
    path: ['response'],
  })
  .refine((d) => !d.insufficient_evidence || d.response === null, {
    message: 'response must be null when insufficient_evidence is true',
    path: ['response'],
  });
export type ObjectionResponseOutput = z.infer<typeof ObjectionResponseOutput>;

export function reconcileObjectionEvidence(foundation: CommercialFoundation): R3Reconciler<ObjectionResponseOutput> {
  return (data) => {
    for (const claim of data.evidence_used) {
      if (claim.status === 'FACT' && !isClaimApproved(foundation, claim.text)) {
        return `FACT evidence not found in approved_claims (or matches prohibited_claims): "${claim.text.slice(0, 80)}"`;
      }
    }
    return null;
  };
}

function buildSystemPrompt(foundation: CommercialFoundation): string {
  return [
    `You respond to a sales objection about ${foundation.product_name}.`,
    'Categories include: price, timing, trust, existing solution, internal approval, unclear ROI, security, accuracy, product fit.',
    'Never invent an answer when the foundation below lacks supporting evidence -- set insufficient_evidence=true and response=null in that case instead.',
    'Respond with ONLY a single valid JSON object matching the required schema. No markdown, no commentary, no code fences.',
    '',
    '=== CANONICAL FOUNDATION (version ' + foundation.version + ') ===',
    `Approved claims (usable as FACT evidence): ${foundation.approved_claims.join(' | ')}`,
    `Prohibited claims (never use, in any form): ${foundation.prohibited_claims.join(' | ')}`,
    `Limitations: ${foundation.limitations.join(' | ')}`,
  ].join('\n');
}

export interface HandleObjectionArgs {
  foundation: CommercialFoundation;
  objectionText: string;
  offerSummary?: string | null;
  adminUserId?: string | null;
  requestId?: string | null;
}

export async function handleObjection(
  args: HandleObjectionArgs,
): Promise<CommercialAgentRunResult<ObjectionResponseOutput>> {
  const userPrompt = [
    `Objection: ${args.objectionText}`,
    args.offerSummary ? `Relevant offer: ${args.offerSummary}` : '',
    'Respond as a JSON object with exactly these fields: interpretation, unresolved (string or null), clarifying_question (string or null), response (string or null), evidence_used (array of {text, status, evidence_ref}), unknowns (array), recommended_next_step, insufficient_evidence (boolean).',
  ]
    .filter(Boolean)
    .join('\n');

  return runCommercialAgent({
    stage: 'objection_handling',
    foundationVersion: args.foundation.version,
    systemPrompt: buildSystemPrompt(args.foundation),
    userPrompt,
    schema: ObjectionResponseOutput,
    reconcile: reconcileObjectionEvidence(args.foundation),
    adminUserId: args.adminUserId,
    requestId: args.requestId,
    inputContext: { objection_text: args.objectionText, offer_summary: args.offerSummary ?? null },
  });
}
