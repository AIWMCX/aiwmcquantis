// ============================================================================
// QOC Orchestrator — composes the pipeline into one auditable envelope.
// ----------------------------------------------------------------------------
//   preflight (D5) → dedupe (D4) → [DETERMINISTIC ENGINE] → narrate (D1/2) → verify (D3)
//
// Short-circuit rules (cost/loss prevention):
//   - preflight FAIL/HARD_BLOCK -> stop, engine never runs, $0.
//   - dedupe hit                 -> return prior report id, $0.
//   - dedupe burst (FAIL)        -> stop, throttle, $0.
//
// Overall verdict composition:
//   HARD_BLOCK if preflight hard-blocked
//   FAIL       if any non-skipped stage FAILed
//   PARTIAL    if any stage PARTIAL (e.g. narration/verify degraded)
//   PASS       otherwise
//
// Every stage contributes a StageTrace. The array of traces IS the audit trail.
// ============================================================================

import type {
  AnalysisRequest,
  AuditEnvelope,
  StageDeps,
  StageTrace,
  Verdict,
} from "./types.ts";
import { QOC_VERSION } from "./types.ts";
import { preflight } from "./preflight.ts";
import { dedupe } from "./dedupe.ts";
import { narrate, verify } from "./stages.ts";

export interface OrchestrateOptions {
  now?: () => number;
}

function composeVerdict(traces: StageTrace[]): Verdict {
  if (traces.some((t) => t.verdict === "HARD_BLOCK")) return "HARD_BLOCK";
  const active = traces.filter((t) => t.verdict !== "SKIPPED");
  if (active.some((t) => t.verdict === "FAIL")) return "FAIL";
  if (active.some((t) => t.verdict === "PARTIAL")) return "PARTIAL";
  return "PASS";
}

function envelope(
  req: AnalysisRequest,
  traces: StageTrace[],
  opts: { report?: unknown; short_circuit?: AuditEnvelope["short_circuit"] },
): AuditEnvelope {
  return {
    qoc_version: QOC_VERSION,
    request_id: req.request_id,
    overall_verdict: composeVerdict(traces),
    traces,
    total_cost_usd: Number(
      traces.reduce((s, t) => s + t.cost_usd, 0).toFixed(6),
    ),
    total_duration_ms: traces.reduce((s, t) => s + t.duration_ms, 0),
    report: opts.report,
    short_circuit: opts.short_circuit,
  };
}

export async function orchestrate(
  req: AnalysisRequest,
  deps: StageDeps,
  options: OrchestrateOptions = {},
): Promise<AuditEnvelope> {
  const now = options.now ?? (() => Date.now());
  const traces: StageTrace[] = [];

  // ---- Stage 1: PREFLIGHT (D5) ----------------------------------------------
  const pf = preflight(req, now);
  traces.push(pf.trace);
  if (!pf.result.ok) {
    const env = envelope(req, traces, {
      short_circuit: {
        at: "preflight",
        reason: pf.result.hard_block_reason ?? pf.result.reject_reason ?? "preflight_fail",
      },
    });
    await safePut(deps, env);
    return env;
  }

  // ---- Stage 2: DEDUPE (D4) -------------------------------------------------
  const dd = await dedupe(req, deps.store, now);
  traces.push(dd.trace);
  if (dd.result.is_duplicate) {
    const env = envelope(req, traces, {
      report: { duplicate_of: dd.result.duplicate_of },
      short_circuit: { at: "dedupe", reason: "idempotent_hit" },
    });
    await safePut(deps, env);
    return env;
  }
  if (dd.result.is_burst) {
    const env = envelope(req, traces, {
      short_circuit: { at: "dedupe", reason: "burst_throttled" },
    });
    await safePut(deps, env);
    return env;
  }

  // ---- DETERMINISTIC ENGINE (wrapped, never reimplemented) ------------------
  const engStart = now();
  let report: unknown;
  try {
    report = await deps.runEngine(req, pf.result);
    traces.push({
      stage: "engine",
      verdict: "PASS",
      started_at: engStart,
      duration_ms: now() - engStart,
      cost_usd: 0, // deterministic compute; no per-call AI cost
      detail: { sector: pf.result.sector, confidence_band: pf.result.confidence_band },
      notes: [],
    });
  } catch (e) {
    traces.push({
      stage: "engine",
      verdict: "FAIL",
      started_at: engStart,
      duration_ms: now() - engStart,
      cost_usd: 0,
      detail: { error: String((e as Error)?.message ?? e) },
      notes: ["Deterministic engine failed; no report produced."],
    });
    const env = envelope(req, traces, {
      short_circuit: { at: "engine", reason: "engine_error" },
    });
    await safePut(deps, env);
    return env;
  }

  // ---- Stage 4: NARRATE (D1/D2) — confidence-gated tier, soft-throttle ------
  const nar = await narrate(report, req, deps, now, pf.result, dd.result.is_soft_throttle);
  traces.push(nar.trace);

  // ---- Stage 5: VERIFY / RVCE (D3) — conditional depth via preflight --------
  const ver = await verify(report, req, deps, now, pf.result);
  traces.push(ver.trace);

  // ---- Compose final report payload -----------------------------------------
  const composedReport = {
    engine: report,
    narrative: nar.text,
    variants: nar.variants ?? [],
    verification: {
      claims: ver.claims,
      overall: ver.overall,
      unverified_count: ver.claims.filter((c) => c.verdict !== "PASS").length,
    },
    confidence_band: pf.result.confidence_band,
    sector: pf.result.sector,
    imputations: pf.result.imputations,
  };

  const env = envelope(req, traces, { report: composedReport });
  await safePut(deps, env);
  return env;
}

// Persistence must never crash the request path. Audit is best-effort-durable:
// we attempt to store, but a store failure degrades to a logged warning, not a 500.
async function safePut(deps: StageDeps, env: AuditEnvelope): Promise<void> {
  try {
    await deps.store.putEnvelope(env);
  } catch (e) {
    console.error(
      "AUDIT_STORE_FAILURE",
      env.request_id,
      String((e as Error)?.message ?? e),
    );
  }
}
