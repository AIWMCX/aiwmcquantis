/**
 * Analysis Event Logger
 * ---------------------
 * Writes to public.analysis_logs and public.reconciliation_log so that the
 * `aggregate-quality-metrics` cron has real data to roll up.
 *
 * NEVER throws — observability must not break the analysis flow.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export type AnalysisEventType =
  | 'analysis_complete'
  | 'engine_error'
  | 'ai_consensus'
  | 'benchmark_used'
  | 'performance_warning'
  | 'reconciliation';

export type AnalysisEventSeverity = 'info' | 'warning' | 'error';

export interface LogAnalysisEventInput {
  analysis_id: string;
  user_id?: string | null;
  event_type: AnalysisEventType;
  severity?: AnalysisEventSeverity;
  payload?: Record<string, unknown>;
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

export async function logAnalysisEvent(input: LogAnalysisEventInput): Promise<void> {
  try {
    const admin = getAdmin();
    if (!admin) return;
    await admin.from('analysis_logs').insert({
      analysis_id: input.analysis_id,
      user_id: input.user_id ?? null,
      event_type: input.event_type,
      severity: input.severity ?? 'info',
      payload: input.payload ?? {},
    });
  } catch (err) {
    console.warn('[analysis-event-logger] insert failed:', (err as Error)?.message);
  }
}

export interface LogReconciliationInput {
  run_id: string;
  analysis_id?: string | null;
  user_id?: string | null;
  reconciled: boolean;
  checks_json?: Record<string, unknown>;
  summary?: string | null;
}

export async function logReconciliation(input: LogReconciliationInput): Promise<void> {
  try {
    const admin = getAdmin();
    if (!admin) return;
    await admin.from('reconciliation_log').insert({
      run_id: input.run_id,
      analysis_id: input.analysis_id ?? null,
      user_id: input.user_id ?? null,
      reconciled: input.reconciled,
      checks_json: input.checks_json ?? {},
      summary: input.summary ?? null,
    });
  } catch (err) {
    console.warn('[analysis-event-logger] reconciliation insert failed:', (err as Error)?.message);
  }
}
