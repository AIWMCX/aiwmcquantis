 import { useState, useEffect, useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/hooks/useAuth';
 
 interface RateLimitInfo {
   allowed: boolean;
   remaining: number;
   limit: number;
   resetAt: Date | null;
   tier: 'anonymous' | 'free' | 'plus';
 }
 
const TIER_LIMITS = {
  anonymous: 3,
  free: 10,
  plus: Infinity,
};
 
 export function useRateLimit() {
   const { user, isLoading: authLoading } = useAuth();
   const [info, setInfo] = useState<RateLimitInfo>({
     allowed: true,
     remaining: 3,
     limit: 3,
     resetAt: null,
     tier: 'anonymous',
   });
   const [isLoading, setIsLoading] = useState(false);
 
   // Determine tier based on auth and subscription
   const getTier = useCallback(async (): Promise<'anonymous' | 'free' | 'plus'> => {
     if (!user) return 'anonymous';
 
     try {
       const { data, error } = await supabase
         .from('subscriptions')
         .select('plan_id, status')
         .eq('user_id', user.id)
         .single();
 
       if (error || !data) return 'free';
 
       if (
         data.plan_id === 'plus' &&
         (data.status === 'active' || data.status === 'trialing')
       ) {
         return 'plus';
       }
 
       return 'free';
     } catch {
       return 'free';
     }
   }, [user]);
 
   // Fetch current rate limit status
   const fetchRateLimitStatus = useCallback(async () => {
     setIsLoading(true);
     try {
       const tier = await getTier();
       const limit = TIER_LIMITS[tier];
 
       if (tier === 'plus') {
         setInfo({
           allowed: true,
           remaining: Infinity,
           limit: Infinity,
           resetAt: null,
           tier: 'plus',
         });
         return;
       }
 
       // For free/anonymous, check usage
       const now = new Date();
       const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
 
       if (user) {
         const { data, error } = await supabase
           .from('usage_tracking')
           .select('analyses_count')
           .eq('user_id', user.id)
           .eq('month_year', monthYear)
           .single();
 
         const used = data?.analyses_count ?? 0;
         const remaining = Math.max(0, limit - used);
 
         // Calculate reset (first of next month)
         const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
 
         setInfo({
           allowed: remaining > 0,
           remaining,
           limit,
           resetAt,
           tier,
         });
       } else {
         // Anonymous users - check localStorage for simple tracking
         const stored = localStorage.getItem('anon_usage_count');
         const used = stored ? parseInt(stored, 10) : 0;
         const remaining = Math.max(0, limit - used);
 
         setInfo({
           allowed: remaining > 0,
           remaining,
           limit,
           resetAt: null,
           tier: 'anonymous',
         });
       }
     } catch (err) {
       console.error('Rate limit check failed:', err);
     } finally {
       setIsLoading(false);
     }
   }, [user, getTier]);
 
   // Refresh on auth change
   useEffect(() => {
     if (!authLoading) {
       fetchRateLimitStatus();
     }
   }, [authLoading, fetchRateLimitStatus]);
 
   // Format time until reset
   const formatResetTime = useCallback((): string => {
     if (!info.resetAt) return '';
     
     const now = new Date();
     const diff = info.resetAt.getTime() - now.getTime();
     
     if (diff <= 0) return 'soon';
     
     const days = Math.floor(diff / (1000 * 60 * 60 * 24));
     if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
     
     const hours = Math.floor(diff / (1000 * 60 * 60));
     if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
     
     const minutes = Math.floor(diff / (1000 * 60));
     return `${minutes} minute${minutes > 1 ? 's' : ''}`;
   }, [info.resetAt]);
 
   return {
     ...info,
     isLoading,
     refresh: fetchRateLimitStatus,
     formatResetTime,
     isUnlimited: info.tier === 'plus',
   };
 }