/**
 * growth-sync: GA4 + Search Console (+ optional Microsoft Clarity) ->
 * public.ext_metrics_daily, one public.ext_sync_runs row per source per run.
 * Read by /admin/growth next to the first-party Supabase funnel.
 *
 * Callers:
 *   * pg_cron 'growth-sync-daily' (13:15 UTC, x-cron-secret from Vault) -> mode 'daily'
 *   * an admin from /admin/growth (user JWT)  -> 'daily' or 'backfill' {from, to}
 *
 * Secrets (Supabase edge secrets, never in git):
 *   GOOGLE_SERVICE_ACCOUNT_JSON  service-account JSON key (GA4 Viewer + GSC Full user)
 *   GA4_PROPERTY_ID              default 520326058 (history property, G-NZE7RGVNEN)
 *   GSC_SITE_URL                 default sc-domain:aiwmcquantis.com
 *   CLARITY_API_TOKEN            optional; Clarity is skipped when unset
 *   CRON_SECRET                  shared pg_cron secret
 *
 * Read-only on Google/Microsoft. Idempotent: rows upsert on
 * (source, day, report, dims_key); rows of a re-fetched range that the new
 * fetch no longer returns (e.g. a page that fell out of the top 50) are deleted.
 * A failure in one source never stops the others.
 */
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { maybeHealthResponse } from '../_shared/health.ts';
import { toIsoDay } from '../_shared/growth/dates.ts';
import { dedupeRows, type GrowthSource, type MetricRow } from '../_shared/growth/rows.ts';
import { getGoogleAccessToken } from '../_shared/growth/google-auth.ts';
import { GA4_DEFAULT_PROPERTY_ID, GA4_REPORTS, fetchGa4Report } from '../_shared/growth/ga4.ts';
import { GSC_DEFAULT_SITE_URL, GSC_REPORTS, fetchGscReport } from '../_shared/growth/gsc.ts';
import { fetchClarity } from '../_shared/growth/clarity.ts';
import { parseMode, planRun, type SourcePlan, type SyncMode } from '../_shared/growth/plan.ts';

const FUNCTION_NAME = 'growth-sync';
const FUNCTION_VERSION = '1.0.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Stop starting new month chunks after this long; the caller resumes from next_from. */
const TIME_BUDGET_MS = 110_000;
const UPSERT_BATCH = 500;

type Status = 'ok' | 'partial' | 'error' | 'skipped' | 'not_configured';

interface SourceResult {
  status: Status;
  rows_upserted: number;
  error?: string;
  next_from?: string;
  details: Record<string, unknown>;
}

async function upsertRows(svc: SupabaseClient, rows: MetricRow[], fetchedAt: string): Promise<number> {
  const clean = dedupeRows(rows);
  for (let i = 0; i < clean.length; i += UPSERT_BATCH) {
    const batch = clean.slice(i, i + UPSERT_BATCH).map((r) => ({ ...r, fetched_at: fetchedAt }));
    const { error } = await svc.from('ext_metrics_daily').upsert(batch, { onConflict: 'source,day,report,dims_key' });
    if (error) throw new Error(`upsert ext_metrics_daily: ${error.message}`);
  }
  return clean.length;
}

/** Remove rows in the re-fetched range that this run did not write. */
async function pruneStale(
  svc: SupabaseClient, source: GrowthSource, report: string, from: string, to: string, fetchedAt: string,
): Promise<void> {
  const { error } = await svc.from('ext_metrics_daily').delete()
    .eq('source', source).eq('report', report)
    .gte('day', from).lte('day', to)
    .lt('fetched_at', fetchedAt);
  if (error) throw new Error(`prune ext_metrics_daily: ${error.message}`);
}

async function startRun(svc: SupabaseClient, mode: SyncMode, source: GrowthSource): Promise<string | null> {
  const { data, error } = await svc.from('ext_sync_runs')
    .insert({ mode, source, status: 'running' }).select('id').single();
  if (error) {
    console.error(`[${FUNCTION_NAME}] ext_sync_runs insert failed`, error.message);
    return null;
  }
  return (data as { id: string }).id;
}

async function finishRun(svc: SupabaseClient, id: string | null, r: SourceResult): Promise<void> {
  if (!id) return;
  const { error } = await svc.from('ext_sync_runs').update({
    finished_at: new Date().toISOString(),
    status: r.status,
    rows_upserted: r.rows_upserted,
    error: r.error ?? null,
    details: { ...r.details, ...(r.next_from ? { next_from: r.next_from } : {}) },
  }).eq('id', id);
  if (error) console.error(`[${FUNCTION_NAME}] ext_sync_runs update failed`, error.message);
}

/**
 * Run every report of one Google source over the plan's month chunks.
 * One failed report is recorded and the rest still run.
 */
