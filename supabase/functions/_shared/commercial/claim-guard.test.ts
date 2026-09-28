/**
 * Verification for the outbound claim guard, the first-touch grounding
 * rules, and the foundation-v2 (provenanced object) contract.
 *
 * Run with:
 *   deno test --allow-env supabase/functions/_shared/commercial/claim-guard.test.ts
 */
import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { CommercialFoundation, foundationGroundingBlock } from "./contracts.ts";
import { scanOutbound } from "./claim-guard.ts";
import { composeOutboundEmail, isSignalGrounded, reconcileFirstTouch } from "./stages/first-touch.ts";
import { reconcileFollowup } from "./stages/follow-up.ts";

// Shape copied from the live v2 foundation (2026-09-27): capabilities and
// limitations are provenanced objects, not strings.
const V2 = CommercialFoundation.parse({
  id: "11111111-1111-1111-1111-111111111111",
  version: 2,
  is_current: true,
  product_name: "AIWMC Quantis",
  product_description: "Financial pre-mortem and decision-support platform.",
  target_segments: ["business consultants", "fractional CFOs"],
  excluded_segments: ["buyers seeking guaranteed business-success predictions"],
  customer_problems: ["rebuilding the same financial starting point for each new client"],
  desired_outcomes: [],
  pricing: [
    { tier: "free", price_monthly: 0, note: "5 complete Decision Runs per month; no card required" },
    { tier: "plus", price_monthly: 17, price_annual: 168 },
    { tier: "pro", price_monthly: 49, price_annual: 492 },
  ],
  verified_capabilities: [{ text: "Runs deterministic financial calculations before AI narration", status: "FACT", evidence_ref: "x" }],
  limitations: [{ text: "Quantis does not predict business success", status: "FACT", evidence_ref: "y" }],
  approved_claims: ["The financial engine runs before AI narration."],
  prohibited_claims: ["audit-grade", "97,500 real companies", "predictive accuracy"],
  evidence: [],
  customer_evidence: [],
  faq: [],
  differentiators: ["decision-first workflow"],
  call_to_actions: ["Test one real business decision"],
  source_references: [],
});

Deno.test("foundation v2: provenanced objects normalize to their text", () => {
  assertEquals(V2.verified_capabilities[0], "Runs deterministic financial calculations before AI narration");
  assertEquals(V2.limitations[0], "Quantis does not predict business success");
  const block = foundationGroundingBlock(V2);
  assert(block.includes("plus: $17/mo or $168/yr"));
  assert(block.includes("Prohibited claims"));
});

Deno.test("guard: clean peer-to-peer email passes", () => {
  const r = scanOutbound(
    "Saw you run fractional CFO work for multi-location retail. Quantis makes the assumptions explicit and runs the cash and payback math before any AI narration. Free is $0 for 5 runs. Quantis does not guarantee outcomes.",
    V2,
  );
  assert(r.ok, r.violations.join("; "));
});

Deno.test("guard: prohibited claim, fake urgency, invented proof and wrong price are all caught", () => {
  const r = scanOutbound(
    "Our audit-grade engine uses 97,500 real companies. Hundreds of consultants use it and our clients saw 30% gains. Only 3 spots left at $29/mo. We guarantee results.",
    V2,
  );
  assertFalse(r.ok);
  const joined = r.violations.join(" | ");
  for (const needle of ["audit-grade", "97,500 real companies", "fabricated adoption", "fabricated customer result", "fake urgency", "$29", "guarantee language"]) {
    assert(joined.includes(needle), `missing ${needle} in ${joined}`);
  }
});

Deno.test("guard: honest negation is not flagged, but a later positive claim still is", () => {
  assert(scanOutbound("Quantis does not guarantee an outcome and does not predict success.", V2).ok);
  assert(scanOutbound("Quantis does not predict business success or guarantee an outcome.", V2).ok);
  assertFalse(scanOutbound("It is not magic. We guarantee a result.", V2).ok);
  assertFalse(scanOutbound("Quantis predicts which businesses will reach success.", V2).ok);
});

Deno.test("guard: word ceiling", () => {
  const long = Array.from({ length: 130 }, () => "word").join(" ");
  assertFalse(scanOutbound(long, V2, { maxWords: 120 }).ok);
});

Deno.test("first touch: signals must come from recorded evidence", () => {
  const recorded = ["Posted on LinkedIn about rebuilding client models every quarter", "Fractional CFO for 6 dental groups"];
  assert(isSignalGrounded("Fractional CFO for 6 dental groups", recorded));
  assertFalse(isSignalGrounded("Recently raised a Series A", recorded));

  const reconcile = reconcileFirstTouch(V2, recorded);
  const good = {
    subject: "dental group models",
    body: "You mentioned rebuilding client models every quarter. Quantis keeps the assumptions explicit and runs cash and payback math before any AI narration. Worth me running one anonymized client case with you?",
    signals_used: ["Posted on LinkedIn about rebuilding client models every quarter"],
    segment_angle: "consultant reuse",
    confidence: "high" as const,
    missing_evidence: [],
  };
  assertEquals(reconcile(good), null);
  assert(reconcile({ ...good, signals_used: ["Recently raised a Series A"] })?.includes("signal not in recorded evidence"));
  assert(reconcile({ ...good, body: good.body + " See https://example.com" })?.includes("links"));
  assert(reconcile({ ...good, body: good.body + " It is audit-grade." })?.includes("claim guard"));
});

Deno.test("follow-up: claim guard applies", () => {
  const r = reconcileFollowup(V2);
  assertEquals(r({ draft: "Circling back once. Happy to run one decision through it.", reasoning: "x", next_action: "y" }), null);
  assert(r({ draft: "Last chance -- limited-time pricing.", reasoning: "x", next_action: "y" }) !== null);
});

Deno.test("compose: greeting, sender identity and opt-out are appended by code", () => {
  const email = composeOutboundEmail("Body text.", "Jane Doe", "Bogdan\nFounder, AIWMC Quantis");
  assert(email.startsWith("Hi Jane,\n\nBody text."));
  assert(email.includes("Founder, AIWMC Quantis"));
  assert(email.endsWith(`reply "no" and I won't follow up.`));
});

Deno.test("compose: a body that repeats the first name is not doubled after the greeting", () => {
  const email = composeOutboundEmail("Carlos — your work sits at capital structure.", "Carlos Ruiz", "Bogdan");
  assert(email.startsWith("Hi Carlos,\n\nYour work sits at capital structure."));
  const kept = composeOutboundEmail("Carlossa Group caught my eye.", "Carlos Ruiz", "Bogdan");
  assert(kept.startsWith("Hi Carlos,\n\nCarlossa Group caught my eye."));
});
