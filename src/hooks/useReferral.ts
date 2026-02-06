import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';

interface ReferralStats {
  code: string | null;
  total_clicks: number;
  total_conversions: number;
  total_rewards_earned: number;
  is_active: boolean;
  pending_rewards: number;
  share_url: string | null;
}

interface ReferralConversion {
  id: string;
  status: string;
  clicked_at: string;
  signed_up_at: string | null;
  qualified_at: string | null;
  reward_applied_at: string | null;
}

interface ReferralReward {
  id: string;
  reward_type: string;
  reward_value: number;
  status: string;
  expires_at: string | null;
  applied_at: string | null;
  created_at: string;
}

const REFERRAL_STORAGE_KEY = 'quantis_referral';

export function useReferral() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [conversions, setConversions] = useState<ReferralConversion[]>([]);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch referral stats
  const fetchStats = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_referral_stats', {
        p_user_id: user.id,
      });

      if (error) throw error;
      setStats(data as unknown as ReferralStats);
    } catch (err) {
      console.error('Failed to fetch referral stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Fetch conversions
  const fetchConversions = useCallback(async () => {
    if (!user?.id) return;

    try {
      // First get user's referral code
      const { data: codeData } = await supabase
        .from('referral_codes')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!codeData?.id) return;

      const { data, error } = await supabase
        .from('referral_conversions')
        .select('id, status, clicked_at, signed_up_at, qualified_at, reward_applied_at')
        .eq('referral_code_id', codeData.id)
        .order('clicked_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setConversions(data || []);
    } catch (err) {
      console.error('Failed to fetch conversions:', err);
    }
  }, [user?.id]);

  // Fetch rewards
  const fetchRewards = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('referral_rewards')
        .select('id, reward_type, reward_value, status, expires_at, applied_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRewards(data || []);
    } catch (err) {
      console.error('Failed to fetch rewards:', err);
    }
  }, [user?.id]);

  // Generate referral code
  const generateCode = useCallback(async () => {
    if (!user?.id) {
      toast.error('Please sign in to generate a referral code');
      return null;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.rpc('generate_referral_code', {
        p_user_id: user.id,
      });

      if (error) throw error;

      trackEvent('referral_code_generated');
      await fetchStats();
      toast.success('Your referral code is ready!');

      return data as string;
    } catch (err) {
      console.error('Failed to generate referral code:', err);
      toast.error('Failed to generate referral code');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [user?.id, fetchStats]);

  // Copy referral link to clipboard
  const copyReferralLink = useCallback(async () => {
    if (!stats?.share_url) {
      toast.error('No referral link available');
      return false;
    }

    try {
      await navigator.clipboard.writeText(stats.share_url);
      trackEvent('referral_link_copied');
      toast.success('Referral link copied to clipboard!');
      return true;
    } catch {
      toast.error('Failed to copy link');
      return false;
    }
  }, [stats?.share_url]);

  // Track referral from URL on page load
  const trackReferralFromUrl = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (!refCode) return;

    // Check if already tracked in this session
    const stored = sessionStorage.getItem(REFERRAL_STORAGE_KEY);
    if (stored === refCode) return;

    try {
      // Create IP hash for fraud prevention (simple hash of timestamp)
      const ipHash = btoa(Date.now().toString()).slice(0, 32);

      const { data } = await supabase.rpc('track_referral_click', {
        p_code: refCode,
        p_ip_hash: ipHash,
        p_user_agent: navigator.userAgent,
      });

      if (data) {
        // Store conversion ID for signup completion
        sessionStorage.setItem(REFERRAL_STORAGE_KEY, refCode);
        localStorage.setItem('quantis_referral_conversion_id', data);
        trackEvent('referral_click_tracked', { code: refCode });
      }
    } catch (err) {
      console.error('Failed to track referral click:', err);
    }

    // Clean URL
    const url = new URL(window.location.href);
    url.searchParams.delete('ref');
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Complete referral signup (call after user signs up)
  const completeReferralSignup = useCallback(async (newUserId: string) => {
    const conversionId = localStorage.getItem('quantis_referral_conversion_id');
    if (!conversionId) return false;

    try {
      const { data, error } = await supabase.rpc('complete_referral_signup', {
        p_conversion_id: conversionId,
        p_referred_user_id: newUserId,
      });

      if (error) throw error;

      if (data) {
        trackEvent('referral_signup_completed');
        localStorage.removeItem('quantis_referral_conversion_id');
        sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
        return true;
      }
    } catch (err) {
      console.error('Failed to complete referral signup:', err);
    }

    return false;
  }, []);

  // Initial load
  useEffect(() => {
    if (user?.id) {
      fetchStats();
      fetchConversions();
      fetchRewards();
    }
  }, [user?.id, fetchStats, fetchConversions, fetchRewards]);

  // Track referral from URL on mount
  useEffect(() => {
    trackReferralFromUrl();
  }, [trackReferralFromUrl]);

  return {
    stats,
    conversions,
    rewards,
    isLoading,
    isGenerating,
    generateCode,
    copyReferralLink,
    completeReferralSignup,
    refreshStats: fetchStats,
  };
}
