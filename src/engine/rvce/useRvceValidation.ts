import { useEffect, useRef, useState } from 'react';
import type { AnalysisCorePayload, AnalysisValidationPayload } from './types';
import { runRVCEValidation } from './rvceService';

/**
 * Hook to run RVCE validation once per analysis. Fail-safe: never throws,
 * always resolves to a payload (UNAVAILABLE on failure).
 */
export function useRvceValidation(payload: AnalysisCorePayload | null) {
  const [data, setData] = useState<AnalysisValidationPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const ranFor = useRef<string | null>(null);

  useEffect(() => {
    if (!payload?.analysis_id) return;
    if (Object.keys(payload.core_metrics ?? {}).length === 0) return;
    if (ranFor.current === payload.analysis_id) return;

    ranFor.current = payload.analysis_id;
    let cancelled = false;
    setLoading(true);

    runRVCEValidation(payload)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [payload?.analysis_id, payload]);

  return { validation: data, loading };
}