async function runGoogleSource<S extends { report: string }>(
  svc: SupabaseClient,
  source: 'ga4' | 'gsc',
  plan: SourcePlan,
  specs: readonly S[],
  fetchOne: (spec: S, from: string, to: string) => Promise<{ rows: MetricRow[]; truncated: boolean; quality?: unknown }>,
  fetchedAt: string,
  deadline: number,
): Promise<SourceResult> {
  const details: Record<string, unknown> = { chunks: plan.chunks.length, range: plan.chunks.length ? [plan.chunks[0].from, plan.chunks[plan.chunks.length - 1].to] : null };
  const errors: string[] = [];
  const quality: Record<string, unknown> = {};
  const truncatedReports: string[] = [];
  let upserted = 0;
  let nextFrom: string | undefined;

  for (const chunk of plan.chunks) {
    if (Date.now() > deadline) {
      nextFrom = chunk.from;
      break;
    }
    for (const spec of specs) {
      try {
        const res = await fetchOne(spec, chunk.from, chunk.to);
        upserted += await upsertRows(svc, res.rows, fetchedAt);
        if (res.truncated) truncatedReports.push(`${spec.report}@${chunk.from}`);
        else await pruneStale(svc, source, spec.report, chunk.from, chunk.to, fetchedAt);
        if (res.quality) quality[`${spec.report}@${chunk.from}`] = res.quality;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
  }

  if (Object.keys(quality).length) details.quality = quality;
  if (truncatedReports.length) details.truncated = truncatedReports;
  const total = plan.chunks.length * specs.length;
  const status: Status = errors.length === 0 && !nextFrom
    ? 'ok'
    : errors.length >= total ? 'error' : 'partial';
  return {
    status,
    rows_upserted: upserted,
    error: errors.length ? errors.slice(0, 5).join(' | ').slice(0, 2000) : undefined,
    next_from: nextFrom,
    details,
  };
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

    // Same check as lead-intake / business-mail: the shared cron secret, or an admin JWT.
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

    const mode = parseMode(body.mode);
    if (!mode) return j({ error: "mode must be 'daily' or 'backfill'" }, 400);

    const started = Date.now();
    const deadline = started + TIME_BUDGET_MS;
    const fetchedAt = new Date(started).toISOString();
    const today = toIsoDay(new Date(started));
    const plan = planRun(mode, today, body);

    const propertyId = (Deno.env.get('GA4_PROPERTY_ID') || GA4_DEFAULT_PROPERTY_ID).trim();
    const siteUrl = (Deno.env.get('GSC_SITE_URL') || GSC_DEFAULT_SITE_URL).trim();
    const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    const clarityToken = Deno.env.get('CLARITY_API_TOKEN');

    const runIds = {
      ga4: await startRun(svc, mode, 'ga4'),
      gsc: await startRun(svc, mode, 'gsc'),
      clarity: await startRun(svc, mode, 'clarity'),
    };

    // One Google token for both sources (valid 1 hour).
    let googleToken: string | null = null;
    let googleError: string | null = null;
    const needGoogle = plan.ga4.chunks.length > 0 || plan.gsc.chunks.length > 0;
    if (needGoogle && saJson) {
      try {
        googleToken = await getGoogleAccessToken(saJson);
      } catch (e) {
        googleError = e instanceof Error ? e.message : String(e);
      }
    }

    const googleSource = async (
      source: 'ga4' | 'gsc', sp: SourcePlan, target: string,
    ): Promise<SourceResult> => {
      const details: Record<string, unknown> = { target };
      if (sp.skip || sp.chunks.length === 0) return { status: 'skipped', rows_upserted: 0, error: sp.skip, details };
      if (!saJson) return { status: 'not_configured', rows_upserted: 0, error: 'GOOGLE_SERVICE_ACCOUNT_JSON is not set', details };
      if (!googleToken) return { status: 'error', rows_upserted: 0, error: googleError ?? 'no Google token', details };
      const res = source === 'ga4'
        ? await runGoogleSource(svc, 'ga4', sp, GA4_REPORTS,
          (spec, from, to) => fetchGa4Report(spec, propertyId, from, to, googleToken!), fetchedAt, deadline)
        : await runGoogleSource(svc, 'gsc', sp, GSC_REPORTS,
          (spec, from, to) => fetchGscReport(spec, siteUrl, from, to, googleToken!), fetchedAt, deadline);
      return { ...res, details: { ...details, ...res.details } };
    };

    const claritySource = async (): Promise<SourceResult> => {
      if (!plan.clarity.call) return { status: 'skipped', rows_upserted: 0, error: plan.clarity.skip, details: {} };
      if (!clarityToken) return { status: 'not_configured', rows_upserted: 0, error: 'CLARITY_API_TOKEN is not set', details: {} };
      const rows = await fetchClarity(clarityToken, today);
      const n = await upsertRows(svc, rows, fetchedAt);
      return { status: 'ok', rows_upserted: n, details: { window: 'last 24h ending at sync time', day: rows[0]?.day ?? null } };
    };

    const settle = async (p: Promise<SourceResult>): Promise<SourceResult> => {
      try {
        return await p;
      } catch (e) {
        return { status: 'error', rows_upserted: 0, error: e instanceof Error ? e.message : String(e), details: {} };
      }
    };

    const [ga4, gsc, clarity] = await Promise.all([
      settle(googleSource('ga4', plan.ga4, propertyId)),
      settle(googleSource('gsc', plan.gsc, siteUrl)),
      settle(claritySource()),
    ]);

    await Promise.all([
      finishRun(svc, runIds.ga4, ga4),
      finishRun(svc, runIds.gsc, gsc),
      finishRun(svc, runIds.clarity, clarity),
    ]);

    const results = { ga4, gsc, clarity };
    const success = Object.values(results).every((r) => r.status !== 'error');
    return j({ success, mode, today, elapsed_ms: Date.now() - started, results });
  } catch (e) {
    return j({ success: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
