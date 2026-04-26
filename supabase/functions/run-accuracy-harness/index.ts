/**
 * run-accuracy-harness — Nightly engine quality regression
 * --------------------------------------------------------
 * Pulls every active row from `golden_test_vectors`, invokes `analyze-business`
 * with its `input_data`, compares the engine output to `expected_ranges`, and
 * writes one row per vector to `accuracy_runs` so admins can chart drift.
 *
 * Authenticated by `x-cron-secret` (CRON_SECRET env var).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface ExpectedRange {
  min?: number;
  max?: number;
  target?: number;
}

/** Walk a JSON object using dot/bracket path: e.g. "financial_analysis.scenarios.base.net_margin". */
function getByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function compareMetric(
  actual: unknown,
  expected: ExpectedRange,
  tolerancePct: number,
): { passed: boolean; deviation_pct: number | null } {
  if (typeof actual !== 'number' || !Number.isFinite(actual)) {
    return { passed: false, deviation_pct: null };
  }
  if (expected.min != null && actual < expected.min) {
    const dev = ((expected.min - actual) / Math.max(1e-9, Math.abs(expected.min))) * 100;
    return { passed: false, deviation_pct: dev };
  }
  if (expected.max != null && actual > expected.max) {
    const dev = ((actual - expected.max) / Math.max(1e-9, Math.abs(expected.max))) * 100;
    return { passed: false, deviation_pct: dev };
  }
  if (expected.target != null) {
    const dev = (Math.abs(actual - expected.target) / Math.max(1e-9, Math.abs(expected.target))) * 100;
    return { passed: dev <= tolerancePct, deviation_pct: dev };
  }
  return { passed: true, deviation_pct: 0 };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Auth: cron secret OR admin user
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  const runId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const { data: vectors, error: vErr } = await admin
      .from('golden_test_vectors')
      .select('id, vector_code, input_data, expected_ranges, tolerance_pct')
      .eq('is_active', true);

    if (vErr) throw vErr;
    if (!vectors || vectors.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, run_id: runId, vectors: 0, message: 'No active vectors' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const summaries: Array<{ vector_code: string; passed: boolean; failed_metrics: string[] }> = [];

    for (const vec of vectors) {
      const tolerancePct = (vec.tolerance_pct as number | null) ?? 15;
      const expected = (vec.expected_ranges as Record<string, ExpectedRange>) ?? {};
      const stepStart = Date.now();
      let actual: any = {};
      let errorMessage: string | null = null;

      try {
        const { data: engineRes, error: engineErr } = await admin.functions.invoke(
          'analyze-business',
          {
            body: {
              ...(vec.input_data as Record<string, unknown>),
              _harness_run: true,
              _harness_run_id: runId,
            },
          },
        );
        if (engineErr) throw new Error(engineErr.message);
        if (!engineRes?.success) throw new Error(`engine_error: ${engineRes?.error ?? 'unknown'}`);
        actual = engineRes.data ?? {};
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : String(err);
      }

      const failedMetrics: string[] = [];
      let worstDeviation = 0;
      let allPassed = errorMessage === null;

      for (const [metricPath, exp] of Object.entries(expected)) {
        const actualVal = getByPath(actual, metricPath);
        const cmp = compareMetric(actualVal, exp, tolerancePct);
        if (!cmp.passed) {
          allPassed = false;
          failedMetrics.push(metricPath);
          if (cmp.deviation_pct != null && Math.abs(cmp.deviation_pct) > Math.abs(worstDeviation)) {
            worstDeviation = cmp.deviation_pct;
          }
        }
      }

      const latencyMs = Date.now() - stepStart;

      await admin.from('accuracy_runs').insert({
        run_id: runId,
        vector_id: vec.id,
        vector_code: vec.vector_code ?? '(no-code)',
        passed: allPassed,
        deviation_pct: worstDeviation || null,
        expected,
        actual,
        failed_metrics: failedMetrics,
        latency_ms: latencyMs,
        engine_version: (actual as any)?.engine_version ?? null,
        error_message: errorMessage,
      });

      // Update vector stats
      await admin
        .from('golden_test_vectors')
        .update({
          total_runs: ((vec as any).total_runs ?? 0) + 1,
          last_passed_at: allPassed ? new Date().toISOString() : (vec as any).last_passed_at,
          last_failed_at: allPassed ? (vec as any).last_failed_at : new Date().toISOString(),
          consecutive_passes: allPassed ? ((vec as any).consecutive_passes ?? 0) + 1 : 0,
          failure_count: allPassed ? ((vec as any).failure_count ?? 0) : ((vec as any).failure_count ?? 0) + 1,
        })
        .eq('id', vec.id);

      summaries.push({
        vector_code: vec.vector_code ?? '(no-code)',
        passed: allPassed,
        failed_metrics: failedMetrics,
      });
    }

    const totalMs = Date.now() - startedAt;
    const passCount = summaries.filter((s) => s.passed).length;

    return new Response(
      JSON.stringify({
        ok: true,
        run_id: runId,
        vectors_run: summaries.length,
        passed: passCount,
        failed: summaries.length - passCount,
        pass_rate_pct: Math.round((passCount / summaries.length) * 1000) / 10,
        total_ms: totalMs,
        summaries,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[run-accuracy-harness] failed', message);
    return new Response(JSON.stringify({ ok: false, error: message, run_id: runId }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
