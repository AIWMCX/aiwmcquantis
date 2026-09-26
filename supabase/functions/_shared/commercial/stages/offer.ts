/**
 * Commercial Ops workflow -- Offer stage (spec section 4).
 *
 * The AI must distinguish FACT / ASSUMPTION / INFERENCE / UNKNOWN, and
 * "Quantis must never manufacture evidence to make an offer stronger." That
 * requirement is enforced here as code, not prompt instruction alone:
 * reconcileOfferClaims rejects the whole generation (R2 in r3Validate's
 * pipeline) if any claim marked FACT isn't actually in the foundation's
 * approved_claims, or matches prohibited_claims.
 */
import { z } from 'npm:zod@3.23.8';
import type { R3Reconciler } from '../../r3-validator.ts';
import { runCommercialAgent, type CommercialAgentRunResult } from '../agent-runtime.ts';
import { ProvenancedClaim, isClaimApproved, type CommercialFoundation } from '../contracts.ts';

export const OfferOutput = z.object({
  primary_customer_problem: z.string().min(1),
  desired_outcome: z.string().min(1),
  offer_hypothesis: z.string().min(1),
  offer_components: z.array(z.string()),
  risk_reducers: z.array(z.string()),
  pricing_context: z.array(z.string()),
  qualification_conditions: z.array(z.string()),
  disqualification_conditions: z.array(z.string()),
  cta: z.string().min(1),
  claims_used: z.array(ProvenancedClaim),
  evidence_references: z.array(z.string()),
  assumptions: z.array(z.string()),
  uncertainties: z.array(z.string()),
});
export type OfferOutput = z.infer<typeof OfferOutput>;

export function reconcileOfferClaims(foundation: CommercialFoundation): R3Reconciler<OfferOutput> {
  return (data) => {
    for (const claim of data.claims_used) {
      if (claim.status === 'FACT' && !isClaimApproved(foundation, claim.text)) {
        return `FACT claim not found in approved_claims (or matches prohibited_claims): "${claim.text.slice(0, 80)}"`;
      }
    }
    return null;
  };
}

function buildSystemPrompt(foundation: CommercialFoundation): string {
  return [
    'You generate ONE commercial offer hypothesis for AIWMC Quantis, a financial pre-mortem and business decision-support product.',
    'You must distinguish FACT, ASSUMPTION, INFERENCE, and UNKNOWN for every claim you use -- a FACT claim MUST be traceable to the canonical foundation below, never invented.',
    'Never fabricate customer results, testimonials, revenue numbers, conversion numbers, performance claims, deadlines, guarantees, discounts, or case studies.',
    'Respond with ONLY a single valid JSON object matching the required schema. No markdown, no commentary, no code fences.',
    '',
    '=== CANONICAL FOUNDATION (version ' + foundation.version + ') ===',
    `Product: ${foundation.product_name}`,
    `Description: ${foundation.product_description}`,
    `Target segments: ${foundation.target_segments.join(', ')}`,
    `Customer problems: ${foundation.customer_problems.join(' | ')}`,
    `Desired outcomes: ${foundation.desired_outcomes.join(' | ')}`,
    `Approved claims (usable as FACT): ${foundation.approved_claims.join(' | ')}`,
    `Prohibited claims (never use, in any form): ${foundation.prohibited_claims.join(' | ')}`,
  ].join('\n');
}

export interface GenerateOfferArgs {
  foundation: CommercialFoundation;
  icp: string;
  context?: Record<string, unknown>;
  adminUserId?: string | null;
  requestId?: string | null;
}

export async function generateOffer(args: GenerateOfferArgs): Promise<CommercialAgentRunResult<OfferOutput>> {
  const userPrompt = [
    `Target ICP: ${args.icp}`,
    args.context ? `Additional context: ${JSON.stringify(args.context)}` : '',
    'Generate an offer hypothesis as a JSON object with exactly these fields: primary_customer_problem, desired_outcome, offer_hypothesis, offer_components (array), risk_reducers (array), pricing_context (array), qualification_conditions (array), disqualification_conditions (array), cta, claims_used (array of {text, status, evidence_ref}), evidence_references (array), assumptions (array), uncertainties (array).',
  ]
    .filter(Boolean)
    .join('\n');

  return runCommercialAgent({
    stage: 'offer',
    foundationVersion: args.foundation.version,
    systemPrompt: buildSystemPrompt(args.foundation),
    userPrompt,
    schema: OfferOutput,
    reconcile: reconcileOfferClaims(args.foundation),
    adminUserId: args.adminUserId,
    requestId: args.requestId,
    inputContext: { icp: args.icp, ...(args.context ?? {}) },
  });
}
