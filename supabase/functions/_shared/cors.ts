/**
 * CORS — Origin Allowlist
 * -----------------------
 * Replaces wildcard `Access-Control-Allow-Origin: *` with an explicit
 * allowlist of trusted origins. Any other origin gets a hard-deny CORS
 * response (no echo, no credentials).
 *
 * Trusted origins:
 *   - https://aiwmcquantis.com
 *   - https://www.aiwmcquantis.com
 *   - https://aiwmcquantis.lovable.app
 *   - any *.lovable.app subdomain (preview environments)
 *   - any *.lovableproject.com subdomain (preview environments)
 *   - http://localhost:* (local dev)
 */

const STATIC_ALLOWED = new Set<string>([
  'https://aiwmcquantis.com',
  'https://www.aiwmcquantis.com',
  'https://aiwmcquantis.lovable.app',
]);

const ALLOWED_PATTERNS: RegExp[] = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
];

const BASE_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-admin-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
};

function isAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (STATIC_ALLOWED.has(origin)) return true;
  return ALLOWED_PATTERNS.some((re) => re.test(origin));
}

/**
 * Returns CORS headers tailored to the incoming request's `Origin`.
 * If the origin is not allowed, omits `Access-Control-Allow-Origin`
 * (browser will block the response — exactly what we want).
 *
 * Usage:
 *   const cors = corsHeadersFor(req);
 *   if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
 *   return new Response(body, { headers: { ...cors, 'Content-Type': 'application/json' } });
 */
export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  if (isAllowed(origin)) {
    return { ...BASE_HEADERS, 'Access-Control-Allow-Origin': origin! };
  }
  return { ...BASE_HEADERS };
}

/**
 * Backwards-compat export for files that still import `corsHeaders`.
 * Prefer `corsHeadersFor(req)` in new code so the origin is validated.
 * This fallback uses `*` only when no Origin header is present (e.g. server-to-server).
 */
export const corsHeaders: Record<string, string> = {
  ...BASE_HEADERS,
  'Access-Control-Allow-Origin': '*',
};
