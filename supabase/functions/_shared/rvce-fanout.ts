/**
 * RVCE fan-out engine — Phase 1B.
 *
 * Per analysis: for each of 12 canonical variables, fan out N parallel
 * `deepseek-chat` calls (N = RVCE_OBS_CAP[tier]) with response_format=json_object
 * to gather independent web-style observations, then ONE DeepSeek calibration
 * call aggregates the per-variable evidence into
 * { p25, p50, p75, status, discrepancy_pct, confidence }.
 *
 * Cached by (variable, business_type, location, tier_cap) in `rvce_cache`
 * for 24h. This is the production RVCE path; legacy Anthropic web search is
 * retained in rvce-validate only as dead-end fallback code and should not run
 * while DeepSeek is configured.
 */
import { callDeepseek } from './deepseek.ts';
import { logAiCall } from './ai-logger.ts';
import { addCost, assertCostBudget } from './cost-guard.ts';
import {
  buildRvceCacheKey,
  RVCE_FANOUT_CONCURRENCY,
  RVCE_OBS_CAP,
  type Tier,
} from './tier.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export interface FanoutObservation {
  source: string;
  snippet: string;
  metric_estimate: number;
  units: string;
  confidence: number;
  url?: string;
}

export interface VariableValidation {
  original_value: number;
  external_median: number | null;
  p25: number | null;
  p75: number | null;
  status: 'OK' | 'WARN' | 'OUTLIER' | 'NO_DATA';
  discrepancy_pct: number;
  confidence: number;
  notes: string;
  observation_count: number;
  observations: FanoutObservation[];
  cache_hit: boolean;
}

export interface FanoutContext {
  industry: string;
  city: string;
  country: string;
  business_model: string;
  /** Phase 2 — telemetry/cost-guard hooks. All optional, additive. */
  analysis_id?: string;
  user_id?: string | null;
  request_id?: string | null;
}

