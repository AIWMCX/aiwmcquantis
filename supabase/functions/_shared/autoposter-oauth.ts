// Pure helpers for the autoposter OAuth connect functions
// (oauth-linkedin-callback, oauth-twitter-callback). No I/O and no remote
// imports, so Deno tests and vitest can both load this file.
//
// Connecting an account is started only by a signed-in admin through each
// function's POST API ({ action: 'start' }). No shared secret (cron or
// otherwise) authorises it.

export type OAuthApiAction = 'status' | 'start';

/** The POST body's action, or null for anything else. */
export function parseOAuthAction(body: unknown): OAuthApiAction | null {
  if (!body || typeof body !== 'object') return null;
  const action = (body as { action?: unknown }).action;
  return action === 'status' || action === 'start' ? action : null;
}

/** Base64url without padding (RFC 4648 §5), as PKCE requires. */
export function base64UrlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** PKCE code_verifier: 64 random bytes -> 86 unreserved characters (RFC 7636 §4.1 allows 43–128). */
export function randomCodeVerifier(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/** PKCE S256 code_challenge = BASE64URL(SHA256(ASCII(code_verifier))). */
export async function pkceS256Challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

export function twitterAuthUrl(p: {
  clientId: string; redirectUri: string; scope: string; state: string; codeChallenge: string;
}): string {
  return `https://twitter.com/i/oauth2/authorize?response_type=code` +
    `&client_id=${encodeURIComponent(p.clientId)}` +
    `&redirect_uri=${encodeURIComponent(p.redirectUri)}` +
    `&scope=${encodeURIComponent(p.scope)}` +
    `&state=${encodeURIComponent(p.state)}` +
    `&code_challenge=${encodeURIComponent(p.codeChallenge)}&code_challenge_method=S256`;
}

export interface CredentialRow {
  account_id?: string | null;
  token_expires?: string | null;
  is_active?: boolean | null;
  last_tested?: string | null;
  refresh_token_secret_id?: string | null;
}

export interface ConnectionStatus {
  configured: boolean;
  redirect_uri: string;
  connected: boolean;
  account_id: string | null;
  token_expires: string | null;
  last_tested: string | null;
  has_refresh_token: boolean;
}

/** What the Connections panel may see about a credential. Never a token or a Vault secret id. */
export function connectionStatus(
  cred: CredentialRow | null | undefined,
  configured: boolean,
  redirectUri: string,
): ConnectionStatus {
  return {
    configured,
    redirect_uri: redirectUri,
    connected: !!cred?.is_active,
    account_id: cred?.account_id ?? null,
    token_expires: cred?.token_expires ?? null,
    last_tested: cred?.last_tested ?? null,
    has_refresh_token: !!cred?.refresh_token_secret_id,
  };
}
