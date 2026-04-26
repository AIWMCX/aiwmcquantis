/**
 * useActivation — fetches the current user's activation score and surfaces
 * the next-best contextual upgrade trigger.
 */
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import {
  fetchActivationScore,
  type ActivationScore,
} from '@/lib/activationTracking';
import {
  selectTrigger,
  type UpgradeTrigger,
} from '@/lib/contextualTriggers';

const DEFAULT: ActivationScore = {
  score: 0,
  band: 'new',
  next_step: 'Enter your business idea and location to start your first analysis.',
  event_counts: {},
  unique_events: 0,
};

export function useActivation() {
  const { user, isAuthenticated } = useAuth();
  const { isPlus } = useSubscription();
  const [score, setScore] = useState<ActivationScore>(DEFAULT);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    setLoading(true);
    try {
      setScore(await fetchActivationScore(user.id));
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const trigger: UpgradeTrigger | null = selectTrigger(score.event_counts, isPlus);

  return { score, loading, refetch, trigger, isPlus };
}
