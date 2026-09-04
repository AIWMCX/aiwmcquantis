import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/stripe-webhook/index.ts"),
  "utf8",
);

describe("paid engagement journey wiring", () => {
  it("captures the persisted engagement id before transitioning", () => {
    expect(source).toContain(
      'const { data: engagementRow, error: engagementErr } = await supabase',
    );
    expect(source).toContain('.select("id, journey_state")');
    expect(source).toContain(".single()");
    expect(source).toContain("if (!engagementRow?.id)");
  });

  it("uses the verified Stripe event as both replay identities", () => {
    expect(source).toContain('"apply_engagement_transition"');
    expect(source).toContain("p_engagement_id: engagementRow.id");
    expect(source).toContain('p_next_state: "payment_confirmed"');
    expect(source).toContain("p_actor_user_id: null");
    expect(source).toContain("p_idempotency_key: event.id");
    expect(source).toContain("p_stripe_event_id: event.id");
  });

  it("fails fulfillment when the transition does not persist", () => {
    const transitionCall = source.indexOf('"apply_engagement_transition"');
    const transitionFailure = source.indexOf(
      "paid_engagement_transition_failed:",
      transitionCall,
    );
    const processedAfterTransition = source.indexOf(
      '.update({ status: "processed"',
      transitionCall,
    );

    expect(transitionCall).toBeGreaterThan(-1);
    expect(transitionFailure).toBeGreaterThan(transitionCall);
    expect(processedAfterTransition).toBeGreaterThan(transitionFailure);
  });

  it("exposes a new deploy-fidelity version", () => {
    expect(source).toContain("const FUNCTION_VERSION = '1.1.0'");
  });
});
