// AIWMC Quantis — Meta (Facebook + Instagram) credentials setup
// ------------------------------------------------------------------
// Meta's Page Access Tokens are issued from Graph API Explorer for
// single-admin use. This function reads the values from the
// META_PAGE_ACCESS_TOKEN / META_PAGE_ID / META_IG_BUSINESS_ID secrets,
// stores the token in Vault, and writes 2 rows (facebook, instagram)
// into autoposter_credentials.
//
// Usage: POST with x-cron-secret header (admin-only). Idempotent.
// ------------------------------------------------------------------
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON = Deno.env.get('CRON_SECRET') ?? '';

const supa = createClient(SUPABASE_URL, SERVICE_KEY);

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const secret = req.headers.get('x-cron-secret');
  if (!CRON || secret !== CRON) return json({ error: 'unauthorized' }, 401);

  const token = Deno.env.get('META_PAGE_ACCESS_TOKEN');
  const pageId = Deno.env.get('META_PAGE_ID');
  const igId = Deno.env.get('META_IG_BUSINESS_ID');
  if (!token || !pageId) return json({ error: 'META_PAGE_ACCESS_TOKEN and META_PAGE_ID required' }, 400);

  // Verify token by hitting /me?access_token=
  const verify = await fetch(`https://graph.facebook.com/v20.0/${pageId}?fields=id,name&access_token=${encodeURIComponent(token)}`);
  const verifyJson = await verify.json();
  if (!verify.ok || verifyJson.error) {
    return json({ error: 'Token verification failed', details: verifyJson }, 400);
  }

  const { data: secretId, error: vErr } = await supa.rpc('autoposter_store_token', {
    p_secret: token, p_name: 'autoposter_meta_page_access_token',
  });
  if (vErr) return json({ error: vErr.message }, 500);

  const now = new Date().toISOString();
  await supa.from('autoposter_credentials').upsert({
    platform: 'facebook',
    account_id: pageId,
    page_id: pageId,
    access_token_secret_id: secretId,
    is_active: true,
    last_tested: now,
    updated_at: now,
  }, { onConflict: 'platform' });

  if (igId) {
    await supa.from('autoposter_credentials').upsert({
      platform: 'instagram',
      account_id: igId,
      page_id: pageId,
      access_token_secret_id: secretId,
      is_active: true,
      last_tested: now,
      updated_at: now,
    }, { onConflict: 'platform' });
  }

  return json({ ok: true, page: verifyJson, instagram_configured: !!igId });
});
