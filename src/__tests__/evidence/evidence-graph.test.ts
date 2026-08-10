/**
 * Quantis Evidence Service — evidence-graph.ts regression suite (PR E4).
 *
 * This file is the master prompt's section 30 "contradiction test" and
 * section 14's "never silently transform" invariant, made concrete.
 */
import { describe, it, expect } from 'vitest';
import {
  deriveClaimStatus,
  buildEvidenceClaim,
  reviseClaimStatus,
  IllegalClaimStatusTransitionError,
} from '../../../supabase/functions/_shared/evidence/evidence-graph';
import { clusterSources } from '../../../supabase/functions/_shared/evidence/dedupe';
import type { EvidenceSource, EvidenceClaimSupport, ClaimStatus } from '../../../supabase/functions/_shared/evidence/types';

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

describe('deriveClaimStatus — master prompt section 30 contradiction test', () => {
  it('one source supports, one independent source contradicts -> CONTESTED, both preserved', () => {
    const raw = [src('a', 'H1'), src('b', 'H2')];
    const { sources } = clusterSources(raw);
    const support: EvidenceClaimSupport[] = [
      { sourceId: 'a', passageId: 'p-a', relation: 'SUPPORTS' },
      { sourceId: 'b', passageId: 'p-b', relation: 'CONTRADICTS' },
    ];
    const claim = buildEvidenceClaim({
      claimId: 'c1',
      statement: 'Median rent is $X',
      support,
      sources,
      freshness: 'CURRENT',
    });
    expect(claim.status).toBe('CONTESTED');
    // Both preserved -- support array is untouched, not filtered down to a winner.
    expect(claim.support).toHaveLength(2);
  });

  it('a single supporting source -> SINGLE_SOURCE, not SUPPORTED', () => {
    const raw = [src('a', 'H1')];
    const { sources } = clusterSources(raw);
    const support: EvidenceClaimSupport[] = [{ sourceId: 'a', passageId: 'p', relation: 'SUPPORTS' }];
    expect(deriveClaimStatus(support, sources, 'CURRENT')).toBe('SINGLE_SOURCE');
  });

  it('two INDEPENDENT supporting sources -> SUPPORTED', () => {
    const raw = [src('a', 'H1'), src('b', 'H2')];
    const { sources } = clusterSources(raw);
    const support: EvidenceClaimSupport[] = [
      { sourceId: 'a', passageId: 'p-a', relation: 'SUPPORTS' },
      { sourceId: 'b', passageId: 'p-b', relation: 'SUPPORTS' },
    ];
    expect(deriveClaimStatus(support, sources, 'CURRENT')).toBe('SUPPORTED');
  });

  it('two syndicated (non-independent) supporting sources -> SINGLE_SOURCE, NOT SUPPORTED (master prompt section 32)', () => {
    const raw = [src('a', 'H1'), src('b', 'H1')]; // same content hash = one cluster
    const { sources } = clusterSources(raw);
    const support: EvidenceClaimSupport[] = [
      { sourceId: 'a', passageId: 'p-a', relation: 'SUPPORTS' },
      { sourceId: 'b', passageId: 'p-b', relation: 'SUPPORTS' },
    ];
    expect(deriveClaimStatus(support, sources, 'CURRENT')).toBe('SINGLE_SOURCE');
  });

  it('no support entries -> UNSUPPORTED', () => {
    expect(deriveClaimStatus([], [], 'CURRENT')).toBe('UNSUPPORTED');
  });

  it('only QUALIFIES entries (no SUPPORTS/CONTRADICTS) -> UNSUPPORTED, not silently upgraded', () => {
    const raw = [src('a', 'H1')];
    const { sources } = clusterSources(raw);
    const support: EvidenceClaimSupport[] = [{ sourceId: 'a', passageId: 'p', relation: 'QUALIFIES' }];
    expect(deriveClaimStatus(support, sources, 'CURRENT')).toBe('UNSUPPORTED');
  });

  it('requiresCurrentFreshness forces STALE even with strong support', () => {
    const raw = [src('a', 'H1'), src('b', 'H2')];
    const { sources } = clusterSources(raw);
    const support: EvidenceClaimSupport[] = [
      { sourceId: 'a', passageId: 'p-a', relation: 'SUPPORTS' },
      { sourceId: 'b', passageId: 'p-b', relation: 'SUPPORTS' },
    ];
    expect(
      deriveClaimStatus(support, sources, 'HISTORICAL', { requiresCurrentFreshness: true }),
    ).toBe('STALE');
    // Without the freshness requirement, the same data is SUPPORTED.
    expect(deriveClaimStatus(support, sources, 'HISTORICAL')).toBe('SUPPORTED');
  });
});

