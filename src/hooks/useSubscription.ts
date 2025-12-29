import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
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
  isPro: boolean;
  isEnterprise: boolean;
  isFree: boolean;
  isActive: boolean;
  analysesUsed: number;
  analysesLimit: number;
  canAnalyze: boolean;
  remainingAnalyses: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCheckout: (plan: 'pro' | 'enterprise') => Promise<void>;
  openPortal: () => Promise<void>;
}

const FREE_TIER_LIMIT = 3;

export function useSubscription(): SubscriptionData {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCurrentMonthYear = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const fetchData = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setUsage(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subError && subError.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subError);
      }
      setSubscription(subData);

      // Fetch usage for current month
      const monthYear = getCurrentMonthYear();
      const { data: usageData, error: usageError } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('month_year', monthYear)
        .maybeSingle();

      if (usageError && usageError.code !== 'PGRST116') {
        console.error('Error fetching usage:', usageError);
      }
      setUsage(usageData);

    } catch (err) {
      console.error('Error in fetchData:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [fetchData, authLoading]);

  // Computed values
  const planId = subscription?.plan_id || 'free';
  const status = subscription?.status || 'active';
  const isActive = status === 'active' || status === 'trialing';
  const isPro = planId === 'pro' && isActive;
  const isEnterprise = planId === 'enterprise' && isActive;
  const isFree = !isPro && !isEnterprise;

  const analysesUsed = usage?.analyses_count || 0;
  const analysesLimit = isFree ? FREE_TIER_LIMIT : Infinity;
  const canAnalyze = !isFree || analysesUsed < FREE_TIER_LIMIT;
  const remainingAnalyses = isFree ? Math.max(0, FREE_TIER_LIMIT - analysesUsed) : Infinity;

  const createCheckout = async (plan: 'pro' | 'enterprise') => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to subscribe',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to start checkout',
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

    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session');

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL received');
      }
    } catch (err) {
      console.error('Portal error:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to open subscription portal',
        variant: 'destructive',
      });
    }
  };

  return {
    subscription,
    usage,
    isPro,
    isEnterprise,
    isFree,
    isActive,
    analysesUsed,
    analysesLimit,
    canAnalyze,
    remainingAnalyses,
    loading: loading || authLoading,
    error,
    refetch: fetchData,
    createCheckout,
    openPortal,
  };
}
