/**
 * RVCE client service — invokes the rvce-validate edge function with
 * a hard timeout and a fail-safe fallback. RVCE NEVER blocks the analysis.
 */
import { supabase } from '@/integrations/supabase/client';
import type { AnalysisCorePayload, AnalysisValidationPayload } from './types';
import { RVCE_VERSION } from './types';

const RVCE_TIMEOUT_MS = 25_000;

export async function runRVCEValidation(
  payload: AnalysisCorePayload,
): Promise<AnalysisValidationPayload> {
  const fallback: AnalysisValidationPayload = {
    analysis_id: payload.analysis_id,
    rvce_version: RVCE_VERSION,
    global_confidence_score: 0,
    reference_classes: [],
    metrics_validation: {},
    flags: [],
    evidence_samples: [],
    latency_ms: 0,
    status: 'UNAVAILABLE',
  };

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), RVCE_TIMEOUT_MS);

    const racePromise = supabase.functions.invoke<AnalysisValidationPayload>(
      'rvce-validate',
      { body: payload },
    );

    // supabase-js doesn't accept AbortSignal yet; wrap with manual race.
    const timeoutPromise = new Promise<never>((_, reject) => {
      controller.signal.addEventListener('abort', () =>
        reject(new Error('RVCE timeout')),
      );
    });

    const { data, error } = (await Promise.race([
      racePromise,
      timeoutPromise,
    ])) as { data: AnalysisValidationPayload | null; error: unknown };

    clearTimeout(t);

    if (error || !data) return fallback;
    return data;
  } catch {
    return fallback;
  }
}

/**
 * Build a core payload from the existing analysis result shape.
 * Unknown / missing values are silently dropped so RVCE only validates
 * what is actually present.
 */
export function buildCorePayload(
  analysisId: string,
  businessProfile: Record<string, unknown>,
  coreMetrics: Record<string, number | null | undefined>,
): AnalysisCorePayload {
  const cleanMetrics: Record<string, number> = {};
  for (const [k, v] of Object.entries(coreMetrics)) {
    if (typeof v === 'number' && Number.isFinite(v)) cleanMetrics[k] = v;
  }

  const get = (k: string) =>
    typeof businessProfile?.[k] === 'string' ? (businessProfile[k] as string) : '';

  return {
    analysis_id: analysisId,
    business_profile: {
      title: get('title') || get('businessDescription'),
      description: get('description') || get('businessDescription'),
      industry: get('sector') || get('industry') || 'General',
      business_model: get('businessModel') || 'B2C',
      location_city: get('locationCity') || get('city') || 'Denver',
      location_country: get('locationCountry') || 'US',
      stage: get('stage') || 'pre-revenue',
    },
    core_metrics: cleanMetrics,
  };
}
