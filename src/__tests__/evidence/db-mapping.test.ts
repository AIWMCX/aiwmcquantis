/**
 * Quantis Evidence Service — db-mapping.ts regression suite (PR E6).
 *
 * Pure unit tests, no database. The critical assertion is the
 * storage-policy filter on evidence_passages: it must mirror
 * evidence_passages_storage_policy_guard exactly, since that trigger will
 * reject anything this mapper gets wrong (proven at the DB layer by
 * evidence-service-rls.test.ts's own storage-policy trigger tests).
 */
import { describe, it, expect } from 'vitest';
import {
  mapEvidenceRequestRow,
  mapEvidencePacketRow,
  mapEvidenceSourceRows,
  mapEvidencePassageRows,
  mapEvidenceClaimRows,
} from '../../../supabase/functions/_shared/evidence/db-mapping';
import type { EvidenceRequest, EvidenceSource, EvidencePassage, EvidenceClaim, QuantisEvidencePacket } from '../../../supabase/functions/_shared/evidence/types';

const ANALYSIS_ID = 'analysis-1';
const USER_ID = 'user-1';

function makeSource(overrides: Partial<EvidenceSource> = {}): EvidenceSource {
  return {
    sourceId: 'source-1',
    canonicalUrl: 'https://example.com/x',
    retrievedAt: '2026-08-10T00:00:00Z',
    contentHash: 'a'.repeat(64),
    sourceType: 'OTHER',
    primaryStatus: 'UNKNOWN',
    freshness: 'UNKNOWN',
    storagePolicy: 'METADATA_ONLY',
    providerId: 'tavily',
    ...overrides,
  };
}

function makePassage(overrides: Partial<EvidencePassage> = {}): EvidencePassage {
  return {
    passageId: 'passage-1',
    sourceId: 'source-1',
    text: 'Some passage text.',
    extractedAt: '2026-08-10T00:00:00Z',
    contentHash: 'b'.repeat(64),
    ...overrides,
  };
}

describe('mapEvidenceRequestRow', () => {
  it('maps riskClass/questions to snake_case columns', () => {
    const request: EvidenceRequest = {
      analysisRunId: 'run-1',
      riskClass: 'FINANCIAL_BUSINESS',
      questions: [{ id: 'q1', objective: 'LOCAL_COST_RENT', query: 'x', preferredLenses: ['OFFICIAL'] }],
    };
    const row = mapEvidenceRequestRow(request, ANALYSIS_ID, USER_ID);
    expect(row).toEqual({
      analysis_id: ANALYSIS_ID,
      user_id: USER_ID,
      risk_class: 'FINANCIAL_BUSINESS',
      questions: request.questions,
    });
  });
});

