/**
 * AIWMC Quantis — Public API: POST /api-analyze-main
 *
 * Spec §11.1: API key middleware validates Bearer token and enforces the
 * tier's daily quota (PRO = 100 req/day per the manifest).
 *
 * Authentication contract:
 *   Authorization: Bearer <api_key_secret>
 *
 * Behaviour:
 *   1. Look up the key by SHA-256(secret) in `api_keys`.
 *   2. Reject if missing, inactive, expired, or the owner is not on PRO.
 *   3. Count today's calls against the same key in `api_request_logs`;
 *      reject with 429 / TIER_GATE if the per-day cap is exceeded.
 *   4. Forward the body to `analyze-business` using the service role and
 *      log the call (latency + status) to `api_request_logs`.
 *
 * NOTE: per project rules (`important-info.md`), this is an ad-hoc per-key
 * cap implemented on top of the existing `api_request_logs` table — it is
 * not generic backend rate limiting infrastructure.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeadersFor } from '../_shared/cors.ts';


import { maybeHealthResponse } from '../_shared/health.ts';
const FUNCTION_NAME = 'api-analyze-main';
const FUNCTION_VERSION = '1.0.0';

const DAILY_CAP = 100;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const t0 = performance.now();
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1) Bearer extraction
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Provide an API key as `Authorization: Bearer <key>`.',
        upgrade_url: 'https://www.aiwmcquantis.com/settings/api-keys',
      }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  const secret = authHeader.replace('Bearer ', '').trim();
  const keyHash = await sha256Hex(secret);

  // 2) Look up key
  const { data: key } = await admin
    .from('api_keys')
    .select('id, user_id, is_active, expires_at, rate_limit_per_hour')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (!key || key.is_active === false || (key.expires_at && new Date(key.expires_at) < new Date())) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'INVALID_API_KEY',
        message: 'API key is missing, revoked, or expired.',
      }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // 3) PRO entitlement
  const { data: pro } = await admin.rpc('verify_pro_subscription', { p_user_id: key.user_id });
  if (!pro) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'TIER_GATE',
        required_tier: 'PRO',
        message: 'API access is a PRO feature.',
        upgrade_url: 'https://www.aiwmcquantis.com/pricing?plan=pro',
        cta: 'Upgrade to PRO',
      }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // 4) Per-key daily cap (ad-hoc; counts /api-analyze-main calls in last 24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('api_request_logs')
    .select('id', { count: 'exact', head: true })
    .eq('api_key_id', key.id)
    .eq('endpoint', '/api-analyze-main')
    .gte('created_at', since);

  if ((count ?? 0) >= DAILY_CAP) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'TIER_GATE',
        required_tier: 'PRO',
        message: `API daily cap of ${DAILY_CAP} reached. Resets in 24h from your first call.`,
        upgrade_url: 'mailto:hello@aiwmcquantis.com?subject=Higher API quota',
        cta: 'Contact us for higher quota',
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // 4b) Per-key hourly cap. The public /settings/api-keys page advertises
  // "60 req/hour" and api_keys.rate_limit_per_hour (default 60) was being
  // fetched above but never checked -- only the daily cap was enforced,
  // meaning the hourly limit was a real, unenforced claim. Falls back to
  // the column default (60) if a row somehow has it null.
  const hourlyLimit = key.rate_limit_per_hour ?? 60;
  const sinceHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: hourlyCount } = await admin
    .from('api_request_logs')
    .select('id', { count: 'exact', head: true })
    .eq('api_key_id', key.id)
    .eq('endpoint', '/api-analyze-main')
    .gte('created_at', sinceHour);

  if ((hourlyCount ?? 0) >= hourlyLimit) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'RATE_LIMITED',
        message: `API hourly rate limit of ${hourlyLimit} req/hour reached. Try again shortly.`,
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // 5) Forward to analyze-business
  let payload: unknown = {};
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'INVALID_JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: fnData, error: fnError } = await admin.functions.invoke('analyze-business', {
    body: { ...(payload as Record<string, unknown>), _api_key_user_id: key.user_id },
  });

  const status = fnError ? 500 : 200;
  const latency = Math.round(performance.now() - t0);

  // 6) Log the call (also bumps usage_count for the key)
  await admin.from('api_request_logs').insert({
    api_key_id: key.id,
    user_id: key.user_id,
    endpoint: '/api-analyze-main',
    status_code: status,
    latency_ms: latency,
    error_message: fnError?.message ?? null,
  });
  await admin.rpc('increment_api_key_usage', { p_key_id: key.id });

  if (fnError) {
    return new Response(JSON.stringify({ success: false, error: fnError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({ success: true, data: fnData, _meta: { latency_ms: latency } }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
