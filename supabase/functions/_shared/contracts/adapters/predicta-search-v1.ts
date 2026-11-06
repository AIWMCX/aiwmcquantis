/**
 * predicta.search.v1 (Predicta /api/search, Akbar Robotics/predicta src/contracts/schemas.ts) → aiwmc.evidence.v1.
 *
 * Mapping notes (each is pinned by a contract test):
 *  - A real Predicta response has no apiVersion field (its Zod schema strips it);
 *    the adapter accepts it absent and rejects any other value.
 *  - Predicta emits no passages. Each candidate with a snippet becomes one passage
 *    `passage_<candidateId>`, the id convention Analytica's claim links already use.
 *  - Predicta's provider registry flags (canRedisplay/canCache/canPersist) are not in
 *    the response; callers pass them as `providerPolicies` or the source stays unreviewed.
 */
import { z } from 'npm:zod@3.23.8';
import {
  deriveContradictions,
  finalizeEvidencePacket,
  makePassage,
  NOT_CAPTURED,
  UNREVIEWED_POLICY,
  type EvidencePacketV1,
  type EvidenceSourceV1,
} from '../evidence-v1.ts';
import { LEGACY_UPPER_CLAIM_STATUS, mapVocabulary } from '../vocabulary.ts';
import { splitLegacySourceType } from './source-type.ts';

export const PREDICTA_ADAPTER_ID = 'adapter:predicta.search.v1->aiwmc.evidence.v1@1';

export const PredictaSearchV1Schema = z.object({
  apiVersion: z.literal('predicta.search.v1').optional(),
  query: z.object({
    queryId: z.string().min(1),
    queryVersion: z.number().int().nonnegative(),
    rawQuery: z.string().min(1).max(2048),
    normalizedQuery: z.string().min(1).max(2048),
    language: z.string().min(2).max(8),
    country: z.string().min(2).max(8).optional(),
    lens: z.string(),
    safeSearch: z.enum(['off', 'moderate', 'strict']),
    createdAt: z.string().min(1),
    sensitiveInputDetected: z.boolean(),
  }),
  intent: z.object({ task: z.string() }).passthrough(),
  origin: z.enum(['LOCAL_RESULT', 'PREDICTIVE_PREVIEW', 'CACHED_RESULT', 'LIVE_WEB_RESULT', 'RESEARCH_SYNTHESIS', 'UNVERIFIED']),
  candidates: z.array(z.object({
    candidateId: z.string().min(1),
    providerId: z.string().min(1),
    providerRank: z.number().int().nonnegative(),
    url: z.string().url(),
    canonicalUrl: z.string().url(),
    title: z.string(),
    snippet: z.string(),
    language: z.string().optional(),
    publisher: z.string().optional(),
    author: z.string().optional(),
    publicationDate: z.string().optional(),
    retrievalDate: z.string(),
    sourceType: z.enum(['PRIMARY', 'SECONDARY', 'AGGREGATOR', 'COMMUNITY', 'UNKNOWN']),
    score: z.number().optional(),
  })),
  claims: z.array(z.object({
    claimId: z.string().min(1),
    statement: z.string().min(1),
    status: z.string(),
    evidence: z.array(z.object({ sourceId: z.string(), passageId: z.string(), relation: z.enum(['SUPPORTS', 'CONTRADICTS', 'QUALIFIES']) })),
    independentSourceCount: z.number().int().nonnegative(),
    limitations: z.array(z.string()),
  })),
  diagnostics: z.object({
    providersRequested: z.array(z.string()),
    providersSucceeded: z.array(z.string()),
    providersFailed: z.array(z.string()),
    cacheHits: z.number().int().nonnegative(),
    latencyMs: z.number().nonnegative(),
    estimatedCostUsd: z.number().nonnegative(),
    degraded: z.boolean(),
  }),
}).passthrough();
export type PredictaSearchV1 = z.infer<typeof PredictaSearchV1Schema>;

export interface ProviderPolicy {
  canRedisplay: boolean;
  canCache: boolean;
  canPersist: boolean;
  license?: string;
  termsUrl?: string;
  termsReviewedAt?: string;
}

