/**
 * SHARED HEALTH ENDPOINT
 * ======================
 * Every Edge Function calls `maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION)`
 * on the first line of its handler. If the request is `?health=1` (or
 * `?health=true`), it returns a tiny JSON envelope that `scripts/verify-deploy.sh`
 * checks against the committed `FUNCTION_VERSION` constant.
 *
 * Bumping `FUNCTION_VERSION` in source and shipping = the CI gate proves the
 * new code actually replaced the old one. "Green CI but stale code" cannot
 * happen anymore.
 *
 * Usage:
 *   import { maybeHealthResponse } from '../_shared/health.ts';
 *   const FUNCTION_VERSION = '1.0.0';
 *   const FUNCTION_NAME = 'my-fn';
 *   serve(async (req) => {
 *     const h = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
 *     if (h) return h;
 *     // ...rest of handler
 *   });
 *
 * The handler is auth-free by design — health is public, returns no PII,
 * and exists to prove deploy fidelity, not to leak system state.
 */

import { corsHeadersFor } from './cors.ts';

export interface HealthEnvelope {
  ok: true;
  function: string;
  version: string;
  deployed_at: string;
  commit_sha: string | null;
}

// Captured at module-load time so `deployed_at` reflects the FIRST invocation
// after (cold-start) deploy — not the moment the health probe was called. The
// previous per-request `new Date()` made `deployed_at` a useless "now" value
// that could never distinguish a fresh deploy from a stale one. commit_sha
// (COMMIT_SHA env var, injected at deploy) is the load-bearing fidelity
// signal now; `deployed_at` is the tiebreaker for humans reading a log.
const MODULE_LOADED_AT = new Date().toISOString();

export function maybeHealthResponse(
  req: Request,
  functionName: string,
  version: string,
): Response | null {
  const url = new URL(req.url);
  const flag = url.searchParams.get('health');
  if (flag !== '1' && flag !== 'true') return null;

  const envelope: HealthEnvelope = {
    ok: true,
    function: functionName,
    version,
    deployed_at: MODULE_LOADED_AT,
    commit_sha: Deno.env.get('COMMIT_SHA') ?? null,
  };

  return new Response(JSON.stringify(envelope), {
    status: 200,
    headers: {
      ...corsHeadersFor(req),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
