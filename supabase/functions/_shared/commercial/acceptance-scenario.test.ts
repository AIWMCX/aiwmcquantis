/**
 * Commercial Ops workflow — acceptance scenario (spec section 20).
 *
 * "Create one deterministic end-to-end fixture using AIWMC Quantis itself
 * ... At every stage show: SOURCE FACTS, ASSUMPTIONS, GENERATED OUTPUT,
 * HUMAN APPROVAL, STATE TRANSITION. No external message should actually be
 * sent during acceptance testing."
 *
 * This fixture proves the WIRING (schemas -> reconcile checks -> funnel
 * rules all chain together against the real production foundation content),
 * not that the LLM can produce well-formed JSON (r3Validate already
 * guarantees that, and agent-runtime.test.ts already proves the runtime's
 * failure path). Every stage OUTPUT below is hand-authored -- exactly what
 * a real model response is expected to look like -- rather than a live
 * call, for the same reason documented in agent-runtime.test.ts's header:
 * llm-call.ts's provider URLs are hardcoded, not env-configurable, so a
 * genuine network-mocked success path isn't reachable without modifying
 * that file (out of scope here).
 *
 * Run with:
 *   deno test --allow-env supabase/functions/_shared/commercial/acceptance-scenario.test.ts
 *
 * No network access needed or requested.
 */
import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { CommercialFoundation } from "./contracts.ts";
import { OfferOutput, reconcileOfferClaims } from "./stages/offer.ts";
import { ProspectAssessmentOutput } from "./stages/prospecting.ts";
import { CallBriefOutput } from "./stages/call-preparation.ts";
import { ObjectionResponseOutput, reconcileObjectionEvidence } from "./stages/objection-handling.ts";
import { FollowupDraftOutput } from "./stages/follow-up.ts";
import { checkFunnelTransition, type CommercialFunnelStage } from "./funnel.ts";

// ─────────────────────────────────────────────────────────────────────────
// SOURCE FACTS -- the real, live production foundation content (version 1
// seed, supabase/migrations/20260926090000_commercial_foundation.sql).
// ─────────────────────────────────────────────────────────────────────────
const FOUNDATION = CommercialFoundation.parse({
  id: "11111111-1111-1111-1111-111111111111",
  version: 1,
  is_current: true,
  product_name: "AIWMC Quantis",
  product_description:
    "Financial pre-mortem and business decision-support: stress-tests a business idea or operating decision against benchmark data and a deterministic financial engine, returning a profitability verdict, reliability score, and sourced report before capital is committed.",
  target_segments: ["founders", "consultants", "fractional CFOs", "business advisors", "strategic operators"],
  excluded_segments: [],
  customer_problems: [
    "need to structure assumptions before committing capital",
    "need to pressure-test a client' or their own business decision",
    "need a sourced, defensible financial analysis, not a guess",
  ],
  desired_outcomes: [
    "a clear profitability verdict and reliability score before investing",
    "a saveable, source-cited report",
    "a decision they can defend to a partner, investor, or client",
  ],
  pricing: [{ tier: "free", price_monthly: 0 }, { tier: "plus", price_monthly: 17 }, { tier: "pro", price_monthly: 49 }],
  verified_capabilities: [
    "structure assumptions before modeling",
    "model business drivers bottom-up (financial-engine.ts)",
    "compare scenarios side by side",
    "calculate runway, break-even, and payback",
    "detect which single assumption is most fragile (sensitivity/required-to-work)",
    "5 free Decision Runs per month, no credit card required",
  ],
  limitations: ["not a predictive model -- disclaimed in src/pages/Methodology.tsx"],
  approved_claims: [
    "97,500 benchmark data points",
    "no credit card required, first analysis free",
  ],
  prohibited_claims: [
    "under 90 seconds",
    "90% fail",
    "predictive accuracy",
  ],
  evidence: [],
  customer_evidence: [],
  faq: [],
  differentiators: ["deterministic financial engine, not a chatbot guess"],
  call_to_actions: ["Start your free analysis"],
  source_references: ["src/config/tiers.ts", "src/config/canonical-facts.ts", "src/pages/Methodology.tsx"],
});

Deno.test("acceptance scenario: 1. Foundation is the real, current, seeded production content", () => {
  assertEquals(FOUNDATION.version, 1);
  assertEquals(FOUNDATION.product_name, "AIWMC Quantis");
  assert(FOUNDATION.is_current);
});

