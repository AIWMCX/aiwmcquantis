// AIWMC Quantis — LinkedIn OAuth callback
// ------------------------------------------------------------------
// Step 1 (initiate): GET ?init=1 — generates state, returns redirect URL.
// Step 2 (callback): LinkedIn redirects back with ?code=...&state=...
//   We exchange the code for an access_token, fetch the member URN
//   (openid /userinfo → `sub`), store the token in Vault, and upsert
//   the secret_id + account_id into autoposter_credentials.
// ------------------------------------------------------------------
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeadersFor } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('LINKEDIN_CLIENT_SECRET') ?? '';
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/oauth-linkedin-callback`;
// Where the browser lands after LinkedIn: the Autoposter admin page.
const APP_URL = (Deno.env.get('APP_URL') ?? 'https://www.aiwmcquantis.com').replace(/\/$/, '');
const RETURN_PATH = '/admin/autoposter';
const SCOPE = 'w_member_social openid profile';

const supa = createClient(SUPABASE_URL, SERVICE_KEY);

function html(body: string, status = 200) {
  return new Response(`<!doctype html><meta charset="utf-8"><title>LinkedIn</title>
  <body style="font-family:system-ui;padding:32px;max-width:560px;margin:auto;background:#070D1A;color:#EBF4FF">
  ${body}</body>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function backToApp(params: Record<string, string>) {
  return Response.redirect(`${APP_URL}${RETURN_PATH}?${new URLSearchParams(params)}`, 302);
}

function authUrlFor(state: string) {
  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code` +
    `&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPE)}&state=${state}`;
}

/** Signed-in admin only. Returns the user id or null. */
async function adminUserId(req: Request): Promise<string | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await supa.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: roles } = await supa.from('user_roles').select('role').eq('user_id', data.user.id).eq('role', 'admin');
  return roles && roles.length > 0 ? data.user.id : null;
}

/**
 * Admin API used by the Autoposter "Connections" panel (POST, JSON):
 *   { action: 'status' } -> connection summary (never tokens)
 *   { action: 'start' }  -> { url } to send the browser to LinkedIn
 * This function is deployed without platform JWT verification because
 * LinkedIn's redirect carries no Supabase token; every path authenticates
 * itself (admin JWT here, single-use expiring state on the callback).
 */
async function handleApi(req: Request): Promise<Response> {
  const cors = corsHeadersFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!(await adminUserId(req))) return json({ error: 'Admin sign-in required' }, 401);
  const body = await req.json().catch(() => ({}));
  const configured = !!(CLIENT_ID && CLIENT_SECRET);

  if (body.action === 'status') {
    const { data: cred } = await supa.from('autoposter_credentials')
      .select('account_id, token_expires, is_active, last_tested, updated_at, refresh_token_secret_id')
      .eq('platform', 'linkedin').maybeSingle();
    return json({
      configured,
      redirect_uri: REDIRECT_URI,
      connected: !!cred?.is_active,
      account_id: cred?.account_id ?? null,
      token_expires: cred?.token_expires ?? null,
      last_tested: cred?.last_tested ?? null,
      has_refresh_token: !!cred?.refresh_token_secret_id,
    });
  }
  if (body.action === 'start') {
    if (!configured) return json({ error: 'LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET are not set in Supabase secrets.' }, 409);
    const state = crypto.randomUUID();
    const { error } = await supa.from('autoposter_oauth_state').insert({ state, platform: 'linkedin', redirect_uri: REDIRECT_URI });
    if (error) return json({ error: `Could not start: ${error.message}` }, 500);
    return json({ url: authUrlFor(state) });
  }
  return json({ error: 'Unknown action' }, 400);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeadersFor(req) });
  if (req.method === 'POST') return handleApi(req);
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return html('<h2>Missing config</h2><p>LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET not set.</p>', 500);
  }
  const url = new URL(req.url);

  // INITIATE — admin-only. Requires CRON_SECRET via header or ?secret= query param.
  // Prevents anonymous attackers from hijacking the shared autoposter account.
  if (url.searchParams.get('init') === '1') {
    const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
    const provided = req.headers.get('x-cron-secret') ?? url.searchParams.get('secret') ?? '';
    if (!CRON_SECRET || provided !== CRON_SECRET) {
      return html('<h2>Unauthorized</h2><p>Admin secret required to initiate LinkedIn OAuth.</p>', 401);
    }
    const state = crypto.randomUUID();
    await supa.from('autoposter_oauth_state').insert({
      state, platform: 'linkedin', redirect_uri: REDIRECT_URI,
    });
    return Response.redirect(authUrlFor(state), 302);
  }


  // CALLBACK
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const err = url.searchParams.get('error');
  if (err) return backToApp({ linkedin: 'error', reason: (url.searchParams.get('error_description') ?? err).slice(0, 200) });
  if (!code || !state) return html('<h2>Missing code or state</h2>', 400);

  // Atomic claim: DELETE ... RETURNING in one round trip, not SELECT-then-DELETE.
  // Two concurrent callback requests racing the same state value can only ever
  // have one of them see a returned row — the loser gets an empty array, not a
  // stale read of a row the winner is about to delete out from under it.
  const { data: claimed } = await supa
    .from('autoposter_oauth_state')
    .delete()
    .eq('state', state)
    .select('*');
  const st = claimed?.[0] ?? null;
  if (!st || st.platform !== 'linkedin') return html('<h2>Invalid state</h2>', 400);

  // Fail closed on a malformed/NULL timestamp: `new Date(x).getTime()` on a
  // bad value is NaN, and `NaN < Date.now()` is always false in JS — so a
  // naive expiry check would silently treat a corrupt row as "not expired".
  const expiresAtMs = new Date(st.expires_at).getTime();
  if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) {
    return html('<h2>State expired</h2><p>This authorization link expired. Start over from the connect flow.</p>', 400);
  }

  // Exchange
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  const token = await tokenRes.json();
  if (!token.access_token) return html(`<h2>Token exchange failed</h2><pre>${JSON.stringify(token, null, 2)}</pre>`, 400);

  // Identify member
  const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const profile = await profileRes.json();
  if (!profile.sub) return html(`<h2>Failed to read profile</h2><pre>${JSON.stringify(profile, null, 2)}</pre>`, 400);

  // Store in Vault
  const { data: secretId, error: vErr } = await supa.rpc('autoposter_store_token', {
    p_secret: token.access_token,
    p_name: 'autoposter_linkedin_access_token',
  });
  if (vErr) return html(`<h2>Vault store failed</h2><pre>${vErr.message}</pre>`, 500);

  let refreshSecretId: string | null = null;
  if (token.refresh_token) {
    const { data: rid } = await supa.rpc('autoposter_store_token', {
      p_secret: token.refresh_token,
      p_name: 'autoposter_linkedin_refresh_token',
    });
    refreshSecretId = rid as string;
  }

  await supa.from('autoposter_credentials').upsert({
    platform: 'linkedin',
    account_id: profile.sub,
    access_token_secret_id: secretId,
    refresh_token_secret_id: refreshSecretId,
    token_expires: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
    is_active: true,
    last_tested: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'platform' });

  return backToApp({ linkedin: 'connected', name: String(profile.name ?? '').slice(0, 80) });
});
