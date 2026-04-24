/**
 * Edge-function request correlation
 * ---------------------------------
 * Reads the `x-request-id` header from an incoming `Request` (set by the UI
 * via `requestHeaders()` in `src/lib/correlation.ts`). Falls back to a fresh
 * generated ID if the header is missing — server-to-server callers always
 * get one.
 *
 * Use it to:
 *   1. Tag every log line in this function with the same ID
 *   2. Pass it through to AI-call ledger entries / DB rows
 *   3. Echo it back in the response (`x-request-id` header) so the UI can
 *      reconcile its own logs with what actually ran server-side
 *
 * Usage in an edge function:
 *   const reqId = getRequestId(req);
 *   console.log(`[${reqId}] starting analysis`);
 *   return new Response(body, {
 *     headers: { ...corsHeadersFor(req), ...requestIdHeader(reqId) },
 *   });
 */

export const REQUEST_ID_HEADER = 'x-request-id';

function makeId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `q_${time}_${rand}`;
}

/** Read `x-request-id` from the inbound request, or generate one. */
export function getRequestId(req: Request): string {
  const incoming = req.headers.get(REQUEST_ID_HEADER);
  if (incoming && incoming.trim()) return incoming.trim().slice(0, 128);
  return makeId();
}

/** Build a header object containing the request ID, ready to spread. */
export function requestIdHeader(id: string): Record<string, string> {
  return { [REQUEST_ID_HEADER]: id };
}
