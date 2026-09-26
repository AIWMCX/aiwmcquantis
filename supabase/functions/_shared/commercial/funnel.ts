/**
 * Commercial Ops workflow -- funnel stage contract.
 *
 * Mirrors the DB enum (public.commercial_funnel_stage) and the transition
 * rule enforced inside transition_prospect_stage() exactly (see
 * 20260926150000_commercial_workflow_stages.sql). Kept here, independently
 * unit-tested, so a drift between the two fails fast in a local test
 * instead of only being discovered against production -- same pattern as
 * agent-runtime.ts's isConsistentAgentRunRow.
 */

export const COMMERCIAL_FUNNEL_STAGES = [
  'discovered',
  'contacted',
  'replied',
  'qualified',
  'call_planned',
  'call_completed',
  'demo_offered',
  'free_analysis_started',
  'offer_presented',
  'checkout_started',
  'won',
  'lost',
  'not_fit',
] as const;
export type CommercialFunnelStage = (typeof COMMERCIAL_FUNNEL_STAGES)[number];

const TERMINAL_STAGES: ReadonlySet<CommercialFunnelStage> = new Set(['won', 'lost', 'not_fit']);

export type FunnelTransitionCheck =
  | { ok: true }
  | { ok: false; reason: 'terminal_stage' | 'no_op' };

/**
 * Deliberately permissive about which forward/lateral transitions are
 * allowed -- the spec's own requirement is "deterministic stage tracking
 * and history", not a rigid linear-only state machine (real sales cycles
 * skip and backtrack). The two hard rules: nothing transitions out of a
 * terminal stage, and a transition to the same stage is rejected as a
 * no-op. Matches transition_prospect_stage()'s SQL exactly.
 */
export function checkFunnelTransition(
  from: CommercialFunnelStage,
  to: CommercialFunnelStage,
): FunnelTransitionCheck {
  if (TERMINAL_STAGES.has(from)) return { ok: false, reason: 'terminal_stage' };
  if (from === to) return { ok: false, reason: 'no_op' };
  return { ok: true };
}

export function isTerminalFunnelStage(stage: CommercialFunnelStage): boolean {
  return TERMINAL_STAGES.has(stage);
}