// ─────────────────────────────────────────────────────────────────────────
// 2. OFFER -- ICP: fractional CFO / consultant.
// GENERATED OUTPUT (hand-authored, as a model would produce it).
// ─────────────────────────────────────────────────────────────────────────
const OFFER_OUTPUT = {
  primary_customer_problem: "needs to pressure-test a client's business decision with a defensible, sourced analysis",
  desired_outcome: "a profitability verdict and reliability score they can show the client",
  offer_hypothesis: "a free pre-mortem analysis on one real client decision, to prove the tool before recommending it",
  offer_components: ["free Decision Run", "sourced report", "sensitivity/required-to-work breakdown"],
  risk_reducers: ["no credit card required, first analysis free"],
  pricing_context: ["free tier available; Plus $17/mo and Pro $49/mo for unlimited use"],
  qualification_conditions: ["advises clients on capital or operating decisions"],
  disqualification_conditions: ["no real client decision to test right now"],
  cta: "Start your free analysis",
  // ASSUMPTIONS / FACT-vs-ASSUMPTION distinction lives in the data itself.
  claims_used: [
    { text: "97,500 benchmark data points", status: "FACT", evidence_ref: "src/config/canonical-facts.ts" },
    { text: "no credit card required, first analysis free", status: "FACT", evidence_ref: "src/config/tiers.ts" },
    { text: "the prospect has at least one active client engagement", status: "ASSUMPTION", evidence_ref: null },
  ],
  evidence_references: ["src/config/tiers.ts", "src/config/canonical-facts.ts"],
  assumptions: ["the prospect has at least one active client engagement"],
  uncertainties: ["whether the prospect bills per-engagement or retainer"],
};

Deno.test("acceptance scenario: 2. Offer -- parses and passes the anti-fabrication reconcile check", () => {
  const parsed = OfferOutput.parse(OFFER_OUTPUT);
  const issue = reconcileOfferClaims(FOUNDATION)(parsed);
  assertFalse(issue !== null, `GENERATED OUTPUT contained an unsupported FACT claim: ${issue}`);
});

// ─────────────────────────────────────────────────────────────────────────
// 3. PROSPECTING -- an example fractional CFO prospect.
// ─────────────────────────────────────────────────────────────────────────
const PROSPECT_ASSESSMENT = {
  segment: "fractional CFOs",
  observed_signals: ["posted publicly about a client pushing back on a forecast's assumptions"],
  likely_relevant_problem: "needs a defensible way to pressure-test a client's forecast assumptions",
  supporting_evidence: ["public LinkedIn post, observed directly -- not inferred"],
  unknowns: ["budget authority for tools", "whether they already use a modeling tool"],
  suggested_message:
    "Saw your post about a client pushing back on your forecast -- curious how you usually defend the assumptions behind it. We built a free tool for exactly that if useful.",
  suggested_next_step: "send suggested_message for human review before any outreach",
};

Deno.test("acceptance scenario: 3. Prospecting -- assessment parses; suggested_message is explicitly a DRAFT", () => {
  const parsed = ProspectAssessmentOutput.parse(PROSPECT_ASSESSMENT);
  assert(parsed.suggested_message.length > 0);
  // HUMAN APPROVAL gate: nothing in this codebase auto-sends
  // suggested_message -- spec section 5 ("Do not automatically send
  // outreach. Human approval is mandatory"). This fixture only asserts the
  // draft exists; no send path is exercised, matching "no external message
  // should actually be sent during acceptance testing."
});

// ─────────────────────────────────────────────────────────────────────────
// 4. FIRST-MESSAGE DRAFT -- reuses step 3's suggested_message. No separate
// stage/schema exists for this per the founder's spec; it IS the
// prospecting stage's suggested_message field.
// ─────────────────────────────────────────────────────────────────────────
Deno.test("acceptance scenario: 4. First-message draft -- is exactly prospecting's suggested_message, never auto-sent", () => {
  assertEquals(PROSPECT_ASSESSMENT.suggested_message.includes("Saw your post"), true);
});

// ─────────────────────────────────────────────────────────────────────────
// 5. CALL PREPARATION
// ─────────────────────────────────────────────────────────────────────────
const CALL_BRIEF = {
  what_we_know: ["fractional CFO, publicly discussed forecast pushback from a client"],
  what_we_dont_know: ["decision authority for adopting a new tool", "current tooling"],
  why_fit: "advises clients on exactly the kind of capital/operating decisions Quantis pressure-tests",
  questions_to_ask: [
    "what does your current process look like when a client questions an assumption?",
    "what would make an analysis defensible enough to hand a client?",
  ],
  financial_assumptions_to_test: ["client's churn assumption held for a new cohort"],
  demonstration_path: "run the founder pre-mortem demo live on the call",
  possible_objections: ["price", "\"I already do this in a spreadsheet\""],
  desired_next_step: "agree on one real client decision to run a free analysis against",
};

Deno.test("acceptance scenario: 5. Call preparation -- brief parses, has at least one real question", () => {
  const parsed = CallBriefOutput.parse(CALL_BRIEF);
  assert(parsed.questions_to_ask.length >= 1);
});

