/**
 * Quantis Evidence Service — pure mapper from in-memory evidence shapes to
 * the E5 persistence schema's row shapes (PR E6).
 *
 * Pure, no I/O, no Supabase client. The caller (evidence-shadow-worker)
 * does the actual inserts; this module only decides WHAT rows to build,
 * so that decision logic is unit-testable without a database.
 *
 * Two rules encoded here that are NOT optional or configurable:
 *
 *   1. evidence_passages rows are only ever built for a source whose
 *      storagePolicy is PASSAGE_ALLOWED or FULL_ALLOWED. This mirrors
 *      the evidence_passages_storage_policy_guard trigger in
 *      20260810090000_evidence_service_schema.sql -- that trigger would
 *      reject anything else, so this mapper filters BEFORE attempting an
 *      insert rather than relying on the DB to reject it. Today every
 *      Tavily-sourced EvidenceSource is METADATA_ONLY (see
 *      provider-registry.ts's unresolved caching-rights finding), so in
 *      practice this mapper currently never emits a passage row -- that
 *      is the correct, honest behavior for the current provider set, not
 *      a bug.
 *
 *   2. numeric_observations and evidence_evaluations are NOT populated
 *      here. numericObservations is always [] on the packet (see
 *      pipeline.ts's own honesty note), and evidence_evaluations is
 *      explicitly scoped to a future evaluation harness (E8) per that
 *      table's own schema comment -- populating it early would misuse a
 *      column reserved for a different, not-yet-built measurement.
 */
import type { EvidenceClaim, EvidencePassage, EvidenceRequest, EvidenceSource, QuantisEvidencePacket } from './types';

const PERSISTABLE_PASSAGE_POLICIES = new Set(['PASSAGE_ALLOWED', 'FULL_ALLOWED']);

export interface EvidenceRequestRow {
  analysis_id: string;
  user_id: string;
  risk_class: string;
  questions: EvidenceRequest['questions'];
}

export interface EvidencePacketRow {
  id: string;
  analysis_id: string;
  user_id: string;
  evidence_request_id: string;
  query_plan_version: string;
  provider_set_version: string;
  ranking_version: string;
  evidence_schema_version: string;
  source_lenses: string[];
  unresolved_questions: string[];
  contradictions: string[];
  degraded: boolean;
  retrieval_latency_ms: number;
  cost_usd?: number;
  content_hash: string;
}

export interface EvidenceSourceRow {
  id: string;
  analysis_id: string;
  user_id: string;
  evidence_packet_id: string;
  canonical_url: string;
  publisher?: string;
  author?: string;
  published_at?: string;
  retrieved_at: string;
  content_hash: string;
  source_type: string;
  primary_status: string;
  independence_cluster?: string;
  geography?: string;
  language?: string;
  freshness: string;
  storage_policy: string;
  provider_id: string;
}

export interface EvidencePassageRow {
  id: string;
  analysis_id: string;
  user_id: string;
  evidence_source_id: string;
  text: string;
  heading?: string;
  page?: number;
  anchor?: string;
  extracted_at: string;
  content_hash: string;
}

export interface EvidenceClaimRow {
  id: string;
  analysis_id: string;
  user_id: string;
  evidence_packet_id: string;
  statement: string;
  support: EvidenceClaim['support'];
  status: string;
  freshness: string;
  source_independence_count: number;
}

export function mapEvidenceRequestRow(
  request: EvidenceRequest,
  analysisId: string,
  userId: string,
): EvidenceRequestRow {
  return {
    analysis_id: analysisId,
    user_id: userId,
    risk_class: request.riskClass,
    questions: request.questions,
  };
}

export function mapEvidencePacketRow(
  packet: QuantisEvidencePacket,
  analysisId: string,
  userId: string,
  evidenceRequestId: string,
): EvidencePacketRow {
  return {
    id: packet.evidencePacketId,
    analysis_id: analysisId,
    user_id: userId,
    evidence_request_id: evidenceRequestId,
    query_plan_version: packet.queryPlanVersion,
    provider_set_version: packet.providerSetVersion,
    ranking_version: packet.rankingVersion,
    evidence_schema_version: packet.evidenceSchemaVersion,
    source_lenses: packet.sourceLenses,
    unresolved_questions: packet.unresolvedQuestions,
    contradictions: packet.contradictions,
    degraded: packet.degraded,
    retrieval_latency_ms: packet.retrievalLatencyMs,
    cost_usd: packet.costUsd,
    content_hash: packet.contentHash,
  };
}

export function mapEvidenceSourceRows(
  sources: EvidenceSource[],
  analysisId: string,
  userId: string,
  evidencePacketId: string,
): EvidenceSourceRow[] {
  return sources.map((s) => ({
    id: s.sourceId,
    analysis_id: analysisId,
    user_id: userId,
    evidence_packet_id: evidencePacketId,
    canonical_url: s.canonicalUrl,
    publisher: s.publisher,
    author: s.author,
    published_at: s.publishedAt,
    retrieved_at: s.retrievedAt,
    content_hash: s.contentHash,
    source_type: s.sourceType,
    primary_status: s.primaryStatus,
    independence_cluster: s.independenceCluster,
    geography: s.geography,
    language: s.language,
    freshness: s.freshness,
    storage_policy: s.storagePolicy,
    provider_id: s.providerId,
  }));
}

/**
 * Only emits a row for passages whose OWN source's storagePolicy permits
 * persisting passage text. See module header rule 1.
 */
export function mapEvidencePassageRows(
  passages: EvidencePassage[],
  sources: EvidenceSource[],
  analysisId: string,
  userId: string,
): EvidencePassageRow[] {
  const policyBySourceId = new Map(sources.map((s) => [s.sourceId, s.storagePolicy]));
  return passages
    .filter((p) => PERSISTABLE_PASSAGE_POLICIES.has(policyBySourceId.get(p.sourceId) ?? 'NO_STORE'))
    .map((p) => ({
      id: p.passageId,
      analysis_id: analysisId,
      user_id: userId,
      evidence_source_id: p.sourceId,
      text: p.text,
      heading: p.locator?.heading,
      page: p.locator?.page,
      anchor: p.locator?.anchor,
      extracted_at: p.extractedAt,
      content_hash: p.contentHash,
    }));
}

export function mapEvidenceClaimRows(
  claims: EvidenceClaim[],
  analysisId: string,
  userId: string,
  evidencePacketId: string,
): EvidenceClaimRow[] {
  return claims.map((c) => ({
    id: c.claimId,
    analysis_id: analysisId,
    user_id: userId,
    evidence_packet_id: evidencePacketId,
    statement: c.statement,
    support: c.support,
    status: c.status,
    freshness: c.freshness,
    source_independence_count: c.sourceIndependenceCount,
  }));
}