describe('buildEvidenceClaim', () => {
  it('populates sourceIndependenceCount alongside status', () => {
    const raw = [src('a', 'H1'), src('b', 'H2')];
    const { sources } = clusterSources(raw);
    const claim = buildEvidenceClaim({
      claimId: 'c1',
      statement: 'x',
      support: [
        { sourceId: 'a', passageId: 'p-a', relation: 'SUPPORTS' },
        { sourceId: 'b', passageId: 'p-b', relation: 'SUPPORTS' },
      ],
      sources,
      freshness: 'CURRENT',
    });
    expect(claim.status).toBe('SUPPORTED');
    expect(claim.sourceIndependenceCount).toBe(2);
  });
});

describe('reviseClaimStatus — the "never silently upgrade" invariant, enforced', () => {
  const baseClaim = (status: ClaimStatus) => ({
    claimId: 'c1',
    statement: 'x',
    support: [],
    status,
    freshness: 'CURRENT' as const,
    sourceIndependenceCount: 1,
  });

  it('CONTESTED -> SUPPORTED is rejected', () => {
    expect(() => reviseClaimStatus(baseClaim('CONTESTED'), 'SUPPORTED')).toThrow(
      IllegalClaimStatusTransitionError,
    );
  });

  it('SINGLE_SOURCE -> SUPPORTED is rejected (this is the exact case named in master prompt section 14)', () => {
    expect(() => reviseClaimStatus(baseClaim('SINGLE_SOURCE'), 'SUPPORTED')).toThrow(
      IllegalClaimStatusTransitionError,
    );
  });

  it('SINGLE_SOURCE -> SUPPORTED rejection carries the from/to on the error for observability', () => {
    try {
      reviseClaimStatus(baseClaim('SINGLE_SOURCE'), 'SUPPORTED');
      expect.fail('expected a throw');
    } catch (e) {
      expect(e).toBeInstanceOf(IllegalClaimStatusTransitionError);
      const err = e as InstanceType<typeof IllegalClaimStatusTransitionError>;
      expect(err.from).toBe('SINGLE_SOURCE');
      expect(err.to).toBe('SUPPORTED');
    }
  });

  it('CONTESTED -> STALE and CONTESTED -> UNSUPPORTED are allowed (confidence-neutral or lower)', () => {
    expect(() => reviseClaimStatus(baseClaim('CONTESTED'), 'STALE')).not.toThrow();
    expect(() => reviseClaimStatus(baseClaim('CONTESTED'), 'UNSUPPORTED')).not.toThrow();
  });

  it('any status can move to CONTESTED (new contradicting evidence downgrades confidence, always allowed)', () => {
    const allStatuses: ClaimStatus[] = ['SUPPORTED', 'SINGLE_SOURCE', 'STALE', 'INFERRED', 'UNSUPPORTED'];
    for (const s of allStatuses) {
      expect(() => reviseClaimStatus(baseClaim(s), 'CONTESTED')).not.toThrow();
    }
  });

  it('UNSUPPORTED -> SUPPORTED is allowed (this represents a genuine first-time re-derivation with new evidence via buildEvidenceClaim, not an unsanctioned upgrade of an existing claim)', () => {
    expect(() => reviseClaimStatus(baseClaim('UNSUPPORTED'), 'SUPPORTED')).not.toThrow();
  });
});
