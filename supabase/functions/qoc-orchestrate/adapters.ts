// ============================================================================
// QOC Supabase Adapters
// ----------------------------------------------------------------------------
// The ONLY place QOC touches the outside world. Everything above this file is
// pure and unit-tested. These adapters bind the injected StageDeps to:
//   - Supabase Postgres (audit + idempotency)            -> AuditStore
//   - existing deterministic analyze-business function   -> runEngine
//   - existing ai-narrator function                      -> narrate
//   - existing ai-consensus function (RVCE-flavoured)    -> verify
//
// Each non-store adapter delegates to an EXISTING capability in aiwmcquantis.
// `class NotWired` is retained as a sentinel so the structural gate can prove
// the wiring ceremony is still in place (invariant 5).
// ============================================================================

import type {
  AnalysisRequest,
  AuditEnvelope,
  AuditStore,
  NarrationContext,
  NarrationTier,
  PreflightResult,
  StageDeps,
  Verdict,
} from "./qoc/types.ts";

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;
// deno-lint-ignore no-explicit-any
const Deno: any = (globalThis as any).Deno;

class NotWired extends Error {
  constructor(seam: string) {
    super(`QOC seam not wired: ${seam}. Connect to aiwmcquantis-main before deploy.`);
    this.name = "NotWired";
  }
}

// ---- AuditStore (fully implemented; table DDL ships in migrations) ----------
export function makeStore(sb: SupabaseClient): AuditStore {
  return {
    async getByFingerprint(fp: string) {
      const { data, error } = await sb
        .from("qoc_audit_envelopes")
        .select("request_id")
        .eq("fingerprint", fp)
        .eq("overall_verdict", "PASS")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? { report_id: data.request_id } : null;
    },
    async recentCountForUser(userId: string, windowMs: number) {
      const since = new Date(Date.now() - windowMs).toISOString();
      const { count, error } = await sb
        .from("qoc_audit_envelopes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", since);
      if (error) throw error;
      return count ?? 0;
    },
    async putEnvelope(env: AuditEnvelope) {
      const { error } = await sb.from("qoc_audit_envelopes").insert({
        request_id: env.request_id,
        qoc_version: env.qoc_version,
        fingerprint:
          // deno-lint-ignore no-explicit-any
          (env.traces.find((t) => t.stage === "dedupe")?.detail as any)?.result
            ?.fingerprint ?? null,
        // deno-lint-ignore no-explicit-any
        user_id: (env as any).__user_id ?? null,
        overall_verdict: env.overall_verdict,
        total_cost_usd: env.total_cost_usd,
        total_duration_ms: env.total_duration_ms,
        traces: env.traces,
        report: env.report ?? null,
        short_circuit: env.short_circuit ?? null,
      });
      if (error) throw error;
    },
  };
}

