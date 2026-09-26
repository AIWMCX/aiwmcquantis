/**
 * Reproducible verification for commercial/contracts.ts.
 *
 * Run with:
 *   deno test --allow-env supabase/functions/_shared/commercial/contracts.test.ts
 *
 * No network access needed or requested -- pure Zod validation logic,
 * matching dahl-canary.test.ts's own header convention.
 */
import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { ClaimStatus, CommercialFoundation, ProvenancedClaim, isClaimApproved } from "./contracts.ts";

const VALID_FOUNDATION = {
  id: "11111111-1111-1111-1111-111111111111",
  version: 1,
  is_current: true,
  product_name: "AIWMC Quantis",
  product_description: "Financial pre-mortem and business decision-support.",
  target_segments: ["founders", "consultants", "fractional CFOs"],
  excluded_segments: [],
  customer_problems: ["need to structure assumptions before committing capital"],
  desired_outcomes: ["a profitability verdict before investing"],
  pricing: [{ tier: "free", price_monthly: 0 }],
  verified_capabilities: ["structure assumptions", "compare scenarios"],
  limitations: [],
  approved_claims: ["97,500 benchmark data points"],
  prohibited_claims: ["under 90 seconds", "predictive accuracy"],
  evidence: [],
  customer_evidence: [],
  faq: [],
  differentiators: [],
  call_to_actions: ["Start your free analysis"],
  source_references: ["src/config/tiers.ts"],
};

Deno.test("foundation validation: a real, seed-shaped foundation parses", () => {
  const result = CommercialFoundation.safeParse(VALID_FOUNDATION);
  assert(result.success, `expected success, got ${JSON.stringify(!result.success && result.error.issues)}`);
});

Deno.test("foundation validation: missing required product_description is rejected", () => {
  const { product_description, ...broken } = VALID_FOUNDATION;
  const result = CommercialFoundation.safeParse(broken);
  assertFalse(result.success);
});

Deno.test("foundation validation: empty product_name is rejected (min(1))", () => {
  const result = CommercialFoundation.safeParse({ ...VALID_FOUNDATION, product_name: "" });
  assertFalse(result.success);
});

Deno.test("foundation validation: non-positive version is rejected", () => {
  const result = CommercialFoundation.safeParse({ ...VALID_FOUNDATION, version: 0 });
  assertFalse(result.success);
});

Deno.test("unsupported claim rejection: a FACT with no evidence_ref is rejected", () => {
  const result = ProvenancedClaim.safeParse({
    text: "customers save 10 hours a week",
    status: "FACT",
    evidence_ref: null,
  });
  assertFalse(result.success, "a FACT claim must carry evidence -- this is the actual anti-fabrication check");
});

Deno.test("unsupported claim rejection: an ASSUMPTION with no evidence_ref is fine", () => {
  const result = ProvenancedClaim.safeParse({
    text: "the prospect has budget authority",
    status: "ASSUMPTION",
    evidence_ref: null,
  });
  assert(result.success);
});

Deno.test("unsupported claim rejection: a FACT WITH an evidence_ref is accepted", () => {
  const result = ProvenancedClaim.safeParse({
    text: "5 free Decision Runs per month",
    status: "FACT",
    evidence_ref: "src/config/tiers.ts",
  });
  assert(result.success);
});

Deno.test("ClaimStatus rejects an unrecognized status string", () => {
  const result = ClaimStatus.safeParse("VERIFIED"); // not one of the 4 allowed values
  assertFalse(result.success);
});

Deno.test("isClaimApproved: an approved claim is usable downstream", () => {
  const parsed = CommercialFoundation.parse(VALID_FOUNDATION);
  assert(isClaimApproved(parsed, "we have 97,500 benchmark data points"));
});

Deno.test("isClaimApproved: a prohibited claim is never usable, even if superficially plausible", () => {
  const parsed = CommercialFoundation.parse(VALID_FOUNDATION);
  assertFalse(isClaimApproved(parsed, "results appear in under 90 seconds"));
  assertFalse(isClaimApproved(parsed, "this model has predictive accuracy"));
});

Deno.test("isClaimApproved: an unrelated claim not in either list is not approved (fail closed)", () => {
  const parsed = CommercialFoundation.parse(VALID_FOUNDATION);
  assertFalse(isClaimApproved(parsed, "we guarantee a 10x return on investment"));
});
