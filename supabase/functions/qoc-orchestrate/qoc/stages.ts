// ============================================================================
// QOC Stages: NARRATE (lineage D1/D2) + VERIFY (lineage D3)
// ----------------------------------------------------------------------------
// These are THIN wrappers. They do NOT reimplement your model routing or RVCE.
// They call injected adapters (deps.narrate / deps.verify) so that:
//   - the real Supabase function wires them to DeepSeek/Anthropic + Tavily,
//   - tests wire them to fakes and run with zero network.
//
// Critical: narration and verification operate on the report the DETERMINISTIC
// ENGINE already produced. They explain and cross-check numbers; they never
// originate them.
// ============================================================================

import type {
  AnalysisRequest,
  NarrationTier,
  StageDeps,
  StageTrace,
} from "./types.ts";
import { tierForPlan } from "./types.ts";

export async function narrate(
  report: unknown,
  req: AnalysisRequest,
  deps: StageDeps,
  now: () => number,
): Promise<{ text: string; variants?: string[]; trace: StageTrace }> {
  const started = now();
  const tier: NarrationTier = tierForPlan(req.plan);
  try {
    const out = await deps.narrate(report, tier, req);
    return {
      text: out.text,
      variants: out.variants,
      trace: {
        stage: "narrate",
        verdict: "PASS",
        started_at: started,
        duration_ms: now() - started,
        cost_usd: out.cost_usd,
        detail: { tier, variant_count: out.variants?.length ?? 0 },
        notes: [],
      },
    };
  } catch (e) {
    // Narration failure must NOT fail the whole analysis — the deterministic
    // numbers are the product. Degrade gracefully to a PARTIAL verdict.
    return {
      text: "",
      trace: {
        stage: "narrate",
        verdict: "PARTIAL",
        started_at: started,
        duration_ms: now() - started,
        cost_usd: 0,
        detail: { tier, error: String((e as Error)?.message ?? e) },
        notes: ["Narration layer failed; report returned with numbers only."],
      },
    };
  }
}

export async function verify(
  report: unknown,
  req: AnalysisRequest,
  deps: StageDeps,
  now: () => number,
): Promise<{
  claims: Array<{ text: string; verdict: string; sources: number }>;
  overall: StageTrace["verdict"];
  trace: StageTrace;
}> {
  const started = now();
  try {
    const out = await deps.verify(report, req);
    return {
      claims: out.claims,
      overall: out.overall,
      trace: {
        stage: "verify",
        verdict: out.overall,
        started_at: started,
        duration_ms: now() - started,
        cost_usd: out.cost_usd,
        detail: { claim_count: out.claims.length },
        notes: [],
      },
    };
  } catch (e) {
    return {
      claims: [],
      overall: "PARTIAL",
      trace: {
        stage: "verify",
        verdict: "PARTIAL",
        started_at: started,
        duration_ms: now() - started,
        cost_usd: 0,
        detail: { error: String((e as Error)?.message ?? e) },
        notes: ["RVCE/verification unavailable; claims left unverified."],
      },
    };
  }
}
