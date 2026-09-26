/**
 * Reproducible verification for the three commercial-workflow stage
 * schemas without their own reconciliation logic: ProspectAssessmentOutput
 * (prospecting.ts), CallBriefOutput (call-preparation.ts), FollowupDraftOutput
 * (follow-up.ts). offer.ts and objection-handling.ts have their own,
 * richer test files (they carry the anti-fabrication reconcile checks).
 *
 * Run with:
 *   deno test --allow-env supabase/functions/_shared/commercial/stages/basic-schemas.test.ts
 *
 * No network access needed or requested.
 */
import { assert, assertFalse } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { ProspectAssessmentOutput } from "./prospecting.ts";
import { CallBriefOutput } from "./call-preparation.ts";
import { FollowupDraftOutput } from "./follow-up.ts";

Deno.test("ProspectAssessmentOutput: a well-formed assessment parses", () => {
  const result = ProspectAssessmentOutput.safeParse({
    segment: "fractional CFOs",
    observed_signals: ["posted about client pushback on a forecast"],
    likely_relevant_problem: "needs a defensible way to pressure-test client assumptions",
    supporting_evidence: ["public LinkedIn post"],
    unknowns: ["budget authority unknown"],
    suggested_message: "Saw your post about forecast pushback -- curious how you handle that today.",
    suggested_next_step: "send suggested_message for human review",
  });
  assert(result.success, `expected success, got ${JSON.stringify(!result.success && result.error.issues)}`);
});

Deno.test("ProspectAssessmentOutput: missing suggested_message is rejected", () => {
  const { suggested_message: _drop, ...broken } = {
    segment: "fractional CFOs",
    observed_signals: [],
    likely_relevant_problem: "x",
    supporting_evidence: [],
    unknowns: [],
    suggested_message: "x",
    suggested_next_step: "x",
  };
  const result = ProspectAssessmentOutput.safeParse(broken);
  assertFalse(result.success);
});

Deno.test("CallBriefOutput: a well-formed call brief parses", () => {
  const result = CallBriefOutput.safeParse({
    what_we_know: ["runs a 12-person consultancy"],
    what_we_dont_know: ["decision timeline"],
    why_fit: "advises clients on capital decisions and needs a defensible tool",
    questions_to_ask: ["what's the biggest assumption your last client analysis got wrong?"],
    financial_assumptions_to_test: ["churn rate holds for new customers"],
    demonstration_path: "run the founder demo live on the call",
    possible_objections: ["price"],
    desired_next_step: "schedule a follow-up call",
  });
  assert(result.success, `expected success, got ${JSON.stringify(!result.success && result.error.issues)}`);
});

Deno.test("CallBriefOutput: an empty questions_to_ask array is rejected (min(1) -- must always probe for something)", () => {
  const result = CallBriefOutput.safeParse({
    what_we_know: [],
    what_we_dont_know: [],
    why_fit: "x",
    questions_to_ask: [],
    financial_assumptions_to_test: [],
    demonstration_path: null,
    possible_objections: [],
    desired_next_step: "x",
  });
  assertFalse(result.success);
});

Deno.test("CallBriefOutput: demonstration_path may be explicitly null (not every call has one)", () => {
  const result = CallBriefOutput.safeParse({
    what_we_know: [],
    what_we_dont_know: [],
    why_fit: "x",
    questions_to_ask: ["what's the decision?"],
    financial_assumptions_to_test: [],
    demonstration_path: null,
    possible_objections: [],
    desired_next_step: "x",
  });
  assert(result.success, `expected success, got ${JSON.stringify(!result.success && result.error.issues)}`);
});

Deno.test("FollowupDraftOutput: a well-formed draft parses", () => {
  const result = FollowupDraftOutput.safeParse({
    draft: "Following up on our call last week -- any new thoughts on the CAC assumption?",
    reasoning: "prospect asked for time to review the CAC sensitivity finding",
    next_action: "wait for a reply, escalate to a call if none in 5 business days",
  });
  assert(result.success, `expected success, got ${JSON.stringify(!result.success && result.error.issues)}`);
});

Deno.test("FollowupDraftOutput: an empty draft string is rejected (min(1))", () => {
  const result = FollowupDraftOutput.safeParse({
    draft: "",
    reasoning: "x",
    next_action: "x",
  });
  assertFalse(result.success);
});
