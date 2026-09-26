/**
 * Commercial Ops workflow -- shared contracts (Phase C: Commercial
 * Foundation only; later stages' schemas are added in the PRs that
 * implement those stages, per this feature's phase discipline).
 *
 * Reuses the existing structured-output pattern (r3-validator.ts's Zod
 * schema-validate -> repair-attempt -> typed-rejection shape) and the
 * existing provider abstraction (llm-call.ts's aiCall/callTierLlm, Dahl ->
 * DeepSeek -> Anthropic fallback chain) rather than introducing a second
 * AI-calling or validation mechanism -- confirmed via repo audit before
 * writing this.
 */
import { z } from "https://esm.sh/zod@3.23.8"; // matches r3-validator.ts's exact import

// ---------------------------------------------------------------------------
// Provenance -- the FACT/ASSUMPTION/INFERENCE/UNKNOWN distinction lives in
// the data itself, not just in prose, so the UI can render it and later
// stages (outcome/learning) can check assumptions against real results.
// ---------------------------------------------------------------------------
export const ClaimStatus = z.enum(["FACT", "ASSUMPTION", "INFERENCE", "UNKNOWN"]);
export type ClaimStatus = z.infer<typeof ClaimStatus>;

export const ProvenancedClaim = z
  .object({
    text: z.string().min(1),
    status: ClaimStatus,
    evidence_ref: z.string().nullable(),
  })
  .refine((claim) => claim.status !== "FACT" || claim.evidence_ref !== null, {
    message: "a FACT claim must carry a non-null evidence_ref",
    path: ["evidence_ref"],
  });
export type ProvenancedClaim = z.infer<typeof ProvenancedClaim>;

// ---------------------------------------------------------------------------
// Commercial Foundation -- matches public.commercial_foundations exactly.
// ---------------------------------------------------------------------------
export const CommercialFoundation = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  is_current: z.boolean(),
  product_name: z.string().min(1),
  product_description: z.string().min(1),
  target_segments: z.array(z.string()),
  excluded_segments: z.array(z.string()),
  customer_problems: z.array(z.string()),
  desired_outcomes: z.array(z.string()),
  pricing: z.array(z.record(z.unknown())),
  verified_capabilities: z.array(z.string()),
  limitations: z.array(z.string()),
  approved_claims: z.array(z.string()),
  prohibited_claims: z.array(z.string()),
  evidence: z.array(z.record(z.unknown())),
  customer_evidence: z.array(z.record(z.unknown())),
  faq: z.array(z.record(z.unknown())),
  differentiators: z.array(z.string()),
  call_to_actions: z.array(z.string()),
  source_references: z.array(z.string()),
});
export type CommercialFoundation = z.infer<typeof CommercialFoundation>;

/**
 * A claim is usable downstream (e.g. in an offer or an objection response)
 * only if it appears in the foundation's approved_claims AND does not match
 * anything in prohibited_claims. This is the actual, checkable mechanism
 * behind "Quantis must never manufacture evidence to make an offer
 * stronger" -- not just a prompt instruction to the LLM, a function later
 * stages must call before using any claim text.
 */
export function isClaimApproved(foundation: CommercialFoundation, claimText: string): boolean {
  const normalized = claimText.toLowerCase();
  const prohibited = foundation.prohibited_claims.some((p) => normalized.includes(p.toLowerCase()));
  if (prohibited) return false;
  return foundation.approved_claims.some((a) => normalized.includes(a.toLowerCase()) || a.toLowerCase().includes(normalized));
}
