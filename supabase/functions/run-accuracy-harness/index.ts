/**
 * run-accuracy-harness — Nightly engine quality regression
 * --------------------------------------------------------
 * Pulls every active row from `golden_test_vectors`, invokes `analyze-business`
 * with its `input_data`, compares the engine output to `expected_ranges`, and
 * writes one row per vector to `accuracy_runs` so admins can chart drift.
 *
 * Authenticated by `x-cron-secret` (CRON_SECRET env var).
 *
 * Rewritten 2026-08-01 (P0-5, Accuracy Package v2.0): the function previously
 * queried columns (`is_active`, `total_runs`, `last_passed_at`, ...) and
 * inserted columns (`vector_code`, `expected`, `actual`, `deviation_pct`,
 * `error_message`, ...) that never existed in ANY deployed schema — the
 * harness has been erroring on every invocation since it was written,
 * because `golden_test_vectors`/`accuracy_runs` themselves were entirely
 * absent from production until this same change applied
 * accuracy_control_schema_v1 (the reviewed
 * quantis_accuracy_migration_proposal.sql). This version matches that
 * reviewed schema exactly: `active` (not `is_active`), `oracle_method`/
 * `oracle_version`/`promotion_status` on vectors, `formula_registry_version`/
 * `dataset_version`/`commit_sha`/`metric_results`/`invariant_results` (all
 * NOT NULL) on runs. No per-vector running-stats columns exist in the
 * reviewed schema, so that update step is removed rather than writing to
 * columns that were never reviewed or created.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { maybeHealthResponse } from '../_shared/health.ts';
import { ENGINE_VERSION, FORMULA_REGISTRY_VERSION } from '../_shared/analysis-snapshot.ts';
import { BENCHMARK_COUNT } from '../_shared/canonical-facts.ts';

const FUNCTION_NAME = 'run-accuracy-harness';
const FUNCTION_VERSION = '2.0.0';

interface ExpectedRange {
  min?: number;
  max?: number;
  target?: number;
}

/** Walk a JSON object using dot/bracket path: e.g. "financial_analysis.scenarios.base.net_margin". */
// deno-lint-ignore no-explicit-any
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

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const reqId = getRequestId(req);
  const log = createLogger('run-accuracy-harness', reqId);
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Auth: cron secret only. This function reads/writes golden_test_vectors
  // and accuracy_runs, both RLS-enabled with zero policies (service-role
  // only) — an admin-user path is intentionally not offered here.
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || !expectedSecret || cronSecret !== expectedSecret) {
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
  const commitSha = Deno.env.get('COMMIT_SHA') ?? 'unknown';
  const datasetVersion = String(BENCHMARK_COUNT);

  try {
    const { data: vectors, error: vErr } = await admin
      .from('golden_test_vectors')
      .select('id, vector_code, input_data, expected_ranges, tolerance_pct, promotion_status')
      .eq('active', true)
      .neq('promotion_status', 'retired');

    if (vErr) throw vErr;
    if (!vectors || vectors.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, run_id: runId, vectors: 0, message: 'No active vectors' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const summaries: Array<{ vector_code: string; passed: boolean; failed_metrics: string[] }> = [];

    for (const vec of vectors) {
      const tolerancePct = (vec.tolerance_pct as number | null) ?? 1;
      const expected = (vec.expected_ranges as Record<string, ExpectedRange>) ?? {};
      const stepStart = Date.now();
      // deno-lint-ignore no-explicit-any
      let actual: any = {};
      let errorCode: string | null = null;

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
        errorCode = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200);
      }

      const metricResults: Record<string, { passed: boolean; deviation_pct: number | null; actual: unknown }> = {};
      const failedMetrics: string[] = [];
      let worstDeviation = 0;
      let allPassed = errorCode === null;

      for (const [metricPath, exp] of Object.entries(expected)) {
        const actualVal = getByPath(actual, metricPath);
        const cmp = compareMetric(actualVal, exp, tolerancePct);
        metricResults[metricPath] = { passed: cmp.passed, deviation_pct: cmp.deviation_pct, actual: actualVal };
        if (!cmp.passed) {
          allPassed = false;
          failedMetrics.push(metricPath);
          if (cmp.deviation_pct != null && Math.abs(cmp.deviation_pct) > Math.abs(worstDeviation)) {
            worstDeviation = cmp.deviation_pct;
          }
        }
      }

      const latencyMs = Date.now() - stepStart;
      const outputHash = await sha256Hex(JSON.stringify(actual));

      const { error: insertErr } = await admin.from('accuracy_runs').insert({
        run_id: runId,
        vector_id: vec.id,
        engine_version: ENGINE_VERSION,
        formula_registry_version: FORMULA_REGISTRY_VERSION,
        dataset_version: datasetVersion,
        commit_sha: commitSha,
        passed: allPassed,
        metric_results: metricResults,
        invariant_results: [],
        worst_deviation_pct: worstDeviation || null,
        duration_ms: latencyMs,
        error_code: errorCode,
        output_hash: outputHash,
      });
      if (insertErr) {
        log.error('accuracy_runs insert failed', insertErr, { vectorCode: vec.vector_code, runId });
      }

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
    log.error('failed', err, { message, runId });
    return new Response(JSON.stringify({ ok: false, error: message, run_id: runId }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
