/**
 * useQuoteGenUsage — single source of truth for QuoteGen (Beta) monthly quotas.
 *
 * Quotas (server-enforced — see `increment_quote_gen_usage` RPC):
 *   FREE → 0 quotes/mo (locked)
 *   PLUS → 5 quotes/mo
 *   PRO  → 15 quotes/mo
 *
 * The server (`get_quote_gen_status` RPC) is the only authority. This hook
 * mirrors the server response into React state for UI.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

export const QUOTEGEN_QUOTAS = { free: 0, plus: 5, pro: 15 } as const;

export type QuoteGenPlanTier = keyof typeof QUOTEGEN_QUOTAS;

export interface QuoteGenStatus {
  planTier: QuoteGenPlanTier;
  limit: number;
  used: number;
  remaining: number;
  isEnabled: boolean;
  isExhausted: boolean;
  monthKey: string;
}

const DEFAULT_STATUS: QuoteGenStatus = {
  planTier: 'free',
  limit: 0,
  used: 0,
  remaining: 0,
  isEnabled: false,
  isExhausted: true,
  monthKey: '',
};

export function useQuoteGenUsage() {
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<QuoteGenStatus>(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!user) {
      setStatus(DEFAULT_STATUS);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_quote_gen_status' as never);
      if (rpcError) throw rpcError;
      const parsed = (data ?? DEFAULT_STATUS) as QuoteGenStatus;
      setStatus(parsed);
      setError(null);
    } catch (e) {
      logger.warn('useQuoteGenUsage fetch failed', { metadata: { err: String(e) } });
      setError(e instanceof Error ? e.message : String(e));
      setStatus(DEFAULT_STATUS);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) void fetchStatus();
  }, [authLoading, fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}
