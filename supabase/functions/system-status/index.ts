/**
 * SYSTEM STATUS ENDPOINT (Phase 6 -- Public Trust Foundation, 2026-08-29)
 *
 * Public, unauthenticated. Computes real per-component health from live
 * data rather than a hand-maintained "everything is operational" list --
 * the gap the prior /status page had (charter 6.2). Aggregation logic
 * lives in status-core.ts (pure, unit-tested); this file only fetches the
 * raw signals and calls it.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeadersFor } from '../_shared/cors.ts';
import { maybeHealthResponse } from '../_shared/health.ts';
import {
  computeDatabaseSignal,
  computeAuthSignal,
  computeEngineSignal,
  computeAiNarrativeSignal,
  computeBillingSignal,
  computeBenchmarksSignal,
  computeReportGenerationSignal,
  overallStatus,
} from './status-core.ts';

const FUNCTION_NAME = 'system-status';
const FUNCTION_VERSION = '1.0.0';

serve(async (req) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Database
  const dbStart = Date.now();
  let dbOk = true;
  try {
    const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1);
    dbOk = !error;
  } catch {
    dbOk = false;
  }
  const dbLatency = Date.now() - dbStart;

  // Auth
  const authStart = Date.now();
  let authOk = true;
  try {
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    authOk = !error;
  } catch {
    authOk = false;
  }
  const authLatency = Date.now() - authStart;

  // Deterministic engine: latest invariant sweep
  let sweepStatus: 'completed' | 'failed' | 'interrupted' | null = null;
  let sweepAgeHours: number | null = null;
  let sweepViolationCount: number | null = null;
  try {
    const { data } = await supabase
      .from('financial_invariant_sweep_runs')
      .select('status, run_at, violation_count')
      .order('run_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      sweepStatus = data.status ?? 'completed';
      sweepAgeHours = (Date.now() - new Date(data.run_at).getTime()) / 3_600_000;
      sweepViolationCount = data.violation_count ?? null;
    }
  } catch {
    // leave null -> reported as unmonitored, not a false outage
  }

  // AI narrative: analyze-business AI calls in the last 2 hours
  let aiTotal = 0;
  let aiFailed = 0;
  try {
    const since = new Date(Date.now() - 2 * 3_600_000).toISOString();
    const { data } = await supabase
      .from('ai_calls')
      .select('ok, status')
      .eq('task', 'analyze-business')
      .gte('created_at', since)
      .limit(500);
    if (data) {
      aiTotal = data.length;
      aiFailed = data.filter((r: { ok: boolean; status: string | null }) => r.ok === false || r.status === 'failed').length;
    }
  } catch {
    // leave zeroed -> reported as "no calls in window"
  }

  // Billing: stripe webhook events in the last 24 hours
  let webhookTotal = 0;
  let webhookFailedOrPending = 0;
  try {
    const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const { data } = await supabase
      .from('stripe_webhook_events')
      .select('status')
      .gte('created_at', since)
      .limit(1000);
    if (data) {
      webhookTotal = data.length;
      webhookFailedOrPending = data.filter((r: { status: string | null }) => r.status === 'failed' || r.status === 'error').length;
    }
  } catch {
    // leave zeroed
  }

  // RVCE / benchmarks: sanity row count
  let benchmarkRowCount = 0;
  try {
    const { count } = await supabase.from('benchmark_master_core').select('id', { count: 'exact', head: true });
    benchmarkRowCount = count ?? 0;
  } catch {
    benchmarkRowCount = 0;
  }

  const signals = [
    computeDatabaseSignal({ ok: dbOk, latencyMs: dbLatency }),
    computeAuthSignal({ ok: authOk, latencyMs: authLatency }),
    computeEngineSignal({ status: sweepStatus, ageHours: sweepAgeHours, violationCount: sweepViolationCount }),
    computeAiNarrativeSignal({ total: aiTotal, failed: aiFailed }),
    computeBillingSignal({ total: webhookTotal, failedOrPending: webhookFailedOrPending }),
    computeBenchmarksSignal({ rowCount: benchmarkRowCount }),
    computeReportGenerationSignal(),
  ];

  const { data: incidents } = await supabase
    .from('status_incidents')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(20);

  return new Response(
    JSON.stringify({
      status: overallStatus(signals),
      checked_at: new Date().toISOString(),
      components: signals,
      incidents: incidents ?? [],
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    }
  );
});
