/**
 * analyze-pro-worker — Background worker for Pro-depth analyses.
 *
 * Invoked async by analyze-business when depth=pro. Reads the queued job
 * from analysis_jobs, runs the engine via internal invoke of analyze-business
 * with a server-only "_worker_run=true" flag (so the queue check is skipped),
 * and writes the result + step timings back.
 *
 * If anything throws, status is set to 'failed' with error_message; the client
 * polling hook converts that into a silent Full-depth retry.
 *
 * @version 1.0.0
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logAnalysisEvent } from '../_shared/analysis-event-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkerPayload {
  job_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  let jobId: string | null = null;

  try {
    const body = (await req.json()) as WorkerPayload;
    jobId = body.job_id;
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'missing job_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark running
    const startedAt = Date.now();
    await admin
      .from('analysis_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        current_step: 'invoke_engine',
      })
      .eq('id', jobId);

    // Load job
    const { data: job, error: jobErr } = await admin
      .from('analysis_jobs')
      .select('input_snapshot, request_id, user_id')
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      throw new Error(`Job not found: ${jobErr?.message ?? 'no row'}`);
    }

    const basePayload = job.input_snapshot as Record<string, unknown>;
    const enginePayload = {
      ...basePayload,
      analysis_depth: 'pro',
      _worker_run: true,
      _worker_request_id: job.request_id,
      _worker_user_id: job.user_id,
    };
    const fullFallbackPayload = { ...enginePayload, analysis_depth: 'full' };

    const stepStart = Date.now();
    let { data: engineRes, error: engineErr } = await admin.functions.invoke(
      'analyze-business',
      { body: enginePayload },
    );
    let depthUsed = 'pro';

    if (engineErr || !(engineRes?.success === true && engineRes?.data)) {
      await admin
        .from('analysis_jobs')
        .update({ current_step: 'full_fallback', fell_back_from: 'pro' })
        .eq('id', jobId);
      const fallbackRun = await admin.functions.invoke('analyze-business', {
        body: fullFallbackPayload,
      });
      engineRes = fallbackRun.data;
      engineErr = fallbackRun.error;
      depthUsed = 'full';
    }
    const stepEnd = Date.now();
    const engineMs = stepEnd - stepStart;

    if (engineErr) {
      throw new Error(`engine_invoke_failed: ${engineErr.message}`);
    }

    // engineRes shape from analyze-business: { success, data, ... }
    const success = engineRes?.success === true && engineRes?.data;
    if (!success) {
      throw new Error(
        `engine_returned_error: ${engineRes?.error ?? 'unknown'} (code=${engineRes?.code ?? 'n/a'})`,
      );
    }

    const totalMs = Date.now() - startedAt;

    await admin
      .from('analysis_jobs')
      .update({
        status: 'completed',
        depth_used: depthUsed,
        result: engineRes.data,
        current_step: null,
        step_timings: {
          invoke_engine_ms: engineMs,
          total_ms: totalMs,
        },
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Observability
    await logAnalysisEvent({
      analysis_id: job.request_id,
      user_id: job.user_id,
      event_type: 'analysis_complete',
      severity: 'info',
      payload: {
        durationMs: totalMs,
        engineMs,
        depth: depthUsed,
        fellBackFromPro: depthUsed !== 'pro',
        confidence: (engineRes.data as any)?.confidence_score ?? null,
        industry_detected: (engineRes.data as any)?.industry_detected ?? null,
        reconciled: (engineRes.data as any)?.validation?.reconciled ?? null,
        tier: 'PRO',
      },
    });
    if (totalMs > 60_000) {
      await logAnalysisEvent({
        analysis_id: job.request_id,
        user_id: job.user_id,
        event_type: 'performance_warning',
        severity: 'warning',
        payload: { code: 'QE-PERF-PRO-001', durationMs: totalMs, threshold: 60_000 },
      });
    }

    return new Response(JSON.stringify({ ok: true, job_id: jobId, ms: totalMs }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[analyze-pro-worker] failure', { jobId, message });

    if (jobId) {
      await admin
        .from('analysis_jobs')
        .update({
          status: 'failed',
          error_message: message.slice(0, 1000),
          error_code: message.includes('timeout') ? 'TIMEOUT' : 'ENGINE_ERROR',
          failed_step: 'invoke_engine',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      await logAnalysisEvent({
        analysis_id: jobId,
        event_type: 'engine_error',
        severity: 'error',
        payload: {
          code: message.includes('timeout') ? 'TIMEOUT' : 'ENGINE_ERROR',
          message: message.slice(0, 500),
          step: 'invoke_engine',
          tier: 'PRO',
        },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
