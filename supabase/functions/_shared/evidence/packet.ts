/**
 * Quantis Evidence Service — Locked Evidence Packet construction and
 * content hashing (PR E1/E5, master prompt section 17).
 *
 * Mirrors this repository's existing convention for `analysis_snapshots`
 * (`supabase/migrations/20260719225336_analysis_snapshots.sql`), which
 * hashes normalized content with SHA-256 rather than a fast non-cryptographic
 * hash, for consistency and for the same tamper-evidence property. Uses
 * the standard Web Crypto API (`crypto.subtle`), available in both the
 * Deno edge runtime and Node 18+/Vitest, so this file needs no
 * environment-specific branching.
 */
import type { QuantisEvidencePacket, EvidenceSource, EvidencePassage, EvidenceClaim, NumericObservation, SourceLens } from './types.ts';
import { EVIDENCE_SCHEMA_VERSION } from './types.ts';

/**
 * Deterministically stringifies a value with all object keys sorted
 * recursively, so semantically identical content always produces the
 * same string regardless of property insertion order -- required for a
 * stable content hash.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

/** Exported for callers (e.g. the pipeline) that need to content-hash an individual passage/source, not just a whole packet. */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** The fields that determine a packet's identity/content -- excludes generated metadata (id, createdAt, contentHash itself). */
export interface EvidencePacketContent {
  analysisRunId: string;
  queryPlanVersion: string;
  providerSetVersion: string;
  rankingVersion: string;
  evidenceSchemaVersion: string;
  sourceLenses: SourceLens[];
  sources: EvidenceSource[];
  passages: EvidencePassage[];
  claims: EvidenceClaim[];
  numericObservations: NumericObservation[];
  unresolvedQuestions: string[];
  contradictions: string[];
  degraded: boolean;
}

export async function computeEvidencePacketContentHash(content: EvidencePacketContent): Promise<string> {
  return sha256Hex(stableStringify(content));
}

export interface BuildEvidencePacketInput extends Omit<EvidencePacketContent, 'evidenceSchemaVersion'> {
  retrievalLatencyMs: number;
  costUsd?: number;
  /** Injectable for deterministic tests; defaults to crypto.randomUUID(). */
  idGenerator?: () => string;
  /** Injectable for deterministic tests; defaults to new Date().toISOString(). */
  clock?: () => string;
}

/**
 * Constructs a complete, hashed `QuantisEvidencePacket`. This is the ONLY
 * place a packet should be assembled -- callers must not hand-construct
 * the object literal, since that would bypass the content-hash guarantee.
 */
export async function buildEvidencePacket(input: BuildEvidencePacketInput): Promise<QuantisEvidencePacket> {
  const content: EvidencePacketContent = {
    analysisRunId: input.analysisRunId,
    queryPlanVersion: input.queryPlanVersion,
    providerSetVersion: input.providerSetVersion,
    rankingVersion: input.rankingVersion,
    evidenceSchemaVersion: EVIDENCE_SCHEMA_VERSION,
    sourceLenses: input.sourceLenses,
    sources: input.sources,
    passages: input.passages,
    claims: input.claims,
    numericObservations: input.numericObservations,
    unresolvedQuestions: input.unresolvedQuestions,
    contradictions: input.contradictions,
    degraded: input.degraded,
  };

  const contentHash = await computeEvidencePacketContentHash(content);
  const evidencePacketId = (input.idGenerator ?? (() => crypto.randomUUID()))();
  const createdAt = (input.clock ?? (() => new Date().toISOString()))();

  return {
    evidencePacketId,
    createdAt,
    ...content,
    retrievalLatencyMs: input.retrievalLatencyMs,
    costUsd: input.costUsd,
    contentHash,
  };
}

/**
 * Verifies a packet's stored contentHash still matches its actual content
 * -- the tamper-evidence check, analogous to how analysis_snapshots'
 * numeric_output_hash lets a later audit confirm byte-identical content.
 */
export async function verifyEvidencePacketIntegrity(packet: QuantisEvidencePacket): Promise<boolean> {
  const { evidencePacketId, createdAt, contentHash, retrievalLatencyMs, costUsd, ...content } = packet;
  const recomputed = await computeEvidencePacketContentHash(content as EvidencePacketContent);
  return recomputed === contentHash;
}
