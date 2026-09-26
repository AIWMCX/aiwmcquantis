/**
 * Reproducible verification for commercial/funnel.ts.
 *
 * Run with:
 *   deno test --allow-env supabase/functions/_shared/commercial/funnel.test.ts
 *
 * No network access needed or requested -- pure logic, matching
 * commercial/contracts.test.ts's own convention.
 */
import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { checkFunnelTransition, COMMERCIAL_FUNNEL_STAGES, isTerminalFunnelStage } from "./funnel.ts";

Deno.test("COMMERCIAL_FUNNEL_STAGES has all 13 canonical stages, in order", () => {
  assertEquals(COMMERCIAL_FUNNEL_STAGES.length, 13);
  assertEquals(COMMERCIAL_FUNNEL_STAGES[0], "discovered");
  assertEquals(COMMERCIAL_FUNNEL_STAGES.at(-1), "not_fit");
});

Deno.test("checkFunnelTransition: a normal forward transition is valid", () => {
  const result = checkFunnelTransition("contacted", "replied");
  assert(result.ok);
});

Deno.test("checkFunnelTransition: a backward transition is still valid (real sales cycles backtrack)", () => {
  const result = checkFunnelTransition("call_planned", "qualified");
  assert(result.ok);
});

Deno.test("checkFunnelTransition: a skip-ahead transition is still valid (deterministic tracking, not a rigid linear machine)", () => {
  const result = checkFunnelTransition("discovered", "won");
  assert(result.ok);
});

Deno.test("checkFunnelTransition: invalid funnel transition -- out of a terminal stage is rejected", () => {
  const result = checkFunnelTransition("won", "contacted");
  assert(!result.ok);
  if (!result.ok) assertEquals(result.reason, "terminal_stage");
});

Deno.test("checkFunnelTransition: invalid funnel transition -- 'lost' is also terminal", () => {
  const result = checkFunnelTransition("lost", "qualified");
  assert(!result.ok);
  if (!result.ok) assertEquals(result.reason, "terminal_stage");
});

Deno.test("checkFunnelTransition: invalid funnel transition -- a same-stage transition is a rejected no-op", () => {
  const result = checkFunnelTransition("qualified", "qualified");
  assert(!result.ok);
  if (!result.ok) assertEquals(result.reason, "no_op");
});

Deno.test("isTerminalFunnelStage: won/lost/not_fit are terminal, everything else is not", () => {
  assert(isTerminalFunnelStage("won"));
  assert(isTerminalFunnelStage("lost"));
  assert(isTerminalFunnelStage("not_fit"));
  assert(!isTerminalFunnelStage("discovered"));
  assert(!isTerminalFunnelStage("offer_presented"));
});
