import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

import { logger } from '@/lib/logger';
import {
  planToTier,
  FEATURE_MANIFEST,
  type Tier,
  type FeatureManifest,
} from '@/lib/tier-spec';
/**
 * Subscription data interface - excludes sensitive Stripe IDs
 * SECURITY: Stripe customer/subscription IDs are never exposed to frontend
 * They are only accessible by service_role for webhook operations
 */
interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
}

interface UsageTracking {
  analyses_count: number;
  month_year: string;
}

interface SubscriptionData {
  subscription: Subscription | null;
  usage: UsageTracking | null;
  /** Canonical Master Spec tier — single source of truth. */
  tier: Tier;
  /** Spec-derived feature manifest for this tier. */
  manifest: FeatureManifest;
  isPlus: boolean;
  isPro: boolean;
  isFree: boolean;
  isActive: boolean;
  isTrialing: boolean;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  analysesUsed: number;
  analysesLimit: number;
  canAnalyze: boolean;
  remainingAnalyses: number;
  loading: boolean;
  error: string | null;
  isTimedOut: boolean;
  refetch: () => Promise<void>;
  createCheckout: (plan: 'plus' | 'pro', promotionCode?: string, billingPeriod?: 'monthly' | 'annual') => Promise<void>;
  openPortal: () => Promise<void>;
}

const FREE_TIER_LIMIT = 1;
const MAX_LOADING_TIMEOUT = 5000; // 5 seconds max wait
const MAX_RETRIES = 2;

