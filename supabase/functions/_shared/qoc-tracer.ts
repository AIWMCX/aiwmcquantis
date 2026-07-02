// ============================================================================
// QOC Tracer — shared helper for building StageTrace objects across pipeline
// ----------------------------------------------------------------------------
// The orchestrator, preflight, dedupe, narrate and verify stages all produce
// StageTrace records (see qoc-orchestrate/qoc/types.ts). This module centralises
// timing, correlation-id propagation and StageTrace assembly so that adopters
// can't accidentally drift the trace shape.
//
// It is intentionally dependency-free (no @supabase/supabase-js, no third-party
// runtime) so it loads under both Deno (edge functions) and the vitest quality
// suite (node). Every function is pure except now(), which the caller injects.
//
// Contract (mirrors types.ts StageTrace, kept in sync by qoc-acceptance test):
//   stage:        one of 'preflight' | 'dedupe' | 'engine' | 'narrate' | 'verify'
//   verdict:      one of 'PASS' | 'PARTIAL' | 'FAIL' | 'HARD_BLOCK' | 'SKIPPED'
//   correlation_id: propagated across every stage in a single analysis request
// ============================================================================

export type QocStage =
  | 'preflight'
  | 'dedupe'
  | 'engine'
  | 'narrate'
  | 'verify';

export type QocVerdict =
  | 'PASS'
  | 'PARTIAL'
  | 'FAIL'
  | 'HARD_BLOCK'
  | 'SKIPPED';

export interface QocStageTrace {
  stage: QocStage;
  verdict: QocVerdict;
  started_at: number;
  duration_ms: number;
  cost_usd: number;
  detail: Record<string, unknown>;
  notes: string[];
  correlation_id: string;
}

export const QOC_STAGES: readonly QocStage[] = [
  'preflight',
  'dedupe',
  'engine',
  'narrate',
  'verify',
] as const;

export interface QocTracer {
  readonly correlation_id: string;
  begin(stage: QocStage): QocStageBuilder;
}

export interface QocStageBuilder {
  finish(verdict: QocVerdict, opts?: {
    cost_usd?: number;
    detail?: Record<string, unknown>;
    notes?: string[];
  }): QocStageTrace;
}

// ---- Factory ---------------------------------------------------------------
// correlation_id defaults to the request_id when not supplied — the orchestrator
// always has one. now() is injected so tests can freeze time and orchestrator.ts
// can pass the same clock it uses for verdict composition.
export function createQocTracer(
  correlation_id: string,
  now: () => number = () => Date.now(),
): QocTracer {
  if (!correlation_id || typeof correlation_id !== 'string') {
    throw new Error('createQocTracer: correlation_id must be a non-empty string');
  }
  return {
    correlation_id,
    begin(stage: QocStage): QocStageBuilder {
      if (!QOC_STAGES.includes(stage)) {
        throw new Error(`createQocTracer: unknown stage '${stage}'`);
      }
      const started_at = now();
      return {
        finish(verdict, opts = {}) {
          return {
            stage,
            verdict,
            started_at,
            duration_ms: Math.max(0, now() - started_at),
            cost_usd: opts.cost_usd ?? 0,
            detail: opts.detail ?? {},
            notes: opts.notes ?? [],
            correlation_id,
          };
        },
      };
    },
  };
}
