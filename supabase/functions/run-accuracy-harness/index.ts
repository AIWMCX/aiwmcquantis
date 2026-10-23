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
import { expectationProblem, isApproved, judgeVector, summarize, type VectorRow } from './evaluate.ts';

const FUNCTION_NAME = 'run-accuracy-harness';
const FUNCTION_VERSION = '3.0.0';

// 3.0.0 (fail-closed): zero vectors, unapproved vectors, empty or bound-less
// expectations, unchecked statuses/invariants and failed evidence writes can
// no longer report success. Logic lives in ./evaluate.ts (unit-tested).

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

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const outputHashOf = async (v: unknown) => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(v ?? null)));
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  try {
    const { data: rows, error: vErr } = await admin
      .from('golden_test_vectors')
      .select('id, vector_code, input_data, expected_ranges, expected_statuses, expected_invariants, tolerance_pct, promotion_status, reviewer_finance, reviewer_engineering')
      .eq('active', true)
      .neq('promotion_status', 'retired');
    if (vErr) throw vErr;

    const active = (rows ?? []) as VectorRow[];
    const approved = active.filter(isApproved);
    let evaluated = 0, passed = 0, persisted = 0, invalid = 0, persistErrors = 0;
    const summaries: Array<{ vector_code: string; passed: boolean; failed: string[] }> = [];

    for (const vec of approved) {
      const stepStart = Date.now();
      const problem = expectationProblem(vec);
      let actual: unknown = null;
      let engineError: string | null = problem ? `INVALID_EXPECTATION:${problem}` : null;
      if (problem) invalid++;
      else {
        try {
          const { data: engineRes, error: engineErr } = await admin.functions.invoke('analyze-business', {
            body: { ...(vec.input_data as Record<string, unknown>), _harness_run: true, _harness_run_id: runId },
          });
          if (engineErr) throw new Error(engineErr.message);
          if (!engineRes?.success) throw new Error(`engine_error: ${engineRes?.error ?? 'unknown'}`);
          actual = engineRes.data ?? null;
        } catch (err) {
          engineError = (err instanceof Error ? err.message : String(err)).slice(0, 200);
        }
      }

      const verdict = judgeVector(vec, actual, engineError);
      evaluated++;
      if (verdict.passed) passed++;

      const { error: insertErr } = await admin.from('accuracy_runs').insert({
        run_id: runId,
        vector_id: vec.id,
        engine_version: ENGINE_VERSION,
        formula_registry_version: FORMULA_REGISTRY_VERSION,
        dataset_version: datasetVersion,
        commit_sha: commitSha,
        passed: verdict.passed,
        metric_results: { metrics: verdict.metric_results, statuses: verdict.status_results },
        invariant_results: verdict.invariant_results,
        worst_deviation_pct: verdict.worst_deviation_pct,
        duration_ms: Date.now() - stepStart,
        error_code: engineError,
        output_hash: await outputHashOf(actual),
      });
      if (insertErr) {
        persistErrors++;
        log.error('accuracy_runs insert failed', insertErr, { vectorCode: vec.vector_code, runId });
      } else persisted++;

      summaries.push({ vector_code: vec.vector_code ?? '(no-code)', passed: verdict.passed, failed: verdict.failed });
    }

    const summary = summarize({ active: active.length, approved: approved.length, evaluated, passed, persisted, invalid, persistErrors });
    return json({
      ...summary,
      run_id: runId,
      commit_sha: commitSha,
      engine_version: ENGINE_VERSION,
      formula_registry_version: FORMULA_REGISTRY_VERSION,
      dataset_version: datasetVersion,
      total_ms: Date.now() - startedAt,
      summaries,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('failed', err, { message, runId });
    return new Response(JSON.stringify({ status: 'ERROR', ok: false, reason: 'HARNESS_EXCEPTION', error: message, run_id: runId }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
