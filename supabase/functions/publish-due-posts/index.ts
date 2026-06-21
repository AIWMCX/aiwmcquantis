// AIWMC Quantis — publish-due-posts
// ---------------------------------------------------------------------------
// Cron-driven (pg_cron, every minute). Replaces n8n.
// Picks all autoposter_post_platforms rows where status='scheduled' AND
// scheduled_at <= now(), attempts publishing via platform APIs (LinkedIn,
// Facebook, Instagram), updates status to 'published' or 'failed', and writes
// an audit row to autoposter_publishing_logs. If a platform has no credentials
// configured yet, the row is marked 'needs_credentials' (NOT failed) so the
// queue stays clean and the dashboard can show a clear action item.
// ---------------------------------------------------------------------------
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';


import { maybeHealthResponse } from '../_shared/health.ts';
const FUNCTION_NAME = 'publish-due-posts';
const FUNCTION_VERSION = '1.0.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supa = createClient(SUPABASE_URL, SERVICE_KEY);

type Platform = 'linkedin' | 'facebook' | 'instagram';

interface PublishResult {
  ok: boolean;
  platform_post_id?: string;
  error?: string;
  needs_credentials?: boolean;
}

async function publishLinkedIn(content: string, creds: any | null): Promise<PublishResult> {
  if (!creds?.access_token || !creds?.account_id) {
    return { ok: false, needs_credentials: true, error: 'LinkedIn credentials missing' };
  }
  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.access_token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${creds.account_id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });
  if (!res.ok) return { ok: false, error: `LinkedIn ${res.status}: ${(await res.text()).slice(0, 300)}` };
  const json = await res.json();
  return { ok: true, platform_post_id: json.id };
}

async function publishFacebook(content: string, creds: any | null): Promise<PublishResult> {
  if (!creds?.access_token || !creds?.page_id) {
    return { ok: false, needs_credentials: true, error: 'Facebook Page credentials missing' };
  }
  const res = await fetch(`https://graph.facebook.com/v20.0/${creds.page_id}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: content, access_token: creds.access_token }),
  });
  const json = await res.json();
  if (!res.ok || json.error) return { ok: false, error: json.error?.message ?? `FB ${res.status}` };
  return { ok: true, platform_post_id: json.id };
}

async function publishInstagram(content: string, creds: any | null): Promise<PublishResult> {
  // Instagram requires a media container first; without an image asset pipeline we
  // mark needs_credentials so the operator wires up image hosting before going live.
  if (!creds?.access_token || !creds?.account_id) {
    return { ok: false, needs_credentials: true, error: 'Instagram Graph credentials missing' };
  }
  return {
    ok: false,
    needs_credentials: true,
    error: 'Instagram publish requires image URL pipeline — wire IG asset host then re-enable.',
  };
}

const PUBLISHERS: Record<Platform, (content: string, creds: any | null) => Promise<PublishResult>> = {
  linkedin: publishLinkedIn,
  facebook: publishFacebook,
  instagram: publishInstagram,
};

async function logAudit(post_platform_id: string, action: string, status: string, payload: unknown, duration_ms: number) {
  await supa.from('autoposter_publishing_logs').insert({
    post_platform_id,
    action,
    status,
    response_payload: payload as any,
    duration_ms,
  });
}

Deno.serve(async (req) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Cron-only endpoint: require x-cron-secret header
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (!expectedSecret || !cronSecret || cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }


  const t0 = Date.now();

  // Pull due rows. Limit batch size for safety.
  const nowIso = new Date().toISOString();
  const { data: due, error } = await supa
    .from('autoposter_post_platforms')
    .select('id, post_id, platform, content, scheduled_at, status')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowIso)
    .limit(20);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!due || due.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0, elapsed_ms: Date.now() - t0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Pull all credentials in one shot, then resolve their Vault-stored tokens.
  const { data: credRows } = await supa.from('autoposter_credentials').select('*').eq('is_active', true);
  const credsByPlatform = new Map<string, any>();
  for (const c of (credRows ?? []) as any[]) {
    let access_token: string | null = null;
    if (c.access_token_secret_id) {
      const { data: tok } = await supa.rpc('autoposter_read_token', { p_id: c.access_token_secret_id });
      access_token = (tok as string) ?? null;
    }
    credsByPlatform.set(c.platform, { ...c, access_token });
  }

  for (const row of due) {
    const platform = row.platform as Platform;
    const publisher = PUBLISHERS[platform];
    if (!publisher) {
      results.push({ id: row.id, platform, ok: false, status: 'failed', error: 'Unknown platform' });
      continue;
    }
    const t1 = Date.now();
    let res: PublishResult;
    try {
      res = await publisher(row.content, credsByPlatform.get(platform) ?? null);
    } catch (e) {
      res = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    const dur = Date.now() - t1;

    const newStatus = res.ok ? 'published' : res.needs_credentials ? 'needs_credentials' : 'failed';
    await supa
      .from('autoposter_post_platforms')
      .update({
        status: newStatus,
        published_at: res.ok ? new Date().toISOString() : null,
        platform_post_id: res.platform_post_id ?? null,
        error_message: res.error ?? null,
      })
      .eq('id', row.id);

    await logAudit(row.id, 'publish', newStatus, res, dur);

    // If all platforms for the parent post are now published, mark the post.
    if (res.ok) {
      const { data: siblings } = await supa
        .from('autoposter_post_platforms')
        .select('status')
        .eq('post_id', row.post_id);
      const allDone = (siblings ?? []).every((s: any) => s.status === 'published');
      if (allDone) {
        await supa.from('autoposter_posts').update({ status: 'published' }).eq('id', row.post_id);
      }
    }

    results.push({ id: row.id, platform, ok: res.ok, status: newStatus, error: res.error });
  }

  return new Response(
    JSON.stringify({ ok: true, processed: results.length, elapsed_ms: Date.now() - t0, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
