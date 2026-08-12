/**
 * Quantis Evidence Service — evidence-telemetry.ts regression suite (PR E7).
 */
import { describe, it, expect } from 'vitest';
import { computeEvidenceTelemetry } from '../../../supabase/functions/_shared/evidence/evidence-telemetry';
import type { QuantisEvidencePacket, EvidenceSource, EvidenceClaim } from '../../../supabase/functions/_shared/evidence/types';
import type { ProviderSearchResult } from '../../../supabase/functions/_shared/evidence/provider';

function makeSource(overrides: Partial<EvidenceSource> = {}): EvidenceSource {
  return {
    sourceId: 'source-1',
    canonicalUrl: 'https://example.com/x',
    retrievedAt: '2026-08-11T00:00:00Z',
    contentHash: 'a'.repeat(64),
    sourceType: 'OTHER',
    primaryStatus: 'UNKNOWN',
    freshness: 'CURRENT',
    storagePolicy: 'METADATA_ONLY',
    providerId: 'tavily',
    ...overrides,
  };
}

function makeClaim(overrides: Partial<EvidenceClaim> = {}): EvidenceClaim {
  return {
    claimId: 'claim-1',
    statement: 'x',
    support: [],
    status: 'SUPPORTED',
    freshness: 'CURRENT',
    sourceIndependenceCount: 1,
    ...overrides,
  };
}

function makePacket(overrides: Partial<QuantisEvidencePacket> = {}): QuantisEvidencePacket {
  return {
    evidencePacketId: 'packet-1',
    analysisRunId: 'run-1',
    queryPlanVersion: '0.1.0',
    providerSetVersion: '0.1.0',
    rankingVersion: '0.1.0',
    evidenceSchemaVersion: '0.1.0',
    createdAt: '2026-08-11T00:00:00Z',
    sourceLenses: [],
    sources: [],
    passages: [],
    claims: [],
    numericObservations: [],
    unresolvedQuestions: [],
    contradictions: [],
    degraded: false,
    retrievalLatencyMs: 500,
    contentHash: 'b'.repeat(64),
    ...overrides,
  };
}

describe('computeEvidenceTelemetry', () => {
  it('counts provider results by status', () => {
    const providerResults: ProviderSearchResult[] = [
      { providerId: 'tavily', status: 'SUCCESS', results: [], latencyMs: 100 },
      { providerId: 'tavily', status: 'DEGRADED', results: [], latencyMs: 200 },
      { providerId: 'tavily', status: 'FAILED', results: [], latencyMs: 50 },
    ];
    const t = computeEvidenceTelemetry(makePacket(), providerResults);
    expect(t.providerCallCount).toBe(3);
    expect(t.providerSuccessCount).toBe(1);
    expect(t.providerDegradedCount).toBe(1);
    expect(t.providerFailedCount).toBe(1);
  });

  it('counts independent clusters, not raw source count, for independentSourceCount', () => {
    const sources = [
      makeSource({ sourceId: 's1', independenceCluster: 'cluster-A' }),
      makeSource({ sourceId: 's2', independenceCluster: 'cluster-A' }), // same cluster as s1 -- syndicated
      makeSource({ sourceId: 's3', independenceCluster: 'cluster-B' }),
    ];
    const t = computeEvidenceTelemetry(makePacket({ sources }), []);
    expect(t.sourceCount).toBe(3);
    expect(t.independentSourceCount).toBe(2); // clusters A, B
    expect(t.duplicateSourceCount).toBe(1); // 3 sources - 2 independent clusters
  });

  it('falls back to sourceId as its own cluster when independenceCluster is unset (no false syndication)', () => {
    const sources = [makeSource({ sourceId: 's1' }), makeSource({ sourceId: 's2' })];
    const t = computeEvidenceTelemetry(makePacket({ sources }), []);
    expect(t.independentSourceCount).toBe(2);
  });

  it('counts stale sources (AGING/HISTORICAL) separately from CURRENT/UNKNOWN', () => {
    const sources = [
      makeSource({ sourceId: 's1', freshness: 'CURRENT' }),
      makeSource({ sourceId: 's2', freshness: 'AGING' }),
      makeSource({ sourceId: 's3', freshness: 'HISTORICAL' }),
      makeSource({ sourceId: 's4', freshness: 'UNKNOWN' }),
    ];
    const t = computeEvidenceTelemetry(makePacket({ sources }), []);
    expect(t.staleSourceCount).toBe(2);
  });

  it('counts claims by status', () => {
    const claims = [
      makeClaim({ claimId: 'c1', status: 'SUPPORTED' }),
      makeClaim({ claimId: 'c2', status: 'SINGLE_SOURCE' }),
      makeClaim({ claimId: 'c3', status: 'CONTESTED' }),
      makeClaim({ claimId: 'c4', status: 'UNSUPPORTED' }),
    ];
    const t = computeEvidenceTelemetry(makePacket({ claims }), []);
    expect(t.claimCount).toBe(4);
    expect(t.supportedClaimCount).toBe(1);
    expect(t.singleSourceClaimCount).toBe(1);
    expect(t.contestedClaimCount).toBe(1);
    expect(t.unsupportedClaimCount).toBe(1);
  });

  it('passes through packet-level fields (latency, cost, degraded) unchanged', () => {
    const t = computeEvidenceTelemetry(makePacket({ retrievalLatencyMs: 4321, costUsd: 0.07, degraded: true }), []);
    expect(t.retrievalLatencyMs).toBe(4321);
    expect(t.costUsd).toBe(0.07);
    expect(t.degraded).toBe(true);
  });

  it('honestly reports zero for primarySourceCount/contradictionCount given the pipeline never produces them today', () => {
    const sources = [makeSource({ primaryStatus: 'UNKNOWN' })];
    const t = computeEvidenceTelemetry(makePacket({ sources, contradictions: [] }), []);
    expect(t.primarySourceCount).toBe(0);
    expect(t.contradictionCount).toBe(0);
  });
});
