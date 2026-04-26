import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface ActivationKpis {
  waf: number;
  waf_target: number;
  trial_to_paid: {
    percent: number;
    target_percent: number;
    signups_90d: number;
    paid_90d: number;
  };
  retention: {
    '3m': { percent: number; target_percent: number; cohort_size: number; active: number };
    '6m': { percent: number; target_percent: number; cohort_size: number; active: number };
    '12m': { percent: number; target_percent: number; cohort_size: number; active: number };
  };
  generated_at: string;
}

export function useActivationKpis() {
  const [kpis, setKpis] = useState<ActivationKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data, error: rpcError } = await supabase.rpc('get_activation_kpis');
        if (cancelled) return;
        if (rpcError) {
          setError(rpcError.message);
          return;
        }
        setKpis(data as unknown as ActivationKpis);
      } catch (err) {
        logger.error('[useActivationKpis] failed', err);
        if (!cancelled) setError('Failed to load KPIs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { kpis, loading, error };
}
