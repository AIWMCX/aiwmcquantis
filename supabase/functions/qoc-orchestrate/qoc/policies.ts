// ============================================================================
// QOC Policies (pure, dependency-free, unit-testable)
// ----------------------------------------------------------------------------
// Two governance policies that were previously implicit:
//   1. httpStatusFor  — F-5: map an envelope to the CORRECT HTTP status. The
//      original index.ts collapsed every FAIL to 502, so a missing idea, a
//      duplicate, and a rate-limit throttle all looked like a server outage —
//      and a 502 invites client retries, which makes burst-throttling worse.
//   2. ceilingFor / withinCeiling — F-11: the econ doc names a $0.15/analysis
//      ceiling, but nothing enforced it. These let the orchestrator stamp an
//      auditable note when a run breaches its tier budget.
// ============================================================================

import type { AuditEnvelope, NarrationTier } from "./types.ts";

// ---- HTTP status mapping ----------------------------------------------------
export function httpStatusFor(env: AuditEnvelope): number {
  if (env.overall_verdict === "HARD_BLOCK") return 422;

  const sc = env.short_circuit;
  if (sc) {
    if (sc.at === "preflight") return 400;
    if (sc.at === "dedupe" && sc.reason === "idempotent_hit") return 200;
    if (sc.at === "dedupe" && sc.reason === "burst_throttled") return 429;
    if (sc.at === "engine") return 502;
  }

  if (env.overall_verdict === "PASS" || env.overall_verdict === "PARTIAL") return 200;

  return 502;
}

// ---- Per-tier cost ceiling (from QOC-ECON $0.15 ceiling) --------------------
const TIER_CEILINGS: Record<NarrationTier, number> = {
  deepseek: 0.01,
  haiku: 0.03,
  sonnet: 0.08,
  opus: 0.15,
};

export function ceilingFor(tier: NarrationTier): number {
  return TIER_CEILINGS[tier] ?? 0.15;
}

export function withinCeiling(
  tier: NarrationTier,
  totalCostUsd: number,
): { ok: boolean; ceiling: number } {
  const ceiling = ceilingFor(tier);
  return { ok: totalCostUsd <= ceiling, ceiling };
}