// ---- Internal: invoke a sibling edge function with the service role ---------
async function invokeFn(name: string, payload: unknown): Promise<unknown> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new NotWired(`${name} -> missing SUPABASE_URL/SERVICE_ROLE`);
  const res = await fetch(`${url}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${key}`,
      "apikey": key,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${name} ${res.status}: ${text.slice(0, 400)}`);
  }
  return await res.json();
}

// ---- runEngine seam ---------------------------------------------------------
// Calls the EXISTING deterministic analyze-business edge function. QOC never
// reimplements the engine; it only forwards the validated request plus the
// preflight-derived sector / confidence_band hints for benchmark routing.
export async function runEngineAdapter(
  req: AnalysisRequest,
  pf: PreflightResult,
): Promise<unknown> {
  return await invokeFn("analyze-business", {
    ...req,
    qoc_sector: pf.sector,
    qoc_confidence_band: pf.confidence_band,
    qoc_imputations: pf.imputations,
  });
}

// ---- narrate seam -----------------------------------------------------------
// Calls the existing ai-narrator function with the deterministic report.
// QOC supplies the tier; narrator may use it for model selection. Cost is
// reported back via the response envelope if present, else 0.
export async function narrateAdapter(
  report: unknown,
  tier: NarrationTier,
  req: AnalysisRequest,
  ctx?: NarrationContext,
): Promise<{ text: string; cost_usd: number; variants?: string[] }> {
  // deno-lint-ignore no-explicit-any
  const out: any = await invokeFn("ai-narrator", {
    report,
    tier,
    request: { idea: req.idea, location: req.location, industry: req.industry, plan: req.plan },
    // Confidence signals for dynamic token caps and thinking mode
    confidence_band: ctx?.confidence_band,
    fields_present: ctx?.fields_present,
    soft_throttled: ctx?.soft_throttled,
  });
  const text =
    typeof out?.narrative === "string" ? out.narrative :
    typeof out?.text === "string" ? out.text :
    typeof out?.content === "string" ? out.content :
    JSON.stringify(out ?? {});
  return {
    text,
    cost_usd: Number(out?.cost_usd ?? 0) || 0,
    variants: Array.isArray(out?.variants) ? out.variants : undefined,
  };
}

// ---- verify seam (RVCE) -----------------------------------------------------
// Calls the existing ai-consensus function as the cross-check layer. Maps its
// confidence into a per-stage verdict. RENAME of existing capability — QOC adds
// no new financial logic here.
export async function verifyAdapter(
  report: unknown,
  req: AnalysisRequest,
  forceModel?: string,
): Promise<VerifyResult> {
  const out = await invokeFn("ai-consensus", {
    report,
    request: { idea: req.idea, location: req.location, industry: req.industry },
    // Conditional verification depth: "gpt" = single-model (cheaper for easy cases)
    options: forceModel ? { forceModel } : undefined,
  });
  return parseVerifyResponse(out);
}

export type VerdictSource = "reported" | "missing" | "malformed";

export interface VerifyResult {
  claims: Array<{ text: string; verdict: Verdict; sources: number }>;
  overall: Verdict;
  /** Whether `overall` came from the verifier, or was set here because it gave none. */
  overall_source: VerdictSource;
  notes: string[];
  cost_usd: number;
}

// A verdict the verifier did not report is unknown, never PASS (F2 in
// docs/predicta/2026-11-06-phase2-governed-evidence-plan.md §1.4). ai-consensus
// answers 200 with { finalOutput, overallConfidence, ... } and no `overall` or
// `verdict` field, so the old `?? "PASS"` default marked every verification
// passed. Unknown is PARTIAL, the state stages.verify already uses when the
// verifier is unreachable; FAIL would turn the envelope into a 502 and drop a
// valid deterministic report.
export function parseVerifyResponse(out: unknown): VerifyResult {
  // deno-lint-ignore no-explicit-any
  const body: any = out !== null && typeof out === "object" ? out : {};
  // deno-lint-ignore no-explicit-any
  const rawClaims: any[] = Array.isArray(body.claims) ? body.claims : [];
  const claims = rawClaims.map((c) => ({
    text: String(c?.text ?? c?.claim ?? ""),
    verdict: readVerdict(c?.verdict ?? c?.status).verdict,
    sources: Number(c?.sources ?? c?.source_count ?? 0) || 0,
  }));
  const overall = readVerdict(body.overall ?? body.verdict);
  const notes =
    overall.source === "missing" ? ["Verifier returned no verdict; claims left unverified."] :
    overall.source === "malformed" ? ["Verifier returned an unrecognised verdict; claims left unverified."] :
    [];
  return {
    claims,
    overall: overall.verdict,
    overall_source: overall.source,
    notes,
    cost_usd: Number(body.cost_usd ?? 0) || 0,
  };
}

const VERDICT_WORDS = new Map<string, Verdict>([
  ["PASS", "PASS"], ["PARTIAL", "PARTIAL"], ["FAIL", "FAIL"], ["HARD_BLOCK", "HARD_BLOCK"], ["SKIPPED", "SKIPPED"],
  ["OK", "PASS"], ["VERIFIED", "PASS"], ["TRUE", "PASS"],
  ["REJECTED", "FAIL"], ["FALSE", "FAIL"],
]);

function readVerdict(v: unknown): { verdict: Verdict; source: VerdictSource } {
  if (v === undefined || v === null) return { verdict: "PARTIAL", source: "missing" };
  const mapped = typeof v === "string" ? VERDICT_WORDS.get(v.trim().toUpperCase()) : undefined;
  return mapped ? { verdict: mapped, source: "reported" } : { verdict: "PARTIAL", source: "malformed" };
}

export function makeDeps(sb: SupabaseClient): StageDeps {
  return {
    store: makeStore(sb),
    runEngine: runEngineAdapter,
    narrate: narrateAdapter,
    verify: verifyAdapter,
  };
}

// Re-exported so callers can detect unwired-seam failures distinctly from
// transport / engine errors if they choose.
export { NotWired };
