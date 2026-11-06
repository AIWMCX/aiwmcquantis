/**
 * Quantis System A QuantisEvidencePacket (branch feature/evidence-service, schema
 * 0.1.0; read only, never merged) → aiwmc.evidence.v1. Decision D4: salvage, don't merge.
 *
 * Mapping notes (each is pinned by a contract test):
 *  - System A writes the page title into `publisher` and has no title field; the
 *    adapter moves it to `title` and leaves publisher null.
 *  - Source and passage contentHash are both sha256(utf8 snippet). v1 passage.sha256
 *    is the same function, so it reproduces System A's passage hash exactly.
 *  - `contradictions` is an unstructured string list (always empty in practice);
 *    v1 derives structured contradictions from CONTRADICTS links instead.
 *  - numericObservations have no v1 home until the Phase 2 Observation type and
 *    are recorded in lineage.dropped; unresolvedQuestions become lineage.gaps.
 */
import { z } from 'npm:zod@3.23.8';
import { canonicalJson } from '../../canonical-json.ts';
import {
  deriveContradictions,
  finalizeEvidencePacket,
  makePassage,
  NOT_CAPTURED,
  type EvidencePacketV1,
  type EvidenceSourceV1,
} from '../evidence-v1.ts';
import { sha256Utf8 } from '../sha256.ts';
import { mapVocabulary, SYSTEM_A_CLAIM_STATUS } from '../vocabulary.ts';
import { systemASourceKind } from './source-type.ts';

export const SYSTEM_A_ADAPTER_ID = 'adapter:quantis.evidence_packet.0.1.0->aiwmc.evidence.v1@1';