export interface PredictaAdapterOptions {
  predictaVersion?: string;
  caseId?: string;
  subject?: { name: string; geography?: string; industry?: string };
  providerPolicies?: Record<string, ProviderPolicy>;
}

const opt = (s: string | undefined): string | null => (s && s.trim() ? s : null);

function policyFor(p: ProviderPolicy | undefined): EvidenceSourceV1['policy'] {
  if (!p) return UNREVIEWED_POLICY;
  return {
    license: opt(p.license),
    terms_url: opt(p.termsUrl),
    terms_reviewed_at: opt(p.termsReviewedAt),
    storage: p.canPersist ? 'passage_allowed' : p.canCache ? 'metadata_only' : 'no_store',
    can_redisplay: p.canRedisplay,
    can_cache: p.canCache,
    can_train: false,
    permitted_uses: ['discovery', 'evidence'],
  };
}

export function adaptPredictaSearchV1(raw: unknown, options: PredictaAdapterOptions = {}): EvidencePacketV1 {
  const r = PredictaSearchV1Schema.parse(raw);

  const sources: EvidenceSourceV1[] = r.candidates.map((c) => ({
    source_id: c.candidateId,
    provider_id: c.providerId,
    url: c.url,
    canonical_url: c.canonicalUrl,
    title: opt(c.title),
    publisher: opt(c.publisher),
    author: opt(c.author),
    language: opt(c.language),
    published_at: opt(c.publicationDate),
    retrieved_at: c.retrievalDate,
    ...splitLegacySourceType(c.sourceType),
    freshness: 'unknown',
    independence_cluster: null,
    snapshot: NOT_CAPTURED,
    policy: policyFor(options.providerPolicies?.[c.providerId]),
    legacy: null,
  }));

  const passages = r.candidates.filter((c) => c.snippet.trim()).map((c) => makePassage({
    passage_id: `passage_${c.candidateId}`,
    source_id: c.candidateId,
    text: c.snippet,
    locator: null,
    extracted_at: c.retrievalDate,
    legacy_hash: null,
  }));

  const claims = r.claims.map((c) => ({
    claim_id: c.claimId,
    statement: c.statement,
    status: mapVocabulary(LEGACY_UPPER_CLAIM_STATUS, c.status, 'Predicta claim status')!.value,
    status_qualifier: null,
    kind: null,
    evidence: c.evidence.map((l) => ({ source_id: l.sourceId, passage_id: l.passageId, relation: l.relation.toLowerCase() as 'supports' | 'contradicts' | 'qualifies' })),
    independent_source_count: c.independentSourceCount,
    freshness: 'unknown' as const,
    limitations: c.limitations,
  }));

  const retrieved = r.candidates.map((c) => c.retrievalDate).sort();
  const limitations: string[] = [];
  if (r.origin === 'UNVERIFIED') limitations.push('Predicta marked this result UNVERIFIED');
  if (r.diagnostics.providersFailed.length) limitations.push(`Providers failed: ${r.diagnostics.providersFailed.join(', ')}`);
  if (r.diagnostics.providersRequested.length === 0) limitations.push('No provider served the requested lens');

  return finalizeEvidencePacket({
    schema_version: 'aiwmc.evidence.v1',
    created_at: /^\d{4}-\d{2}-\d{2}T/.test(r.query.createdAt) ? r.query.createdAt : null,
    subject: options.subject
      ? { name: options.subject.name, geography: opt(options.subject.geography), industry: opt(options.subject.industry) }
      : null,
    sources,
    passages,
    claims,
    contradictions: deriveContradictions(claims, null),
    limitations,
    lineage: {
      produced_by: { system: 'predicta', component: 'search', version: opt(options.predictaVersion) },
      upstream: [{ schema: 'predicta.search.v1', id: r.query.queryId, content_hash: null }],
      transformations: [PREDICTA_ADAPTER_ID],
      component_versions: {},
      run_id: r.query.queryId,
      case_id: opt(options.caseId),
      retrieved_from: retrieved[0] ?? null,
      retrieved_to: retrieved[retrieved.length - 1] ?? null,
      degraded: r.diagnostics.degraded,
      gaps: [],
      dropped: [{ field: 'intent', count: 1, reason: 'query-understanding output, not evidence' }],
    },
  });
}
