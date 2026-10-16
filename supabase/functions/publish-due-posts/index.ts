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
import { ambiguousFromThrow, isAmbiguousHttpStatus, PUBLISH_TIMEOUT_MS, statusFor, type PublishResult } from './outcome.ts';


import { maybeHealthResponse } from '../_shared/health.ts';
const FUNCTION_NAME = 'publish-due-posts';
const FUNCTION_VERSION = '1.0.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LINKEDIN_CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID') ?? '';
const LINKEDIN_CLIENT_SECRET = Deno.env.get('LINKEDIN_CLIENT_SECRET') ?? '';

const supa = createClient(SUPABASE_URL, SERVICE_KEY);

// Refresh the LinkedIn access token if it's missing or within 5 minutes of
// expiry. `autoposter_store_token` upserts by the fixed secret name, so the
// existing access_token_secret_id keeps pointing at the same (now-updated)
// Vault secret — only token_expires on the credentials row needs to change.
// Workstream I.1 gap fix (2026-09-05): previously there was no refresh path
// at all, so an expired token just failed every publish attempt forever.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const LEASE_MS = 30 * 1000; // generous over one LinkedIn token-refresh HTTP round trip

async function refreshLinkedInTokenIfNeeded(cred: any): Promise<{ access_token: string | null; disabled?: boolean }> {
  const expiresAt = cred.token_expires ? new Date(cred.token_expires).getTime() : 0;
  const expiryIsValid = Number.isFinite(expiresAt);
  const needsRefresh = !cred.access_token || !expiryIsValid || expiresAt - Date.now() < REFRESH_MARGIN_MS;
  if (!needsRefresh) return { access_token: cred.access_token };

  if (!cred.refresh_token_secret_id || !LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    // Nothing we can do — surface as needs_credentials, not a silent stale-token failure.
    return { access_token: null };
  }

  // Concurrency guard: a durable, row-based lease -- NOT a Postgres session-
  // level advisory lock. pg_try_advisory_lock/pg_advisory_unlock belong to
  // the Postgres *session*, and two separate Supabase RPC calls from an Edge
  // Function have no guaranteed session affinity through PostgREST's
  // connection pool: the acquire and release can land on different pooled
  // connections, so a lock could be released by a session that never held
  // it, or held forever by a session recycled for an unrelated request.
  // A single atomic conditional UPDATE has no such assumption -- it's one
  // statement, one round trip, correct regardless of which connection
  // services it. The lease also self-expires (LEASE_MS), so a worker that
  // crashes mid-refresh doesn't lock the credential out forever the way an
  // un-released advisory lock effectively could.
  const leaseOwner = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const leaseExpiresAt = new Date(Date.now() + LEASE_MS).toISOString();
  const { data: leased } = await supa
    .from('autoposter_credentials')
    .update({ refresh_lease_owner: leaseOwner, refresh_lease_expires_at: leaseExpiresAt })
    .eq('id', cred.id)
    .or(`refresh_lease_owner.is.null,refresh_lease_expires_at.lt.${nowIso}`)
    .select('id');
  if (!leased?.length) {
    // Another worker holds a live (unexpired) lease -- use the existing
    // token rather than racing a second refresh; the lease-holder's update
    // will be visible on the next cron tick if this one still isn't fresh.
    return { access_token: cred.access_token ?? null };
  }

  // Every write below is additionally gated on `refresh_lease_owner = leaseOwner`.
  // If our lease has since expired and a new worker has taken over (visible
  // as a different owner value), these writes become no-ops instead of
  // overwriting whatever the new, legitimate owner is doing.
  try {
    const { data: refreshToken } = await supa.rpc('autoposter_read_token', { p_id: cred.refresh_token_secret_id });
    if (!refreshToken) return { access_token: null };

    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken as string,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });
    const token = await res.json();

    if (!res.ok || !token.access_token) {
      // Recoverable-but-broken: disable the credential so every future run
      // reports needs_credentials instead of quietly failing on every post.
      // Deliberately does NOT touch access_token_secret_id / token_expires —
      // the last known-good credential stays intact, just marked inactive,
      // in case the failure is transient and a human re-enables it.
      // Log only the error shape LinkedIn returns on a failed grant
      // (error/error_description) — never the raw response body, in case a
      // future LinkedIn API version ever echoes request fields back.
      await supa.from('autoposter_credentials')
        .update({ is_active: false })
        .eq('id', cred.id)
        .eq('refresh_lease_owner', leaseOwner);
      await supa.from('autoposter_publishing_logs').insert({
        post_platform_id: null,
        action: 'token_refresh',
        status: 'failed',
        response_payload: { error: token?.error ?? null, error_description: token?.error_description ?? null, http_status: res.status },
        duration_ms: 0,
      });
      return { access_token: null, disabled: true };
    }

    await supa.rpc('autoposter_store_token', {
      p_secret: token.access_token,
      p_name: 'autoposter_linkedin_access_token',
    });
    // LinkedIn may rotate the refresh token on use — if it returns a new
    // one, it MUST be stored, or the next refresh attempt will exchange an
    // already-invalidated refresh_token and fail permanently.
    if (token.refresh_token) {
      await supa.rpc('autoposter_store_token', {
        p_secret: token.refresh_token,
        p_name: 'autoposter_linkedin_refresh_token',
      });
    }
    const newExpiry = token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null;
    await supa.from('autoposter_credentials')
      .update({
        token_expires: newExpiry,
        last_tested: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cred.id)
      .eq('refresh_lease_owner', leaseOwner);
    await supa.from('autoposter_publishing_logs').insert({
      post_platform_id: null,
      action: 'token_refresh',
      status: 'refreshed',
      response_payload: { expires_in: token.expires_in, refresh_token_rotated: !!token.refresh_token },
      duration_ms: 0,
    });

    return { access_token: token.access_token };
  } finally {
    // Release only if we still own it. If our lease already expired and a
    // new worker has legitimately taken over, this condition simply won't
    // match, so we never clear a lease that isn't ours to clear.
    await supa.from('autoposter_credentials')
      .update({ refresh_lease_owner: null, refresh_lease_expires_at: null })
      .eq('id', cred.id)
      .eq('refresh_lease_owner', leaseOwner);
  }
}

