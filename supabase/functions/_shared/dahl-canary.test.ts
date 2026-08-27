/**
 * Reproducible verification for dahl-canary.ts.
 *
 * Run with:
 *   deno test --allow-env supabase/functions/_shared/dahl-canary.test.ts
 *
 * No network access needed or requested -- pure logic + Web Crypto hashing.
 */
import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { isDahlEligible, canaryMode, isDahlAliasCleared } from "./dahl-canary.ts";

function resetEnv() {
  for (const k of ["DAHL_CANARY_MODE", "DAHL_CANARY_ADMIN_USER_IDS", "DAHL_CANARY_PERCENT", "DAHL_CLEARED_ALIASES"]) {
    Deno.env.delete(k);
  }
}

Deno.test("default mode is 'off' when unset or garbage", () => {
  resetEnv();
  assertEquals(canaryMode(), "off");
  Deno.env.set("DAHL_CANARY_MODE", "everyone"); // not a recognized value
  assertEquals(canaryMode(), "off");
});

Deno.test("mode 'off' is never eligible, regardless of other config", async () => {
  resetEnv();
  Deno.env.set("DAHL_CANARY_MODE", "off");
  Deno.env.set("DAHL_CANARY_PERCENT", "100");
  Deno.env.set("DAHL_CANARY_ADMIN_USER_IDS", "user-1");
  assertEquals(await isDahlEligible({ userId: "user-1" }), false);
});

Deno.test("mode 'admin_only': eligible only for listed user IDs, never for no-userId requests", async () => {
  resetEnv();
  Deno.env.set("DAHL_CANARY_MODE", "admin_only");
  Deno.env.set("DAHL_CANARY_ADMIN_USER_IDS", "39c39ad3-ca59-4ce1-96b0-4c82c68da47a, c54bdd97-8fdf-4464-be3c-1c432e5c6984");

  assertEquals(await isDahlEligible({ userId: "39c39ad3-ca59-4ce1-96b0-4c82c68da47a" }), true);
  assertEquals(await isDahlEligible({ userId: "c54bdd97-8fdf-4464-be3c-1c432e5c6984" }), true);
  assertEquals(await isDahlEligible({ userId: "some-other-user" }), false);
  assertEquals(await isDahlEligible({ userId: null }), false);
  assertEquals(await isDahlEligible({}), false);
  // Server-to-server calls with only a requestId, no userId, are NOT
  // eligible under admin_only -- there's no identity to check against the
  // allowlist, and this must fail closed, not open.
  assertEquals(await isDahlEligible({ requestId: "req-123" }), false);
});

Deno.test("mode 'percent': 0 means nobody eligible, 100 means everybody (with a stable identity)", async () => {
  resetEnv();
  Deno.env.set("DAHL_CANARY_MODE", "percent");

  Deno.env.set("DAHL_CANARY_PERCENT", "0");
  assertEquals(await isDahlEligible({ userId: "any-user" }), false);

  Deno.env.set("DAHL_CANARY_PERCENT", "100");
  assertEquals(await isDahlEligible({ userId: "any-user" }), true);
  assertEquals(await isDahlEligible({ requestId: "any-request" }), true);
});

Deno.test("mode 'percent': fails closed when there is no stable identity at all", async () => {
  resetEnv();
  Deno.env.set("DAHL_CANARY_MODE", "percent");
  Deno.env.set("DAHL_CANARY_PERCENT", "100");
  assertEquals(await isDahlEligible({}), false);
  assertEquals(await isDahlEligible({ userId: null, requestId: null }), false);
});

Deno.test("mode 'percent': the same userId always resolves to the same eligibility (stable bucket, not a coin flip)", async () => {
  resetEnv();
  Deno.env.set("DAHL_CANARY_MODE", "percent");
  Deno.env.set("DAHL_CANARY_PERCENT", "50");

  const userId = "stable-bucket-test-user";
  const first = await isDahlEligible({ userId });
  for (let i = 0; i < 5; i++) {
    assertEquals(await isDahlEligible({ userId }), first);
  }
});

Deno.test("mode 'percent': roughly matches the configured percentage across many distinct users", async () => {
  resetEnv();
  Deno.env.set("DAHL_CANARY_MODE", "percent");
  Deno.env.set("DAHL_CANARY_PERCENT", "30");

  let eligible = 0;
  const total = 2000;
  for (let i = 0; i < total; i++) {
    if (await isDahlEligible({ userId: `user-${i}` })) eligible++;
  }
  const pct = (eligible / total) * 100;
  // Not an exact 30% (it's a hash-based bucket, not a perfectly uniform
  // sample), but should land in a sane band around it.
  assert(pct > 20 && pct < 40, `expected ~30%, got ${pct}%`);
});

Deno.test("percent config outside [0, 100], non-integer, or non-numeric all fail closed to 0 -- never clamped", async () => {
  resetEnv();
  Deno.env.set("DAHL_CANARY_MODE", "percent");

  Deno.env.set("DAHL_CANARY_PERCENT", "-10");
  assertEquals(await isDahlEligible({ userId: "x" }), false);

  // A typo like 500 must NOT silently become "100% rollout" -- that would
  // fail open on exactly the config mistake a safety gate exists to catch.
  Deno.env.set("DAHL_CANARY_PERCENT", "500");
  assertEquals(await isDahlEligible({ userId: "x" }), false);

  Deno.env.set("DAHL_CANARY_PERCENT", "50.5");
  assertEquals(await isDahlEligible({ userId: "x" }), false);

  Deno.env.set("DAHL_CANARY_PERCENT", "not-a-number");
  assertEquals(await isDahlEligible({ userId: "x" }), false);

  // A genuinely valid boundary value still works normally.
  Deno.env.set("DAHL_CANARY_PERCENT", "100");
  assertEquals(await isDahlEligible({ userId: "x" }), true);
});

Deno.test("isDahlAliasCleared: defaults to fast_reasoning-only when unset (2026-08-27 smoke test evidence)", () => {
  resetEnv();
  assertEquals(isDahlAliasCleared("fast_reasoning"), true);
  assertEquals(isDahlAliasCleared("general"), false);
  assertEquals(isDahlAliasCleared("long_reasoning"), false);
});

Deno.test("isDahlAliasCleared: empty/whitespace-only config falls back to the safe default, not 'everything allowed'", () => {
  resetEnv();
  Deno.env.set("DAHL_CLEARED_ALIASES", "");
  assertEquals(isDahlAliasCleared("fast_reasoning"), true);
  assertEquals(isDahlAliasCleared("general"), false);

  Deno.env.set("DAHL_CLEARED_ALIASES", "   ");
  assertEquals(isDahlAliasCleared("fast_reasoning"), true);
  assertEquals(isDahlAliasCleared("general"), false);
});

Deno.test("isDahlAliasCleared: ops can widen the allowlist explicitly once an alias earns passing evidence", () => {
  resetEnv();
  Deno.env.set("DAHL_CLEARED_ALIASES", "fast_reasoning, long_reasoning");
  assertEquals(isDahlAliasCleared("fast_reasoning"), true);
  assertEquals(isDahlAliasCleared("long_reasoning"), true);
  assertEquals(isDahlAliasCleared("general"), false);
});
