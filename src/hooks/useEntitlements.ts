/**
 * useEntitlements — server-validated tier + features + limits.
 *
 * Mirrors `plan_entitlements` server-side via the `entitlements-snapshot`
 * edge function. After a Stripe webhook flips `subscriptions.plan_id`, the
 * realtime listener triggers a fresh snapshot fetch so the UI flips instantly
 * to the new tier — guaranteed identical to what edge functions enforce.
 *
 * Use this for ANY UI gating going forward. `useSubscription` remains for
 * legacy callers but reads the same `subscriptions` row; this hook adds
 * server-side validation against the plan_entitlements DB mirror.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';

export type EntitlementsTier = 'free' | 'plus' | 'pro';

export interface EntitlementsSnapshot {
  tier: EntitlementsTier;
  label: string;
  monthly_analyses: number; // -1 = unlimited
  features: Record<string, boolean>;
  limits: Record<string, number>;
  stripe_price_ids: string[];
}

export interface UseEntitlementsResult {
  tier: EntitlementsTier;
  entitlements: EntitlementsSnapshot | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasFeature: (key: string) => boolean;
  getLimit: (key: string) => number;
  source: 'plan_entitlements' | null;
  serverTime: string | null;
}

const FREE_FALLBACK: EntitlementsSnapshot = {
  tier: 'free',
  label: 'Free',
  monthly_analyses: 5,
  features: {
    depthQuick: true,
    depthFull: true,
    preMortem: true,
    actionPlan: true,
    scenarioView: true,
    scenarioCustom: true,
    scenarioSave: true,
    scenarioCompare: true,
  },
  limits: {
    analysesPerMonth: 5,
    projectionMonths: 36,
    monteCarloScenarios: 1000,
    scenarioSetsPerAnalysis: 1,
    templates: 3,
  },
  stripe_price_ids: [],
};

export function useEntitlements(): UseEntitlementsResult {
  const { user, isLoading: authLoading } = useAuth();
  const [snapshot, setSnapshot] = useState<EntitlementsSnapshot | null>(null);
  const [source, setSource] = useState<'plan_entitlements' | null>(null);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const fetchSnapshot = useCallback(async () => {
    if (!user) {
      setSnapshot(FREE_FALLBACK);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data, error: invokeErr } = await supabase.functions.invoke('entitlements-snapshot', {
        body: {},
      });
      if (invokeErr) throw invokeErr;
      if (!mounted.current) return;
      if (data?.ok && data.entitlements) {
        setSnapshot(data.entitlements as EntitlementsSnapshot);
        setSource((data.source as 'plan_entitlements') ?? null);
        setServerTime(data.server_time ?? null);
        if (data.rejected_claim) {
          logger.warn('[useEntitlements] server rejected client claim', { metadata: { rejected: data.rejected_claim } });
        }
      } else {
        setSnapshot(FREE_FALLBACK);
        setError('snapshot_unavailable');
      }
    } catch (e) {
      logger.error('[useEntitlements] fetch failed', e);
      if (mounted.current) {
        setSnapshot(FREE_FALLBACK);
        setError(e instanceof Error ? e.message : 'fetch_failed');
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!authLoading) fetchSnapshot();
  }, [authLoading, fetchSnapshot]);

  // Realtime: subscriptions row changes (Stripe webhook lands) → refetch.
  useEffect(() => {
    if (!user) return;
    const channelName = `entitlements:${user.id}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subscriptions',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        logger.info('[useEntitlements] subscriptions changed → resyncing entitlements');
        fetchSnapshot();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'plan_entitlements',
      }, () => fetchSnapshot())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchSnapshot]);

  // Window focus revalidation — covers cross-tab Stripe checkouts.
  useEffect(() => {
    const onFocus = () => { if (user && !loading) fetchSnapshot(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, loading, fetchSnapshot]);

  const eff = snapshot ?? FREE_FALLBACK;
  return {
    tier: eff.tier,
    entitlements: eff,
    loading,
    error,
    refetch: fetchSnapshot,
    hasFeature: (key) => !!eff.features?.[key],
    getLimit: (key) => {
      const v = eff.limits?.[key];
      return v === -1 ? Number.POSITIVE_INFINITY : (typeof v === 'number' ? v : 0);
    },
    source,
    serverTime,
  };
}
