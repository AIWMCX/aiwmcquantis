/**
 * Run with: deno test --allow-read supabase/functions/_shared/entitlements.resolve-tier.test.ts
 *
 * Regression coverage for a confirmed live gap: resolveTier() checked
 * trial_ends_at for 'trialing' subscriptions but had NO check on
 * current_period_end for 'active' ones -- an active-but-unrenewed
 * subscription retained paid-tier access indefinitely. Confirmed live
 * before the fix: 2 real subscriptions (1 pro, 1 plus) remained 'active'
 * 12+ days and 5+ weeks past their own current_period_end.
 */
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { resolveTier } from "./entitlements.ts";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

Deno.test("resolveTier: active subscription with a future current_period_end keeps its paid tier", () => {
  const future = new Date(Date.now() + ONE_DAY_MS).toISOString();
  assertEquals(resolveTier({ status: "active", plan_id: "pro", current_period_end: future }), "pro");
  assertEquals(resolveTier({ status: "active", plan_id: "plus", current_period_end: future }), "plus");
});

Deno.test("resolveTier: active subscription with a PAST current_period_end fails closed to free", () => {
  const past = new Date(Date.now() - ONE_DAY_MS).toISOString();
  assertEquals(resolveTier({ status: "active", plan_id: "pro", current_period_end: past }), "free");
  assertEquals(resolveTier({ status: "active", plan_id: "plus", current_period_end: past }), "free");
});

Deno.test("resolveTier: reproduces the exact 2 live-confirmed cases before the fix", () => {
  // Real values from production (dmlxrvfyqsakyjomsvdj.subscriptions), captured
  // 2026-08-23 before this fix -- both were incorrectly resolving to their
  // paid tier prior to this change.
  assertEquals(
    resolveTier({ status: "active", plan_id: "pro", current_period_end: "2026-07-16T22:59:19+00:00" }),
    "free",
  );
  assertEquals(
    resolveTier({ status: "active", plan_id: "plus", current_period_end: "2026-08-11T07:55:01.31656+00:00" }),
    "free",
  );
});

Deno.test("resolveTier: active subscription with NO current_period_end (legacy/lifetime row) is unaffected", () => {
  // Deliberately preserves prior behavior for rows that never had a period
  // end set -- the new check only fires when current_period_end is present.
  assertEquals(resolveTier({ status: "active", plan_id: "pro", current_period_end: null }), "pro");
  assertEquals(resolveTier({ status: "active", plan_id: "pro" }), "pro");
});

Deno.test("resolveTier: trialing expiry check (pre-existing behavior) is unaffected by this change", () => {
  const future = new Date(Date.now() + ONE_DAY_MS).toISOString();
  const past = new Date(Date.now() - ONE_DAY_MS).toISOString();
  assertEquals(resolveTier({ status: "trialing", plan_id: "pro", trial_ends_at: future }), "pro");
  assertEquals(resolveTier({ status: "trialing", plan_id: "pro", trial_ends_at: past }), "free");
});

Deno.test("resolveTier: no subscription, or non-active/non-trialing status, resolves to free", () => {
  assertEquals(resolveTier(null), "free");
  assertEquals(resolveTier(undefined), "free");
  assertEquals(resolveTier({ status: "canceled", plan_id: "pro" }), "free");
  assertEquals(resolveTier({ status: "past_due", plan_id: "pro" }), "free");
});

Deno.test("resolveTier: unrecognized plan_id on an otherwise-valid active subscription resolves to free", () => {
  const future = new Date(Date.now() + ONE_DAY_MS).toISOString();
  assertEquals(resolveTier({ status: "active", plan_id: "enterprise", current_period_end: future }), "free");
});
