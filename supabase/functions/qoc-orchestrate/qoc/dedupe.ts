// ============================================================================
// QOC Stage: DEDUPE (lineage: D4)
// ----------------------------------------------------------------------------
// Idempotency + abuse throttling, BEFORE the expensive engine + AI run.
//   1. Fingerprint the normalized request. Identical request already analyzed?
//      -> return the prior report, $0 spent. (Idempotency = system loss prevention.)
//   2. Burst guard: too many analyses from one user in a short window -> throttle.
//
// Pure logic + injected store. No financial computation.
// ============================================================================

import type {
  AnalysisRequest,
  AuditStore,
  DedupeResult,
  StageTrace,
} from "./types.ts";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "to", "of", "for", "in", "on", "with",
  "is", "are", "my", "our", "we", "i", "this", "that", "it",
]);

// Deterministic, dependency-free fingerprint. We avoid pulling a sha lib so the
// stage stays portable across Deno/Node/test. djb2 over normalized tokens is
// sufficient for an idempotency key (collisions are astronomically unlikely at
// our volume, and a collision only costs a cache miss, never a wrong answer).
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

export function normalize(req: AnalysisRequest): string {
  const core = [
    req.idea,
    req.location,
    req.industry,
    req.revenue,
    req.price,
    req.customers,
    req.operating_costs,
    req.cac,
    req.churn_rate,
    req.initial_investment,
  ]
    .map((v) => (v === undefined || v === null ? "" : String(v)))
    .join(" ");
  const tokens = core
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t))
    .sort();
  return tokens.join("|");
}

export function fingerprint(req: AnalysisRequest): string {
  // Include plan so a free-tier run can't satisfy a pro-tier idempotency check
  // (different narration tier => genuinely different artifact).
  return djb2(`${req.plan}::${normalize(req)}`);
}

const BURST_WINDOW_MS = 60_000;
const SOFT_THROTTLE_LIMIT = 3; // 3–4 analyses / 60s => degrade narration tier
const BURST_LIMIT = 5; // ≥5 analyses / 60s / user => hard throttle

export async function dedupe(
  req: AnalysisRequest,
  store: AuditStore,
  now: () => number,
): Promise<{ result: DedupeResult; trace: StageTrace }> {
  const started = now();
  const fp = fingerprint(req);

  // 1) Idempotency check.
  const prior = await store.getByFingerprint(fp);
  if (prior) {
    const result: DedupeResult = {
      fingerprint: fp,
      is_duplicate: true,
      duplicate_of: prior.report_id,
      is_burst: false,
      is_soft_throttle: false,
      cache_action: "hit",
    };
    return {
      result,
      trace: {
        stage: "dedupe",
        verdict: "PASS",
        started_at: started,
        duration_ms: now() - started,
        cost_usd: 0,
        detail: { result },
        notes: ["Identical prior analysis returned; no recompute."],
      },
    };
  }

  // 2) Burst guard (two tiers: soft throttle degrades quality, hard burst blocks).
  const recent = await store.recentCountForUser(req.user_id, BURST_WINDOW_MS);
  const isBurst = recent >= BURST_LIMIT;
  const isSoftThrottle = !isBurst && recent >= SOFT_THROTTLE_LIMIT;
  const result: DedupeResult = {
    fingerprint: fp,
    is_duplicate: false,
    is_burst: isBurst,
    is_soft_throttle: isSoftThrottle,
    cache_action: isBurst ? "miss" : "store",
  };

  const notes: string[] = [];
  if (isBurst) notes.push(`Burst limit hit (${recent} in 60s); throttle this user.`);
  else if (isSoftThrottle) notes.push(`Soft throttle (${recent} in 60s); narration tier downshifted.`);

  return {
    result,
    trace: {
      stage: "dedupe",
      verdict: isBurst ? "FAIL" : "PASS",
      started_at: started,
      duration_ms: now() - started,
      cost_usd: 0,
      detail: { result, recent_count: recent },
      notes,
    },
  };
}

export const _internal = { BURST_LIMIT, BURST_WINDOW_MS, SOFT_THROTTLE_LIMIT };
