// AIWMC Quantis — Twitter/X OAuth 2.0 callback with PKCE
// ------------------------------------------------------------------
// Step 1 (init): GET ?init=1 — generates state + PKCE verifier,
//   stores them, returns redirect to X authorize URL.
// Step 2 (callback): exchanges code with code_verifier, stores
//   access_token + refresh_token in Vault.
// ------------------------------------------------------------------
import { createClient } from 'npm:@supabase/supabase-js@2';
import { encodeBase64Url } from 'https://deno.land/std@0.224.0/encoding/base64url.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLIENT_ID = Deno.env.get('TWITTER_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('TWITTER_CLIENT_SECRET') ?? '';
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/oauth-twitter-callback`;
const SCOPES = 'tweet.read tweet.write users.read offline.access';

const supa = createClient(SUPABASE_URL, SERVICE_KEY);

function html(body: string, status = 200) {
  return new Response(`<!doctype html><meta charset="utf-8"><title>X / Twitter</title>
  <body style="font-family:system-ui;padding:32px;max-width:560px;margin:auto;background:#070D1A;color:#EBF4FF">
  ${body}</body>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function sha256base64url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return encodeBase64Url(new Uint8Array(buf));
}

function randomVerifier(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return encodeBase64Url(bytes).replace(/=+$/, '').slice(0, 96);
}

Deno.serve(async (req) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return html('<h2>Missing config</h2><p>TWITTER_CLIENT_ID / TWITTER_CLIENT_SECRET not set.</p>', 500);
  }
  const url = new URL(req.url);

  if (url.searchParams.get('init') === '1') {
    const state = crypto.randomUUID();
    const verifier = randomVerifier();
    const challenge = await sha256base64url(verifier);
    await supa.from('autoposter_oauth_state').insert({
      state, platform: 'twitter', code_verifier: verifier, redirect_uri: REDIRECT_URI,
    });
    const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code` +
      `&client_id=${encodeURIComponent(CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;
    return Response.redirect(authUrl, 302);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const err = url.searchParams.get('error');
  if (err) return html(`<h2>X error</h2><pre>${err}</pre>`, 400);
  if (!code || !state) return html('<h2>Missing code or state</h2>', 400);

  const { data: st } = await supa.from('autoposter_oauth_state').select('*').eq('state', state).maybeSingle();
  if (!st || st.platform !== 'twitter' || !st.code_verifier) return html('<h2>Invalid state</h2>', 400);
  await supa.from('autoposter_oauth_state').delete().eq('state', state);

  const basic = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: st.code_verifier,
      client_id: CLIENT_ID,
    }),
  });
  const token = await tokenRes.json();
  if (!token.access_token) return html(`<h2>Token exchange failed</h2><pre>${JSON.stringify(token, null, 2)}</pre>`, 400);

  // Identify user
  const meRes = await fetch('https://api.x.com/2/users/me', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const me = await meRes.json();
  const accountId = me?.data?.id ?? null;

  const { data: accessId, error: vErr } = await supa.rpc('autoposter_store_token', {
    p_secret: token.access_token, p_name: 'autoposter_twitter_access_token',
  });
  if (vErr) return html(`<h2>Vault store failed</h2><pre>${vErr.message}</pre>`, 500);

  let refreshId: string | null = null;
  if (token.refresh_token) {
    const { data: rid } = await supa.rpc('autoposter_store_token', {
      p_secret: token.refresh_token, p_name: 'autoposter_twitter_refresh_token',
    });
    refreshId = rid as string;
  }

  await supa.from('autoposter_credentials').upsert({
    platform: 'twitter',
    account_id: accountId,
    access_token_secret_id: accessId,
    refresh_token_secret_id: refreshId,
    token_expires: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
    is_active: true,
    last_tested: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'platform' });

  return html(`<h2 style="color:#8FFF2A">✅ X / Twitter connected</h2>
    <p>Account: <code>${me?.data?.username ?? accountId ?? 'unknown'}</code></p>
    <p>You can close this tab.</p>`);
});