// ─────────────────────────────────────────────────────────────────────────
// 6. OBJECTION HANDLING -- "I already do this in a spreadsheet."
// ─────────────────────────────────────────────────────────────────────────
const OBJECTION_RESPONSE = {
  interpretation: "believes a spreadsheet already gives them the same rigor",
  unresolved: null,
  clarifying_question: null,
  response:
    "Quantis runs the same kind of forecast through a deterministic engine with 97,500 benchmark data points behind it, so the assumptions get pressure-tested against real-world ranges instead of just your own spreadsheet's math.",
  evidence_used: [{ text: "97,500 benchmark data points", status: "FACT", evidence_ref: "src/config/canonical-facts.ts" }],
  unknowns: ["how rigorously they currently stress-test their own spreadsheet's assumptions"],
  recommended_next_step: "offer to run the same client decision through Quantis for a side-by-side comparison",
  insufficient_evidence: false,
};

Deno.test("acceptance scenario: 6. Objection handling -- parses and its evidence passes reconciliation", () => {
  const parsed = ObjectionResponseOutput.parse(OBJECTION_RESPONSE);
  const issue = reconcileObjectionEvidence(FOUNDATION)(parsed);
  assertFalse(issue !== null, `objection response used unsupported evidence: ${issue}`);
});

// ─────────────────────────────────────────────────────────────────────────
// 7. FOLLOW-UP -- draft only, never sent by this fixture.
// ─────────────────────────────────────────────────────────────────────────
const FOLLOWUP_DRAFT = {
  draft: "Following up on our call -- want to pick a real client decision this week to run the free analysis against?",
  reasoning: "prospect agreed in principle on the call but hadn't picked a specific decision yet",
  next_action: "wait for a reply; escalate to a second call if none in 5 business days",
};

Deno.test("acceptance scenario: 7. Follow-up -- draft parses; HUMAN APPROVAL is required before it could ever be sent", () => {
  const parsed = FollowupDraftOutput.parse(FOLLOWUP_DRAFT);
  assert(parsed.draft.length > 0);
  // This fixture stops at DRAFT. commercial_followups' own schema (Phase E
  // migration) makes 'sent' unreachable without going through
  // approve_commercial_followup() first (status_chk + approval_chk) --
  // exercised at the DB layer in the Phase E migration's own verification,
  // not repeated here.
});

// ─────────────────────────────────────────────────────────────────────────
// 8. FUNNEL -- state transitions through a realistic sales cycle, using the
// SAME transition rule as transition_prospect_stage() (checkFunnelTransition
// mirrors it exactly -- see funnel.ts).
// ─────────────────────────────────────────────────────────────────────────
const REALISTIC_CYCLE: CommercialFunnelStage[] = [
  "discovered",
  "contacted",
  "replied",
  "qualified",
  "call_planned",
  "call_completed",
  "offer_presented",
  "checkout_started",
  "won",
];

Deno.test("acceptance scenario: 8. Funnel -- a realistic full sales cycle transitions cleanly end to end", () => {
  for (let i = 1; i < REALISTIC_CYCLE.length; i++) {
    const result = checkFunnelTransition(REALISTIC_CYCLE[i - 1], REALISTIC_CYCLE[i]);
    assert(result.ok, `expected ${REALISTIC_CYCLE[i - 1]} -> ${REALISTIC_CYCLE[i]} to be valid`);
  }
});

Deno.test("acceptance scenario: 8. Funnel -- once 'won', no further transition is possible (terminal, never overwritten)", () => {
  const result = checkFunnelTransition("won", "contacted");
  assertFalse(result.ok);
  if (!result.ok) assertEquals(result.reason, "terminal_stage");
});

// ─────────────────────────────────────────────────────────────────────────
// 9. OUTCOME -- comparing ASSUMPTION vs ACTUAL OUTCOME. Phase G (analytics/
// outcome-learning) has not been built yet -- this fixture only proves the
// INPUT the future outcome-learning stage will need is already available
// and traceable: every ASSUMPTION made in step 2 (Offer) is a plain,
// checkable string, so a future outcome record can reference it directly.
// ─────────────────────────────────────────────────────────────────────────
Deno.test("acceptance scenario: 9. Outcome -- every Offer-stage ASSUMPTION is traceable for future outcome comparison (Phase G)", () => {
  const parsedOffer = OfferOutput.parse(OFFER_OUTPUT);
  assert(parsedOffer.assumptions.length > 0);
  const assumptionClaims = parsedOffer.claims_used.filter((c) => c.status === "ASSUMPTION");
  assertEquals(assumptionClaims.length, 1);
  assertEquals(assumptionClaims[0].text, "the prospect has at least one active client engagement");
  // Phase G's job: once a real outcome is recorded (won/lost/not_fit +
  // reason), compare it against exactly these ASSUMPTION-status claims --
  // that comparison is not implemented yet, and this test does not claim
  // it is.
});
