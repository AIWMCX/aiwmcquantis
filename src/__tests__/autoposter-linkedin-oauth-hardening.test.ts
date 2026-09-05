import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const callbackSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/oauth-linkedin-callback/index.ts"),
  "utf8",
);
const publishSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/publish-due-posts/index.ts"),
  "utf8",
);
const expiryMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260905210000_autoposter_oauth_state_expiry.sql"),
  "utf8",
);
const lockMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260905211500_autoposter_credential_refresh_lock.sql"),
  "utf8",
);

describe("autoposter LinkedIn OAuth hardening (Workstream I.1 gap fixes)", () => {
  it("adds an expiry column to autoposter_oauth_state", () => {
    expect(expiryMigration).toContain("add column expires_at timestamptz not null");
  });

  it("claims state atomically via DELETE ... RETURNING, not SELECT-then-DELETE", () => {
    // A separate .select('*').eq('state', state) followed by a separate
    // .delete() is exactly the race this replaces -- assert the delete call
    // itself carries the .select('*') that makes it atomic (single round trip).
    expect(callbackSource).toContain(".delete()\n    .eq('state', state)\n    .select('*');");
    expect(callbackSource).not.toContain("select('*').eq('state', state).maybeSingle()");
  });

  it("rejects an expired OR malformed/non-finite state timestamp (NaN never silently passes as 'not expired')", () => {
    expect(callbackSource).toContain("Number.isFinite(expiresAtMs)");
    const finiteCheckIdx = callbackSource.indexOf("Number.isFinite(expiresAtMs)");
    const tokenExchangeIdx = callbackSource.indexOf("linkedin.com/oauth/v2/accessToken");
    expect(finiteCheckIdx).toBeGreaterThan(-1);
    expect(tokenExchangeIdx).toBeGreaterThan(finiteCheckIdx);
  });

  it("attempts a LinkedIn token refresh using the stored refresh token before publishing", () => {
    expect(publishSource).toContain("refreshLinkedInTokenIfNeeded");
    expect(publishSource).toContain("grant_type: 'refresh_token'");
    expect(publishSource).toContain("cred.refresh_token_secret_id");
  });

  it("stores a rotated refresh token when LinkedIn returns a new one", () => {
    const refreshFnStart = publishSource.indexOf("async function refreshLinkedInTokenIfNeeded");
    const rotationCheckIdx = publishSource.indexOf("if (token.refresh_token) {", refreshFnStart);
    const rotatedStoreIdx = publishSource.indexOf("p_name: 'autoposter_linkedin_refresh_token'", refreshFnStart);
    expect(rotationCheckIdx).toBeGreaterThan(refreshFnStart);
    expect(rotatedStoreIdx).toBeGreaterThan(rotationCheckIdx);
  });

  it("acquires a per-credential advisory lock before refreshing and releases it in a finally block", () => {
    expect(publishSource).toContain("autoposter_try_lock_credential");
    expect(publishSource).toContain("autoposter_unlock_credential");
    const lockIdx = publishSource.indexOf("autoposter_try_lock_credential");
    const tryIdx = publishSource.indexOf("try {", lockIdx);
    const finallyIdx = publishSource.indexOf("} finally {", lockIdx);
    const unlockIdx = publishSource.indexOf("autoposter_unlock_credential", finallyIdx);
    expect(tryIdx).toBeGreaterThan(lockIdx);
    expect(finallyIdx).toBeGreaterThan(tryIdx);
    expect(unlockIdx).toBeGreaterThan(finallyIdx);
  });

  it("skips refreshing (uses existing token) when the lock is already held by another worker", () => {
    const lockIdx = publishSource.indexOf("autoposter_try_lock_credential");
    const skipIdx = publishSource.indexOf("if (!gotLock)", lockIdx);
    expect(skipIdx).toBeGreaterThan(lockIdx);
    expect(skipIdx).toBeLessThan(publishSource.indexOf("try {", lockIdx));
  });

  it("grants the lock RPCs to service_role only", () => {
    expect(lockMigration).toContain("revoke all on function public.autoposter_try_lock_credential(uuid) from public, anon, authenticated;");
    expect(lockMigration).toContain("grant execute on function public.autoposter_try_lock_credential(uuid) to service_role;");
  });

  it("disables the credential on refresh failure without erasing the last known-good token reference", () => {
    const refreshFnStart = publishSource.indexOf("async function refreshLinkedInTokenIfNeeded");
    const failBlockStart = publishSource.indexOf("if (!res.ok || !token.access_token)", refreshFnStart);
    const failBlockEnd = publishSource.indexOf("return { access_token: null, disabled: true };", failBlockStart);
    const failBlock = publishSource.slice(failBlockStart, failBlockEnd);
    expect(failBlock).toContain("is_active: false");
    expect(failBlock).not.toContain("access_token_secret_id:");
    expect(failBlock).not.toContain("token_expires:");
  });

  it("never logs the raw LinkedIn token-endpoint response on refresh failure -- only error/error_description", () => {
    const refreshFnStart = publishSource.indexOf("async function refreshLinkedInTokenIfNeeded");
    const failBlockStart = publishSource.indexOf("if (!res.ok || !token.access_token)", refreshFnStart);
    const failBlockEnd = publishSource.indexOf("return { access_token: null, disabled: true };", failBlockStart);
    const failBlock = publishSource.slice(failBlockStart, failBlockEnd);
    expect(failBlock).not.toContain("response_payload: token as any");
    expect(failBlock).toContain("error: token?.error");
    expect(failBlock).toContain("error_description: token?.error_description");
  });

  it("re-stores a refreshed access token under the same fixed Vault secret name", () => {
    expect(publishSource).toContain("p_name: 'autoposter_linkedin_access_token'");
  });

  it("treats a non-finite (malformed) token_expires as needing refresh, not as valid", () => {
    const refreshFnStart = publishSource.indexOf("async function refreshLinkedInTokenIfNeeded");
    expect(publishSource.slice(refreshFnStart, refreshFnStart + 600)).toContain("!expiryIsValid");
  });
});
