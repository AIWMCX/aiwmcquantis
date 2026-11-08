/**
 * Google service-account auth with Web Crypto only (works in Deno and Node 20+).
 *
 *   1. parseServiceAccount(): the JSON key from the GOOGLE_SERVICE_ACCOUNT_JSON
 *      edge secret. Never logged, never returned.
 *   2. buildJwtClaims() + signJwt(): an RS256 JWT assertion.
 *   3. exchangeJwtForToken(): POST it to the token endpoint
 *      (grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer).
 *
 * Steps 1-2 are pure and unit-tested with a generated key (no network).
 */

export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const GROWTH_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
] as const;

export interface ServiceAccount {
  client_email: string;
  private_key: string;
  private_key_id?: string;
  token_uri?: string;
}

export interface JwtClaims {
  iss: string;
  scope: string;
  aud: string;
  iat: number;
  exp: number;
}

/** Parse and validate the key JSON. Error messages never include key material. */
export function parseServiceAccount(raw: string | undefined | null): ServiceAccount {
  if (!raw || !raw.trim()) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set');
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }
  const email = typeof parsed.client_email === 'string' ? parsed.client_email : '';
  let key = typeof parsed.private_key === 'string' ? parsed.private_key : '';
  // A key pasted with literal "\n" sequences (double-escaped) still works.
  if (key.includes('\\n')) key = key.replace(/\\n/g, '\n');
  if (!email || !key.includes('PRIVATE KEY')) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON lacks client_email or private_key');
  }
  return {
    client_email: email,
    private_key: key,
    private_key_id: typeof parsed.private_key_id === 'string' ? parsed.private_key_id : undefined,
    token_uri: typeof parsed.token_uri === 'string' ? parsed.token_uri : undefined,
  };
}

/** JWT claim set for the token exchange; valid for 1 hour (Google's maximum). */
export function buildJwtClaims(sa: ServiceAccount, scopes: readonly string[], nowSec: number): JwtClaims {
  const iat = Math.floor(nowSec);
  return {
    iss: sa.client_email,
    scope: scopes.join(' '),
    aud: sa.token_uri || GOOGLE_TOKEN_URL,
    iat,
    exp: iat + 3600,
  };
}

export function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** PEM "-----BEGIN PRIVATE KEY-----" (PKCS#8) -> DER bytes. */
export function pemToPkcs8(pem: string): ArrayBuffer {
  if (pem.includes('BEGIN RSA PRIVATE KEY')) {
    throw new Error('private_key is PKCS#1; Google JSON keys are PKCS#8 (BEGIN PRIVATE KEY)');
  }
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const bin = atob(body);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

/** header.payload.signature, RS256. */
export async function signJwt(claims: JwtClaims, key: CryptoKey, kid?: string): Promise<string> {
  const header: Record<string, string> = { alg: 'RS256', typ: 'JWT' };
  if (kid) header.kid = kid;
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64UrlEncode(new Uint8Array(sig))}`;
}

/** Network: exchange the signed assertion for an access token. */
export async function exchangeJwtForToken(
  assertion: string,
  tokenUrl: string = GOOGLE_TOKEN_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || typeof body.access_token !== 'string') {
    // error / error_description only; the assertion is never echoed.
    const reason = [body.error, body.error_description].filter(Boolean).join(': ') || `HTTP ${res.status}`;
    throw new Error(`Google token exchange failed: ${reason}`);
  }
  return body.access_token;
}

/** parse -> claims -> sign -> exchange. */
export async function getGoogleAccessToken(
  rawJson: string | undefined | null,
  scopes: readonly string[] = GROWTH_SCOPES,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const sa = parseServiceAccount(rawJson);
  const key = await importPrivateKey(sa.private_key);
  const claims = buildJwtClaims(sa, scopes, Date.now() / 1000);
  const jwt = await signJwt(claims, key, sa.private_key_id);
  return await exchangeJwtForToken(jwt, claims.aud, fetchImpl);
}
