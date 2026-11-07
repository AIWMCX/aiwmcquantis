/**
 * Rows for public.rvce_observations, built from one rvce-validate run.
 *
 * Moved out of index.ts so Vitest can test it. The call site used to persist
 * the response's evidence_samples, which are cut to the tier's observation
 * limit (Free 20, Plus 40, Pro 100); with 10 metrics x up to 5 samples, a Free
 * run stored the later metrics as no_external_evidence_found although they were
 * validated against real sources. index.ts now passes the full list, and a
 * validated metric with no sample is recorded as evidence_not_recorded, never as
 * "no evidence".
 *
 * Pure module (no Deno-only imports).
 */

import { noEvidenceRejectionReason, type ProviderAttempt, type SearchProviderId } from './search-outcome.ts';

export interface RvceEvidenceSample {
  metric: string;
  source: string;
  url?: string;
  summary: string;
  value: number;
  provider?: SearchProviderId | null;
}

export interface RvcePersistPayload {
  analysis_id: string;
  metrics_validation: Record<string, { status: string; discrepancy_score: number }>;
  evidence_samples: RvceEvidenceSample[];
  search_diagnostics?: Array<{ metric: string; provider_attempts: ProviderAttempt[] }>;
}

export function buildObservationRows(
  payload: RvcePersistPayload,
  ids: { correlationId: string; analysisId: string | null },
): Record<string, unknown>[] {
  const { correlationId, analysisId } = ids;
  const rows: Record<string, unknown>[] = [];

  const evidenceByMetric = new Map<string, RvceEvidenceSample[]>();
  for (const sample of payload.evidence_samples ?? []) {
    const list = evidenceByMetric.get(sample.metric) ?? [];
    list.push(sample);
    evidenceByMetric.set(sample.metric, list);
  }
  const attemptsByMetric = new Map(
    (payload.search_diagnostics ?? []).map(d => [d.metric, d.provider_attempts ?? []] as const),
  );

  for (const [metric, validation] of Object.entries(payload.metrics_validation ?? {})) {
    const samples = evidenceByMetric.get(metric) ?? [];
    const v = validation as { status: string; discrepancy_score: number };
    // Same OK/WARN/OUTLIER -> score mapping used for comparability elsewhere
    // in this system; NO_DATA gets the lowest score since no evidence backs it.
    const qualityScore = v.status === 'OK' ? 0.9 : v.status === 'WARN' ? 0.6 : v.status === 'OUTLIER' ? 0.3 : 0.1;

    if (samples.length === 0) {
      rows.push({
        analysis_id: analysisId,
        correlation_id: correlationId,
        metric_code: metric,
        raw_value: null,
        normalized_value: null,
        unit: 'unknown',
        source_url: null,
        source_title: null,
        publisher: null,
        extraction_method: 'rvce_web_search',
        source_quality: qualityScore,
        comparability_score: qualityScore,
        accepted: false,
        // A validated metric had evidence that was not passed in; a provider
        // failure is recorded as one. Neither is "no evidence found".
        rejection_reason: v.status !== 'NO_DATA'
          ? 'evidence_not_recorded'
          : noEvidenceRejectionReason(attemptsByMetric.get(metric) ?? []),
      });
      continue;
    }

    for (const sample of samples) {
      const hasRealUrl = typeof sample.url === 'string' && sample.url.length > 0;
      rows.push({
        analysis_id: analysisId,
        correlation_id: correlationId,
        metric_code: metric,
        raw_value: sample.value,
        normalized_value: sample.value,
        unit: 'unknown',
        source_url: hasRealUrl ? sample.url : null,
        source_title: sample.summary ?? null,
        publisher: sample.source ?? null,
        extraction_method: !hasRealUrl ? 'internal_benchmark_master'
          : sample.provider ? `rvce_web_search:${sample.provider}` : 'rvce_web_search',
        source_quality: qualityScore,
        comparability_score: qualityScore,
        accepted: v.status !== 'OUTLIER',
        rejection_reason: v.status === 'OUTLIER' ? 'outlier_vs_reference' : null,
      });
    }
  }

  return rows;
}
