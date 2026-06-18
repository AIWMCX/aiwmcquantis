/**
 * Per-call AI cost log (frontend read helper).
 *
 * Genesis Protocol P1 — gives admin pages a typed view into `ai_calls`
 * without re-deriving the schema everywhere. Writes happen exclusively in
 * the edge `_shared/ai-logger.ts`; this is read-only.
 */
import { supabase } from '@/integrations/supabase/client';

export interface AiCallRow {
  id: string;
  created_at: string;
  user_id: string | null;
  analysis_id: string | null;
  request_id: string | null;
  task: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number;
  ok: boolean;
  error: string | null;
}

export interface AiCostSummary {
  total_calls: number;
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  by_task: Record<string, { calls: number; cost_usd: number }>;
}

export interface EndpointStat {
  task: string;
  calls: number;
  ok_calls: number;
  error_calls: number;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
}

export type TimeRangeHours = 1 | 6 | 24 | 168 | 720;

/** Fetch all AI calls for a given analysis_id. Returns [] on any error. */
export async function getAiCallsForAnalysis(analysisId: string): Promise<AiCallRow[]> {
  if (!analysisId) return [];
  const { data, error } = await supabase
    .from('ai_calls')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data as unknown as AiCallRow[];
}

/**
 * Admin read — AI calls within the last N hours, optionally filtered by
 * task (edge-function name). Capped at 5,000 rows for UI responsiveness.
 */
export async function getAiCallsInRange(opts: {
  hours: number;
  task?: string | null;
  limit?: number;
}): Promise<AiCallRow[]> {
  const since = new Date(Date.now() - opts.hours * 3600_000).toISOString();
  let q = supabase
    .from('ai_calls')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(Math.min(opts.limit ?? 5_000, 5_000));
  if (opts.task && opts.task !== 'all') q = q.eq('task', opts.task);
  const { data, error } = await q;
  if (error || !data) return [];
  return data as unknown as AiCallRow[];
}

/** Distinct list of task / endpoint names seen in the last N hours. */
export async function listEndpoints(hours: number): Promise<string[]> {
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const { data, error } = await supabase
    .from('ai_calls')
    .select('task')
    .gte('created_at', since)
    .limit(5_000);
  if (error || !data) return [];
  const set = new Set<string>();
  for (const r of data as unknown as { task: string }[]) {
    if (r.task) set.add(r.task);
  }
  return [...set].sort();
}

/** Summarize cost + token usage for a set of AI calls. */
export function summarizeAiCalls(rows: AiCallRow[]): AiCostSummary {
  const summary: AiCostSummary = {
    total_calls: rows.length,
    total_cost_usd: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    by_task: {},
  };
  for (const r of rows) {
    summary.total_cost_usd += Number(r.cost_usd) || 0;
    summary.total_input_tokens += Number(r.input_tokens) || 0;
    summary.total_output_tokens += Number(r.output_tokens) || 0;
    const bucket = summary.by_task[r.task] ?? { calls: 0, cost_usd: 0 };
    bucket.calls += 1;
    bucket.cost_usd += Number(r.cost_usd) || 0;
    summary.by_task[r.task] = bucket;
  }
  // Round to USD-microcents for stable display.
  summary.total_cost_usd = Number(summary.total_cost_usd.toFixed(6));
  for (const k of Object.keys(summary.by_task)) {
    summary.by_task[k].cost_usd = Number(summary.by_task[k].cost_usd.toFixed(6));
  }
  return summary;
}

/** Per-endpoint stats with p95 latency. Pure; deterministic. */
export function summarizeByEndpoint(rows: AiCallRow[]): EndpointStat[] {
  const groups = new Map<string, AiCallRow[]>();
  for (const r of rows) {
    const arr = groups.get(r.task) ?? [];
    arr.push(r);
    groups.set(r.task, arr);
  }
  const out: EndpointStat[] = [];
  for (const [task, list] of groups) {
    const latencies = list
      .map((r) => Number(r.latency_ms) || 0)
      .sort((a, b) => a - b);
    const avg =
      latencies.reduce((s, n) => s + n, 0) / Math.max(1, latencies.length);
    const p95Idx = Math.min(
      latencies.length - 1,
      Math.floor(latencies.length * 0.95),
    );
    out.push({
      task,
      calls: list.length,
      ok_calls: list.filter((r) => r.ok).length,
      error_calls: list.filter((r) => !r.ok).length,
      cost_usd: Number(
        list.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0).toFixed(6),
      ),
      input_tokens: list.reduce((s, r) => s + (Number(r.input_tokens) || 0), 0),
      output_tokens: list.reduce(
        (s, r) => s + (Number(r.output_tokens) || 0),
        0,
      ),
      avg_latency_ms: Math.round(avg),
      p95_latency_ms: latencies[p95Idx] ?? 0,
    });
  }
  return out.sort((a, b) => b.cost_usd - a.cost_usd || b.calls - a.calls);
}
