/**
 * aiwmc.evidence.v1 — the one evidence schema (Phase 1, contract set item 2).
 *
 * Replaces, through adapters only:
 *   analytica.evidence.v1        → adapters/analytica-evidence-v1.ts
 *   predicta.search.v1           → adapters/predicta-search-v1.ts
 *   Quantis System A packet 0.1.0 → adapters/quantis-system-a.ts
 * The ontology (ONTOLOGY-ADDENDUM-v1.0 §18) will read this shape in Phase 2.
 *
 * Rules the schema enforces (not just documents):
 *  - every id is unique; every reference resolves; a claim's passage belongs to
 *    the source it cites (no system checked this before);
 *  - passage.sha256 = SHA-256 of the passage text (UTF-8);
 *  - a source snapshot is either captured (with its SHA-256) or says why not;
 *    a captured snapshot needs a storage policy that allows full copies;
 *  - integrity.content_hash = SHA-256 of canonical-json-v2 of the packet without
 *    packet_id, created_at and integrity, so the same evidence hashes the same in
 *    any runtime;
 *  - unknown stays null (no "Unknown publisher", no "not-retrieved").
 * Legacy hashes are kept as opaque values in `legacy`; only their own system can
 * re-verify them.
 */
import { z } from 'npm:zod@3.23.8';
import { canonicalJson, CANONICAL_JSON_VERSION } from '../canonical-json.ts';
import { sha256Utf8 } from './sha256.ts';
import { ASSUMPTION_ORIGINS, CLAIM_QUALIFIERS, CLAIM_STATUSES } from './vocabulary.ts';

export const EVIDENCE_SCHEMA_VERSION = 'aiwmc.evidence.v1';

