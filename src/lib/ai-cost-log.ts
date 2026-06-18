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
