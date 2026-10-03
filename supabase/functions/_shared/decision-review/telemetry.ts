/**
 * Decision-review telemetry — reuses the existing `ai_calls` cost ledger
 * (contract §30: "use existing AI-call telemetry where it already fits
 * instead of creating another observability system") rather than a new
 * table. Best-effort: a telemetry write failure must never fail the
 * caller's actual review — mirrors `_shared/llm-call.ts`'s own pattern.
 *
 * Never logs the API key, never logs raw packet/evidence content — only
 * the structured event name, timing, and outcome classification.
 */
// deno-lint-ignore no-explicit-any
type SupabaseAdminClient = any;

export type DecisionReviewEventName =
  | 'decision_review_requested'
  | 'decision_review_cache_hit'
  | 'decision_review_completed'
  | 'decision_review_failed';

export async function logDecisionReviewEvent(
  admin: SupabaseAdminClient,
  args: {
    event: DecisionReviewEventName;
    userId: string | null;
    analysisId: string | null;
    provider: string;
    latencyMs: number;
    ok: boolean;
    costUsd?: number | null;
    error?: string | null;
  },
): Promise<void> {
  try {
    await admin.from('ai_calls').insert({
      user_id: args.userId,
      analysis_id: args.analysisId,
      task: args.event,
      provider: args.provider,
      model: 'decision-review',
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: args.costUsd ?? 0,
      latency_ms: args.latencyMs,
      ok: args.ok,
      error: args.error ?? null,
    });
  } catch {
    // Best-effort only — never let a telemetry failure surface to the caller.
  }
}