export const Sha256Hex = z.string().regex(/^[a-f0-9]{64}$/, 'lowercase hex SHA-256');
export const IsoDateTime = z.string().datetime({ offset: true });
/** A date as precise as the source gives it: 2026, 2026-02, 2026-02-01 or a full timestamp. */
export const PartialDate = z.string().regex(
  /^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?)?)?$/,
  'ISO 8601 date, possibly partial',
);
export const HttpUrl = z.string().url().refine((u) => /^https?:\/\//i.test(u), 'http(s) URL');
const Id = z.string().min(1).max(256);

export const SOURCE_KINDS = [
  'official', 'government', 'filing', 'company', 'licensed', 'academic', 'news',
  'community', 'documentation', 'local_business', 'aggregator', 'other',
] as const;
export const PRIMACY = ['primary', 'secondary', 'unknown'] as const;
export const FRESHNESS = ['current', 'aging', 'historical', 'unknown'] as const;
export const STORAGE_POLICIES = ['no_store', 'metadata_only', 'passage_allowed', 'full_allowed', 'unknown'] as const;
export const PERMITTED_USES = ['discovery', 'evidence', 'financial_assumption_proposal'] as const;
export const SNAPSHOT_STATUSES = ['captured', 'not_permitted', 'not_captured'] as const;
export const CLAIM_RELATIONS = ['supports', 'contradicts', 'qualifies'] as const;
export const CLAIM_KINDS = ['observed', 'calculated', 'inferred', 'customer_provided'] as const;
export const PRODUCING_SYSTEMS = ['analytica', 'predicta', 'quantis_evidence_service', 'quantis'] as const;

export const SourcePolicySchema = z.object({
  /** Licence or terms name, e.g. "CC BY 4.0", "Public Domain", "Tavily ToS". Null = not reviewed. */
  license: z.string().min(1).nullable(),
  terms_url: HttpUrl.nullable(),
  terms_reviewed_at: IsoDateTime.nullable(),
  storage: z.enum(STORAGE_POLICIES),
  can_redisplay: z.boolean().nullable(),
  can_cache: z.boolean().nullable(),
  /** Founder spec: no model training on sources. Only true with a reviewed licence. */
  can_train: z.literal(false),
  permitted_uses: z.array(z.enum(PERMITTED_USES)),
}).strict();

export const SnapshotSchema = z.object({
  status: z.enum(SNAPSHOT_STATUSES),
  /** SHA-256 of the retrieved bytes, exactly as fetched. */
  sha256: Sha256Hex.nullable(),
  byte_length: z.number().int().nonnegative().nullable(),
  media_type: z.string().min(1).nullable(),
  /** Where the bytes are stored (bucket path), when they are. */
  storage_ref: z.string().min(1).nullable(),
}).strict().superRefine((s, ctx) => {
  if (s.status === 'captured' && s.sha256 == null) ctx.addIssue({ code: 'custom', message: 'captured snapshot needs sha256' });
  if (s.status !== 'captured' && (s.sha256 != null || s.storage_ref != null)) {
    ctx.addIssue({ code: 'custom', message: `${s.status} snapshot cannot carry sha256 or storage_ref` });
  }
});

export const LegacyRefSchema = z.object({
  schema: z.string().min(1),
  /** How the legacy system computed its hash, e.g. "sha256(utf8 snippet)". */
  scheme: z.string().min(1),
  content_hash: Sha256Hex.nullable(),
}).strict();

export const SourceSchema = z.object({
  source_id: Id,
  provider_id: Id,
  url: HttpUrl,
  canonical_url: HttpUrl,
  title: z.string().min(1).nullable(),
  publisher: z.string().min(1).nullable(),
  author: z.string().min(1).nullable(),
  language: z.string().min(2).max(16).nullable(),
  published_at: PartialDate.nullable(),
  retrieved_at: IsoDateTime,
  source_kind: z.enum(SOURCE_KINDS),
  primacy: z.enum(PRIMACY),
  freshness: z.enum(FRESHNESS),
  independence_cluster: z.string().min(1).nullable(),
  snapshot: SnapshotSchema,
  policy: SourcePolicySchema,
  legacy: LegacyRefSchema.nullable(),
}).strict().superRefine((s, ctx) => {
  if (s.snapshot.status === 'captured' && s.policy.storage !== 'full_allowed') {
    ctx.addIssue({ code: 'custom', message: 'a captured snapshot needs storage policy full_allowed' });
  }
});

export const PassageSchema = z.object({
  passage_id: Id,
  source_id: Id,
  text: z.string().min(1),
  locator: z.object({
    heading: z.string().min(1).optional(),
    page: z.number().int().positive().optional(),
    anchor: z.string().min(1).optional(),
    start_offset: z.number().int().nonnegative().optional(),
    end_offset: z.number().int().nonnegative().optional(),
  }).strict().nullable(),
  extracted_at: IsoDateTime.nullable(),
  sha256: Sha256Hex,
  legacy_hash: Sha256Hex.nullable(),
}).strict().superRefine((p, ctx) => {
  if (sha256Utf8(p.text) !== p.sha256) ctx.addIssue({ code: 'custom', path: ['sha256'], message: 'sha256 does not match text' });
});

export const ClaimEvidenceLinkSchema = z.object({
  source_id: Id,
  passage_id: Id,
  relation: z.enum(CLAIM_RELATIONS),
}).strict();

export const ClaimSchema = z.object({
  claim_id: Id,
  statement: z.string().min(1),
  status: z.enum(CLAIM_STATUSES),
  status_qualifier: z.enum(CLAIM_QUALIFIERS).nullable(),
  kind: z.enum(CLAIM_KINDS).nullable(),
  evidence: z.array(ClaimEvidenceLinkSchema),
  independent_source_count: z.number().int().nonnegative(),
  freshness: z.enum(FRESHNESS),
  limitations: z.array(z.string().min(1)),
}).strict();

export const ContradictionSchema = z.object({
  contradiction_id: Id,
  claim_id: Id,
  supporting_passage_ids: z.array(Id),
  contradicting_passage_ids: z.array(Id).min(1),
  explanation: z.string().min(1).nullable(),
  status: z.enum(['open', 'resolved']),
}).strict();

export const LineageSchema = z.object({
  produced_by: z.object({
    system: z.enum(PRODUCING_SYSTEMS),
    component: z.string().min(1),
    version: z.string().min(1).nullable(),
  }).strict(),
  /** Packets this one was adapted from, oldest first. */
  upstream: z.array(z.object({
    schema: z.string().min(1),
    id: z.string().min(1).nullable(),
    content_hash: Sha256Hex.nullable(),
  }).strict()),
  /** Adapter or pipeline steps applied, e.g. "adapter:analytica.evidence.v1@1". */
  transformations: z.array(z.string().min(1)),
  component_versions: z.record(z.string()),
  run_id: Id,
  case_id: z.string().min(1).nullable(),
  retrieved_from: IsoDateTime.nullable(),
  retrieved_to: IsoDateTime.nullable(),
  degraded: z.boolean().nullable(),
  /** Questions the run could not answer. */
  gaps: z.array(z.string().min(1)),
  /** Legacy fields not carried into v1, so nothing disappears unannounced. */
  dropped: z.array(z.object({ field: z.string().min(1), count: z.number().int().nonnegative(), reason: z.string().min(1) }).strict()),
}).strict();

export const SubjectSchema = z.object({
  name: z.string().min(1),
  geography: z.string().min(1).nullable(),
  industry: z.string().min(1).nullable(),
}).strict();

const PacketBodySchema = z.object({
  schema_version: z.literal(EVIDENCE_SCHEMA_VERSION),
  packet_id: Id,
  created_at: IsoDateTime.nullable(),
  subject: SubjectSchema.nullable(),
  sources: z.array(SourceSchema),
  passages: z.array(PassageSchema),
  claims: z.array(ClaimSchema),
  contradictions: z.array(ContradictionSchema),
  limitations: z.array(z.string().min(1)),
  lineage: LineageSchema,
  integrity: z.object({
    algorithm: z.literal('sha256'),
    canonicalization: z.literal(CANONICAL_JSON_VERSION),
    content_hash: Sha256Hex,
  }).strict(),
}).strict();

export type EvidencePacketV1 = z.infer<typeof PacketBodySchema>;
export type EvidenceSourceV1 = z.infer<typeof SourceSchema>;
export type EvidencePassageV1 = z.infer<typeof PassageSchema>;
export type EvidenceClaimV1 = z.infer<typeof ClaimSchema>;
export type EvidenceContradictionV1 = z.infer<typeof ContradictionSchema>;
export type EvidenceLineageV1 = z.infer<typeof LineageSchema>;
export type EvidencePacketDraftV1 = Omit<EvidencePacketV1, 'packet_id' | 'integrity'>;

/** The hashed content: everything except packet_id, created_at and integrity. */
export function evidenceContentHash(packet: Omit<EvidencePacketV1, 'packet_id' | 'integrity'> | EvidencePacketV1): string {
  const { created_at: _c, ...rest } = packet as EvidencePacketV1;
  const { packet_id: _p, integrity: _i, ...content } = rest as Partial<EvidencePacketV1>;
  return sha256Utf8(canonicalJson(content));
}

function unique(ctx: z.RefinementCtx, ids: string[], what: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) ctx.addIssue({ code: 'custom', message: `duplicate ${what} id ${id}` });
    seen.add(id);
  }
}

