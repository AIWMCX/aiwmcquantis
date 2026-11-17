/**
 * growth-os: the AIWMC Growth Studio OS snapshot for /admin/growth-studio.
 *
 * One system for the four AIWMC products (aiwmc.store, build.aiwmc.store, aiwmcquantis.com, aiwmc.space):
 * registry, engines, product prompts and wiring, every OPS-LOG entry, the git history of all product
 * repos, every working document, memory (rules and decisions), skills, scheduled tasks and the Growth
 * Studio page database, from the first entry to the snapshot time.
 *
 * Source of truth: the private Growth Studio vault repo (AIWMCX/aiwmc-growth-studio,
 * snapshots/growth-os/snapshot.json, written by tools/build_os_snapshot.py with emails and secrets
 * scrubbed). The snapshot is NOT bundled here: the Supabase CLI deploy reads quoted paths inside
 * function assets as files to open, so raw history text failed the 2026-11-17 deploy.
 *
 * Secret GROWTH_OS_GITHUB_TOKEN: a fine-grained GitHub token with read-only Contents access to that one
 * repo, set by the founder. Without it the function answers 503 'not_configured'.
 * Only an authenticated admin (user_roles.role = 'admin') gets the data; everyone else 401/403.
 */
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { maybeHealthResponse } from '../_shared/health.ts';

const FUNCTION_NAME = 'growth-os';
const FUNCTION_VERSION = '1.1.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SNAPSHOT_URL =
  'https://api.github.com/repos/AIWMCX/aiwmc-growth-studio/contents/snapshots/growth-os/snapshot.json?ref=main';
const CACHE_MS = 10 * 60 * 1000;

let cache: { body: string; at: number } | null = null;

async function loadSnapshot(token: string): Promise<string> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.body;
  const res = await fetch(SNAPSHOT_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.raw+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'aiwmc-quantis-growth-os',
    },
  });
  if (!res.ok) throw new Error(`snapshot fetch ${res.status}`);
  const body = await res.text();
  JSON.parse(body); // refuse to serve a broken snapshot
  cache = { body, at: Date.now() };
  return body;
}

Deno.serve(async (req) => {
  const health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (health) return health;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const j = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return j({ error: 'Unauthorized' }, 401);
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes } = await svc.auth.getUser(token);
    if (!userRes?.user) return j({ error: 'Unauthorized' }, 401);
    const { data: roles } = await svc.from('user_roles').select('role').eq('user_id', userRes.user.id).eq('role', 'admin');
    if (!roles || roles.length === 0) return j({ error: 'Admin only' }, 403);

    const ghToken = Deno.env.get('GROWTH_OS_GITHUB_TOKEN');
    if (!ghToken) return j({ error: 'not_configured', detail: 'Set the GROWTH_OS_GITHUB_TOKEN edge secret.' }, 503);

    const body = await loadSnapshot(ghToken);
    return new Response(body, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    console.error(`${FUNCTION_NAME} error`, e instanceof Error ? e.message : e);
    return j({ error: 'snapshot_unavailable' }, 502);
  }
});
