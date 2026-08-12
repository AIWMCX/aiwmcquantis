/**
 * Quantis Evidence Service — pipeline observability (PR E7).
 *
 * Pure derivation from an already-built QuantisEvidencePacket + the raw
 * ProviderSearchResult[] a pipeline run produced. Deliberately NOT a
 * distributed-tracing integration (no OpenTelemetry/Datadog span emission
 * anywhere in this codebase to hook into) -- this is a scoped v1 that
 * answers the master prompt's Phase 4 observability questions
 * (success/degraded/failure rate, source/independence/contradiction/
 * staleness counts, cost, latency) from data the pipeline already
 * produces, persisted per-packet so /admin/evidence has real numbers to
 * read once it exists (E10), rather than fabricated ones.
 *
 * HONESTY NOTE: several fields are structurally always zero today,
 * exactly mirroring pipeline.ts's own honesty note -- primarySourceCount
 * (sourceType/primaryStatus classification doesn't exist yet) and
 * contradictionCount (no entailment step exists yet, so packet.claims
 * never reaches CONTESTED). These are computed correctly, not hidden,
 * so the metric will start reporting real non-zero values automatically
 * once those capabilities are built, with zero changes needed here.
 */
import type { EvidenceSource, QuantisEvidencePacket } from './types.ts';
import type { ProviderSearchResult } from './provider.ts';

export interface EvidenceTelemetryMetrics {
  providerCallCount: number;
  providerSuccessCount: number;
  providerDegradedCount: number;
  providerFailedCount: number;

  sourceCount: number;
  independentSourceCount: number;
  duplicateSourceCount: number;
  primarySourceCount: number;
  staleSourceCount: number;

  claimCount: number;
  supportedClaimCount: number;
  singleSourceClaimCount: number;
  contestedClaimCount: number;
  unsupportedClaimCount: number;

  contradictionCount: number;
  unresolvedQuestionCount: number;
  numericObservationCount: number;

  retrievalLatencyMs: number;
  costUsd?: number;
  degraded: boolean;
}

function countIndependentClusters(sources: EvidenceSource[]): number {
  const clusters = new Set(sources.map((s) => s.independenceCluster ?? s.sourceId));
  return clusters.size;
}

export function computeEvidenceTelemetry(
  packet: QuantisEvidencePacket,
  providerResults: ProviderSearchResult[],
): EvidenceTelemetryMetrics {
  const independentSourceCount = countIndependentClusters(packet.sources);
  const staleFreshness = new Set(['AGING', 'HISTORICAL']);

  return {
    providerCallCount: providerResults.length,
    providerSuccessCount: providerResults.filter((r) => r.status === 'SUCCESS').length,
    providerDegradedCount: providerResults.filter((r) => r.status === 'DEGRADED').length,
    providerFailedCount: providerResults.filter((r) => r.status === 'FAILED').length,

    sourceCount: packet.sources.length,
    independentSourceCount,
    duplicateSourceCount: packet.sources.length - independentSourceCount,
    primarySourceCount: packet.sources.filter((s) => s.primaryStatus === 'PRIMARY').length,
    staleSourceCount: packet.sources.filter((s) => staleFreshness.has(s.freshness)).length,

    claimCount: packet.claims.length,
    supportedClaimCount: packet.claims.filter((c) => c.status === 'SUPPORTED').length,
    singleSourceClaimCount: packet.claims.filter((c) => c.status === 'SINGLE_SOURCE').length,
    contestedClaimCount: packet.claims.filter((c) => c.status === 'CONTESTED').length,
    unsupportedClaimCount: packet.claims.filter((c) => c.status === 'UNSUPPORTED').length,

    contradictionCount: packet.contradictions.length,
    unresolvedQuestionCount: packet.unresolvedQuestions.length,
    numericObservationCount: packet.numericObservations.length,

    retrievalLatencyMs: packet.retrievalLatencyMs,
    costUsd: packet.costUsd,
    degraded: packet.degraded,
  };
}