export const EvidencePacketV1Schema = PacketBodySchema.superRefine((p, ctx) => {
  unique(ctx, p.sources.map((s) => s.source_id), 'source');
  unique(ctx, p.passages.map((x) => x.passage_id), 'passage');
  unique(ctx, p.claims.map((c) => c.claim_id), 'claim');
  unique(ctx, p.contradictions.map((c) => c.contradiction_id), 'contradiction');

  const sources = new Set(p.sources.map((s) => s.source_id));
  const passageSource = new Map(p.passages.map((x) => [x.passage_id, x.source_id]));
  const claims = new Set(p.claims.map((c) => c.claim_id));

  p.passages.forEach((x, i) => {
    if (!sources.has(x.source_id)) ctx.addIssue({ code: 'custom', path: ['passages', i, 'source_id'], message: `unknown source ${x.source_id}` });
  });
  p.claims.forEach((c, i) => c.evidence.forEach((l, j) => {
    const path = ['claims', i, 'evidence', j];
    if (!sources.has(l.source_id)) ctx.addIssue({ code: 'custom', path, message: `unknown source ${l.source_id}` });
    const owner = passageSource.get(l.passage_id);
    if (owner === undefined) ctx.addIssue({ code: 'custom', path, message: `unknown passage ${l.passage_id}` });
    else if (owner !== l.source_id) ctx.addIssue({ code: 'custom', path, message: `passage ${l.passage_id} belongs to ${owner}, not ${l.source_id}` });
  }));
  p.contradictions.forEach((c, i) => {
    if (!claims.has(c.claim_id)) ctx.addIssue({ code: 'custom', path: ['contradictions', i, 'claim_id'], message: `unknown claim ${c.claim_id}` });
    for (const id of [...c.supporting_passage_ids, ...c.contradicting_passage_ids]) {
      if (!passageSource.has(id)) ctx.addIssue({ code: 'custom', path: ['contradictions', i], message: `unknown passage ${id}` });
    }
  });

  let expected: string | null = null;
  try {
    expected = evidenceContentHash(p);
  } catch (e) {
    ctx.addIssue({ code: 'custom', path: ['integrity'], message: `content cannot be canonicalised: ${(e as Error).message}` });
  }
  if (expected && expected !== p.integrity.content_hash) {
    ctx.addIssue({ code: 'custom', path: ['integrity', 'content_hash'], message: 'content_hash does not match packet content' });
  }
});

