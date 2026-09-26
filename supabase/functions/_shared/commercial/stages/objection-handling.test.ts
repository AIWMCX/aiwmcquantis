/**
 * Reproducible verification for commercial/stages/objection-handling.ts.
 *
 * Run with:
 *   deno test --allow-env supabase/functions/_shared/commercial/stages/objection-handling.test.ts
 *
 * No network access needed or requested -- same convention as offer.test.ts.
 */
import { assert, assertFalse } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { CommercialFoundation } from "../contracts.ts";
import { ObjectionResponseOutput, reconcileObjectionEvidence } from "./objection-handling.ts";

const FOUNDATION = CommercialFoundation.parse({
  id: "11111111-1111-1111-1111-111111111111",
  version: 1,
  is_current: true,
  product_name: "AIWMC Quantis",
  product_description: "Financial pre-mortem and business decision-support.",
  target_segments: ["founders"],
  excluded_segments: [],
  customer_problems: [],
  desired_outcomes: [],
  pricing: [],
  verified_capabilities: [],
  limitations: ["not a predictive model"],
  approved_claims: ["97,500 benchmark data points"],
  prohibited_claims: ["predictive accuracy"],
  evidence: [],
  customer_evidence: [],
  faq: [],
  differentiators: [],
  call_to_actions: [],
  source_references: [],
});

Deno.test("ObjectionResponseOutput: a normal answered objection (insufficient_evidence=false, response set) parses", () => {
  const result = ObjectionResponseOutput.safeParse({
    interpretation: "concerned about accuracy",
    unresolved: null,
    clarifying_question: null,
    response: "the model is built on 97,500 benchmark data points",
    evidence_used: [{ text: "97,500 benchmark data points", status: "FACT", evidence_ref: "src/config/tiers.ts" }],
    unknowns: [],
    recommended_next_step: "offer a live walkthrough",
    insufficient_evidence: false,
  });
  assert(result.success, `expected success, got ${JSON.stringify(!result.success && result.error.issues)}`);
});

Deno.test("ObjectionResponseOutput: insufficient_evidence=true REQUIRES response=null (rejects a response anyway)", () => {
  const result = ObjectionResponseOutput.safeParse({
    interpretation: "asks about a case study we don't have",
    unresolved: "no matching case study exists",
    clarifying_question: "what industry are you in?",
    response: "here's a case study anyway", // should be rejected -- contradicts insufficient_evidence
    evidence_used: [],
    unknowns: ["no case study for this industry"],
    recommended_next_step: "ask for more context",
    insufficient_evidence: true,
  });
  assertFalse(result.success, "insufficient_evidence=true must force response=null, not permit an invented one");
});

Deno.test("ObjectionResponseOutput: insufficient_evidence=true WITH response=null is the correct honest shape", () => {
  const result = ObjectionResponseOutput.safeParse({
    interpretation: "asks about a case study we don't have",
    unresolved: "no matching case study exists",
    clarifying_question: "what industry are you in?",
    response: null,
    evidence_used: [],
    unknowns: ["no case study for this industry"],
    recommended_next_step: "ask for more context",
    insufficient_evidence: true,
  });
  assert(result.success, `expected success, got ${JSON.stringify(!result.success && result.error.issues)}`);
});

Deno.test("ObjectionResponseOutput: insufficient_evidence=false REQUIRES a non-null response", () => {
  const result = ObjectionResponseOutput.safeParse({
    interpretation: "concerned about price",
    unresolved: null,
    clarifying_question: null,
    response: null, // should be rejected -- claims to have an answer but gives none
    evidence_used: [],
    unknowns: [],
    recommended_next_step: "clarify pricing",
    insufficient_evidence: false,
  });
  assertFalse(result.success, "insufficient_evidence=false must not silently produce a null response");
});

Deno.test("reconcileObjectionEvidence: a FACT-status evidence entry not in approved_claims is rejected", () => {
  const parsed = ObjectionResponseOutput.parse({
    interpretation: "concerned about accuracy",
    unresolved: null,
    clarifying_question: null,
    response: "our model has predictive accuracy", // matches a prohibited claim
    evidence_used: [{ text: "predictive accuracy", status: "FACT", evidence_ref: "made up" }],
    unknowns: [],
    recommended_next_step: "offer a walkthrough",
    insufficient_evidence: false,
  });
  const issue = reconcileObjectionEvidence(FOUNDATION)(parsed);
  assert(issue !== null, "expected a reconciliation issue for a prohibited FACT claim used as evidence");
});
