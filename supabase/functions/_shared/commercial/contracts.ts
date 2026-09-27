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
// Foundation v2 (2026-09-27) stores verified_capabilities/limitations as
// provenanced objects ({text, status, evidence_ref}) while v1 stored plain
// strings. Accept both and normalize to the text, so a foundation content
// update can never again take every commercial stage down with a parse error.
const FoundationStatement = z
  .union([z.string(), z.object({ text: z.string() }).passthrough()])
  .transform((v) => (typeof v === "string" ? v : v.text));

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
  verified_capabilities: z.array(FoundationStatement),
  limitations: z.array(FoundationStatement),
  approved_claims: z.array(FoundationStatement),
  prohibited_claims: z.array(FoundationStatement),
  evidence: z.array(z.record(z.unknown())),
  customer_evidence: z.array(z.record(z.unknown())),
  faq: z.array(z.record(z.unknown())),
  differentiators: z.array(FoundationStatement),
  call_to_actions: z.array(FoundationStatement),
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

/**
 * The full grounding block every outbound-writing stage puts in its system
 * prompt. One function so prospecting, first-touch and follow-up can never
 * drift apart on what the model is told is true, priced, or forbidden.
 */
export function foundationGroundingBlock(foundation: CommercialFoundation): string {
  const pricing = foundation.pricing
    .map((p) => {
      const name = String(p.tier ?? p.offer ?? "offer");
      const parts: string[] = [];
      if (p.price_monthly !== undefined) parts.push(`$${p.price_monthly}/mo`);
      if (p.price_annual !== undefined) parts.push(`$${p.price_annual}/yr`);
      if (p.price_one_time !== undefined) parts.push(`$${p.price_one_time} one-time`);
      return `${name}: ${parts.join(" or ") || "n/a"}${p.note ? ` (${p.note})` : ""}`;
    })
    .join(" | ");
  return [
    `=== CANONICAL FOUNDATION (version ${foundation.version}) ===`,
    `Product: ${foundation.product_name}`,
    `Description: ${foundation.product_description}`,
    `Target segments: ${foundation.target_segments.join(", ")}`,
    `Excluded segments: ${foundation.excluded_segments.join(", ")}`,
    `Customer problems: ${foundation.customer_problems.join(" | ")}`,
    `Verified capabilities: ${foundation.verified_capabilities.join(" | ")}`,
    `Limitations (never contradict): ${foundation.limitations.join(" | ")}`,
    `Pricing (the ONLY prices you may mention): ${pricing}`,
    `Approved claims (the ONLY product claims you may make): ${foundation.approved_claims.join(" | ")}`,
    `Prohibited claims (never use, in any wording): ${foundation.prohibited_claims.join(" | ")}`,
    `Differentiators: ${foundation.differentiators.join(" | ")}`,
    `Calls to action: ${foundation.call_to_actions.join(" | ")}`,
  ].join("\n");
}
