/**
 * Quantis Evidence Service — duplicate / syndication clustering (PR E3).
 *
 * Master prompt section 12: "Five URLs do not necessarily equal five
 * independent sources." This module groups a set of EvidenceSource records
 * into independence clusters so downstream code (independence.ts,
 * evidence-graph.ts) never mistakes syndicated copies for confirmations.
 *
 * Clustering rule (deliberately conservative -- false negatives, i.e.
 * failing to merge two sources that ARE the same material, are safer than
 * false positives, i.e. merging two sources that are NOT the same
 * material and thereby erasing a real independent confirmation):
 *
 *   Two sources belong to the same cluster if EITHER:
 *     (a) their canonical URLs are identical (same document retrieved
 *         twice, e.g. by two different providers), OR
 *     (b) their content hashes are identical (byte-identical text --
 *         covers exact press-release/wire-copy syndication).
 *
 * Near-duplicate detection (reworded but substantively identical articles)
 * is explicitly OUT of scope for this module -- it needs a similarity
 * metric with tunable thresholds and a labeled corpus to validate against
 * (see the master prompt's section 26 evaluation-corpus requirement),
 * which does not exist yet. Do not add fuzzy matching here without that
 * corpus; an unvalidated threshold is worse than no threshold.
 */
import type { EvidenceSource } from './types.ts';
import { canonicalizeUrl } from './url-normalize.ts';

/** Simple union-find (disjoint-set) with path compression. */
class DisjointSet {
  private parent = new Map<string, string>();

  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      return x;
    }
    let root = x;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    // Path compression.
    let cur = x;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) {
      this.parent.set(ra, rb);
    }
  }
}

export interface ClusterResult {
  /** Same sources, each with `independenceCluster` populated. */
  sources: EvidenceSource[];
  /** clusterId -> member sourceIds, for callers that want the raw grouping. */
  clusters: Map<string, string[]>;
}

/**
 * Assigns `independenceCluster` to every source. A source that shares no
 * canonical URL or content hash with any other source gets its own
 * singleton cluster (its own sourceId as the cluster id) -- it is fully
 * independent by definition.
 */
export function clusterSources(sources: EvidenceSource[]): ClusterResult {
  const dsu = new DisjointSet();
  for (const s of sources) dsu.find(s.sourceId);

  const byCanonicalUrl = new Map<string, string[]>();
  const byContentHash = new Map<string, string[]>();

  for (const s of sources) {
    const canon = canonicalizeUrl(s.canonicalUrl);
    const urlKey = canon.ok ? canon.canonicalUrl! : `__unparseable__:${s.sourceId}`;
    if (!byCanonicalUrl.has(urlKey)) byCanonicalUrl.set(urlKey, []);
    byCanonicalUrl.get(urlKey)!.push(s.sourceId);

    if (s.contentHash) {
      if (!byContentHash.has(s.contentHash)) byContentHash.set(s.contentHash, []);
      byContentHash.get(s.contentHash)!.push(s.sourceId);
    }
  }

  for (const group of byCanonicalUrl.values()) {
    for (let i = 1; i < group.length; i++) dsu.union(group[0], group[i]);
  }
  for (const group of byContentHash.values()) {
    for (let i = 1; i < group.length; i++) dsu.union(group[0], group[i]);
  }

  const clusters = new Map<string, string[]>();
  for (const s of sources) {
    const root = dsu.find(s.sourceId);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(s.sourceId);
  }

  const clusteredSources = sources.map((s) => ({
    ...s,
    independenceCluster: dsu.find(s.sourceId),
  }));

  return { sources: clusteredSources, clusters };
}

/** Number of distinct independence clusters among the given sourceIds. */
export function countIndependentClusters(
  sourceIds: string[],
  clusteredSources: EvidenceSource[],
): number {
  const clusterOf = new Map(clusteredSources.map((s) => [s.sourceId, s.independenceCluster]));
  const distinct = new Set<string>();
  for (const id of sourceIds) {
    const cluster = clusterOf.get(id);
    if (cluster) distinct.add(cluster);
  }
  return distinct.size;
}
