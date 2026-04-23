/**
 * AI Call Logger
 * --------------
 * Persists every Anthropic / Lovable-Gateway call to `public.ai_calls`
 * for cost monitoring, abuse detection, and per-user accounting.
 *
 * Never throws — logging failures must never break the analysis flow.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export type AiCallProvider = 'anthropic' | 'lovable_gateway';
export type AiCallTask =
  | 'hybrid_validator'
  | 'industry_classifier'
  | 'risk_flags'
  | 'action_plan'
  | 'consensus_check'
  | 'narrator'
  | 'other';

export interface LogAiCallInput {
  user_id?: string | null;
  analysis_id?: string | null;
  task: AiCallTask;
  provider: AiCallProvider;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number;
  ok: boolean;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

let cachedClient: ReturnType<typeof createClient> | null = null;
function getAdmin() {
  if (cachedClient) return cachedClient;
  if (!SUPABASE_URL || !SERVICE_ROLE) return null;
  cachedClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export async function logAiCall(input: LogAiCallInput): Promise<void> {
  try {
    const admin = getAdmin();
    if (!admin) return;
    await admin.from('ai_calls').insert({
      user_id: input.user_id ?? null,
      analysis_id: input.analysis_id ?? null,
      task: input.task,
      provider: input.provider,
      model: input.model,
      input_tokens: Math.max(0, Math.round(input.input_tokens || 0)),
      output_tokens: Math.max(0, Math.round(input.output_tokens || 0)),
      cost_usd: Number((input.cost_usd || 0).toFixed(6)),
      latency_ms: Math.max(0, Math.round(input.latency_ms || 0)),
      ok: !!input.ok,
      error: input.error ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    // Never let logging break the request
    console.warn('[ai-logger] insert failed:', (err as Error)?.message);
  }
}
