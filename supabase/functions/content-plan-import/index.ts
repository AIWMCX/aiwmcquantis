// AIWMC Quantis — Content Plan Import (admin-only)
// ---------------------------------------------------------------------------
// Bulk-ingests a structured content plan (e.g. a 30-day calendar) into
// autoposter_posts as fresh draft rows, with duplicate rejection against
// everything already in the table.
//
// Deliberately INSERT-only -- never an upsert, never touches an existing
// row. The prior bulk-import mechanism (since deliberately deleted) used
// an upsert whose conflict payload included `status`, which silently reset
// 42 archived rows back to 'draft' (see
// 20260911224116_seed_content_studio_as_archived_posts.sql's own comment).
// This function cannot repeat that failure mode structurally: it only ever
// runs INSERT statements for genuinely new rows.
//
// Duplicate detection is exact/near-exact (normalized token-overlap hash,
// _shared/content-dedupe.ts) against EVERY existing row regardless of
// status (draft/scheduled/posted/archived/not_published all count) -- a
// plan item that matches something already posted is exactly as much a
// duplicate as one matching an existing draft.
// ---------------------------------------------------------------------------
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { contentFingerprint } from '../_shared/content-dedupe.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface PlanItem {
  post_date: string;
  hook: string;
  content_brief: string;
  post_type?: string;
  visual_type?: string;
  cta?: string;
  hashtags?: string[];
}

function validateItem(item: unknown, index: number): { ok: true; item: PlanItem } | { ok: false; error: string } {
  const i = item as Record<string, unknown>;
  if (!i || typeof i !== 'object') return { ok: false, error: `item ${index}: not an object` };
  const post_date = String(i.post_date ?? '').trim();
  const hook = String(i.hook ?? '').trim();
  const content_brief = String(i.content_brief ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post_date)) return { ok: false, error: `item ${index}: post_date must be YYYY-MM-DD` };
  if (!hook) return { ok: false, error: `item ${index}: hook is required` };
  if (!content_brief) return { ok: false, error: `item ${index}: content_brief is required` };
  return {
    ok: true,
    item: {
      post_date,
      hook,
      content_brief,
      post_type: i.post_type ? String(i.post_type) : undefined,
      visual_type: i.visual_type ? String(i.visual_type) : undefined,
      cta: i.cta ? String(i.cta) : undefined,
      hashtags: Array.isArray(i.hashtags) ? i.hashtags.map(String) : undefined,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const j = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return j({ error: 'Unauthorized' }, 401);
    const supaUser = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes } = await supaUser.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return j({ error: 'Unauthorized' }, 401);

    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRows } = await svc
      .from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'content_admin']);
    if (!roleRows || roleRows.length === 0) return j({ error: 'Admin only' }, 403);

    const body = await req.json().catch(() => ({}));
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) return j({ error: 'items (non-empty array) is required' }, 400);
    if (rawItems.length > 60) return j({ error: 'items must be 60 or fewer per import' }, 400);

    const validationErrors: string[] = [];
    const validated: PlanItem[] = [];
    rawItems.forEach((raw: unknown, idx: number) => {
      const result = validateItem(raw, idx);
      if (result.ok) validated.push(result.item);
      else validationErrors.push(result.error);
    });
    if (validationErrors.length > 0) return j({ error: 'validation failed', details: validationErrors }, 400);

    const withHashes = validated.map((item) => ({
      item,
      dedup_hash: contentFingerprint(item.hook, item.content_brief),
    }));

    // Reject duplicates within THIS import batch too (not just against the DB).
    const seenInBatch = new Set<string>();
    const rejectedInBatch: string[] = [];
    const batchUnique = withHashes.filter(({ item, dedup_hash }) => {
      if (seenInBatch.has(dedup_hash)) {
        rejectedInBatch.push(item.hook);
        return false;
      }
      seenInBatch.add(dedup_hash);
      return true;
    });

    const allHashes = batchUnique.map((b) => b.dedup_hash);
    const { data: existingRows, error: existingErr } = await svc
      .from('autoposter_posts')
      .select('dedup_hash')
      .in('dedup_hash', allHashes);
    if (existingErr) return j({ error: existingErr.message }, 500);
    const existingHashes = new Set((existingRows ?? []).map((r) => r.dedup_hash as string));

    const rejectedAsExistingDuplicate: string[] = [];
    const toInsert = batchUnique.filter(({ item, dedup_hash }) => {
      if (existingHashes.has(dedup_hash)) {
        rejectedAsExistingDuplicate.push(item.hook);
        return false;
      }
      return true;
    });

    if (toInsert.length === 0) {
      return j({
        success: true,
        inserted_count: 0,
        rejected_duplicate_in_batch: rejectedInBatch,
        rejected_existing_duplicate: rejectedAsExistingDuplicate,
      });
    }

    const rows = toInsert.map(({ item, dedup_hash }) => ({
      post_date: item.post_date,
      hook: item.hook,
      content_brief: item.content_brief,
      post_type: item.post_type ?? null,
      visual_type: item.visual_type ?? null,
      cta: item.cta ?? null,
      hashtags: item.hashtags ?? [],
      status: 'draft',
      source: 'external_seed',
      dedup_hash,
    }));

    // INSERT-only -- never upsert, never touches an existing row. See header.
    const { data: inserted, error: insertErr } = await svc
      .from('autoposter_posts')
      .insert(rows)
      .select('id, post_date, hook');
    if (insertErr) return j({ error: insertErr.message }, 500);

    return j({
      success: true,
      inserted_count: inserted?.length ?? 0,
      inserted,
      rejected_duplicate_in_batch: rejectedInBatch,
      rejected_existing_duplicate: rejectedAsExistingDuplicate,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return j({ error: message }, 500);
  }
});
