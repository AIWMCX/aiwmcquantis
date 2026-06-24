// ============================================================================
// Quantis Orchestration Core (QOC) — Type Contracts
// ----------------------------------------------------------------------------
// Single source of truth for the data shapes that flow through every stage.
// These contracts are the "auditability" promise made concrete: every stage
// emits a StageTrace, and the union of traces IS the audit envelope.
//
// HARD ARCHITECTURAL CONSTRAINT (do not violate):
//   The deterministic engine + Monte Carlo runs FIRST and is the only thing
//   allowed to produce numbers. Every QOC stage is governance/narration/
//   verification ONLY. No QOC stage may compute a financial figure.
// ============================================================================

export const QOC_VERSION = "1.0.0" as const;

// ---- Tiering (mirrors the live model lineup; QOC does not pick the engine) --
export type Plan = "free" | "plus" | "pro";

// Narration tier is derived from plan, never from user input.
export type NarrationTier = "deepseek" | "haiku" | "sonnet" | "opus";

// ---- Stage identity ---------------------------------------------------------
// We keep the D-naming as an internal alias so the framework lineage is legible
// in traces, but the *product* names are the canonical ones.
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
  // Free-form, stage-specific structured detail. Must be JSON-serializable.
  detail: Record<string, unknown>;
  // Non-fatal notes surfaced into the report's confidence/limitations section.
  notes: string[];
}

// ---- Sector taxonomy (Quantis-native, NOT the 8-color clock taxonomy) -------
// These are the real Quantis sectors used for benchmark routing. The framework
// shipped an 8x50 "clock" taxonomy for a consumer chat app — irrelevant here.
// We keep a compact, auditable sector enum aligned to the benchmark corpus.
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
  request_id: string; // client-supplied UUID for idempotency
  user_id: string;
  plan: Plan;
  idea: string; // required; without it we cannot proceed
  location?: string;
  industry?: string;
  revenue?: number;
  price?: number;
  customers?: number;
  operating_costs?: number;
  cac?: number;
  churn_rate?: number;
  initial_investment?: number;
  // anything else passes through untouched to the engine
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
  ok: boolean; // false => short-circuit, engine never runs
  reject_reason?: string;
  sector: Sector;
  sector_confidence: number; // 0..1
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
  duplicate_of?: string; // prior report id
  is_burst: boolean;
  cache_action: "hit" | "miss" | "store";
}

// ---- The composed envelope returned to the caller ---------------------------
export interface AuditEnvelope {
  qoc_version: string;
  request_id: string;
  overall_verdict: Verdict;
  traces: StageTrace[];
  total_cost_usd: number;
  total_duration_ms: number;
  // The actual report payload from the deterministic engine + narration.
  // QOC treats this as opaque except for attaching verify verdicts.
  report?: unknown;
  // Present only on short-circuit (hard block / dedupe hit / preflight fail).
  short_circuit?: {
    at: StageId;
    reason: string;
  };
}

// ---- Stage interface --------------------------------------------------------
// Every stage is independently testable: pure-ish function, explicit deps in,
// StageTrace out. This is the framework's one genuinely good idea, kept.
export interface StageContext {
  req: AnalysisRequest;
  now: () => number; // injectable clock for deterministic tests
  // Injected adapters (engine call, model call, verifier, store). Each is
  // swappable for a fake in tests — no network needed to unit-test a stage.
  deps: StageDeps;
}

export interface StageDeps {
  // Persistence for idempotency + audit (Supabase in prod, in-memory in tests)
  store: AuditStore;
  // The untouched deterministic engine. QOC only CALLS it; never reimplements.
  runEngine: (req: AnalysisRequest, pf: PreflightResult) => Promise<unknown>;
  // Tier-routed narration. QOC selects tier from plan; provider does the call.
  narrate: (
    report: unknown,
    tier: NarrationTier,
    req: AnalysisRequest,
  ) => Promise<{ text: string; cost_usd: number; variants?: string[] }>;
  // RVCE / source verification (Tavily etc.). Returns per-claim verdicts.
  verify: (
    report: unknown,
    req: AnalysisRequest,
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

export function tierForPlan(plan: Plan): NarrationTier {
  switch (plan) {
    case "free":
      return "deepseek";
    case "plus":
      return "opus"; // Plus gets adversarial Opus validation per spec
    case "pro":
      return "sonnet";
    default:
      return "deepseek";
  }
}
