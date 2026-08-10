/**
 * Quantis Evidence Service — dedupe.ts regression suite (PR E3).
 */
import { describe, it, expect } from 'vitest';
import {
  clusterSources,
  countIndependentClusters,
} from '../../../supabase/functions/_shared/evidence/dedupe';
import type { EvidenceSource } from '../../../supabase/functions/_shared/evidence/types';

function src(overrides: Partial<EvidenceSource> & Pick<EvidenceSource, 'sourceId'>): EvidenceSource {
  return {
    canonicalUrl: `https://example.com/${overrides.sourceId}`,
    retrievedAt: '2026-08-10T00:00:00Z',
    contentHash: `hash-${overrides.sourceId}`,
    sourceType: 'NEWS',
    primaryStatus: 'UNKNOWN',
    freshness: 'CURRENT',
    storagePolicy: 'PASSAGE_ALLOWED',
    providerId: 'test-provider',
    ...overrides,
  };
}

describe('clusterSources', () => {
  it('the master-prompt example: press release syndicated across 4 reproductions is ONE cluster, not 5 independent sources', () => {
    const sources = [
      src({ sourceId: 'press-release', canonicalUrl: 'https://company.com/press/launch', contentHash: 'H1' }),
      src({ sourceId: 'yahoo-repro', canonicalUrl: 'https://finance.yahoo.com/news/launch-xyz', contentHash: 'H1' }),
      src({ sourceId: 'industry-news-repro', canonicalUrl: 'https://industrynews.example/launch', contentHash: 'H1' }),
      src({ sourceId: 'blog-repro', canonicalUrl: 'https://someblog.example/re-launch', contentHash: 'H1' }),
      src({ sourceId: 'independent-analysis', canonicalUrl: 'https://analyst.example/take', contentHash: 'H2' }),
    ];

    const { sources: clustered, clusters } = clusterSources(sources);
    expect(clusters.size).toBe(2);

    const pressReleaseCluster = clustered.find((s) => s.sourceId === 'press-release')!.independenceCluster;
    for (const id of ['press-release', 'yahoo-repro', 'industry-news-repro', 'blog-repro']) {
      expect(clustered.find((s) => s.sourceId === id)!.independenceCluster).toBe(pressReleaseCluster);
    }
    expect(clustered.find((s) => s.sourceId === 'independent-analysis')!.independenceCluster).not.toBe(
      pressReleaseCluster,
    );

    expect(
      countIndependentClusters(
        ['press-release', 'yahoo-repro', 'industry-news-repro', 'blog-repro', 'independent-analysis'],
        clustered,
      ),
    ).toBe(2);
  });

  it('same canonical URL (retrieved twice by two providers) merges into one cluster even with different content hashes', () => {
    const sources = [
      src({ sourceId: 'a', canonicalUrl: 'https://example.com/story', contentHash: 'H1' }),
      src({ sourceId: 'b', canonicalUrl: 'https://www.example.com/story/?utm_source=x', contentHash: 'H2-slightly-different-extraction' }),
    ];
    const { clusters } = clusterSources(sources);
    expect(clusters.size).toBe(1);
  });

  it('fully independent sources each get their own singleton cluster', () => {
    const sources = [
      src({ sourceId: 'a' }),
      src({ sourceId: 'b' }),
      src({ sourceId: 'c' }),
    ];
    const { clusters } = clusterSources(sources);
    expect(clusters.size).toBe(3);
  });

  it('transitively merges via a shared content hash bridging two different URL groups', () => {
    // a<->b share a URL; b<->c share a content hash. a, b, c must all end up
    // in one cluster (transitivity), proving union-find correctness, not
    // just pairwise matching.
    const sources = [
      src({ sourceId: 'a', canonicalUrl: 'https://x.com/1', contentHash: 'HA' }),
      src({ sourceId: 'b', canonicalUrl: 'https://x.com/1', contentHash: 'HB' }),
      src({ sourceId: 'c', canonicalUrl: 'https://y.com/2', contentHash: 'HB' }),
    ];
    const { clusters } = clusterSources(sources);
    expect(clusters.size).toBe(1);
  });

  it('does not throw on an unparseable canonicalUrl and still clusters by content hash', () => {
    const sources = [
      src({ sourceId: 'a', canonicalUrl: 'not-a-url', contentHash: 'SAME' }),
      src({ sourceId: 'b', canonicalUrl: 'also-not-a-url', contentHash: 'SAME' }),
    ];
    expect(() => clusterSources(sources)).not.toThrow();
    const { clusters } = clusterSources(sources);
    expect(clusters.size).toBe(1);
  });

  it('handles an empty input array', () => {
    const { sources, clusters } = clusterSources([]);
    expect(sources).toEqual([]);
    expect(clusters.size).toBe(0);
  });
});

describe('countIndependentClusters', () => {
  it('returns 0 for unknown sourceIds', () => {
    const { sources: clustered } = clusterSources([src({ sourceId: 'a' })]);
    expect(countIndependentClusters(['does-not-exist'], clustered)).toBe(0);
  });
});
