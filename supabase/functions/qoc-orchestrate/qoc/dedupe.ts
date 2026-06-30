// ============================================================================
// QOC Stage: DEDUPE (lineage: D4)
// ----------------------------------------------------------------------------
// Idempotency + abuse throttling, BEFORE the expensive engine + AI run.
//   1. Fingerprint the normalized request. Identical request already analyzed?
//      -> return the prior report, $0 spent.
//   2. Soft throttle: 3–4 req/60s → narration tier downshifted (graceful).
//   3. Hard burst guard: ≥5 req/60s → reject entirely, $0.
//
// HARDENING (F-7): fingerprint widened from 32-bit djb2 (collision at ~77k
//   distinct inputs, birthday bound on 2^32) to ~64-bit djb2+sdbm (birthday
//   bound ~4.3B). Also keyed by user_id so two different users submitting the
//   same idea get different fingerprints — fixing a cross-user report_id
//   reference and an RLS-alignment bug.
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

// Two independent rolling hashes concatenated → ~64-bit key. No sha lib needed
// (keeps the stage portable across Deno/Node/test). djb2+sdbm pushes the
// birthday collision bound to ~4.3B inputs vs ~77k for djb2-32 alone.
function hash64(s: string): string {
  let d = 5381; // djb2
  let g = 0;    // sdbm
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    d = ((d << 5) + d + c) >>> 0;
    g = (c + (g << 6) + (g << 16) - g) >>> 0;
  }
  return d.toString(16).padStart(8, "0") + g.toString(16).padStart(8, "0");
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

// Keyed by user_id + plan + content: two users submitting the same idea get
// different fingerprints, so B never receives A's report_id (RLS-correct).
// Plan in the key prevents a free-tier run from satisfying a pro-tier check.
export function fingerprint(req: AnalysisRequest): string {
  return hash64(`${req.user_id}::${req.plan}::${normalize(req)}`);
}

const BURST_WINDOW_MS = 60_000;
const SOFT_THROTTLE_LIMIT = 3; // 3-4 req/60s → downshift narration tier
const BURST_LIMIT = 5;         // ≥5 req/60s → hard block

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

  // 2) Burst guard (soft throttle first, then hard block).
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

  return {
    result,
    trace: {
      stage: "dedupe",
      verdict: isBurst ? "FAIL" : "PASS",
      started_at: started,
      duration_ms: now() - started,
      cost_usd: 0,
      detail: { result, recent_count: recent },
      notes: isBurst
        ? [`Burst limit hit (${recent} in 60s); throttle this user.`]
        : isSoftThrottle
        ? [`Soft throttle active (${recent} in 60s); narration tier will downshift.`]
        : [],
    },
  };
}

export const _internal = { BURST_LIMIT, SOFT_THROTTLE_LIMIT, BURST_WINDOW_MS };
