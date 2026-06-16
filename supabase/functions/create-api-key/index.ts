/**
 * create-api-key — PRO-only endpoint that mints an API key.
 *
 * Returns the plaintext key EXACTLY ONCE. Server stores only:
 *   - key_prefix (first 8 chars, displayed in the UI for identification)
 *   - key_hash   (SHA-256 of the full secret, used by api-analyze-main lookup)
 *
 * Tier gate: requires PRO. Verified server-side via subscriptions table —
 * client-side gating in the UI is purely cosmetic.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeadersFor } from '../_shared/cors.ts';


import { maybeHealthResponse } from '../_shared/health.ts';
const FUNCTION_NAME = 'create-api-key';
const FUNCTION_VERSION = '1.0.0';

interface Body {
  name?: string;
}

function jsonResponse(status: number, body: unknown, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateKey(): { plaintext: string; prefix: string } {
  // Format: qk_live_<48 random base32 chars>
  const bytes = new Uint8Array(36);
  crypto.getRandomValues(bytes);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let body = '';
  for (const b of bytes) body += alphabet[b % 32];
  const plaintext = `qk_live_${body}`;
  // Display prefix: first 8 chars including 'qk_live_' is too long; show 'qk_live_' + first 4 of body
  const prefix = `qk_${body.slice(0, 5)}`; // 8 chars, fits api_keys_prefix_length CHECK
  return { plaintext, prefix };
}

Deno.serve(async (req) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'METHOD_NOT_ALLOWED' }, corsHeaders);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse(401, { error: 'UNAUTHORIZED' }, corsHeaders);
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) return jsonResponse(401, { error: 'UNAUTHORIZED' }, corsHeaders);

  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'INVALID_JSON' }, corsHeaders);
  }
  const name = (body.name ?? '').trim();
  if (!name) return jsonResponse(400, { error: 'NAME_REQUIRED' }, corsHeaders);
  if (name.length > 64) return jsonResponse(400, { error: 'NAME_TOO_LONG' }, corsHeaders);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // PRO tier verification (server-side, source of truth)
  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan_id, status')
    .eq('user_id', user.id)
    .maybeSingle();
  const isActive = sub?.status === 'active' || sub?.status === 'trialing';
  const isPro = isActive && (sub?.plan_id === 'pro' || sub?.plan_id === 'enterprise');
  if (!isPro) {
    return jsonResponse(402, {
      success: false,
      error: 'TIER_GATE',
      message: 'API keys require the Pro plan.',
      required_tier: 'PRO',
      upgrade_url: 'https://www.aiwmcquantis.com/pricing',
      cta: 'Unlock with Pro — $49/mo',
    }, corsHeaders);
  }

  // Cap: max 10 active keys per user
  const { count } = await admin
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true);
  if ((count ?? 0) >= 10) {
    return jsonResponse(429, { error: 'KEY_LIMIT_REACHED', max: 10 }, corsHeaders);
  }

  const { plaintext, prefix } = generateKey();
  const key_hash = await sha256Hex(plaintext);

  const { data: inserted, error: insErr } = await admin
    .from('api_keys')
    .insert({
      user_id: user.id,
      name,
      key_prefix: prefix,
      key_hash,
      scopes: ['analyze'],
      rate_limit_per_hour: 60,
      is_active: true,
    })
    .select(
      'id, name, key_prefix, scopes, last_used_at, usage_count, rate_limit_per_hour, is_active, expires_at, created_at',
    )
    .single();

  if (insErr || !inserted) {
    return jsonResponse(500, { error: 'INSERT_FAILED', detail: insErr?.message }, corsHeaders);
  }

  return jsonResponse(201, { ...inserted, plaintext_key: plaintext }, corsHeaders);
});
