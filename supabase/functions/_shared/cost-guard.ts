/**
 * Phase 2 — Cost guard.
 *
 * In-memory per-analysis spend tracker plus a soft ceiling check against
 * COST_CEILING_USD[tier]. Two modes:
 *
 *  - assertCostBudget(spent, tier): boolean    → cheap branch in hot loops
 *  - logCostBreach(...)                        → fire-and-forget telemetry
 *
 * NOTE: deliberately additive. Breaching the ceiling does NOT throw — the
 * caller decides whether to truncate, downgrade the model, or warn. The goal
 * is observability first, with a guard rail before runaway fan-outs.
 */
import { COST_CEILING_USD, type Tier } from './tier.ts';
import { logAiCall } from './ai-logger.ts';

export interface CostTally {
  tier: Tier;
  spent_usd: number;
  ceiling_usd: number;
  breached: boolean;
}

const tallies = new Map<string, CostTally>();

export function startTally(analysisId: string, tier: Tier): CostTally {
  const t: CostTally = {
    tier,
    spent_usd: 0,
    ceiling_usd: COST_CEILING_USD[tier],
    breached: false,
  };
  tallies.set(analysisId, t);
  return t;
}

export function addCost(analysisId: string, usd: number): CostTally | null {
  const t = tallies.get(analysisId);
  if (!t) return null;
  t.spent_usd = Number((t.spent_usd + Math.max(0, usd)).toFixed(6));
  if (!t.breached && t.spent_usd > t.ceiling_usd) {
    t.breached = true;
  }
  return t;
}

export function getTally(analysisId: string): CostTally | null {
  return tallies.get(analysisId) ?? null;
}

export function endTally(analysisId: string): CostTally | null {
  const t = tallies.get(analysisId) ?? null;
  tallies.delete(analysisId);
  return t;
}

/** Returns true if the analysis is still under budget (or not tracked). */
export function assertCostBudget(analysisId: string, headroomUsd = 0): boolean {
  const t = tallies.get(analysisId);
  if (!t) return true;
  return t.spent_usd + headroomUsd <= t.ceiling_usd;
}

/** Fire-and-forget breach telemetry to ai_calls (task=other, ok=false). */
export async function logCostBreach(args: {
  analysis_id: string;
  user_id?: string | null;
  request_id?: string | null;
  tally: CostTally;
}): Promise<void> {
  try {
    await logAiCall({
      analysis_id: args.analysis_id,
      user_id: args.user_id ?? null,
      request_id: args.request_id ?? null,
      task: 'other',
      provider: 'lovable_gateway',
      model: 'cost-guard',
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: args.tally.spent_usd,
      latency_ms: 0,
      ok: false,
      error: `cost_ceiling_breached:${args.tally.tier}:${args.tally.spent_usd}>${args.tally.ceiling_usd}`,
      metadata: { kind: 'cost_breach', ...args.tally },
    });
  } catch {
    /* never throws */
  }
}
