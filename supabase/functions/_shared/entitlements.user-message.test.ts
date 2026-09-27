/**
 * Reproducible verification for EntitlementError's optional userMessage
 * (Activation-to-revenue Wave 7, PR D).
 *
 * Run with:
 *   deno test --allow-env supabase/functions/_shared/entitlements.user-message.test.ts
 *
 * No network access needed or requested.
 */
import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { EntitlementError } from "./entitlements.ts";

Deno.test("EntitlementError.toResponse: without userMessage, falls back to the internal debug message (unchanged behavior for every pre-existing call site)", async () => {
  const err = new EntitlementError("scenarioSetsPerAnalysis", "free", "quota_exceeded", { used: 1, limit: 1 });
  const res = err.toResponse();
  const body = await res.json();
  assertEquals(res.status, 402);
  assert(body.message.includes("Entitlement denied"), `expected the internal debug message, got: ${body.message}`);
});

Deno.test("EntitlementError.toResponse: with userMessage, sends the real value-continuity copy instead", async () => {
  const err = new EntitlementError(
    "scenarioSetsPerAnalysis",
    "free",
    "quota_exceeded",
    { used: 1, limit: 1 },
    "You've tested 1 scenario on this decision -- that's the free limit. Plus lets you compare up to 10 scenarios per decision.",
  );
  const res = err.toResponse();
  const body = await res.json();
  assertEquals(body.message, "You've tested 1 scenario on this decision -- that's the free limit. Plus lets you compare up to 10 scenarios per decision.");
  assertEquals(body.error, "QUOTA_EXCEEDED");
  assertEquals(body.feature, "scenarioSetsPerAnalysis");
  assertEquals(body.currentTier, "free");
});

Deno.test("EntitlementError.toResponse: meta fields (used/limit) are still included alongside userMessage, not replaced by it", async () => {
  const err = new EntitlementError(
    "scenarioSetsPerAnalysis",
    "plus",
    "quota_exceeded",
    { used: 10, limit: 10 },
    "You've reached the 10-scenario limit for this decision on your current plan.",
  );
  const res = err.toResponse();
  const body = await res.json();
  assertEquals(body.used, 10);
  assertEquals(body.limit, 10);
});
