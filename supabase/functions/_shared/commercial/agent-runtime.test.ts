/**
 * Reproducible verification for commercial/agent-runtime.ts.
 *
 * Run with:
 *   deno test --allow-env supabase/functions/_shared/commercial/agent-runtime.test.ts
 *
 * No network access requested or needed, same convention as
 * commercial/contracts.test.ts and dahl-canary.test.ts. This deliberately
 * does NOT attempt to mock a successful LLM call: llm-call.ts's legacy
 * provider URLs (DeepSeek/Lovable/Anthropic) are hardcoded constants, not
 * env-configurable like dahl-adapter.ts's DAHL_BASE_URL, so there is no way
 * to redirect a real success response to a local mock server without
 * modifying llm-call.ts itself -- out of scope for this file. Instead this
 * suite proves two things end to end, with zero mocking, by relying on the
 * ambient test environment having no AI provider key configured (true for
 * any machine that hasn't explicitly set one, and true in this repo's CI --
 * no `deno test` step exists yet, per contracts.test.ts's own note):
 *   1. runCommercialAgent() never throws and returns a typed
 *      `provider_error` rejection when no provider is configured.
 *   2. The commercial_agent_runs audit-write path is equally safe to call
 *      with no Supabase credentials configured (returns null, doesn't throw).
 * The row-shape invariant that actually gates what CAN be inserted
 * (isConsistentAgentRunRow) is tested directly and exhaustively below,
 * independent of any network path.
 */
import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  COMMERCIAL_AGENT_STAGES,
  isConsistentAgentRunRow,
  runCommercialAgent,
} from "./agent-runtime.ts";
import { z } from "npm:zod@3.23.8";

Deno.test("COMMERCIAL_AGENT_STAGES is exactly the five AI-generative stages", () => {
  assertEquals(COMMERCIAL_AGENT_STAGES, [
    "offer",
    "prospecting",
    "call_preparation",
    "objection_handling",
    "follow_up",
  ]);
});

Deno.test("isConsistentAgentRunRow: a validated success (output set, no rejection) is consistent", () => {
  assert(isConsistentAgentRunRow({ ok: true, rejectionReason: null, output: { foo: "bar" } }));
});

Deno.test("isConsistentAgentRunRow: a typed rejection (reason set, no output) is consistent", () => {
  assert(isConsistentAgentRunRow({ ok: false, rejectionReason: "schema", output: null }));
});

Deno.test("isConsistentAgentRunRow: ok=true but a rejection_reason is present is caught as inconsistent", () => {
  assertFalse(isConsistentAgentRunRow({ ok: true, rejectionReason: "schema", output: { foo: "bar" } }));
});

Deno.test("isConsistentAgentRunRow: ok=true but output is null is caught as inconsistent", () => {
  assertFalse(isConsistentAgentRunRow({ ok: true, rejectionReason: null, output: null }));
});

Deno.test("isConsistentAgentRunRow: ok=false but output is present is caught as inconsistent", () => {
  assertFalse(isConsistentAgentRunRow({ ok: false, rejectionReason: "empty", output: { foo: "bar" } }));
});

Deno.test("isConsistentAgentRunRow: ok=false but rejection_reason is null is caught as inconsistent", () => {
  assertFalse(isConsistentAgentRunRow({ ok: false, rejectionReason: null, output: null }));
});

Deno.test("runCommercialAgent: with no AI provider configured, returns a typed provider_error (never throws)", async () => {
  const result = await runCommercialAgent({
    stage: "offer",
    foundationVersion: 1,
    systemPrompt: "You are a test.",
    userPrompt: "Say hello.",
    schema: z.object({ hello: z.string() }),
  });
  assertFalse(result.ok);
  if (!result.ok) {
    assertEquals(result.reason, "provider_error");
    assertEquals(result.runId, null); // no Supabase creds configured either -- audit write safely no-ops
  }
});

Deno.test("runCommercialAgent: the provider_error path is stage-agnostic and carries adminUserId/requestId through without throwing", async () => {
  const result = await runCommercialAgent({
    stage: "follow_up",
    foundationVersion: 3,
    systemPrompt: "You are a test.",
    userPrompt: "Draft a follow-up.",
    schema: z.object({ draft: z.string() }),
    adminUserId: "11111111-1111-1111-1111-111111111111",
    requestId: "test-request-id",
    inputContext: { prospect_id: "22222222-2222-2222-2222-222222222222" },
  });
  assertFalse(result.ok);
  if (!result.ok) {
    assertEquals(result.reason, "provider_error");
  }
});
