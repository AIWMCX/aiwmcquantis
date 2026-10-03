/**
 * Idempotency hashing for the decision-review pipeline.
 *
 * review_cache_key = sha256(canonicalResultHash + evidenceHash + reviewVersion + reviewerModel)
 *
 * A re-opened page, a React StrictMode double-mount, a re-rendered PDF, or a
 * dashboard remount must NEVER re-invoke the (metered) reviewer. Only a
 * materially changed canonical analysis or evidence set should.
 */
import type { EvidenceSummary, TypedFinancialMetric } from './contracts.ts';

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Stable serialization: sorted keys, fixed precision — order/formatting must never change the hash. */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (typeof v === 'number') return Math.round(v * 1e6) / 1e6;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.keys(v as Record<string, unknown>)
        .sort()
        .reduce((acc, k) => {
          acc[k] = (v as Record<string, unknown>)[k];
          return acc;
        }, {} as Record<string, unknown>);
    }
    return v;
  });
}

/** Hashes only the canonical financial fields that matter for review freshness — not narrative text, not timestamps. */
export async function computeCanonicalResultHash(analysisId: string, metrics: TypedFinancialMetric[]): Promise<string> {
  return await sha256Hex(stableStringify({ analysisId, metrics }));
}

export async function computeEvidenceHash(evidence: EvidenceSummary[]): Promise<string> {
  return await sha256Hex(stableStringify(evidence));
}

export async function computeReviewCacheKey(args: {
  canonicalResultHash: string;
  evidenceHash: string;
  reviewVersion: string;
  reviewerModel: string;
}): Promise<string> {
  return await sha256Hex(
    `${args.canonicalResultHash}:${args.evidenceHash}:${args.reviewVersion}:${args.reviewerModel}`,
  );
}

export async function hashPacketInput(packet: unknown): Promise<string> {
  return await sha256Hex(stableStringify(packet));
}

export async function hashReviewOutput(review: unknown): Promise<string> {
  return await sha256Hex(stableStringify(review));
}
