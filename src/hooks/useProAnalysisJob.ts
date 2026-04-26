/**
 * useProAnalysisJob — polls `analysis_jobs` for a Pro-depth background run.
 *
 * Pro analyses are too heavy to complete inside the edge-function 90 s budget,
 * so the backend returns `{ queued: true, job_id }` (HTTP 202) and a worker
 * processes the run out-of-band, writing progress + final result to
 * `public.analysis_jobs`.
 *
 * This hook:
 *   1. Polls that row every 2 s.
 *   2. Surfaces a phase machine (queued → running → completed | failed | timed_out).
 *   3. Tracks elapsed time + current_step for the progress panel.
 *   4. Stops polling on terminal status OR after `timeoutMs` (default 90 s),
 *      at which point the caller is expected to fall back to Full depth.
 *
 * The hook intentionally does NOT trigger the fallback itself — that decision
 * belongs to useAnalysis so we can keep one source of truth for retries.
 */
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { BusinessAnalysisResult } from '@/types/analysis';

export type ProJobPhase =
  | 'idle'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'timed_out';

export interface ProJobState {
  phase: ProJobPhase;
  jobId: string | null;
  requestId: string | null;
  currentStep: string | null;
  failedStep: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  elapsedMs: number;
  result: BusinessAnalysisResult | null;
}

interface UseProAnalysisJobOptions {
  /** Job id returned from the analyze-business 202 response. */
  jobId: string | null;
  /** Poll interval in ms. Defaults to 2000 (per spec). */
  intervalMs?: number;
  /** Total budget before we declare the job timed out. Defaults to 90 s. */
  timeoutMs?: number;
  /** Fired exactly once with the final state when polling stops. */
  onSettled?: (state: ProJobState) => void;
}

const TERMINAL: ReadonlyArray<ProJobPhase> = ['completed', 'failed', 'timed_out'];

function normalizePhase(status: string | null | undefined): ProJobPhase {
  switch (status) {
    case 'queued':
    case 'running':
    case 'completed':
    case 'failed':
      return status;
    default:
      return 'queued';
  }
}

export function useProAnalysisJob({
  jobId,
  intervalMs = 2000,
  timeoutMs = 90_000,
  onSettled,
}: UseProAnalysisJobOptions): ProJobState {
  const [state, setState] = useState<ProJobState>({
    phase: jobId ? 'queued' : 'idle',
    jobId,
    requestId: null,
    currentStep: null,
    failedStep: null,
    errorCode: null,
    errorMessage: null,
    elapsedMs: 0,
    result: null,
  });

  const startedAtRef = useRef<number | null>(null);
  const settledRef = useRef(false);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  useEffect(() => {
    if (!jobId) {
      setState({
        phase: 'idle',
        jobId: null,
        requestId: null,
        currentStep: null,
        failedStep: null,
        errorCode: null,
        errorMessage: null,
        elapsedMs: 0,
        result: null,
      });
      startedAtRef.current = null;
      settledRef.current = false;
      return;
    }

    settledRef.current = false;
    startedAtRef.current = Date.now();
    setState((prev) => ({ ...prev, phase: 'queued', jobId, elapsedMs: 0 }));

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let tickTimer: ReturnType<typeof setInterval> | null = null;

    const settle = (next: ProJobState) => {
      if (settledRef.current || cancelled) return;
      settledRef.current = true;
      if (pollTimer) clearInterval(pollTimer);
      if (tickTimer) clearInterval(tickTimer);
      setState(next);
      onSettledRef.current?.(next);
    };

    const fetchOnce = async () => {
      const { data, error } = await supabase
        .from('analysis_jobs')
        .select(
          'id, status, current_step, failed_step, error_code, error_message, request_id, result, started_at, completed_at',
        )
        .eq('id', jobId)
        .maybeSingle();

      if (cancelled) return;

      const elapsed = Date.now() - (startedAtRef.current ?? Date.now());

      if (error) {
        logger.error('Pro job poll failed', { metadata: { job_id: jobId, error: error.message } });
        // Transient DB error — keep polling unless we time out.
        setState((prev) => ({ ...prev, elapsedMs: elapsed }));
        return;
      }

      if (!data) {
        // Row not yet visible (replication lag) — keep polling.
        setState((prev) => ({ ...prev, elapsedMs: elapsed }));
        return;
      }

      const phase = normalizePhase(data.status);
      const next: ProJobState = {
        phase,
        jobId,
        requestId: data.request_id ?? null,
        currentStep: data.current_step ?? null,
        failedStep: data.failed_step ?? null,
        errorCode: data.error_code ?? null,
        errorMessage: data.error_message ?? null,
        elapsedMs: elapsed,
        result: (data.result as unknown as BusinessAnalysisResult | null) ?? null,
      };

      if (TERMINAL.includes(phase)) {
        settle(next);
        return;
      }

      setState(next);
    };

    // Lightweight elapsed-time ticker (1s) so the UI counter feels live
    // even between 2-second polls.
    tickTimer = setInterval(() => {
      if (cancelled || settledRef.current) return;
      setState((prev) => ({
        ...prev,
        elapsedMs: Date.now() - (startedAtRef.current ?? Date.now()),
      }));
    }, 1000);

    // Kick off immediately, then on the configured interval.
    void fetchOnce();
    pollTimer = setInterval(() => void fetchOnce(), intervalMs);

    // Hard timeout — declare timed_out and let caller decide on fallback.
    const timeoutTimer = setTimeout(() => {
      if (settledRef.current || cancelled) return;
      logger.warn('Pro job polling timed out', {
        metadata: { job_id: jobId, timeout_ms: timeoutMs },
      });
      settle({
        phase: 'timed_out',
        jobId,
        requestId: null,
        currentStep: null,
        failedStep: null,
        errorCode: 'CLIENT_POLL_TIMEOUT',
        errorMessage: `Pro analysis is still processing after ${Math.round(timeoutMs / 1000)}s.`,
        elapsedMs: timeoutMs,
        result: null,
      });
    }, timeoutMs);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (tickTimer) clearInterval(tickTimer);
      clearTimeout(timeoutTimer);
    };
  }, [jobId, intervalMs, timeoutMs]);

  return state;
}