/** ─── pLimit: minimal concurrency limiter (no deps). ─────────────── */
function pLimit(concurrency: number) {
  const queue: Array<() => void> = [];
  let active = 0;
  const next = () => {
    active--;
    if (queue.length) queue.shift()!();
  };
  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const run = () => {
        active++;
        fn().then(resolve, reject).finally(next);
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
}

/** ─── Cache (best-effort, never throws into the engine). ─────────── */
async function cacheGet(key: string): Promise<FanoutObservation[] | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/rvce_cache?cache_key=eq.${encodeURIComponent(key)}&select=evidence,expires_at&limit=1`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      },
    );
    if (!r.ok) return null;
    const rows = (await r.json()) as Array<{ evidence: FanoutObservation[]; expires_at: string }>;
    if (!rows.length) return null;
    if (new Date(rows[0].expires_at).getTime() < Date.now()) return null;
    return rows[0].evidence;
  } catch {
    return null;
  }
}

async function cachePut(
  key: string,
  evidence: FanoutObservation[],
  variable: string,
  business_type: string,
  location: string,
  tier_cap: number,
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rvce_cache?on_conflict=cache_key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        cache_key: key,
        variable,
        business_type,
        location,
        tier_cap,
        evidence,
        observation_count: evidence.length,
      }),
    });
  } catch {
    /* best-effort */
  }
}

/** ─── DeepSeek single observation call. ──────────────────────────── */
async function fetchOneObservation(
  variable: string,
  ctx: FanoutContext,
  variantIdx: number,
): Promise<FanoutObservation | null> {
  const metricLabel = variable.replace(/_/g, ' ');
  const isPct = variable.includes('pct') || variable.includes('ratio');
  const units = isPct ? (variable.includes('ratio') ? 'x' : '%') : 'USD';
  const sys =
    'You are a financial benchmark researcher with strong web knowledge. ' +
    'Return ONE realistic, citation-style observation as strict JSON only.';
  const user = `Find ONE benchmark observation for "${metricLabel}" for a ${ctx.industry} business in ${ctx.city}, ${ctx.country} (${ctx.business_model || 'unspecified model'}).
Variant seed: ${variantIdx}. Vary your source / angle from prior calls (industry report, government data, trade association, market study, news, SaaS benchmark).

Return strict JSON ONLY (no prose, no markdown):
{
  "source": "publisher or report name",
  "snippet": "1-2 sentence quote/paraphrase grounding the number",
  "metric_estimate": <number>,
  "units": "${units}",
  "confidence": <0-1>,
  "url": "https://... if known else empty string"
}
Rules:
- For monthly metrics, convert annual → monthly (÷12).
- For percentages, return the number (e.g., 62 for 62%).
- If you genuinely cannot ground a number, return {"source":"","snippet":"","metric_estimate":0,"units":"${units}","confidence":0,"url":""}.`;

  const result = await callDeepseek(
    {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.85,
      max_tokens: 400,
    },
    25_000,
  );

  if (!result.ok || !result.data) return null;
  const choices = (result.data.choices as Array<{ message?: { content?: string } }> | undefined) ?? [];
  const raw = choices[0]?.message?.content ?? '';
  try {
    const parsed = JSON.parse(raw) as FanoutObservation;
    if (!parsed || typeof parsed.metric_estimate !== 'number' || !isFinite(parsed.metric_estimate)) return null;
    if (parsed.metric_estimate <= 0) return null;
    return {
      source: String(parsed.source ?? '').slice(0, 200),
      snippet: String(parsed.snippet ?? '').slice(0, 400),
      metric_estimate: Number(parsed.metric_estimate),
      units: String(parsed.units ?? units),
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.5))),
      url: String(parsed.url ?? ''),
    };
  } catch {
    return null;
  }
}

/** ─── Public: fan-out for a single variable. ─────────────────────── */
export async function fanoutVariable(
  variable: string,
  originalValue: number,
  ctx: FanoutContext,
  tier: Tier,
): Promise<VariableValidation> {
  const cap = RVCE_OBS_CAP[tier];
  const cacheKey = buildRvceCacheKey({
    variable,
    business_type: ctx.industry || ctx.business_model,
    location: ctx.city,
    tier_cap: cap,
  });

  let observations: FanoutObservation[] | null = await cacheGet(cacheKey);
  let cacheHit = !!observations;

  if (!observations) {
    const limit = pLimit(RVCE_FANOUT_CONCURRENCY);
    const tasks = Array.from({ length: cap }, (_, i) =>
      limit(async () => {
        // Phase 2 — cost guard: stop scheduling new calls once ceiling hit.
        if (ctx.analysis_id && !assertCostBudget(ctx.analysis_id, 0.001)) return null;
        const obs = await fetchOneObservation(variable, ctx, i);
        // ~$0.001 per deepseek-chat fan-out call; book it whether or not it
        // returned a valid observation (we still paid for the request).
        if (ctx.analysis_id) addCost(ctx.analysis_id, 0.001);
        return obs;
      }),
    );
    const settled = await Promise.all(tasks);
    observations = settled.filter((o): o is FanoutObservation => !!o);
    if (observations.length >= 5) {
      // only cache "good" runs
      cachePut(
        cacheKey,
        observations,
        variable,
        ctx.industry || ctx.business_model || '',
        ctx.city || '',
        cap,
      ).catch(() => {});
    }
  } else if (observations.length > cap) {
    // Slice cached evidence down to the user's tier cap.
    observations = observations.slice(0, cap);
  }

  // Phase 2 — single roll-up telemetry row per (analysis, variable). The
  // RvceFanoutTile groups by metadata.cache_hit to derive hit rate.
  if (ctx.analysis_id) {
    logAiCall({
      analysis_id: ctx.analysis_id,
      user_id: ctx.user_id ?? null,
      request_id: ctx.request_id ?? null,
      task: 'other',
      provider: 'deepseek',
      model: 'deepseek-chat',
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: cacheHit ? 0 : (observations?.length ?? 0) * 0.001,
      latency_ms: 0,
      ok: (observations?.length ?? 0) >= 3,
      metadata: {
        kind: 'rvce_fanout',
        variable,
        tier,
        cap,
        cache_hit: cacheHit,
        observation_count: observations?.length ?? 0,
      },
    }).catch(() => {});
  }

  if (!observations || observations.length < 3) {
    return {
      original_value: originalValue,
      external_median: null,
      p25: null,
      p75: null,
      status: 'NO_DATA',
      discrepancy_pct: 0,
      confidence: 0,
      notes: 'Fan-out collected insufficient observations.',
      observation_count: observations?.length ?? 0,
      observations: observations ?? [],
      cache_hit: cacheHit,
    };
  }

  const values = observations.map((o) => o.metric_estimate).sort((a, b) => a - b);
  const n = values.length;
  const median = n % 2 === 0 ? (values[n / 2 - 1] + values[n / 2]) / 2 : values[Math.floor(n / 2)];
  const p25 = values[Math.max(0, Math.floor(n * 0.25))];
  const p75 = values[Math.min(n - 1, Math.floor(n * 0.75))];
  const denom = Math.max(1e-6, Math.abs(median));
  const discrepancy_pct = ((originalValue - median) / denom) * 100;
  const abs = Math.abs(discrepancy_pct);
  const status: VariableValidation['status'] = abs < 25 ? 'OK' : abs < 60 ? 'WARN' : 'OUTLIER';
  const meanConf = observations.reduce((s, o) => s + (o.confidence || 0.5), 0) / n;
  const confidence = Math.min(1, 0.4 + meanConf * 0.4 + Math.min(0.2, n / cap / 5));

  return {
    original_value: originalValue,
    external_median: round(median),
    p25: round(p25),
    p75: round(p75),
    status,
    discrepancy_pct: round(discrepancy_pct),
    confidence: round(confidence),
    notes:
      status === 'OK'
        ? `Aligned with ${n} fan-out observations (median ${round(median)}).`
        : status === 'WARN'
        ? `Borderline: ${round(abs)}% from median of ${n} observations.`
        : `${round(abs)}% off median of ${n} observations — likely outlier.`,
    observation_count: n,
    observations,
    cache_hit: cacheHit,
  };
}

/** ─── Optional: single DeepSeek calibration over all vars. ── */
export async function calibrateWithDeepSeek(
  perVariable: Record<string, VariableValidation>,
  coreMetrics: Record<string, number>,
): Promise<Record<string, VariableValidation>> {
  // Compact summary so calibration never sees raw snippets (cost guard).
  const summary = Object.fromEntries(
    Object.entries(perVariable).map(([k, v]) => [
      k,
      {
        original: v.original_value,
        median: v.external_median,
        p25: v.p25,
        p75: v.p75,
        n: v.observation_count,
        status: v.status,
        discrepancy_pct: v.discrepancy_pct,
      },
    ]),
  );
  const sys =
    'You are a financial reality-check calibrator. Adjust per-variable status/confidence using cross-variable coherence. Return strict JSON only.';
  const user = `Per-variable evidence (medians, IQR, status, discrepancy%):\n${JSON.stringify(summary)}\nCore metrics:\n${JSON.stringify(coreMetrics)}\n\nReturn STRICT JSON: {"variables": {"<name>": {"status":"OK|WARN|OUTLIER|NO_DATA","confidence":0..1,"notes":"<=160 chars"}}}. Do NOT invent new medians.`;

  try {
    const r = await callDeepseek(
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1200,
      },
      20_000,
    );
    if (!r.ok || !r.data) return perVariable;
    const choices = (r.data.choices as Array<{ message?: { content?: string } }> | undefined) ?? [];
    const text = choices[0]?.message?.content ?? '';
    const parsed = JSON.parse(text) as {
      variables?: Record<string, { status?: VariableValidation['status']; confidence?: number; notes?: string }>;
    };
    const out: Record<string, VariableValidation> = { ...perVariable };
    for (const [k, v] of Object.entries(parsed.variables ?? {})) {
      if (!out[k]) continue;
      if (v.status) out[k].status = v.status;
      if (typeof v.confidence === 'number') out[k].confidence = round(Math.max(0, Math.min(1, v.confidence)));
      if (typeof v.notes === 'string') out[k].notes = v.notes.slice(0, 200);
    }
    return out;
  } catch {
    return perVariable;
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
