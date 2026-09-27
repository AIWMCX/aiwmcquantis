/**
 * Reproducible verification for commercial-suppression.ts.
 *
 * Run with:
 *   deno test --allow-env supabase/functions/_shared/commercial-suppression.test.ts
 *
 * No network access needed or requested -- pure logic, matching
 * commercial/funnel.test.ts's own convention.
 */
import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { checkSuppression, identityKey, type SuppressionContext, type SuppressionProspect } from "./commercial-suppression.ts";

function baseProspect(overrides: Partial<SuppressionProspect> = {}): SuppressionProspect {
  return {
    id: "prospect-1",
    company_name: "Acme Inc",
    contact_channel: "email:jane@acme.com",
    suppression_status: "active",
    ...overrides,
  };
}

function baseContext(overrides: Partial<SuppressionContext> = {}): SuppressionContext {
  return {
    campaignSiblingProspects: [],
    activeOpportunityProspects: [],
    lastContactedAt: null,
    now: new Date("2026-09-27T00:00:00.000Z"),
    ...overrides,
  };
}

Deno.test("checkSuppression: an active prospect with no conflicts is not suppressed", () => {
  const result = checkSuppression(baseProspect(), baseContext());
  assertEquals(result.suppressed, false);
});

Deno.test("checkSuppression: unsubscribed status suppresses regardless of anything else", () => {
  const result = checkSuppression(
    baseProspect({ suppression_status: "unsubscribed" }),
    baseContext(),
  );
  assert(result.suppressed);
  if (result.suppressed) assertEquals(result.reasonCode, "unsubscribed");
});

Deno.test("checkSuppression: hard_bounced status suppresses", () => {
  const result = checkSuppression(
    baseProspect({ suppression_status: "hard_bounced" }),
    baseContext(),
  );
  assert(result.suppressed);
  if (result.suppressed) assertEquals(result.reasonCode, "hard_bounced");
});

Deno.test("checkSuppression: do_not_contact status suppresses", () => {
  const result = checkSuppression(
    baseProspect({ suppression_status: "do_not_contact" }),
    baseContext(),
  );
  assert(result.suppressed);
  if (result.suppressed) assertEquals(result.reasonCode, "do_not_contact");
});

Deno.test("checkSuppression: a duplicate email in the same campaign is suppressed", () => {
  const result = checkSuppression(
    baseProspect(),
    baseContext({
      campaignSiblingProspects: [
        { id: "prospect-2", company_name: "Acme Inc (dup)", contact_channel: "email:jane@acme.com" },
      ],
    }),
  );
  assert(result.suppressed);
  if (result.suppressed) assertEquals(result.reasonCode, "duplicate_in_campaign");
});

Deno.test("checkSuppression: a duplicate company (no contact_channel on either side) in the same campaign is suppressed", () => {
  const result = checkSuppression(
    baseProspect({ contact_channel: null }),
    baseContext({
      campaignSiblingProspects: [
        { id: "prospect-2", company_name: "acme inc", contact_channel: null },
      ],
    }),
  );
  assert(result.suppressed);
  if (result.suppressed) assertEquals(result.reasonCode, "duplicate_in_campaign");
});

Deno.test("checkSuppression: the prospect's own row in campaignSiblingProspects never counts as a duplicate of itself", () => {
  const result = checkSuppression(
    baseProspect(),
    baseContext({
      campaignSiblingProspects: [
        { id: "prospect-1", company_name: "Acme Inc", contact_channel: "email:jane@acme.com" },
      ],
    }),
  );
  assertEquals(result.suppressed, false);
});

Deno.test("checkSuppression: contacted 10 days ago (inside the 30-day default window) is suppressed", () => {
  const result = checkSuppression(
    baseProspect(),
    baseContext({ lastContactedAt: "2026-09-17T00:00:00.000Z" }),
  );
  assert(result.suppressed);
  if (result.suppressed) assertEquals(result.reasonCode, "recent_contact");
});

Deno.test("checkSuppression: contacted 31 days ago (outside the 30-day default window) is NOT suppressed on that basis", () => {
  const result = checkSuppression(
    baseProspect(),
    baseContext({ lastContactedAt: "2026-08-27T00:00:00.000Z" }),
  );
  assertEquals(result.suppressed, false);
});

Deno.test("checkSuppression: a custom recentContactWindowDays overrides the 30-day default", () => {
  const result = checkSuppression(
    baseProspect(),
    baseContext({ lastContactedAt: "2026-09-25T00:00:00.000Z", recentContactWindowDays: 3 }),
  );
  assertEquals(result.suppressed, false);
});

Deno.test("checkSuppression: an existing non-terminal opportunity for the same company is suppressed", () => {
  const result = checkSuppression(
    baseProspect(),
    baseContext({
      activeOpportunityProspects: [
        { id: "prospect-9", company_name: "Acme Inc", contact_channel: "email:jane@acme.com", stage: "qualified" },
      ],
    }),
  );
  assert(result.suppressed);
  if (result.suppressed) assertEquals(result.reasonCode, "active_opportunity");
});

Deno.test("checkSuppression: an existing TERMINAL-stage opportunity for the same company does NOT suppress", () => {
  const result = checkSuppression(
    baseProspect(),
    baseContext({
      activeOpportunityProspects: [
        { id: "prospect-9", company_name: "Acme Inc", contact_channel: "email:jane@acme.com", stage: "lost" },
      ],
    }),
  );
  assertEquals(result.suppressed, false);
});

Deno.test("checkSuppression: suppression_status is checked before duplicate/recency/opportunity (first match wins)", () => {
  const result = checkSuppression(
    baseProspect({ suppression_status: "unsubscribed" }),
    baseContext({
      lastContactedAt: "2026-09-26T00:00:00.000Z",
      campaignSiblingProspects: [
        { id: "prospect-2", company_name: "Acme Inc", contact_channel: "email:jane@acme.com" },
      ],
    }),
  );
  assert(result.suppressed);
  if (result.suppressed) assertEquals(result.reasonCode, "unsubscribed");
});

Deno.test("identityKey: normalizes case and whitespace so equivalent identities match", () => {
  assertEquals(
    identityKey("  Acme Inc ", "Email:Jane@Acme.com"),
    identityKey("acme inc", "email:jane@acme.com"),
  );
});
