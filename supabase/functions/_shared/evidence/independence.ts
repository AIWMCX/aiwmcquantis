/**
 * Quantis Evidence Service — source independence analysis (PR E3).
 *
 * Master prompt section 12: "Store independenceCluster and calculate
 * sourceIndependenceCount for every material claim." This module turns
 * dedupe.ts's cluster assignments into the per-claim count that
 * evidence-graph.ts uses to decide SUPPORTED vs SINGLE_SOURCE vs CONTESTED.
 *
 * Deliberate scope decision: independence is counted over SUPPORTS
 * relations only. A claim "supported" by 3 syndicated copies of one press
 * release AND contradicted by 1 independent source should not have its
 * independence count inflated by the contradicting source -- that source's
 * independence is relevant to the CONTESTED determination in
 * evidence-graph.ts, not to how many confirmations exist.
 */
import type { EvidenceClaimSupport, EvidenceSource } from './types.ts';

/**
 * Counts distinct independence clusters among a claim's SUPPORTS entries.
 * Requires `sources` to already have `independenceCluster` populated (i.e.
 * already passed through `clusterSources` from dedupe.ts) -- a support
 * entry pointing at a source with no cluster assigned is treated as its
 * own singleton (fail-safe: undercounts independence rather than silently
 * overcounting it, which would be the more dangerous failure direction per
 * the master prompt's "never silently transform SINGLE_SOURCE -> VERIFIED"
 * rule in section 14).
 */
export function computeSourceIndependenceCount(
  support: EvidenceClaimSupport[],
  sources: EvidenceSource[],
): number {
  const sourceById = new Map(sources.map((s) => [s.sourceId, s]));
  const clusters = new Set<string>();

  for (const entry of support) {
    if (entry.relation !== 'SUPPORTS') continue;
    const source = sourceById.get(entry.sourceId);
    const cluster = source?.independenceCluster ?? `__unclustered__:${entry.sourceId}`;
    clusters.add(cluster);
  }

  return clusters.size;
}

/**
 * Same computation but for CONTRADICTS entries -- used by evidence-graph.ts
 * to distinguish "one crank blog disagrees" from "two independent official
 * sources disagree," which matters for how strongly CONTESTED should read.
 */
export function computeContradictionIndependenceCount(
  support: EvidenceClaimSupport[],
  sources: EvidenceSource[],
): number {
  const sourceById = new Map(sources.map((s) => [s.sourceId, s]));
  const clusters = new Set<string>();

  for (const entry of support) {
    if (entry.relation !== 'CONTRADICTS') continue;
    const source = sourceById.get(entry.sourceId);
    const cluster = source?.independenceCluster ?? `__unclustered__:${entry.sourceId}`;
    clusters.add(cluster);
  }

  return clusters.size;
}
