import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import type { UserEngagement, EmailFrequency, MILESTONES, STREAK_MILESTONES } from '@/lib/engagementTypes';

import { logger } from '@/lib/logger';
interface UseEngagementReturn {
  engagement: UserEngagement | null;
  isLoading: boolean;
  error: string | null;
  updateEmailPreference: (frequency: EmailFrequency) => Promise<void>;
  checkNewMilestones: () => string[];
  refetch: () => void;
}

const DEFAULT_ENGAGEMENT: UserEngagement = {
  current_streak: 0,
  longest_streak: 0,
  total_analyses: 0,
  total_exports: 0,
  activity_score: 0,
  engagement_tier: 'new',
  milestones_achieved: [],
  email_frequency: 'weekly',
  last_active_date: null,
};

export function useEngagement(): UseEngagementReturn {
  const { user, isAuthenticated } = useAuth();
  const [engagement, setEngagement] = useState<UserEngagement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEngagement = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setEngagement(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use RPC function to get engagement stats
      const { data, error: rpcError } = await supabase.rpc('get_user_engagement_stats', {
        p_user_id: user.id,
      });

      if (rpcError) throw rpcError;

      // Parse the JSON response - cast through unknown first
      const stats = data as unknown as UserEngagement;
      setEngagement({
        ...DEFAULT_ENGAGEMENT,
        ...stats,
        milestones_achieved: Array.isArray(stats.milestones_achieved) 
          ? stats.milestones_achieved 
          : [],
      });
    } catch (err) {
      logger.error('Error fetching engagement:', err);
      setError('Failed to load engagement data');
      setEngagement(DEFAULT_ENGAGEMENT);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    fetchEngagement();
  }, [fetchEngagement]);

  const updateEmailPreference = useCallback(async (frequency: EmailFrequency) => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('user_engagement')
        .update({ email_frequency: frequency, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setEngagement(prev => prev ? { ...prev, email_frequency: frequency } : null);
      toast.success(`Email preference updated to ${frequency}`);
      
      trackEvent('email_preference_updated', { frequency });
    } catch (err) {
      logger.error('Error updating email preference:', err);
      toast.error('Failed to update email preference');
    }
  }, [user]);

  const checkNewMilestones = useCallback((): string[] => {
    if (!engagement) return [];

    const { MILESTONES } = require('@/lib/engagementTypes');
    const newMilestones: string[] = [];

    for (const milestone of MILESTONES) {
      if (engagement.milestones_achieved.includes(milestone.id)) continue;

      const { field, operator, value } = milestone.condition;
      const currentValue = engagement[field as keyof UserEngagement];

      let achieved = false;
      if (operator === '>=' && typeof currentValue === 'number') {
        achieved = currentValue >= (value as number);
      } else if (operator === '>' && typeof currentValue === 'number') {
        achieved = currentValue > (value as number);
      } else if (operator === '=') {
        achieved = currentValue === value;
      }

      if (achieved) {
        newMilestones.push(milestone.id);
      }
    }

    return newMilestones;
  }, [engagement]);

  return {
    engagement,
    isLoading,
    error,
    updateEmailPreference,
    checkNewMilestones,
    refetch: fetchEngagement,
  };
}
