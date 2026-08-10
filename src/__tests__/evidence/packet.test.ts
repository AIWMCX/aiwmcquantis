/**
 * Quantis Evidence Service — packet.ts regression suite (PR E1/E5).
 */
import { describe, it, expect } from 'vitest';
import {
  stableStringify,
  computeEvidencePacketContentHash,
  buildEvidencePacket,
  verifyEvidencePacketIntegrity,
  type EvidencePacketContent,
} from '../../../supabase/functions/_shared/evidence/packet';

describe('stableStringify', () => {
  it('produces identical output regardless of key insertion order', () => {
    const a = { b: 2, a: 1, c: { z: 1, y: 2 } };
    const b = { a: 1, c: { y: 2, z: 1 }, b: 2 };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it('preserves array element order (arrays are ordered, unlike object keys)', () => {
    expect(stableStringify([1, 2, 3])).not.toBe(stableStringify([3, 2, 1]));
  });
});

function baseContent(overrides: Partial<EvidencePacketContent> = {}): EvidencePacketContent {
  return {
    analysisRunId: 'run-1',
    queryPlanVersion: 'v1',
    providerSetVersion: 'v1',
    rankingVersion: 'v1',
    evidenceSchemaVersion: '0.1.0',
    sourceLenses: ['OFFICIAL'],
    sources: [],
    passages: [],
    claims: [],
    numericObservations: [],
    unresolvedQuestions: [],
    contradictions: [],
    degraded: false,
    ...overrides,
  };
}

describe('computeEvidencePacketContentHash', () => {
  it('is deterministic for identical content', async () => {
    const h1 = await computeEvidencePacketContentHash(baseContent());
    const h2 = await computeEvidencePacketContentHash(baseContent());
    expect(h1).toBe(h2);
  });

  it('is a 64-character hex string (SHA-256)', async () => {
    const h = await computeEvidencePacketContentHash(baseContent());
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when any content field changes', async () => {
    const h1 = await computeEvidencePacketContentHash(baseContent());
    const h2 = await computeEvidencePacketContentHash(baseContent({ degraded: true }));
    expect(h1).not.toBe(h2);
  });

  it('changes when the source list changes', async () => {
    const h1 = await computeEvidencePacketContentHash(baseContent());
    const h2 = await computeEvidencePacketContentHash(
      baseContent({
        sources: [
          {
            sourceId: 'a',
            canonicalUrl: 'https://example.com',
            retrievedAt: '2026-08-10T00:00:00Z',
            contentHash: 'H1',
            sourceType: 'NEWS',
            primaryStatus: 'UNKNOWN',
            freshness: 'CURRENT',
            storagePolicy: 'PASSAGE_ALLOWED',
            providerId: 'tavily',
          },
        ],
      }),
    );
    expect(h1).not.toBe(h2);
  });
});

describe('buildEvidencePacket', () => {
  it('two packets built from identical content but different generated id/timestamp still hash identically -- the hash covers content, not metadata', async () => {
    const p1 = await buildEvidencePacket({
      ...baseContent(),
      retrievalLatencyMs: 100,
      idGenerator: () => 'id-1',
      clock: () => '2026-08-10T00:00:00Z',
    });
    const p2 = await buildEvidencePacket({
      ...baseContent(),
      retrievalLatencyMs: 999, // different latency, also metadata -- must not affect the hash
      idGenerator: () => 'id-2',
      clock: () => '2026-08-11T00:00:00Z',
    });
    expect(p1.evidencePacketId).not.toBe(p2.evidencePacketId);
    expect(p1.createdAt).not.toBe(p2.createdAt);
    expect(p1.contentHash).toBe(p2.contentHash);
  });

  it('stamps the current EVIDENCE_SCHEMA_VERSION regardless of what the caller passes', async () => {
    const p = await buildEvidencePacket({
      ...baseContent(),
      retrievalLatencyMs: 0,
    });
    expect(p.evidenceSchemaVersion).toBe('0.1.0');
  });

  it('uses crypto.randomUUID() and an ISO timestamp by default when no injectables are provided', async () => {
    const p = await buildEvidencePacket({ ...baseContent(), retrievalLatencyMs: 0 });
    expect(p.evidencePacketId).toMatch(/^[0-9a-f-]{36}$/);
    expect(() => new Date(p.createdAt).toISOString()).not.toThrow();
  });
});

describe('verifyEvidencePacketIntegrity', () => {
  it('returns true for an untampered packet', async () => {
    const p = await buildEvidencePacket({ ...baseContent(), retrievalLatencyMs: 0 });
    expect(await verifyEvidencePacketIntegrity(p)).toBe(true);
  });

  it('returns false if a content field is mutated after construction (tamper detection)', async () => {
    const p = await buildEvidencePacket({ ...baseContent(), retrievalLatencyMs: 0 });
    const tampered = { ...p, degraded: true };
    expect(await verifyEvidencePacketIntegrity(tampered)).toBe(false);
  });

  it('is NOT fooled by a stale contentHash left over from before a field was edited', async () => {
    const p = await buildEvidencePacket({ ...baseContent(), retrievalLatencyMs: 0 });
    const tampered = { ...p, unresolvedQuestions: ['sneaky-addition'] };
    // contentHash still says "clean" even though content changed -- must detect this.
    expect(tampered.contentHash).toBe(p.contentHash);
    expect(await verifyEvidencePacketIntegrity(tampered)).toBe(false);
  });
});