type Platform = 'linkedin' | 'facebook' | 'instagram';


async function publishLinkedIn(content: string, creds: any | null): Promise<PublishResult> {
  if (!creds?.access_token || !creds?.account_id) {
    return { ok: false, needs_credentials: true, error: 'LinkedIn credentials missing' };
  }
  let res: Response;
  try {
    res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    signal: AbortSignal.timeout(PUBLISH_TIMEOUT_MS),
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
  } catch (e) {
    // Timeout / connection reset after sending: LinkedIn may have accepted it.
    return ambiguousFromThrow('LinkedIn', e);
  }
  if (!res.ok) {
    const detail = `LinkedIn ${res.status}: ${(await res.text()).slice(0, 300)}`;
    return isAmbiguousHttpStatus(res.status) ? { ok: false, ambiguous: true, error: `${detail} (may be live — verify on LinkedIn)` } : { ok: false, error: detail };
  }
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

  // Find candidate rows, then claim them atomically. Two overlapping
  // publish-due-posts invocations (e.g. a slow run still finishing when the
  // next cron minute fires) could both see the same 'scheduled' rows from a
  // plain SELECT. The UPDATE below re-checks status='scheduled' at write
  // time, so even if both invocations see the same candidate ids, only one
  // of them actually flips each given row -- the loser's UPDATE matches
  // zero rows for anything already claimed, and .select() only returns
  // what THIS invocation actually claimed. This is what makes "one
  // scheduled post cannot publish twice" true at the row-claim level; it
  // does not by itself make the downstream LinkedIn API call idempotent
  // against a network-timeout retry -- LinkedIn's ugcPosts endpoint has no
  // client-supplied idempotency key, so a request that times out after
  // LinkedIn already accepted it remains a real, unresolved residual risk.
  const nowIso = new Date().toISOString();
  const { data: candidates, error: candidateErr } = await supa
    .from('autoposter_post_platforms')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowIso)
    .limit(20);

  if (candidateErr) {
    return new Response(JSON.stringify({ error: candidateErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!candidates || candidates.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0, elapsed_ms: Date.now() - t0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: due, error } = await supa
    .from('autoposter_post_platforms')
    .update({ status: 'publishing' })
    .in('id', candidates.map((c) => c.id))
    .eq('status', 'scheduled')
    .select('id, post_id, platform, content, scheduled_at');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!due || due.length === 0) {
    // Every candidate was already claimed by a concurrent invocation between
    // our SELECT and this UPDATE -- correct behavior, not an error.
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
    if (c.platform === 'linkedin') {
      const { access_token: freshToken } = await refreshLinkedInTokenIfNeeded({ ...c, access_token });
      access_token = freshToken;
    }
    credsByPlatform.set(c.platform, { ...c, access_token });
  }

  const results: Array<{ id: string; platform: string; ok: boolean; status: string; error?: string }> = [];



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
      // Anything unexpected after the request may have been sent is treated
      // as an unknown outcome, never as a definite failure.
      res = ambiguousFromThrow(platform, e);
    }
    const dur = Date.now() - t1;

    const newStatus = statusFor(res);
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
