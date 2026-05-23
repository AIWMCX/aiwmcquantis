import type { MetricValidation, ValidationStatus } from './types';

export interface Observation {
  value: number;
  source: string;
  snippet?: string;
}

export interface MetricStats {
  count: number;
  mean: number;
  median: number;
  p25: number;
  p75: number;
  std: number;
}

export function aggregateObservations(observations: Observation[]): MetricStats | null {
  const clean = observations.filter(
    (o) => typeof o.value === 'number' && Number.isFinite(o.value) && o.value > 0,
  );
  if (clean.length === 0) return null;

  const values = clean.map((o) => o.value).sort((a, b) => a - b);
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const median =
    n % 2 === 0 ? (values[n / 2 - 1] + values[n / 2]) / 2 : values[Math.floor(n / 2)];
  const p25 = values[Math.max(0, Math.floor(n * 0.25))];
  const p75 = values[Math.min(n - 1, Math.floor(n * 0.75))];
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, n - 1);
  const std = Math.sqrt(variance);

  return { count: n, mean, median, p25, p75, std };
}

export function calibrateMetric(
  originalValue: number,
  stats: MetricStats | null,
  observationCount: number,
): MetricValidation {
  if (!stats || stats.count < 3) {
    return {
      original_value: originalValue,
      external_median: null,
      p25: null,
      p75: null,
      status: 'NO_DATA',
      discrepancy_score: 0,
      notes: 'Insufficient external observations for reliable calibration.',
      observation_count: observationCount,
    };
  }

  const { median, p25, p75, std } = stats;
  const effectiveStd = std > 0 ? std : Math.max(1e-6, Math.abs(median) * 0.1);
  const discrepancy = (originalValue - median) / effectiveStd;
  const abs = Math.abs(discrepancy);

  let status: ValidationStatus;
  if (abs < 1.0) status = 'OK';
  else if (abs < 2.0) status = 'WARN';
  else status = 'OUTLIER';

  const result: MetricValidation = {
    original_value: originalValue,
    external_median: round2(median),
    p25: round2(p25),
    p75: round2(p75),
    status,
    discrepancy_score: round2(discrepancy),
    notes:
      status === 'OUTLIER'
        ? `Value is ${abs.toFixed(1)}σ ${discrepancy > 0 ? 'above' : 'below'} the external median of comparable businesses.`
        : status === 'WARN'
          ? 'Value is at the boundary of the typical range for comparable businesses.'
          : 'Value aligns with external reality for comparable businesses.',
    observation_count: observationCount,
  };
  if (status === 'OUTLIER') result.recommended_value = round2(median);
  return result;
}

export function computeGlobalConfidence(
  metricsValidation: Record<string, MetricValidation>,
): number {
  const entries = Object.values(metricsValidation);
  if (entries.length === 0) return 0;

  let score = 85;
  score -= entries.filter((e) => e.status === 'OUTLIER').length * 12;
  score -= entries.filter((e) => e.status === 'WARN').length * 5;
  score -= entries.filter((e) => e.status === 'NO_DATA').length * 3;

  const avgObs =
    entries.reduce((s, e) => s + e.observation_count, 0) / entries.length;
  if (avgObs >= 10) score += 5;

  return Math.max(0, Math.min(100, score)) / 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
