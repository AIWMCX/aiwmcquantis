/**
 * Persistent anonymous session identifier.
 *
 * Used by Fix #2B (mega prompt): the analysis rate limiter is keyed on
 * identity, not IP. For authenticated users the key is `user:<uuid>`;
 * for anonymous visitors it is `anon:<this uuid>`. Sharing an IP (office,
 * CGNAT, coffee-shop wifi) must never cause one user's quota to spill
 * onto another's first click.
 *
 * Generated once per browser, persisted in localStorage, sent on every
 * analysis request as the `x-quantis-anon-id` header.
 */

const STORAGE_KEY = 'quantis_anon_id';

function safeRandomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for ancient browsers — non-cryptographic but unique enough.
  return 'anon-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export function getAnonSessionId(): string {
  if (typeof window === 'undefined') return safeRandomUUID();
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = safeRandomUUID();
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // localStorage blocked (private mode, quota): per-page-load identity.
    return safeRandomUUID();
  }
}

/** Header name the edge function reads to derive the rate-limit key. */
export const ANON_ID_HEADER = 'x-quantis-anon-id';
