/**
 * Request / Analysis correlation IDs
 * ----------------------------------
 * Every analysis run (and any sub-request that fans out from it) gets a
 * single short ID that is:
 *   - attached to every `logger.*` call as `metadata.request_id`
 *   - attached to every Sentry event as a tag (`request_id`)
 *   - sent on outbound `supabase.functions.invoke()` calls via the
 *     `x-request-id` header so edge functions can echo it into their own logs
 *
 * This lets you grep one ID across browser logs, Sentry, and edge logs to
 * trace a single analysis end-to-end.
 *
 * Usage:
 *   const id = startRequestContext();         // begin a new run
 *   logger.info('starting analysis', { ... }); // automatically tagged
 *   await supabase.functions.invoke('analyze-business', {
 *     body: payload,
 *     headers: requestHeaders(),               // x-request-id: <id>
 *   });
 *   endRequestContext();                       // optional cleanup
 */

import { Sentry } from './sentry';

const HEADER = 'x-request-id';

let currentId: string | null = null;

function makeId(): string {
  // Short, URL-safe, sortable-ish. Not a UUID — we don't need 122 bits.
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `q_${time}_${rand}`;
}

/** Begin a new correlation context. Returns the new request ID. */
export function startRequestContext(explicitId?: string): string {
  currentId = explicitId && explicitId.trim() ? explicitId.trim() : makeId();
  try {
    Sentry.setTag('request_id', currentId);
  } catch {
    // Sentry not initialized — fine.
  }
  return currentId;
}

/** End the current context. Idempotent. */
export function endRequestContext(): void {
  currentId = null;
  try {
    Sentry.setTag('request_id', undefined as unknown as string);
  } catch {
    // ignore
  }
}

/** Read the active request ID, if any. */
export function getRequestId(): string | null {
  return currentId;
}

/** Header name used everywhere — exported so tests / fetch wrappers can use it. */
export const REQUEST_ID_HEADER = HEADER;

/**
 * Build a headers object suitable for `supabase.functions.invoke({ headers })`
 * or raw `fetch()`. Only includes the header when a context is active.
 */
export function requestHeaders(extra?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...(extra ?? {}) };
  if (currentId) out[HEADER] = currentId;
  return out;
}
