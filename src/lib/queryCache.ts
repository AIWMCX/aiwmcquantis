/**
 * Query Cache Utilities
 * 
 * Provides stale-while-revalidate patterns for caching expensive queries.
 * Uses React Query's caching layer with optimized stale/cache times.
 */

import { useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Cache durations (in milliseconds)
export const CACHE_DURATIONS = {
  BENCHMARKS: {
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - benchmarks rarely change
    gcTime: 48 * 60 * 60 * 1000,    // 48 hours
  },
  LOCATIONS: {
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days - location data is very stable
    gcTime: 14 * 24 * 60 * 60 * 1000,   // 14 days
  },
  USER_DATA: {
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 30 * 60 * 1000,    // 30 minutes
  },
  ANALYSES: {
    staleTime: 1 * 60 * 1000,  // 1 minute - user's analyses can change
    gcTime: 10 * 60 * 1000,    // 10 minutes
  },
} as const;

/**
 * Hook for fetching industry benchmarks with aggressive caching
 */
export function useCachedBenchmarks(industryId: string | null) {
  return useQuery({
    queryKey: ['benchmark', industryId],
    queryFn: async () => {
      if (!industryId) return null;
      
      const { data, error } = await supabase
        .from('industry_benchmarks')
        .select('*')
        .eq('industry_id', industryId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!industryId,
    staleTime: CACHE_DURATIONS.BENCHMARKS.staleTime,
    gcTime: CACHE_DURATIONS.BENCHMARKS.gcTime,
  });
}

/**
 * Hook for fetching all benchmarks (for autocomplete/search)
 */
export function useCachedBenchmarksList() {
  return useQuery({
    queryKey: ['benchmarks', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('industry_benchmarks')
        .select('industry_id, industry_name, keywords, region')
        .order('industry_name');
      
      if (error) throw error;
      return data;
    },
    staleTime: CACHE_DURATIONS.BENCHMARKS.staleTime,
    gcTime: CACHE_DURATIONS.BENCHMARKS.gcTime,
  });
}

/**
 * Hook for fetching location data with very long cache
 */
export function useCachedLocations() {
  return useQuery({
    queryKey: ['locations', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_data')
        .select('city_id, city, country, region, overall_cost_index')
        .order('city');
      
      if (error) throw error;
      return data;
    },
    staleTime: CACHE_DURATIONS.LOCATIONS.staleTime,
    gcTime: CACHE_DURATIONS.LOCATIONS.gcTime,
  });
}

/**
 * Hook for fetching user's analyses with moderate caching
 */
export function useCachedUserAnalyses(userId: string | null, limit = 10) {
  return useQuery({
    queryKey: ['analyses', userId, limit],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('analyses')
        .select('id, idea, location, created_at, confidence_score, monthly_profit, payback_months')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: CACHE_DURATIONS.ANALYSES.staleTime,
    gcTime: CACHE_DURATIONS.ANALYSES.gcTime,
  });
}

/**
 * Hook for fetching user's subscription with short cache
 */
export function useCachedSubscription(userId: string | null) {
  return useQuery({
    queryKey: ['subscription', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase.rpc('get_subscription_summary', {
        p_user_id: userId,
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: CACHE_DURATIONS.USER_DATA.staleTime,
    gcTime: CACHE_DURATIONS.USER_DATA.gcTime,
  });
}

/**
 * Prefetch benchmarks for faster subsequent access
 */
export async function prefetchBenchmarks(queryClient: QueryClient, industryIds: string[]) {
  await Promise.all(
    industryIds.map(id =>
      queryClient.prefetchQuery({
        queryKey: ['benchmark', id],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('industry_benchmarks')
            .select('*')
            .eq('industry_id', id)
            .single();
          
          if (error) throw error;
          return data;
        },
        staleTime: CACHE_DURATIONS.BENCHMARKS.staleTime,
      })
    )
  );
}

/**
 * Invalidate user-specific caches (call after analysis, subscription change, etc.)
 */
export function useInvalidateUserCaches() {
  const queryClient = useQueryClient();
  
  return {
    invalidateAnalyses: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
    },
    invalidateSubscription: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  };
}

/**
 * Create optimized query client with proper cache defaults
 */
export function createOptimizedQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes default
        gcTime: 30 * 60 * 1000,   // 30 minutes default
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
}
