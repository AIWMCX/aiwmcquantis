/**
 * Reproducible verification for commercial/stages/offer.ts.
 *
 * Run with:
 *   deno test --allow-env supabase/functions/_shared/commercial/stages/offer.test.ts
 *
 * No network access needed or requested -- tests OfferOutput's schema and
 * reconcileOfferClaims's anti-fabrication check directly, not the network
 * call inside generateOffer() (see agent-runtime.test.ts's own header for
 * why an end-to-end successful-call test isn't feasible without modifying
 * llm-call.ts).
 */
import { assert, assertFalse } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { CommercialFoundation } from "../contracts.ts";
import { OfferOutput, reconcileOfferClaims } from "./offer.ts";

const FOUNDATION = CommercialFoundation.parse({
  id: "11111111-1111-1111-1111-111111111111",
  version: 1,
  is_current: true,
  product_name: "AIWMC Quantis",
  product_description: "Financial pre-mortem and business decision-support.",
  target_segments: ["founders"],
  excluded_segments: [],
  customer_problems: ["need to structure assumptions before committing capital"],
  desired_outcomes: ["a profitability verdict before investing"],
  pricing: [{ tier: "free", price_monthly: 0 }],
  verified_capabilities: [],
  limitations: [],
  approved_claims: ["97,500 benchmark data points"],
  prohibited_claims: ["under 90 seconds", "predictive accuracy"],
  evidence: [],
  customer_evidence: [],
  faq: [],
  differentiators: [],
  call_to_actions: ["Start your free analysis"],
  source_references: ["src/config/tiers.ts"],
});

const VALID_OFFER = {
  primary_customer_problem: "needs to pressure-test assumptions before committing capital",
  desired_outcome: "a defensible profitability verdict",
  offer_hypothesis: "a free pre-mortem analysis to validate the decision before spending",
  offer_components: ["free analysis", "sourced report"],
  risk_reducers: ["no card required"],
  pricing_context: ["free tier available"],
  qualification_conditions: ["has a real capital decision pending"],
  disqualification_conditions: ["no real decision to test"],
  cta: "Start your free analysis",
  claims_used: [{ text: "97,500 benchmark data points", status: "FACT", evidence_ref: "src/config/tiers.ts" }],
  evidence_references: ["src/config/tiers.ts"],
  assumptions: ["the prospect has budget authority"],
  uncertainties: ["unclear decision timeline"],
};

Deno.test("OfferOutput: a real, well-formed offer parses", () => {
  const result = OfferOutput.safeParse(VALID_OFFER);
  assert(result.success, `expected success, got ${JSON.stringify(!result.success && result.error.issues)}`);
});

Deno.test("reconcileOfferClaims: an offer whose FACT claim is approved passes reconciliation", () => {
  const parsed = OfferOutput.parse(VALID_OFFER);
  const issue = reconcileOfferClaims(FOUNDATION)(parsed);
  assertFalse(issue !== null, `expected no reconciliation issue, got: ${issue}`);
});

Deno.test("reconcileOfferClaims: a FACT claim not in approved_claims is rejected -- the actual anti-fabrication check", () => {
  const parsed = OfferOutput.parse({
    ...VALID_OFFER,
    claims_used: [{ text: "we have 50,000 five-star reviews", status: "FACT", evidence_ref: "made up" }],
  });
  const issue = reconcileOfferClaims(FOUNDATION)(parsed);
  assert(issue !== null, "expected a reconciliation issue for a fabricated FACT claim");
});

Deno.test("reconcileOfferClaims: a FACT claim matching a prohibited_claims entry is rejected even with an evidence_ref", () => {
  const parsed = OfferOutput.parse({
    ...VALID_OFFER,
    claims_used: [{ text: "results in under 90 seconds", status: "FACT", evidence_ref: "src/config/tiers.ts" }],
  });
  const issue = reconcileOfferClaims(FOUNDATION)(parsed);
  assert(issue !== null, "expected a reconciliation issue for a prohibited claim");
});

Deno.test("reconcileOfferClaims: an ASSUMPTION-status claim is never checked against approved_claims", () => {
  const parsed = OfferOutput.parse({
    ...VALID_OFFER,
    claims_used: [{ text: "the prospect prefers monthly billing", status: "ASSUMPTION", evidence_ref: null }],
  });
  const issue = reconcileOfferClaims(FOUNDATION)(parsed);
  assertFalse(issue !== null, `an ASSUMPTION should never be reconciled against approved_claims, got: ${issue}`);
});
