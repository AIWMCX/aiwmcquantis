/**
 * self-learning-update
 * --------------------
 * Reads the last 30 days of analysis_self_learning + analysis_run_logs,
 * recomputes per-segment priors (sector|geo|model_type), generates prompt
 * hints from frequent issue codes, and inserts a new row into
 * public.quantis_learning_config — flipping the previous active row off.
 *
 * Triggers:
 *  - cron (nightly) via pg_cron net.http_post
 *  - admin manual invoke
 *
 * Always safe to re-run. Rollback = UPDATE quantis_learning_config SET
 * is_active=true WHERE version=<old> (handled by admin).
 */
import 'https://deno.land/std@0.224.0/dotenv/load.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface RunRow {
  analysis_id: string;
  sector: string | null;
  geo: string | null;
  model_type: string | null;
  financial_core: Record<string, unknown> | null;
  numeric_consistency: number | null;
  benchmark_alignment: number | null;
  mc_stability: number | null;
  rvce_agreement: number | null;
  global_status: string;
  issues: Array<{ code: string; severity: string }>;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

function segmentKey(sector: string | null, geo: string | null, model: string | null): string {
  return `${(sector || 'unknown').toLowerCase()}|${(geo || 'unknown').toLowerCase()}|${(model || 'unknown').toLowerCase()}`;
}

function buildPriors(rows: RunRow[]) {
  const groups = new Map<string, { gm: number[]; nm: number[]; lc: number[]; cp: number[]; issueCodes: Map<string, number>; qualityScores: number[] }>();
  for (const r of rows) {
    const key = segmentKey(r.sector, r.geo, r.model_type);
    let g = groups.get(key);
    if (!g) {
      g = { gm: [], nm: [], lc: [], cp: [], issueCodes: new Map(), qualityScores: [] };
      groups.set(key, g);
    }
    const fc = r.financial_core || {};
    let gm = num(fc.grossMargin); if (gm !== null && Math.abs(gm) > 1.5) gm = gm / 100;
    let nm = num(fc.netMargin);   if (nm !== null && Math.abs(nm) > 1.5) nm = nm / 100;
    const lc = num(fc.ltvToCac);
    const cp = num(fc.cacPaybackMonths);
    if (gm !== null) g.gm.push(gm);
    if (nm !== null) g.nm.push(nm);
    if (lc !== null) g.lc.push(lc);
    if (cp !== null) g.cp.push(cp);
    for (const iss of r.issues || []) {
      g.issueCodes.set(iss.code, (g.issueCodes.get(iss.code) || 0) + 1);
    }
    const scores = [r.numeric_consistency, r.benchmark_alignment, r.mc_stability, r.rvce_agreement]
      .filter((s): s is number => typeof s === 'number');
    if (scores.length) g.qualityScores.push(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  const priors: Record<string, unknown> = {};
  const promptHints: Record<string, string[]> = {};
  const qualityMetrics: Record<string, { n: number; meanScore: number }> = {};

  for (const [key, g] of groups) {
    if (g.gm.length + g.nm.length + g.lc.length + g.cp.length === 0) continue;
    const dist = (arr: number[]) => {
      if (arr.length < 5) return null;
      const s = [...arr].sort((a, b) => a - b);
      return { p25: percentile(s, 0.25), p50: percentile(s, 0.5), p75: percentile(s, 0.75), n: arr.length };
    };
    const segPriors: Record<string, unknown> = {};
    const gmd = dist(g.gm); if (gmd) segPriors.gross_margin = gmd;
    const nmd = dist(g.nm); if (nmd) segPriors.net_margin = nmd;
    const lcd = dist(g.lc); if (lcd) segPriors.ltv_cac = lcd;
    const cpd = dist(g.cp); if (cpd) segPriors.cac_payback_months = cpd;
    if (Object.keys(segPriors).length) priors[key] = segPriors;

    // Top 3 frequent issue codes → hints
    const topIssues = [...g.issueCodes.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 3);
    const hints: string[] = [];
    for (const [code, count] of topIssues) {
      if (count < 3) continue;
      hints.push(`Segment "${key}": issue ${code} appeared in ${count} recent runs — apply stricter check.`);
    }
    if (hints.length) promptHints[key] = hints;

    if (g.qualityScores.length) {
      qualityMetrics[key] = {
        n: g.qualityScores.length,
        meanScore: g.qualityScores.reduce((a, b) => a + b, 0) / g.qualityScores.length,
      };
    }
  }

  return { priors, promptHints, qualityMetrics };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Pull last 30 days
    const since = new Date(Date.now() - 30 * 86400e3).toISOString();
    const { data: rows, error } = await admin
      .from('analysis_run_logs')
      .select('analysis_id,sector,geo,model_type,financial_core, asl:analysis_self_learning!inner(numeric_consistency,benchmark_alignment,mc_stability,rvce_agreement,global_status,issues)')
      .gte('created_at', since)
      .limit(10000);

    if (error) throw error;

    const flat: RunRow[] = (rows || []).map((r: any) => ({
      analysis_id: r.analysis_id,
      sector: r.sector,
      geo: r.geo,
      model_type: r.model_type,
      financial_core: r.financial_core,
      numeric_consistency: r.asl?.numeric_consistency ?? null,
      benchmark_alignment: r.asl?.benchmark_alignment ?? null,
      mc_stability: r.asl?.mc_stability ?? null,
      rvce_agreement: r.asl?.rvce_agreement ?? null,
      global_status: r.asl?.global_status ?? 'partial',
      issues: r.asl?.issues ?? [],
    }));

    const { priors, promptHints, qualityMetrics } = buildPriors(flat);

    // 2. Compare to previous active config — guard against quality regression
    const { data: prevActive } = await admin
      .from('quantis_learning_config')
      .select('version, quality_metrics')
      .eq('is_active', true)
      .maybeSingle();

    let qualityDelta = 0;
    if (prevActive?.quality_metrics) {
      const prev = prevActive.quality_metrics as Record<string, { meanScore: number }>;
      const prevMean = Object.values(prev).reduce((a, b) => a + (b.meanScore || 0), 0) / Math.max(1, Object.keys(prev).length);
      const newMean = Object.values(qualityMetrics).reduce((a, b) => a + b.meanScore, 0) / Math.max(1, Object.keys(qualityMetrics).length);
      qualityDelta = newMean - prevMean;
    }

    // 3. Insert new row; if quality regressed >5%, leave inactive (rollback-safe)
    const willActivate = qualityDelta >= -0.05;
    if (willActivate) {
      await admin.from('quantis_learning_config').update({ is_active: false }).eq('is_active', true);
    }
    const { data: inserted, error: insertErr } = await admin
      .from('quantis_learning_config')
      .insert({
        is_active: willActivate,
        created_by: 'self-learning-update',
        segments_count: Object.keys(priors).length,
        priors,
        prompt_hints: promptHints,
        quality_metrics: qualityMetrics,
        notes: `Δ quality vs prev: ${qualityDelta.toFixed(3)}; rows=${flat.length}`,
      })
      .select('version')
      .single();

    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({
        ok: true,
        version: inserted?.version,
        activated: willActivate,
        segments: Object.keys(priors).length,
        hints: Object.keys(promptHints).length,
        rows_analyzed: flat.length,
        quality_delta: qualityDelta,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[self-learning-update] failed:', err);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