describe('mapEvidencePacketRow', () => {
  it('preserves the packet id as the row id (auditability link)', async () => {
    const packet: QuantisEvidencePacket = {
      evidencePacketId: 'packet-1',
      analysisRunId: 'run-1',
      queryPlanVersion: '0.1.0',
      providerSetVersion: '0.1.0',
      rankingVersion: '0.1.0',
      evidenceSchemaVersion: '0.1.0',
      createdAt: '2026-08-10T00:00:00Z',
      sourceLenses: ['OFFICIAL'],
      sources: [],
      passages: [],
      claims: [],
      numericObservations: [],
      unresolvedQuestions: [],
      contradictions: [],
      degraded: false,
      retrievalLatencyMs: 100,
      contentHash: 'c'.repeat(64),
    };
    const row = await mapEvidencePacketRow(packet, ANALYSIS_ID, USER_ID, 'request-db-id');
    expect(row.id).toBe('packet-1');
    expect(row.evidence_request_id).toBe('request-db-id');
    expect(row.analysis_id).toBe(ANALYSIS_ID);
    expect(row.user_id).toBe(USER_ID);
    expect(row.content_hash).toBe('c'.repeat(64));
    expect(row.cost_usd).toBeUndefined();
    expect(row.run_key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces the same run_key for two packets with identical analysisRunId/queryPlanVersion/evidenceSchemaVersion (the idempotency guarantee)', async () => {
    const base: QuantisEvidencePacket = {
      evidencePacketId: 'packet-A',
      analysisRunId: 'run-1',
      queryPlanVersion: '0.1.0',
      providerSetVersion: '0.1.0',
      rankingVersion: '0.1.0',
      evidenceSchemaVersion: '0.1.0',
      createdAt: '2026-08-10T00:00:00Z',
      sourceLenses: [],
      sources: [],
      passages: [],
      claims: [],
      numericObservations: [],
      unresolvedQuestions: [],
      contradictions: [],
      degraded: false,
      retrievalLatencyMs: 50,
      contentHash: 'd'.repeat(64),
    };
    const rowA = await mapEvidencePacketRow(base, ANALYSIS_ID, USER_ID, 'req-A');
    const rowB = await mapEvidencePacketRow({ ...base, evidencePacketId: 'packet-B', contentHash: 'e'.repeat(64) }, ANALYSIS_ID, USER_ID, 'req-B');
    expect(rowA.run_key).toBe(rowB.run_key);
    expect(rowA.id).not.toBe(rowB.id); // different packets, same semantic run identity
  });
});

describe('mapEvidenceSourceRows', () => {
  it('maps every EvidenceSource field to its snake_case column', () => {
    const source = makeSource({ publisher: 'Denver Post', independenceCluster: 'cluster-1' });
    const [row] = mapEvidenceSourceRows([source], ANALYSIS_ID, USER_ID, 'packet-1');
    expect(row).toEqual({
      id: 'source-1',
      analysis_id: ANALYSIS_ID,
      user_id: USER_ID,
      evidence_packet_id: 'packet-1',
      canonical_url: 'https://example.com/x',
      publisher: 'Denver Post',
      author: undefined,
      published_at: undefined,
      retrieved_at: '2026-08-10T00:00:00Z',
      content_hash: 'a'.repeat(64),
      source_type: 'OTHER',
      primary_status: 'UNKNOWN',
      independence_cluster: 'cluster-1',
      geography: undefined,
      language: undefined,
      freshness: 'UNKNOWN',
      storage_policy: 'METADATA_ONLY',
      provider_id: 'tavily',
    });
  });
});

describe('mapEvidencePassageRows — storage policy filter', () => {
  it('drops a passage whose source is METADATA_ONLY (matches every real Tavily source today)', () => {
    const source = makeSource({ storagePolicy: 'METADATA_ONLY' });
    const passage = makePassage();
    const rows = mapEvidencePassageRows([passage], [source], ANALYSIS_ID, USER_ID);
    expect(rows).toEqual([]);
  });

  it('drops a passage whose source is NO_STORE', () => {
    const source = makeSource({ storagePolicy: 'NO_STORE' });
    const rows = mapEvidencePassageRows([makePassage()], [source], ANALYSIS_ID, USER_ID);
    expect(rows).toEqual([]);
  });

  it('drops a passage whose source is missing entirely (defensive default)', () => {
    const rows = mapEvidencePassageRows([makePassage({ sourceId: 'missing-source' })], [], ANALYSIS_ID, USER_ID);
    expect(rows).toEqual([]);
  });

  it('keeps a passage whose source is PASSAGE_ALLOWED', () => {
    const source = makeSource({ storagePolicy: 'PASSAGE_ALLOWED' });
    const passage = makePassage({ locator: { heading: 'Rent', page: 2, anchor: '#rent' } });
    const rows = mapEvidencePassageRows([passage], [source], ANALYSIS_ID, USER_ID);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      id: 'passage-1',
      analysis_id: ANALYSIS_ID,
      user_id: USER_ID,
      evidence_source_id: 'source-1',
      text: 'Some passage text.',
      heading: 'Rent',
      page: 2,
      anchor: '#rent',
      extracted_at: '2026-08-10T00:00:00Z',
      content_hash: 'b'.repeat(64),
    });
  });

  it('keeps a passage whose source is FULL_ALLOWED', () => {
    const source = makeSource({ storagePolicy: 'FULL_ALLOWED' });
    const rows = mapEvidencePassageRows([makePassage()], [source], ANALYSIS_ID, USER_ID);
    expect(rows).toHaveLength(1);
  });

  it('handles a mixed batch: only the PASSAGE_ALLOWED-backed passage survives', () => {
    const sources = [
      makeSource({ sourceId: 's-metadata', storagePolicy: 'METADATA_ONLY' }),
      makeSource({ sourceId: 's-allowed', storagePolicy: 'PASSAGE_ALLOWED' }),
    ];
    const passages = [
      makePassage({ passageId: 'p-metadata', sourceId: 's-metadata' }),
      makePassage({ passageId: 'p-allowed', sourceId: 's-allowed' }),
    ];
    const rows = mapEvidencePassageRows(passages, sources, ANALYSIS_ID, USER_ID);
    expect(rows.map((r) => r.id)).toEqual(['p-allowed']);
  });
});

describe('mapEvidenceClaimRows', () => {
  it('maps every EvidenceClaim field to its snake_case column', () => {
    const claim: EvidenceClaim = {
      claimId: 'claim-1',
      statement: 'Evidence gathered for: rent',
      support: [{ sourceId: 'source-1', passageId: 'passage-1', relation: 'SUPPORTS' }],
      status: 'SUPPORTED',
      freshness: 'CURRENT',
      sourceIndependenceCount: 2,
    };
    const [row] = mapEvidenceClaimRows([claim], ANALYSIS_ID, USER_ID, 'packet-1');
    expect(row).toEqual({
      id: 'claim-1',
      analysis_id: ANALYSIS_ID,
      user_id: USER_ID,
      evidence_packet_id: 'packet-1',
      statement: 'Evidence gathered for: rent',
      support: claim.support,
      status: 'SUPPORTED',
      freshness: 'CURRENT',
      source_independence_count: 2,
    });
  });
});
