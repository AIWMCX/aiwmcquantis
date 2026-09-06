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
  resolve(process.cwd(), "supabase/migrations/20260905213627_autoposter_oauth_state_expiry.sql"),
  "utf8",
);
const leaseMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260905222201_autoposter_credential_lease_lock.sql"),
  "utf8",
);

describe("autoposter LinkedIn OAuth hardening (Workstream I.1 gap fixes)", () => {
  it("adds an expiry column to autoposter_oauth_state", () => {
    expect(expiryMigration).toContain("add column expires_at timestamptz not null");
  });

  it("claims state atomically via DELETE ... RETURNING, not SELECT-then-DELETE", () => {
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

  it("no longer uses session-scoped Postgres advisory locks for concurrency (removed: unsafe across pooled RPC calls)", () => {
    expect(publishSource).not.toContain("autoposter_try_lock_credential");
    expect(publishSource).not.toContain("autoposter_unlock_credential");
    expect(leaseMigration).toContain("drop function if exists public.autoposter_try_lock_credential(uuid);");
    expect(leaseMigration).toContain("drop function if exists public.autoposter_unlock_credential(uuid);");
  });

  it("acquires the refresh lease via a single atomic conditional UPDATE keyed on an owner token", () => {
    expect(publishSource).toContain("refresh_lease_owner: leaseOwner");
    expect(publishSource).toContain("refresh_lease_expires_at.lt.");
    const leaseIdx = publishSource.indexOf("refresh_lease_owner: leaseOwner");
    const skipIdx = publishSource.indexOf("if (!leased?.length)", leaseIdx);
    expect(skipIdx).toBeGreaterThan(leaseIdx);
  });

  it("gates every credential write during refresh on still owning the lease, so an expired worker can't clobber a newer refresh", () => {
    const refreshFnStart = publishSource.indexOf("async function refreshLinkedInTokenIfNeeded");
    const refreshFnBody = publishSource.slice(refreshFnStart);
    const ownerGateCount = (refreshFnBody.match(/\.eq\('refresh_lease_owner', leaseOwner\)/g) ?? []).length;
    // Failure-path update, success-path update, and the release in `finally` --
    // three separate writes, all conditioned on still owning the lease.
    expect(ownerGateCount).toBeGreaterThanOrEqual(3);
  });

  it("releases the lease in a finally block, conditioned on still owning it", () => {
    const refreshFnStart = publishSource.indexOf("async function refreshLinkedInTokenIfNeeded");
    const finallyIdx = publishSource.indexOf("} finally {", refreshFnStart);
    const releaseIdx = publishSource.indexOf("refresh_lease_owner: null, refresh_lease_expires_at: null", finallyIdx);
    expect(finallyIdx).toBeGreaterThan(refreshFnStart);
    expect(releaseIdx).toBeGreaterThan(finallyIdx);
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

  it("claims due posts atomically (UPDATE ... WHERE status='scheduled' ... SELECT), not via a plain SELECT then a later UPDATE", () => {
    const claimIdx = publishSource.indexOf(".update({ status: 'publishing' })");
    const inIdx = publishSource.indexOf(".in('id', candidates.map", claimIdx);
    const rescheckIdx = publishSource.indexOf(".eq('status', 'scheduled')", inIdx);
    expect(claimIdx).toBeGreaterThan(-1);
    expect(inIdx).toBeGreaterThan(claimIdx);
    expect(rescheckIdx).toBeGreaterThan(inIdx);
  });

  it("treats zero newly-claimed rows as a normal empty result, not an error", () => {
    const claimIdx = publishSource.indexOf(".update({ status: 'publishing' })");
    const afterClaim = publishSource.slice(claimIdx);
    expect(afterClaim).toContain("already claimed by a concurrent invocation");
  });
});
