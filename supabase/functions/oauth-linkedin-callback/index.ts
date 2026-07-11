// AIWMC Quantis — LinkedIn OAuth callback
// ------------------------------------------------------------------
// Step 1 (initiate): GET ?init=1 — generates state, returns redirect URL.
// Step 2 (callback): LinkedIn redirects back with ?code=...&state=...
//   We exchange the code for an access_token, fetch the member URN
//   (openid /userinfo → `sub`), store the token in Vault, and upsert
//   the secret_id + account_id into autoposter_credentials.
// ------------------------------------------------------------------
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('LINKEDIN_CLIENT_SECRET') ?? '';
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/oauth-linkedin-callback`;

const supa = createClient(SUPABASE_URL, SERVICE_KEY);

function html(body: string, status = 200) {
  return new Response(`<!doctype html><meta charset="utf-8"><title>LinkedIn</title>
  <body style="font-family:system-ui;padding:32px;max-width:560px;margin:auto;background:#070D1A;color:#EBF4FF">
  ${body}</body>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

Deno.serve(async (req) => {
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
    const scope = encodeURIComponent('w_member_social openid profile');
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code` +
      `&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${scope}&state=${state}`;
    return Response.redirect(authUrl, 302);
  }


  // CALLBACK
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const err = url.searchParams.get('error');
  if (err) return html(`<h2>LinkedIn error</h2><pre>${err}: ${url.searchParams.get('error_description') ?? ''}</pre>`, 400);
  if (!code || !state) return html('<h2>Missing code or state</h2>', 400);

  const { data: st } = await supa.from('autoposter_oauth_state').select('*').eq('state', state).maybeSingle();
  if (!st || st.platform !== 'linkedin') return html('<h2>Invalid state</h2>', 400);
  await supa.from('autoposter_oauth_state').delete().eq('state', state);

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

  return html(`<h2 style="color:#8FFF2A">✅ LinkedIn connected</h2>
    <p>Member: <code>${profile.name ?? profile.sub}</code></p>
    <p>You can close this tab.</p>`);
});
