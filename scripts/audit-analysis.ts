/**
 * Phase 6 — End-to-end audit harness for AIWMC Quantis.
 *
 * Picks a recent analysis (or one passed via --id <uuid>) and asserts:
 *   1. analyses.result is populated
 *   2. result.narrator (or result.narrative) has content
 *   3. all 5 forensic panel keys exist:
 *      panels.dcfPanel | irrPanel | runwayPanel | sensitivityPanel | unitEconPanel
 *   4. RVCE block has at least 1 variable with observation_count >= 1
 *   5. PDF export size > 0 (when --pdf is passed; otherwise skipped)
 *
 * Exit code 0 on success, 1 on any failure.  Designed for nightly cron via
 * GitHub Actions; on failure, post to alert-webhook (env: ALERT_WEBHOOK_URL).
 *
 * Run locally:
 *   bun run scripts/audit-analysis.ts --id <analysis-uuid>
 *
 * CI:
 *   bun run scripts/audit-analysis.ts            # picks latest of last 24h
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? '';
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL ?? '';

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('audit-analysis: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(2);
}

const args = process.argv.slice(2);
const idIdx = args.indexOf('--id');
const explicitId = idIdx !== -1 ? args[idIdx + 1] : undefined;
const checkPdf = args.includes('--pdf');

interface Failure {
  check: string;
  detail: string;
}

async function main(): Promise<void> {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const failures: Failure[] = [];

  // 1. pick analysis
  let analysis: any;
  if (explicitId) {
    const { data, error } = await sb.from('analyses').select('*').eq('id', explicitId).maybeSingle();
    if (error || !data) {
      console.error(`Analysis ${explicitId} not found:`, error?.message);
      process.exit(1);
    }
    analysis = data;
  } else {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await sb
      .from('analyses')
      .select('*')
      .gte('created_at', since)
      .not('result', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      console.error('No analyses in last 24h:', error?.message);
      process.exit(1);
    }
    analysis = data;
  }

  console.log(`audit-analysis: id=${analysis.id} created=${analysis.created_at}`);
  const result = analysis.result ?? {};

  // 2. narrator present
  const narrator = result.narrator ?? result.narrative ?? result.summary;
  if (!narrator || (typeof narrator === 'string' && narrator.length < 80)) {
    failures.push({ check: 'narrator', detail: `missing or <80 chars: ${typeof narrator}` });
  }

  // 3. five forensic panels
  const panels = result.forensic_panels ?? result.panels ?? {};
  const required = ['dcfPanel', 'irrPanel', 'runwayPanel', 'sensitivityPanel', 'unitEconPanel'];
  const missing = required.filter((k) => !panels[k]);
  if (missing.length) {
    failures.push({ check: 'forensic_panels', detail: `missing: ${missing.join(', ')}` });
  }

  // 4. RVCE block with observation
  const rvce = result.rvce_validation ?? result.rvce ?? null;
  if (!rvce || typeof rvce !== 'object') {
    failures.push({ check: 'rvce_block', detail: 'rvce_validation missing on result' });
  } else {
    const vars = rvce.per_variable ?? rvce.variables ?? {};
    const counts = Object.values(vars).map((v: any) => v?.observation_count ?? 0);
    if (!counts.some((n) => Number(n) >= 1)) {
      failures.push({
        check: 'rvce_observations',
        detail: `no variable has observation_count >= 1 (had ${counts.length} vars)`,
      });
    }
  }

  // 5. optional PDF size
  if (checkPdf) {
    try {
      const url = `${SUPABASE_URL}/functions/v1/pdf-generator`;
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({ analysis_id: analysis.id }),
        signal: AbortSignal.timeout(60_000),
      });
      const buf = await r.arrayBuffer();
      if (!r.ok || buf.byteLength < 5000) {
        failures.push({
          check: 'pdf',
          detail: `status=${r.status} size=${buf.byteLength}`,
        });
      } else {
        console.log(`pdf ok: ${buf.byteLength} bytes`);
      }
    } catch (err) {
      failures.push({ check: 'pdf', detail: (err as Error).message });
    }
  }

  if (!failures.length) {
    console.log('audit-analysis: ALL CHECKS PASSED');
    process.exit(0);
  }

  console.error('audit-analysis: FAILURES');
  for (const f of failures) console.error(` ✗ ${f.check}: ${f.detail}`);

  if (ALERT_WEBHOOK_URL) {
    try {
      await fetch(ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'audit-analysis',
          analysis_id: analysis.id,
          failures,
          ts: new Date().toISOString(),
        }),
      });
    } catch {
      /* best-effort */
    }
  }

  process.exit(1);
}

main().catch((err) => {
  console.error('audit-analysis crashed:', err);
  process.exit(2);
});
