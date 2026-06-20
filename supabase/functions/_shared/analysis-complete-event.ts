/**
 * analysis_complete observability emitter — see migration
 * 20260619180000_rvce_telemetry_and_analysis_event.sql and audit 2026-06-20 D7.3.
 *
 * One canonical event per completed analysis. Every dashboard query
 * (ok-rate, cost/analysis, p50 latency, RVCE coverage) reads from
 * analysis_complete_events — not from analyses or ai_calls.
 *
 * Emitter is fire-and-forget: a failed event MUST NOT cause an otherwise-good
 * analysis to return non-200. Log the error, continue.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export interface AnalysisCompleteEvent {
  analysis_id: string | null;
  user_id: string | null;
  tier: 'free' | 'plus' | 'pro';
  ok: boolean;
  degraded?: boolean;
  reason?: string | null;
  layer_latency_ms?: Record<string, number>;
  benchmark_match_type?: 'exact' | 'sector' | 'fallback' | 'engine_fallback' | 'none' | null;
  tokens_input?: number;
  tokens_output?: number;
  cost_usd?: number;
  rvce_status?: 'observed' | 'no_data' | 'unavailable' | 'skipped' | null;
  rvce_observation_count?: number;
  total_latency_ms?: number | null;
}

let cachedClient: ReturnType<typeof createClient> | null = null;

function getServiceClient() {
  if (cachedClient) return cachedClient;
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !serviceKey) return null;
  cachedClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}

export async function emitAnalysisComplete(event: AnalysisCompleteEvent): Promise<void> {
  const client = getServiceClient();
  if (!client) {
    // No service role configured — silently skip rather than fail the analysis.
    console.warn('[analysis-complete] service client unavailable, skipping event');
    return;
  }
  try {
    const { error } = await client.from('analysis_complete_events').insert({
      analysis_id: event.analysis_id,
      user_id: event.user_id,
      tier: event.tier,
      ok: event.ok,
      degraded: event.degraded ?? false,
      reason: event.reason ?? null,
      layer_latency_ms: event.layer_latency_ms ?? {},
      benchmark_match_type: event.benchmark_match_type ?? null,
      tokens_input: event.tokens_input ?? 0,
      tokens_output: event.tokens_output ?? 0,
      cost_usd: event.cost_usd ?? 0,
      rvce_status: event.rvce_status ?? null,
      rvce_observation_count: event.rvce_observation_count ?? 0,
      total_latency_ms: event.total_latency_ms ?? null,
    });
    if (error) {
      console.warn('[analysis-complete] insert error:', error.message);
    }
  } catch (err) {
    console.warn('[analysis-complete] emit threw:', (err as Error).message);
  }
}
