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
  analysesUsed: number;
  analysesLimit: number;
  canAnalyze: boolean;
  remainingAnalyses: number;
  loading: boolean;
  error: string | null;
  isTimedOut: boolean;
  refetch: () => Promise<void>;
  createCheckout: (plan: 'plus' | 'pro') => Promise<void>;
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
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('id, user_id, plan_id, status, current_period_start, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') {
        logger.error('Error fetching subscription:', subError);
      }
      
      if (isMounted.current) {
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

  // Computed values — graceful fallback to free tier on any error.
  // Master Spec v1.0 supports FREE | PLUS | PRO (enterprise → PRO).
  const planId = subscription?.plan_id || 'free';
  const status = subscription?.status || 'active';
  const isActive = status === 'active' || status === 'trialing';
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

  const createCheckout = async (plan: 'plus' | 'pro') => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to subscribe',
        variant: 'destructive',
      });
      return;
    }

    try {
      logger.info('[Checkout] Starting checkout for plan:', plan);
      
      toast({
        title: 'Starting checkout...',
        description: 'Redirecting to payment page',
      });

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan },
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
