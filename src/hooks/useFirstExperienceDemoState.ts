import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface FirstExperienceDemoState {
  demo_version: string;
  demo_started_at: string;
  demo_completed_at: string | null;
  demo_skipped_at: string | null;
}

/**
 * Server-side persistence for First Decision Experience demo progress
 * (Wave 2). Mirrors useBrandProfile.ts's shape: one row per user, fetched
 * and written via SECURITY DEFINER RPCs rather than direct table access.
 *
 * This hook only persists state -- it does not change any routing or
 * redirect behavior. Wiring it into a first-login resolver is a later wave.
 */
export function useFirstExperienceDemoState() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['first-experience-demo-state', user?.id];

  const { data: state, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await (supabase as any).rpc('get_first_experience_demo_state');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as FirstExperienceDemoState | null;
    },
    enabled: !!user,
  });

  const markStarted = useMutation({
    mutationFn: async (demoVersion: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await (supabase as any).rpc('mark_first_experience_demo_started', {
        _demo_version: demoVersion,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const markCompleted = useMutation({
    mutationFn: async (demoVersion: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await (supabase as any).rpc('mark_first_experience_demo_completed', {
        _demo_version: demoVersion,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const markSkipped = useMutation({
    mutationFn: async (demoVersion: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await (supabase as any).rpc('mark_first_experience_demo_skipped', {
        _demo_version: demoVersion,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    state,
    isLoading,
    hasStartedBefore: !!state,
    hasCompletedBefore: !!state?.demo_completed_at,
    hasSkippedBefore: !!state?.demo_skipped_at,
    markStarted: markStarted.mutate,
    markCompleted: markCompleted.mutate,
    markSkipped: markSkipped.mutate,
  };
}
