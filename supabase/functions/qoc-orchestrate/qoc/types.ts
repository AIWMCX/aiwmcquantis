// ============================================================================
// Quantis Orchestration Core (QOC) — Type Contracts
// ----------------------------------------------------------------------------
// Single source of truth for the data shapes that flow through every stage.
//
// HARDENING (F-1): tierForPlan was inverted vs QOC-SPEC Table 10/16.
//   Plus $17 was routing to Opus (the most expensive) while Pro $49 got Sonnet.
//   Fixed: free→deepseek, plus→sonnet, pro→opus.
//
// HARD ARCHITECTURAL CONSTRAINT (do not violate):
//   The deterministic engine + Monte Carlo runs FIRST and is the only thing
//   allowed to produce numbers. Every QOC stage is governance/narration/
//   verification ONLY. No QOC stage may compute a financial figure.
// ============================================================================

export const QOC_VERSION = "1.0.1" as const;

// Per-analysis unit-cost ceiling (QUANTIS_AI_ENGINE_INTELLIGENCE.md). Breaching
// it does not fail the analysis; it raises a cost_guard flag for alarms.
export const MAX_COST_USD = 0.15 as const;

// ---- Tiering (mirrors the live model lineup; QOC does not pick the engine) --
export type Plan = "free" | "plus" | "pro";

// Narration tier is derived from plan, never from user input.
export type NarrationTier = "deepseek" | "haiku" | "sonnet" | "opus";

// ---- Stage identity ---------------------------------------------------------
export type StageId =
  | "preflight" // D5  — classify + validate + hard-block
  | "dedupe" //    D4  — fingerprint + idempotency + burst
  | "engine" //    ——  — deterministic + Monte Carlo (NOT a QOC stage; wrapped)
  | "narrate" //   D1/2 — tier-routed narrative + variants
  | "verify"; //   D3  — RVCE / source cross-check

export type Verdict = "PASS" | "PARTIAL" | "FAIL" | "HARD_BLOCK" | "SKIPPED";

// ---- The audit unit ---------------------------------------------------------
export interface StageTrace {
  stage: StageId;
  verdict: Verdict;
  started_at: number; // epoch ms
  duration_ms: number;
  cost_usd: number; // 0 for all non-AI stages
  detail: Record<string, unknown>;
  notes: string[];
}

// ---- Sector taxonomy --------------------------------------------------------
export type Sector =
  | "saas_software"
  | "food_beverage"
  | "professional_services"
  | "retail_ecommerce"
  | "healthcare"
  | "construction"
  | "real_estate"
  | "health_fitness"
  | "education"
  | "unknown";

// ---- Input envelope ---------------------------------------------------------
export interface AnalysisRequest {
  request_id: string;
  user_id: string;
  plan: Plan;
  idea: string;
  location?: string;
  industry?: string;
  revenue?: number;
  price?: number;
  customers?: number;
  operating_costs?: number;
  cac?: number;
  churn_rate?: number;
  initial_investment?: number;
  [k: string]: unknown;
}

// ---- Preflight result -------------------------------------------------------
export type ConfidenceBand =
  | "very_high"
  | "high"
  | "medium"
  | "low"
  | "very_low";

export interface PreflightResult {
  ok: boolean;
  reject_reason?: string;
  sector: Sector;
  sector_confidence: number;
  fields_present: number;
  confidence_band: ConfidenceBand;
  hard_block: boolean;
  hard_block_reason?: string;
  imputations: Array<{ field: string; reason: string }>;
}

// ---- Dedupe result ----------------------------------------------------------
export interface DedupeResult {
  fingerprint: string;
  is_duplicate: boolean;
  duplicate_of?: string;
  is_burst: boolean;
  is_soft_throttle: boolean;
  cache_action: "hit" | "miss" | "store";
}

// ---- Narration context passed from orchestrator to narrator adapter ----------
export interface NarrationContext {
  confidence_band: ConfidenceBand;
  fields_present: number;
  sector: Sector;
  soft_throttled: boolean;
}

// ---- The composed envelope returned to the caller ---------------------------
export interface AuditEnvelope {
  qoc_version: string;
  request_id: string;
  overall_verdict: Verdict;
  traces: StageTrace[];
  total_cost_usd: number;
  total_duration_ms: number;
  report?: unknown;
  short_circuit?: {
    at: StageId;
    reason: string;
  };
}

// ---- Stage interface --------------------------------------------------------
export interface StageContext {
  req: AnalysisRequest;
  now: () => number;
  deps: StageDeps;
}

export interface StageDeps {
  store: AuditStore;
  runEngine: (req: AnalysisRequest, pf: PreflightResult) => Promise<unknown>;
  // ctx is optional for backwards compat with existing test fakes.
  narrate: (
    report: unknown,
    tier: NarrationTier,
    req: AnalysisRequest,
    ctx?: NarrationContext,
  ) => Promise<{ text: string; cost_usd: number; variants?: string[] }>;
  // forceModel is optional — set by orchestrator for conditional verification depth.
  verify: (
    report: unknown,
    req: AnalysisRequest,
    forceModel?: string,
  ) => Promise<{
    claims: Array<{ text: string; verdict: Verdict; sources: number }>;
    overall: Verdict;
    cost_usd: number;
  }>;
}

export interface AuditStore {
  getByFingerprint(fp: string): Promise<{ report_id: string } | null>;
  recentCountForUser(userId: string, windowMs: number): Promise<number>;
  putEnvelope(env: AuditEnvelope): Promise<void>;
}

// FIXED (F-1): tier mapping now matches QOC-SPEC Table 10/16.
// Plus $17 tops out at Sonnet; Pro $49 adds the deepest Opus adversarial path.
// The original code had these swapped, causing Plus to overpay for Opus and
// Pro to underpay for Sonnet — an inverted-margin tier leak.
export function tierForPlan(plan: Plan): NarrationTier {
  switch (plan) {
    case "free":
      return "deepseek";
    case "plus":
      return "sonnet"; // $17 — Sonnet narrative + adversarial pass
    case "pro":
      return "opus";   // $49 — deepest Opus adversarial validation
    default:
      return "deepseek";
  }
}

// Confidence-gated escalation: weak inputs on cheap tiers get one step up.
// Free users with very_low/low confidence and weak sector get haiku instead of
// deepseek — marginal cost increase, significant accuracy gain on hard requests.
// Paid tiers are never downgraded.
export function tierForRequest(
  plan: Plan,
  confidenceBand: ConfidenceBand,
  sectorConfidence: number,
): NarrationTier {
  const base = tierForPlan(plan);
  if (
    base === "deepseek" &&
    (confidenceBand === "very_low" || confidenceBand === "low") &&
    sectorConfidence < 0.5
  ) {
    return "haiku";
  }
  return base;
}
