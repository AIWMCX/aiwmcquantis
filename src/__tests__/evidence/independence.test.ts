/**
 * Quantis Evidence Service — independence.ts regression suite (PR E3).
 */
import { describe, it, expect } from 'vitest';
import {
  computeSourceIndependenceCount,
  computeContradictionIndependenceCount,
} from '../../../supabase/functions/_shared/evidence/independence';
import { clusterSources } from '../../../supabase/functions/_shared/evidence/dedupe';
import type { EvidenceSource, EvidenceClaimSupport } from '../../../supabase/functions/_shared/evidence/types';

function src(id: string, contentHash: string): EvidenceSource {
  return {
    sourceId: id,
    canonicalUrl: `https://example.com/${id}`,
    retrievedAt: '2026-08-10T00:00:00Z',
    contentHash,
    sourceType: 'NEWS',
    primaryStatus: 'UNKNOWN',
    freshness: 'CURRENT',
    storagePolicy: 'PASSAGE_ALLOWED',
    providerId: 'test-provider',
  };
}

describe('computeSourceIndependenceCount', () => {
  it('4 syndicated copies + 1 independent source = independence count 2, not 5', () => {
    const raw = [src('press-release', 'H1'), src('yahoo', 'H1'), src('blog', 'H1'), src('trade-rag', 'H1'), src('analyst', 'H2')];
    const { sources } = clusterSources(raw);
    const support: EvidenceClaimSupport[] = raw.map((s) => ({
      sourceId: s.sourceId,
      passageId: `p-${s.sourceId}`,
      relation: 'SUPPORTS',
    }));
    expect(computeSourceIndependenceCount(support, sources)).toBe(2);
  });

  it('ignores CONTRADICTS/QUALIFIES entries when counting supporting independence', () => {
    const raw = [src('a', 'H1'), src('b', 'H2')];
    const { sources } = clusterSources(raw);
    const support: EvidenceClaimSupport[] = [
      { sourceId: 'a', passageId: 'p-a', relation: 'SUPPORTS' },
      { sourceId: 'b', passageId: 'p-b', relation: 'CONTRADICTS' },
    ];
    expect(computeSourceIndependenceCount(support, sources)).toBe(1);
  });

  it('a single source supporting a claim yields independence count 1 (SINGLE_SOURCE territory)', () => {
    const raw = [src('only', 'H1')];
    const { sources } = clusterSources(raw);
    const support: EvidenceClaimSupport[] = [{ sourceId: 'only', passageId: 'p', relation: 'SUPPORTS' }];
    expect(computeSourceIndependenceCount(support, sources)).toBe(1);
  });

  it('returns 0 for an empty support list', () => {
    expect(computeSourceIndependenceCount([], [])).toBe(0);
  });

  it('fails safe (treats as its own singleton, does not throw) when a support entry references an unknown sourceId', () => {
    const support: EvidenceClaimSupport[] = [{ sourceId: 'ghost', passageId: 'p', relation: 'SUPPORTS' }];
    expect(() => computeSourceIndependenceCount(support, [])).not.toThrow();
    expect(computeSourceIndependenceCount(support, [])).toBe(1);
  });
});

describe('computeContradictionIndependenceCount', () => {
  it('counts independent contradicting clusters separately from supporting ones', () => {
    const raw = [src('a', 'H1'), src('b', 'H2'), src('c', 'H2')];
    const { sources } = clusterSources(raw);
    const support: EvidenceClaimSupport[] = [
      { sourceId: 'a', passageId: 'p-a', relation: 'SUPPORTS' },
      { sourceId: 'b', passageId: 'p-b', relation: 'CONTRADICTS' },
      { sourceId: 'c', passageId: 'p-c', relation: 'CONTRADICTS' },
    ];
    expect(computeContradictionIndependenceCount(support, sources)).toBe(1); // b and c share H2 -> one cluster
    expect(computeSourceIndependenceCount(support, sources)).toBe(1);
  });
});
