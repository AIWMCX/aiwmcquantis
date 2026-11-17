/**
 * growth-os: the AIWMC Growth Studio OS snapshot for /admin/growth-studio.
 *
 * One system for the four AIWMC products (aiwmc.store, build.aiwmc.store, aiwmcquantis.com, aiwmc.space):
 * registry, engines, product prompts and wiring, every OPS-LOG entry, the git history of all product
 * repos, every working document, memory (rules and decisions), skills, scheduled tasks and the Growth
 * Studio page database, from the first entry to the snapshot time.
 *
 * The snapshot is internal business data, so it is bundled HERE (server side) and never in the public
 * frontend bundle. Only an authenticated admin (user_roles.role = 'admin') gets it; everyone else 401/403.
 * Rebuild: python -I -X utf8 <growth-studio vault>/tools/build_os_snapshot.py supabase/functions/growth-os/snapshot.json
 * (emails and secrets are scrubbed by the builder).
 */
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { maybeHealthResponse } from '../_shared/health.ts';
import snapshot from './snapshot.json' with { type: 'json' };

const FUNCTION_NAME = 'growth-os';
const FUNCTION_VERSION = '1.0.0';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

let body: string | null = null;

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

    body ??= JSON.stringify(snapshot);
    return new Response(body, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    console.error(`${FUNCTION_NAME} error`, e instanceof Error ? e.message : e);
    return j({ error: 'Internal error' }, 500);
  }
});
