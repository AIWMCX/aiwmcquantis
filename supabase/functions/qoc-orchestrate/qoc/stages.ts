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
  NarrationContext,
  NarrationTier,
  PreflightResult,
  StageDeps,
  StageTrace,
} from "./types.ts";
import { tierForPlan, tierForRequest } from "./types.ts";

export async function narrate(
  report: unknown,
  req: AnalysisRequest,
  deps: StageDeps,
  now: () => number,
  pf?: PreflightResult,
  softThrottled?: boolean,
): Promise<{ text: string; variants?: string[]; trace: StageTrace }> {
  const started = now();
  // Confidence-gated tier: uses preflight signals when available.
  let tier: NarrationTier;
  if (pf) {
    tier = tierForRequest(req.plan, pf.confidence_band, pf.sector_confidence);
    // Soft throttle: downshift one step to conserve capacity under moderate load.
    if (softThrottled && tier !== "deepseek") {
      const downshift: Record<NarrationTier, NarrationTier> = {
        opus: "sonnet",
        sonnet: "haiku",
        haiku: "deepseek",
        deepseek: "deepseek",
      };
      tier = downshift[tier];
    }
  } else {
    tier = tierForPlan(req.plan);
  }

  const ctx: NarrationContext | undefined = pf
    ? {
        confidence_band: pf.confidence_band,
        fields_present: pf.fields_present,
        sector: pf.sector,
        soft_throttled: softThrottled ?? false,
      }
    : undefined;

  try {
    const out = await deps.narrate(report, tier, req, ctx);
    return {
      text: out.text,
      variants: out.variants,
      trace: {
        stage: "narrate",
        verdict: "PASS",
        started_at: started,
        duration_ms: now() - started,
        cost_usd: out.cost_usd,
        detail: {
          tier,
          variant_count: out.variants?.length ?? 0,
          confidence_gated: pf ? tier !== tierForPlan(req.plan) : false,
          soft_throttled: softThrottled ?? false,
        },
        notes: [],
      },
    };
  } catch (e) {
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
  pf?: PreflightResult,
): Promise<{
  claims: Array<{ text: string; verdict: string; sources: number }>;
  overall: StageTrace["verdict"];
  trace: StageTrace;
}> {
  const started = now();
  // Conditional verification depth: high-confidence + known sector → single-model.
  const singleModel =
    pf &&
    (pf.confidence_band === "very_high" || pf.confidence_band === "high") &&
    pf.sector !== "unknown" &&
    pf.sector_confidence >= 0.7;
  const forceModel = singleModel ? "gpt" : undefined;

  try {
    const out = await deps.verify(report, req, forceModel);
    return {
      claims: out.claims,
      overall: out.overall,
      trace: {
        stage: "verify",
        verdict: out.overall,
        started_at: started,
        duration_ms: now() - started,
        cost_usd: out.cost_usd,
        detail: {
          claim_count: out.claims.length,
          single_model: !!singleModel,
          force_model: forceModel ?? null,
          overall_source: out.overall_source ?? "reported",
        },
        notes: out.notes ?? [],
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
