/**
 * lead-intake: free, public lead sources -> commercial_prospects (2026-11-04).
 *
 *   * pg_cron daily (x-cron-secret) or an admin -> action "form_d": read the
 *     SEC EDGAR Form D filings of the last day(s), keep US operating companies
 *     raising $100k-$20M with a named executive, and insert them as
 *     discovered prospects in the "Form D funded owners" campaign, one batch
 *     per day. Then post a short digest to Slack if LEADS_SLACK_WEBHOOK_URL is set.
 *
 * Never sends email and never guesses an address: contact_channel stays null
 * until a verified address is added. Filters live in _shared/commercial/form-d.ts.
 */
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { maybeHealthResponse } from '../_shared/health.ts';
import {
  FORM_D_SEGMENT,
  filingsFromHits,
  parseFormDXml,
  prospectFromFormD,
  rejectReason,
  type EftsHit,
} from '../_shared/commercial/form-d.ts';

const FUNCTION_NAME = 'lead-intake';
const FUNCTION_VERSION = '1.0.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// SEC fair-access policy: identify the caller and stay under 10 requests a second.
const SEC_HEADERS = { 'User-Agent': 'AIWMC Quantis lead-intake hello@aiwmcquantis.com', Accept: 'application/json, text/xml' };
const SEC_GAP_MS = 150;
const CAMPAIGN_NAME = 'Form D funded owners';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

async function secFetch(url: string): Promise<Response> {
  const res = await fetch(url, { headers: SEC_HEADERS });
  await sleep(SEC_GAP_MS);
  return res;
}

// deno-lint-ignore no-explicit-any
type Svc = any;

async function campaignAndBatch(svc: Svc, day: string): Promise<{ campaignId: string; batchId: string }> {
  let { data: campaign } = await svc.from('commercial_campaigns').select('id').eq('name', CAMPAIGN_NAME).maybeSingle();
  if (!campaign) {
    const ins = await svc.from('commercial_campaigns').insert({ name: CAMPAIGN_NAME, segment: FORM_D_SEGMENT, status: 'draft' }).select('id').single();
    if (ins.error) throw new Error(`campaign: ${ins.error.message}`);
    campaign = ins.data;
  }
  const batchNumber = Number(day.replace(/-/g, ''));
  let { data: batch } = await svc.from('commercial_batches').select('id').eq('campaign_id', campaign.id).eq('batch_number', batchNumber).maybeSingle();
  if (!batch) {
    const ins = await svc.from('commercial_batches').insert({ campaign_id: campaign.id, batch_number: batchNumber, scheduled_date: day }).select('id').single();
    if (ins.error) throw new Error(`batch: ${ins.error.message}`);
    batch = ins.data;
  }
  return { campaignId: campaign.id, batchId: batch.id };
}

async function runFormD(svc: Svc, opts: { start: string; end: string; maxFetch: number }) {
  const hits: EftsHit[] = [];
  for (let from = 0; from < 1000; from += 100) {
    const res = await secFetch(`https://efts.sec.gov/LATEST/search-index?forms=D&dateRange=custom&startdt=${opts.start}&enddt=${opts.end}&from=${from}`);
    if (!res.ok) throw new Error(`EDGAR search ${res.status}`);
    const page = await res.json();
    const pageHits = (page?.hits?.hits ?? []) as EftsHit[];
    hits.push(...pageHits);
    if (pageHits.length < 100) break;
  }
  const filings = filingsFromHits(hits);

  const { data: existingRaw } = await svc.from('commercial_prospects').select('company_name');
  const existing = new Set(((existingRaw ?? []) as Array<{ company_name: string }>).map((r) => r.company_name.trim().toLowerCase()));

  const rejected: Record<string, number> = {};
  const rows: ReturnType<typeof prospectFromFormD>[] = [];
  let fetched = 0;
  for (const f of filings) {
    if (fetched >= opts.maxFetch) break;
    const res = await secFetch(f.xmlUrl);
    fetched++;
    if (!res.ok) { rejected.fetch_failed = (rejected.fetch_failed ?? 0) + 1; continue; }
    const details = parseFormDXml(await res.text());
    const reason = rejectReason(details);
    if (reason) { rejected[reason] = (rejected[reason] ?? 0) + 1; continue; }
    const row = prospectFromFormD(f, details);
    const key = row.company_name.trim().toLowerCase();
    if (existing.has(key)) { rejected.already_exists = (rejected.already_exists ?? 0) + 1; continue; }
    existing.add(key);
    rows.push(row);
  }

  let inserted = 0;
  if (rows.length > 0) {
    const { campaignId, batchId } = await campaignAndBatch(svc, opts.end);
    const { data, error } = await svc
      .from('commercial_prospects')
      .insert(rows.map((r) => ({ ...r, campaign_id: campaignId, batch_id: batchId })))
      .select('id');
    if (error) throw new Error(`insert: ${error.message}`);
    inserted = data?.length ?? 0;
    const { count } = await svc.from('commercial_prospects').select('id', { count: 'exact', head: true }).eq('batch_id', batchId);
    await svc.from('commercial_batches').update({ lead_count: count ?? 0 }).eq('id', batchId);
  }
  return { searched: hits.length, candidates: filings.length, fetched, inserted, rejected, sample: rows.slice(0, 5) };
}

async function postDigest(result: Awaited<ReturnType<typeof runFormD>>, range: string) {
  const url = Deno.env.get('LEADS_SLACK_WEBHOOK_URL');
  if (!url) return false;
  const lines = result.sample.map((r) => `• ${r.company_name}: ${r.contact_name}. ${r.observed_signals[0]}`);
  const text = [
    `*New funded-company leads (SEC Form D, ${range})*: ${result.inserted} added to Quantis, ${result.fetched} filings read.`,
    ...lines,
    result.inserted > 0 ? 'No email yet: each needs a verified address before it can be drafted. Admin: /admin/commercial' : '',
  ].filter(Boolean).join('\n');
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
  return res.ok;
}

Deno.serve(async (req) => {
  const health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (health) return health;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const j = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');

    const cronSecret = Deno.env.get('CRON_SECRET');
    const isCron = !!cronSecret && req.headers.get('x-cron-secret') === cronSecret;
    if (!isCron) {
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
      if (!token) return j({ error: 'Unauthorized' }, 401);
      const { data: userRes } = await svc.auth.getUser(token);
      if (!userRes?.user) return j({ error: 'Unauthorized' }, 401);
      const { data: roles } = await svc.from('user_roles').select('role').eq('user_id', userRes.user.id).eq('role', 'admin');
      if (!roles || roles.length === 0) return j({ error: 'Admin only' }, 403);
    }

    if (action !== 'form_d') return j({ error: 'unknown action' }, 400);

    const today = new Date();
    const end = /^\d{4}-\d{2}-\d{2}$/.test(String(body.end ?? '')) ? String(body.end) : isoDay(today);
    const start = /^\d{4}-\d{2}-\d{2}$/.test(String(body.start ?? '')) ? String(body.start) : isoDay(new Date(today.getTime() - 86_400_000));
    const maxFetch = Math.min(Math.max(Number(body.max_fetch ?? 150), 1), 250);

    const result = await runFormD(svc, { start, end, maxFetch });
    const digested = await postDigest(result, start === end ? end : `${start} to ${end}`).catch(() => false);
    return j({ success: true, start, end, ...result, slack: digested });
  } catch (e) {
    return j({ success: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