export function useSubscription(): SubscriptionData {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const retryCount = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  const getCurrentMonthYear = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const fetchData = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setUsage(null);
      setLoading(false);
      setError(null);
      setIsTimedOut(false);
      return;
    }

    try {
      if (isMounted.current) {
        setLoading(true);
        setError(null);
        setIsTimedOut(false);
      }

      // SECURITY: Query the secure view instead of base table
      // This excludes stripe_customer_id and stripe_subscription_id
      // Note: Using base table query but only selecting safe columns
      // The RLS policy + view ensure Stripe IDs are never exposed
      // Order by updated_at DESC so if multiple rows exist we always get the latest.
      // Without ordering, Postgres can return any row — causing paid users to see FREE tier.
      const { data: subRows, error: subError } = await supabase
        .from('subscriptions')
        .select('id, user_id, plan_id, status, current_period_start, current_period_end, trial_ends_at')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .order('updated_at', { ascending: false })
        .limit(5);

      if (subError && subError.code !== 'PGRST116') {
        logger.error('Error fetching subscription:', subError);
      }
      
      if (isMounted.current) {
        const rank = (planId?: string | null) => planId === 'pro' || planId === 'enterprise' ? 3 : planId === 'plus' ? 2 : 1;
        const subData = (subRows ?? [])
          .slice()
          .sort((a, b) => rank(b.plan_id) - rank(a.plan_id))[0] ?? null;
        // Type assertion to match our safe Subscription interface (without Stripe IDs)
        setSubscription(subData as Subscription | null);
      }

      // Fetch usage for current month
      const monthYear = getCurrentMonthYear();
      const { data: usageData, error: usageError } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('month_year', monthYear)
        .maybeSingle();

      if (usageError && usageError.code !== 'PGRST116') {
        logger.error('Error fetching usage:', usageError);
      }
      
      if (isMounted.current) {
        setUsage(usageData);
        retryCount.current = 0; // Reset retry count on success
      }

    } catch (err) {
      logger.error('Error in fetchData:', err);
      if (isMounted.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load subscription data';
        setError(errorMessage);
        
        // Auto-retry with exponential backoff
        if (retryCount.current < MAX_RETRIES) {
          retryCount.current++;
          const delay = Math.pow(2, retryCount.current) * 1000;
          setTimeout(() => {
            if (isMounted.current) fetchData();
          }, delay);
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [user]);

  // Timeout mechanism - ensure loading never hangs
  useEffect(() => {
    if (loading && !isTimedOut) {
      timeoutRef.current = setTimeout(() => {
        if (isMounted.current && loading) {
          logger.warn('Subscription fetch timed out, defaulting to free tier');
          setLoading(false);
          setIsTimedOut(true);
          setError('Connection timeout - using free tier');
        }
      }, MAX_LOADING_TIMEOUT);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loading, isTimedOut]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Initial fetch when auth is ready
  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [fetchData, authLoading]);

  // Refetch on window focus for real-time subscription updates
  useEffect(() => {
    const handleFocus = () => {
      if (user && !loading) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, loading, fetchData]);

  // ISSUE-004 — Realtime listener: react instantly when the Stripe webhook
  // flips plan_id (checkout → 'pro', grace expired → 'free', etc.) so the
  // user sees Pro features unlock without a reload.
  useEffect(() => {
    if (!user) return;
    const channelName = `subscription:${user.id}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          logger.info('[Subscription realtime] change received', { metadata: { event: payload.eventType } });
          fetchData();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchData]);

  // Computed values — graceful fallback to free tier on any error.
  // Master Spec v1.0 supports FREE | PLUS | PRO (enterprise → PRO).
  const planId = subscription?.plan_id || 'free';
  const status = subscription?.status || 'active';
  const isActive = status === 'active' || status === 'trialing';
  const isTrialing = status === 'trialing';
  const trialEndsAt = subscription?.trial_ends_at ?? null;
  const trialDaysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : null;
  // Resolve canonical tier; if subscription is inactive, downgrade to FREE.
  const tier: Tier = isActive ? planToTier(planId) : 'FREE';
  const manifest: FeatureManifest = FEATURE_MANIFEST[tier];
  const isPro = tier === 'PRO';
  const isPlus = tier === 'PLUS' || isPro; // Pro inherits Plus capabilities
  const isFree = tier === 'FREE';

  const analysesUsed = usage?.analyses_count || 0;
  const monthlyLimit = manifest.monthly_analysis_limit;
  const analysesLimit = Number.isFinite(monthlyLimit) ? monthlyLimit : Infinity;
  const canAnalyze = !isFree || analysesUsed < monthlyLimit;
  const remainingAnalyses = isFree ? Math.max(0, monthlyLimit - analysesUsed) : Infinity;

  const createCheckout = async (plan: 'plus' | 'pro', promotionCode?: string, billingPeriod?: 'monthly' | 'annual') => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to subscribe',
        variant: 'destructive',
      });
      return;
    }

    try {
      const trimmedCode = (promotionCode ?? '').trim().toUpperCase();
      const period = billingPeriod === 'annual' ? 'annual' : 'monthly';
      logger.info(`[Checkout] Starting checkout for plan: ${plan} ${period}${trimmedCode ? ` (promo: ${trimmedCode})` : ''}`);

      toast({
        title: 'Starting checkout...',
        description: trimmedCode
          ? `Applying promo code ${trimmedCode} and redirecting to payment…`
          : 'Redirecting to payment page',
      });

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan, billing_period: period, ...(trimmedCode ? { promotion_code: trimmedCode } : {}) },
      });

      logger.info('[Checkout] Response:', { data, error });

      if (error) throw error;
      
      if (data?.url) {
        logger.info('[Checkout] Redirecting immediately to:', data.url);
        // Use replace for immediate, non-interruptible redirect
        window.location.replace(data.url);
        return; // Prevent any further code execution
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      logger.error('[Checkout] Error:', err);
      toast({
        title: 'Checkout Error',
        description: err instanceof Error ? err.message : 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const openPortal = async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to manage your subscription',
        variant: 'destructive',
      });
      return;
    }

    // SECURITY: Check subscription exists via plan_id (not stripe_customer_id which is hidden)
    // The portal edge function will verify Stripe customer server-side
    if (!subscription || subscription.plan_id === 'free') {
      toast({
        title: 'No Active Subscription',
        description: 'You are on the free plan. Upgrade to access subscription management.',
        variant: 'destructive',
      });
      return;
    }

    try {
      toast({
        title: 'Opening portal...',
        description: 'Redirecting to subscription management',
      });

      const { data, error } = await supabase.functions.invoke('create-portal-session');

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL received');
      }
    } catch (err) {
      logger.error('Portal error:', err);
      toast({
        title: 'Portal Error',
        description: err instanceof Error ? err.message : 'Failed to open subscription portal. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Return loading as false after authLoading is done and timeout kicks in
  const effectiveLoading = authLoading ? true : (loading && !isTimedOut);

  return {
    subscription,
    usage,
    tier,
    manifest,
    isPlus,
    isPro,
    isFree,
    isActive,
    isTrialing,
    trialEndsAt,
    trialDaysRemaining,
    analysesUsed,
    analysesLimit,
    canAnalyze,
    remainingAnalyses,
    loading: effectiveLoading,
    error,
    isTimedOut,
    refetch: fetchData,
    createCheckout,
    openPortal,
  };
}
