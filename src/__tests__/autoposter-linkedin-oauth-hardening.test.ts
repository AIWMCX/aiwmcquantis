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
const migrationSource = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260905210000_autoposter_oauth_state_expiry.sql"),
  "utf8",
);

describe("autoposter LinkedIn OAuth hardening (Workstream I.1 gap fixes)", () => {
  it("adds an expiry column to autoposter_oauth_state", () => {
    expect(migrationSource).toContain("add column expires_at timestamptz not null");
  });

  it("deletes the state row before checking expiry, so a replay can never succeed either way", () => {
    const deleteIdx = callbackSource.indexOf("autoposter_oauth_state').delete()");
    const expiryCheckIdx = callbackSource.indexOf("expires_at).getTime() < Date.now()");
    expect(deleteIdx).toBeGreaterThan(-1);
    expect(expiryCheckIdx).toBeGreaterThan(deleteIdx);
  });

  it("rejects an expired state before the token exchange happens", () => {
    const expiryCheckIdx = callbackSource.indexOf("expires_at).getTime() < Date.now()");
    const tokenExchangeIdx = callbackSource.indexOf("oauth2/v2/accessToken") !== -1
      ? callbackSource.indexOf("oauth2/v2/accessToken")
      : callbackSource.indexOf("linkedin.com/oauth/v2/accessToken", expiryCheckIdx + 1);
    expect(expiryCheckIdx).toBeGreaterThan(-1);
    expect(tokenExchangeIdx).toBeGreaterThan(expiryCheckIdx);
  });

  it("attempts a LinkedIn token refresh using the stored refresh token before publishing", () => {
    expect(publishSource).toContain("refreshLinkedInTokenIfNeeded");
    expect(publishSource).toContain("grant_type: 'refresh_token'");
    expect(publishSource).toContain("cred.refresh_token_secret_id");
  });

  it("disables the credential on refresh failure instead of retrying forever silently", () => {
    const refreshFnStart = publishSource.indexOf("async function refreshLinkedInTokenIfNeeded");
    const disableIdx = publishSource.indexOf("is_active: false", refreshFnStart);
    const failedLogIdx = publishSource.indexOf("action: 'token_refresh'", refreshFnStart);
    expect(refreshFnStart).toBeGreaterThan(-1);
    expect(disableIdx).toBeGreaterThan(refreshFnStart);
    expect(failedLogIdx).toBeGreaterThan(refreshFnStart);
  });

  it("re-stores a refreshed access token under the same fixed Vault secret name", () => {
    expect(publishSource).toContain("p_name: 'autoposter_linkedin_access_token'");
  });
});