/** Stamps integrity and a content-addressed packet_id, then validates. Throws ZodError on any contract break. */
export function finalizeEvidencePacket(draft: EvidencePacketDraftV1): EvidencePacketV1 {
  const content_hash = evidenceContentHash(draft);
  return EvidencePacketV1Schema.parse({
    ...draft,
    packet_id: `aep_${content_hash.slice(0, 24)}`,
    integrity: { algorithm: 'sha256', canonicalization: CANONICAL_JSON_VERSION, content_hash },
  });
}

/** Builds a passage with its text hash. */
export function makePassage(p: Omit<EvidencePassageV1, 'sha256'>): EvidencePassageV1 {
  return { ...p, sha256: sha256Utf8(p.text) };
}

/** Contradictions derived from contradicts-links, one per claim (what Analytica did; System A never filled them). */
export function deriveContradictions(claims: EvidenceClaimV1[], explanation: string | null): EvidenceContradictionV1[] {
  return claims
    .filter((c) => c.evidence.some((l) => l.relation === 'contradicts'))
    .map((c) => ({
      contradiction_id: `contra_${c.claim_id}`,
      claim_id: c.claim_id,
      supporting_passage_ids: c.evidence.filter((l) => l.relation === 'supports').map((l) => l.passage_id),
      contradicting_passage_ids: c.evidence.filter((l) => l.relation === 'contradicts').map((l) => l.passage_id),
      explanation,
      status: 'open' as const,
    }));
}

/** The default policy for a legacy source whose licence was never reviewed. */
export const UNREVIEWED_POLICY: z.infer<typeof SourcePolicySchema> = {
  license: null, terms_url: null, terms_reviewed_at: null, storage: 'unknown',
  can_redisplay: null, can_cache: null, can_train: false, permitted_uses: ['discovery', 'evidence'],
};

export const NOT_CAPTURED: z.infer<typeof SnapshotSchema> = {
  status: 'not_captured', sha256: null, byte_length: null, media_type: null, storage_ref: null,
};

export { ASSUMPTION_ORIGINS, CLAIM_STATUSES };
