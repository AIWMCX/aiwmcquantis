/**
 * analytica.evidence.v1 (Python/Pydantic, analytica-cf apps/api/app/evidence.py) → aiwmc.evidence.v1.
 *
 * Mapping notes (each is pinned by a contract test):
 *  - Analytica drops the fetched URL; canonical_url fills both url fields.
 *  - Sentinels become null: publisher "Unknown publisher", title "", source_type
 *    "UNKNOWN" (kind other / primacy unknown), lineage.retrieved_at "not-retrieved".
 *  - snapshot.content_hash hashes metadata + snippet as Python JSON, so it is kept
 *    as an opaque legacy hash. The page itself was never captured.
 *  - quality.* scores are not carried: freshness is a constant 1.0 there and the
 *    rest are recomputable from claims. Recorded in lineage.dropped.
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

export const ANALYTICA_ADAPTER_ID = 'adapter:analytica.evidence.v1->aiwmc.evidence.v1@1';

const Hex = z.string().regex(/^[a-f0-9]{64}$/);
export const AnalyticaEvidenceV1Schema = z.object({
  schema_version: z.literal('analytica.evidence.v1'),
  upstream_api_version: z.literal('predicta.search.v1'),
  packet_id: z.string().min(1),
  case_id: z.string().min(1),
  research_run_id: z.string().min(1),
  subject: z.object({
    submitted_name: z.string(),
    geography: z.string(),
    industry: z.string(),
    resolution_status: z.literal('UNRESOLVED'),
  }),
  query: z.record(z.unknown()),
  sources: z.array(z.object({
    source_id: z.string().min(1),
    provider_id: z.string().min(1),
    canonical_url: z.string(),
    title: z.string(),
    publisher: z.string(),
    publication_date: z.string().nullable().optional(),
    source_type: z.string(),
    snapshot: z.object({ retrieved_at: z.string(), content_hash: Hex, text: z.string() }),
  })),
  passages: z.array(z.object({ passage_id: z.string().min(1), source_id: z.string().min(1), text: z.string(), content_hash: Hex })),
  claims: z.array(z.object({
    claim_id: z.string().min(1),
    statement: z.string(),
    status: z.string(),
    evidence: z.array(z.object({ source_id: z.string(), passage_id: z.string(), relation: z.enum(['SUPPORTS', 'CONTRADICTS', 'QUALIFIES']) })),
    independent_source_count: z.number().int().nonnegative(),
    limitations: z.array(z.string()).default([]),
  })),
  contradictions: z.array(z.object({
    contradiction_id: z.string().min(1),
    claim_id: z.string().min(1),
    supporting_passage_ids: z.array(z.string()),
    contradicting_passage_ids: z.array(z.string()),
    explanation: z.string(),
  })),
  quality: z.object({
    coverage: z.number(), corroboration: z.number(), freshness: z.number(),
    source_diversity: z.number(), overall_confidence: z.number(), limitations: z.array(z.string()).default([]),
  }),
  lineage: z.object({
    predicta_version: z.string(),
    provider_versions: z.record(z.string()),
    retrieved_at: z.string(),
    content_hash: Hex,
  }),
});
export type AnalyticaEvidenceV1 = z.infer<typeof AnalyticaEvidenceV1Schema>;

const nonEmpty = (s: string | null | undefined): string | null => (s && s.trim() ? s : null);
const notSentinel = (s: string, sentinel: string): string | null => (s === sentinel ? null : nonEmpty(s));
const isoOrNull = (s: string): string | null => (Number.isNaN(Date.parse(s)) || !/^\d{4}-\d{2}-\d{2}T/.test(s) ? null : s);

export function adaptAnalyticaEvidenceV1(raw: unknown): EvidencePacketV1 {
  const a = AnalyticaEvidenceV1Schema.parse(raw);

  const sources: EvidenceSourceV1[] = a.sources.map((s) => {
    const { source_kind, primacy } = splitLegacySourceType(s.source_type);
    return {
      source_id: s.source_id,
      provider_id: s.provider_id,
      url: s.canonical_url,
      canonical_url: s.canonical_url,
      title: nonEmpty(s.title),
      publisher: notSentinel(s.publisher, 'Unknown publisher'),
      author: null,
      language: null,
      published_at: nonEmpty(s.publication_date ?? null),
      retrieved_at: s.snapshot.retrieved_at,
      source_kind,
      primacy,
      freshness: 'unknown',
      independence_cluster: null,
      snapshot: NOT_CAPTURED,
      policy: UNREVIEWED_POLICY,
      legacy: {
        schema: 'analytica.evidence.v1',
        scheme: 'sha256(python canonical json of {canonical_url,title,publisher,publication_date,text})',
        content_hash: s.snapshot.content_hash,
      },
    };
  });

  const passages = a.passages.map((p) => makePassage({
    passage_id: p.passage_id,
    source_id: p.source_id,
    text: p.text,
    locator: null,
    extracted_at: null,
    legacy_hash: p.content_hash,
  }));

  const claims = a.claims.map((c) => ({
    claim_id: c.claim_id,
    statement: c.statement,
    status: mapVocabulary(LEGACY_UPPER_CLAIM_STATUS, c.status, 'Analytica claim status')!.value,
    status_qualifier: null,
    kind: null,
    evidence: c.evidence.map((l) => ({ source_id: l.source_id, passage_id: l.passage_id, relation: l.relation.toLowerCase() as 'supports' | 'contradicts' | 'qualifies' })),
    independent_source_count: c.independent_source_count,
    freshness: 'unknown' as const,
    limitations: c.limitations,
  }));

  // Analytica derives its contradictions from CONTRADICTS links; re-derive so the
  // packet cannot carry one that disagrees with its own claims, then keep its wording.
  const legacyExplanations = new Map(a.contradictions.map((c) => [c.claim_id, c.explanation]));
  const contradictions = deriveContradictions(claims, null).map((c) => ({ ...c, explanation: nonEmpty(legacyExplanations.get(c.claim_id)) }));

  const retrieved = a.sources.map((s) => s.snapshot.retrieved_at).filter((t) => isoOrNull(t)).sort();

  return finalizeEvidencePacket({
    schema_version: 'aiwmc.evidence.v1',
    created_at: null,
    subject: {
      name: a.subject.submitted_name,
      geography: nonEmpty(a.subject.geography),
      industry: nonEmpty(a.subject.industry),
    },
    sources,
    passages,
    claims,
    contradictions,
    limitations: [...new Set(a.quality.limitations)],
    lineage: {
      produced_by: { system: 'analytica', component: 'predicta_evidence_port', version: nonEmpty(a.lineage.predicta_version) },
      upstream: [
        { schema: 'predicta.search.v1', id: a.research_run_id === 'unknown' ? null : a.research_run_id, content_hash: null },
        { schema: 'analytica.evidence.v1', id: a.packet_id, content_hash: a.lineage.content_hash },
      ],
      transformations: [ANALYTICA_ADAPTER_ID],
      component_versions: { ...a.lineage.provider_versions },
      run_id: a.research_run_id,
      case_id: a.case_id,
      retrieved_from: retrieved[0] ?? null,
      retrieved_to: isoOrNull(a.lineage.retrieved_at) ?? retrieved[retrieved.length - 1] ?? null,
      degraded: null,
      gaps: [],
      dropped: [
        { field: 'quality', count: 1, reason: 'scores are recomputable from claims; Analytica freshness is a constant' },
        { field: 'query', count: 1, reason: 'raw Predicta query envelope; its id is kept in lineage.upstream' },
      ],
    },
  });
}