const Freshness = z.enum(['CURRENT', 'AGING', 'HISTORICAL', 'UNKNOWN']);
export const SystemAPacketSchema = z.object({
  evidencePacketId: z.string().min(1),
  analysisRunId: z.string().min(1),
  queryPlanVersion: z.string(),
  providerSetVersion: z.string(),
  rankingVersion: z.string(),
  evidenceSchemaVersion: z.literal('0.1.0'),
  createdAt: z.string(),
  sourceLenses: z.array(z.string()),
  sources: z.array(z.object({
    sourceId: z.string().min(1),
    canonicalUrl: z.string(),
    publisher: z.string().optional(),
    author: z.string().optional(),
    publishedAt: z.string().optional(),
    retrievedAt: z.string(),
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    sourceType: z.string(),
    primaryStatus: z.enum(['PRIMARY', 'SECONDARY', 'UNKNOWN']),
    independenceCluster: z.string().optional(),
    geography: z.string().optional(),
    language: z.string().optional(),
    freshness: Freshness,
    storagePolicy: z.enum(['NO_STORE', 'METADATA_ONLY', 'PASSAGE_ALLOWED', 'FULL_ALLOWED']),
    providerId: z.string().min(1),
  })),
  passages: z.array(z.object({
    passageId: z.string().min(1),
    sourceId: z.string().min(1),
    text: z.string(),
    locator: z.object({ heading: z.string().optional(), page: z.number().optional(), anchor: z.string().optional() }).optional(),
    extractedAt: z.string(),
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  })),
  claims: z.array(z.object({
    claimId: z.string().min(1),
    statement: z.string(),
    support: z.array(z.object({ sourceId: z.string(), passageId: z.string(), relation: z.enum(['SUPPORTS', 'CONTRADICTS', 'QUALIFIES']) })),
    status: z.string(),
    freshness: Freshness,
    sourceIndependenceCount: z.number().int().nonnegative(),
  })),
  numericObservations: z.array(z.unknown()),
  unresolvedQuestions: z.array(z.string()),
  contradictions: z.array(z.string()),
  degraded: z.boolean(),
  retrievalLatencyMs: z.number(),
  costUsd: z.number().optional(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type SystemAPacket = z.infer<typeof SystemAPacketSchema>;

/** System A provider capability flags (ProviderCapability in its types.ts). */
export interface SystemAProviderCapability {
  canRedisplay: boolean;
  canCache: boolean;
  canTrainOnResults: boolean;
  termsReviewedAt?: string;
  termsReviewCitation?: string;
}

/** Re-computes System A's own packet hash (sha256 of key-sorted JSON, minus five fields). */
export function systemALegacyPacketHash(packet: SystemAPacket): string {
  const { evidencePacketId: _a, createdAt: _b, retrievalLatencyMs: _c, costUsd: _d, contentHash: _e, ...content } = packet;
  return sha256Utf8(canonicalJson(content));
}

const lower = <T extends string>(s: T) => s.toLowerCase() as Lowercase<T>;

export function adaptSystemAPacket(raw: unknown, providers: Record<string, SystemAProviderCapability> = {}): EvidencePacketV1 {
  const a = SystemAPacketSchema.parse(raw);

  const sources: EvidenceSourceV1[] = a.sources.map((s) => {
    const cap = providers[s.providerId];
    return {
      source_id: s.sourceId,
      provider_id: s.providerId,
      url: s.canonicalUrl,
      canonical_url: s.canonicalUrl,
      title: s.publisher?.trim() ? s.publisher : null,
      publisher: null,
      author: s.author?.trim() ? s.author : null,
      language: s.language?.trim() ? s.language : null,
      published_at: s.publishedAt?.trim() ? s.publishedAt : null,
      retrieved_at: s.retrievedAt,
      source_kind: systemASourceKind(s.sourceType),
      primacy: lower(s.primaryStatus),
      freshness: lower(s.freshness),
      independence_cluster: s.independenceCluster ?? null,
      snapshot: NOT_CAPTURED,
      policy: {
        license: cap?.termsReviewCitation ?? null,
        terms_url: null,
        terms_reviewed_at: cap?.termsReviewedAt ?? null,
        storage: lower(s.storagePolicy),
        can_redisplay: cap ? cap.canRedisplay : null,
        can_cache: cap ? cap.canCache : null,
        can_train: false,
        permitted_uses: ['discovery', 'evidence'],
      },
      legacy: { schema: 'quantis.evidence_packet.0.1.0', scheme: 'sha256(utf8 snippet)', content_hash: s.contentHash },
    };
  });

  const passages = a.passages.map((p) => {
    const locator = p.locator && Object.keys(p.locator).length ? {
      ...(p.locator.heading ? { heading: p.locator.heading } : {}),
      ...(p.locator.page != null ? { page: p.locator.page } : {}),
      ...(p.locator.anchor ? { anchor: p.locator.anchor } : {}),
    } : null;
    return makePassage({
      passage_id: p.passageId,
      source_id: p.sourceId,
      text: p.text,
      locator,
      extracted_at: p.extractedAt,
      legacy_hash: p.contentHash,
    });
  });

  const claims = a.claims.map((c) => ({
    claim_id: c.claimId,
    statement: c.statement,
    status: mapVocabulary(SYSTEM_A_CLAIM_STATUS, c.status, 'System A claim status')!.value,
    status_qualifier: null,
    kind: null,
    evidence: c.support.map((l) => ({ source_id: l.sourceId, passage_id: l.passageId, relation: lower(l.relation) })),
    independent_source_count: c.sourceIndependenceCount,
    freshness: lower(c.freshness),
    limitations: [],
  }));

  const retrieved = a.sources.map((s) => s.retrievedAt).sort();
  const dropped: EvidencePacketV1['lineage']['dropped'] = [
    { field: 'sourceLenses', count: a.sourceLenses.length, reason: 'query-planning input, kept in component_versions only by version' },
  ];
  if (a.numericObservations.length) {
    dropped.push({ field: 'numericObservations', count: a.numericObservations.length, reason: 'no v1 type; Phase 2 Observation' });
  }
  if (a.costUsd !== undefined) dropped.push({ field: 'costUsd', count: 1, reason: 'belongs in the cost ledger, not the evidence packet' });

  return finalizeEvidencePacket({
    schema_version: 'aiwmc.evidence.v1',
    created_at: a.createdAt,
    subject: null,
    sources,
    passages,
    claims,
    contradictions: deriveContradictions(claims, null),
    limitations: a.contradictions.map((c) => `System A contradiction note: ${c}`),
    lineage: {
      produced_by: { system: 'quantis_evidence_service', component: 'pipeline', version: a.evidenceSchemaVersion },
      upstream: [{ schema: 'quantis.evidence_packet.0.1.0', id: a.evidencePacketId, content_hash: a.contentHash }],
      transformations: [SYSTEM_A_ADAPTER_ID],
      component_versions: { queryPlan: a.queryPlanVersion, providerSet: a.providerSetVersion, ranking: a.rankingVersion },
      run_id: a.analysisRunId,
      case_id: null,
      retrieved_from: retrieved[0] ?? null,
      retrieved_to: retrieved[retrieved.length - 1] ?? null,
      degraded: a.degraded,
      gaps: a.unresolvedQuestions,
      dropped,
    },
  });
}
