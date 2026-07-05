/**
 * Share-loop attribution (MP2 WS-5) — tracks whether a new signup originated
 * from a recipient clicking "Try It Free" on a shared report, so
 * share_originated_signup can be logged as a distinct funnel event separate
 * from share_link_created (sharing happening vs. sharing actually working).
 *
 * sessionStorage, matching the existing pending_checkout_plan convention
 * elsewhere in the app: survives the /share/:token -> /app -> /auth
 * navigation chain within one browser session, cleared once consumed.
 */
export const SHARE_ORIGIN_SESSION_KEY = 'quantis_share_origin_token';

export function markShareOrigin(token: string): void {
  try {
    sessionStorage.setItem(SHARE_ORIGIN_SESSION_KEY, token);
  } catch {
    /* ignore — attribution is best-effort, never block navigation */
  }
}

/** Reads and clears the marker in one call — consume-once semantics. */
export function consumeShareOrigin(): string | null {
  try {
    const token = sessionStorage.getItem(SHARE_ORIGIN_SESSION_KEY);
    if (token) sessionStorage.removeItem(SHARE_ORIGIN_SESSION_KEY);
    return token;
  } catch {
    return null;
  }
}
