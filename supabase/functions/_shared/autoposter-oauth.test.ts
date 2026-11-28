/**
 * Reproducible verification for autoposter-oauth.ts.
 *
 * Run with:
 *   deno test --allow-read --allow-env supabase/functions/_shared/autoposter-oauth.test.ts
 *
 * No network access needed or requested -- pure logic.
 */
import { assert, assertEquals, assertMatch, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  base64UrlEncode,
  connectionStatus,
  parseOAuthAction,
  pkceS256Challenge,
  randomCodeVerifier,
  twitterAuthUrl,
} from "./autoposter-oauth.ts";

Deno.test("parseOAuthAction accepts only status and start", () => {
  assertEquals(parseOAuthAction({ action: "status" }), "status");
  assertEquals(parseOAuthAction({ action: "start" }), "start");
  assertEquals(parseOAuthAction({ action: "init" }), null);
  assertEquals(parseOAuthAction({ action: "START" }), null);
  assertEquals(parseOAuthAction({}), null);
  assertEquals(parseOAuthAction(null), null);
  assertEquals(parseOAuthAction("start"), null);
  assertEquals(parseOAuthAction(["start"]), null);
});

Deno.test("base64UrlEncode uses the URL alphabet and drops padding", () => {
  assertEquals(base64UrlEncode(new Uint8Array([])), "");
  assertEquals(base64UrlEncode(new Uint8Array([0xfb, 0xff])), "-_8");
  assertEquals(base64UrlEncode(new TextEncoder().encode("f")), "Zg");
  assertEquals(base64UrlEncode(new TextEncoder().encode("foobar")), "Zm9vYmFy");
});

Deno.test("pkceS256Challenge matches the RFC 7636 Appendix B example", async () => {
  assertEquals(
    await pkceS256Challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
});

Deno.test("randomCodeVerifier is a valid, unpredictable RFC 7636 verifier", () => {
  const a = randomCodeVerifier();
  const b = randomCodeVerifier();
  assertEquals(a.length, 86);
  assertMatch(a, /^[A-Za-z0-9\-._~]{43,128}$/);
  assertNotEquals(a, b);
});

Deno.test("twitterAuthUrl carries state and an S256 challenge, all encoded", () => {
  const url = new URL(twitterAuthUrl({
    clientId: "client id",
    redirectUri: "https://ref.supabase.co/functions/v1/oauth-twitter-callback",
    scope: "tweet.read tweet.write users.read offline.access",
    state: "11111111-2222-3333-4444-555555555555",
    codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  }));
  assertEquals(url.origin + url.pathname, "https://twitter.com/i/oauth2/authorize");
  const q = url.searchParams;
  assertEquals(q.get("response_type"), "code");
  assertEquals(q.get("client_id"), "client id");
  assertEquals(q.get("redirect_uri"), "https://ref.supabase.co/functions/v1/oauth-twitter-callback");
  assertEquals(q.get("scope"), "tweet.read tweet.write users.read offline.access");
  assertEquals(q.get("state"), "11111111-2222-3333-4444-555555555555");
  assertEquals(q.get("code_challenge"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  assertEquals(q.get("code_challenge_method"), "S256");
  // Never the verifier, never a secret.
  assertEquals(q.get("code_verifier"), null);
  assertEquals(q.get("secret"), null);
});

Deno.test("connectionStatus with no credential row reports not connected", () => {
  assertEquals(connectionStatus(null, false, "https://r"), {
    configured: false,
    redirect_uri: "https://r",
    connected: false,
    account_id: null,
    token_expires: null,
    last_tested: null,
    has_refresh_token: false,
  });
});

Deno.test("connectionStatus never exposes Vault secret ids", () => {
  const out = connectionStatus({
    account_id: "12345",
    token_expires: "2026-12-01T00:00:00.000Z",
    is_active: true,
    last_tested: "2026-11-06T00:00:00.000Z",
    refresh_token_secret_id: "vault-refresh-id",
    // A wider row from the database must not leak through.
    ...({ access_token_secret_id: "vault-access-id" } as Record<string, unknown>),
  }, true, "https://r");
  assertEquals(out.connected, true);
  assertEquals(out.account_id, "12345");
  assertEquals(out.has_refresh_token, true);
  const json = JSON.stringify(out);
  assert(!json.includes("vault-refresh-id"));
  assert(!json.includes("vault-access-id"));
  assert(!json.includes("secret_id"));
});
