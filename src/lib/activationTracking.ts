/**
 * Activation Tracking System
 *
 * Tracks key user events through the activation funnel and powers:
 * - The activation scoring system (sidebar widget, dashboard banner)
 * - Contextual upgrade triggers (matrix in contextualTriggers.ts)
 * - Admin KPI dashboard (WAF, trial-to-paid, retention)
 *
 * Event vocabulary is canonical — do NOT add new event types here without
 * updating the database `get_user_activation_score` function and the
 * trigger matrix in `contextualTriggers.ts`.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { trackEvent } from '@/lib/analytics';

export type ActivationEventType =
  | 'idea_entered'
  | 'location_entered'
  | 'calculation_completed'
  | 'pdf_exported'
  | 'return_visit'
  | 'doc_generated'
  | 'scenario_edited'
  | 'invoice_created';

export type ActivationBand = 'new' | 'exploring' | 'engaged' | 'champion';

export interface ActivationScore {
  score: number;
  band: ActivationBand;
  next_step: string;
  event_counts: Record<string, number>;
  unique_events: number;
}

/**
 * Canonical scoring weights — must match `get_user_activation_score` in DB.
 * Each event type's contribution is capped at 3 occurrences.
 */
export const EVENT_WEIGHTS: Record<ActivationEventType, number> = {
  idea_entered: 10,
  location_entered: 10,
  calculation_completed: 20,
  pdf_exported: 25,
  return_visit: 15,
  doc_generated: 20,
  scenario_edited: 15,
  invoice_created: 25,
};

/**
 * Per-session dedupe to avoid spamming events on rapid keystroke / re-render.
 * Keyed by `${type}:${windowId}`.
 */
const SESSION_DEDUPE_WINDOW_MS = 30_000;
const recentEvents = new Map<string, number>();

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = sessionStorage.getItem('quantis_activation_session');
  if (!id) {
    id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem('quantis_activation_session', id);
  }
  return id;
}

/**
 * Track an activation event — fire-and-forget, never blocks the UI.
 *
 * - Inserts a row into `activation_events` for the authenticated user
 * - Mirrors the event to GA via `trackEvent('activation_*')`
 * - De-duplicates within a 30-second window per event type
 */
export async function trackActivationEvent(
  type: ActivationEventType,
  metadata: Record<string, unknown> = {},
  options: { dedupe?: boolean } = {},
): Promise<void> {
  const dedupe = options.dedupe ?? true;

  // Mirror to GA always (analytics tier — no PII)
  trackEvent(`activation_${type}`, {
    weight: EVENT_WEIGHTS[type],
    ...metadata,
  });

  try {
    const { data: userResp } = await supabase.auth.getUser();
    const userId = userResp?.user?.id;
    if (!userId) {
      // Anonymous — skip DB write. GA already captured the funnel signal.
      return;
    }

    if (dedupe) {
      const key = `${type}:${userId}`;
      const last = recentEvents.get(key) ?? 0;
      if (Date.now() - last < SESSION_DEDUPE_WINDOW_MS) return;
      recentEvents.set(key, Date.now());
    }

    // Cast required because the generated Supabase types lag behind the migration
    // until the next regeneration cycle. Insert is server-validated by RLS regardless.
    const { error } = await (supabase.from('activation_events') as unknown as {
      insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    }).insert({
      user_id: userId,
      event_type: type,
      event_value: EVENT_WEIGHTS[type],
      metadata,
      session_id: getSessionId(),
    });

    if (error) {
      logger.warn('[activation] insert failed', error.message);
    }
  } catch (err) {
    logger.warn('[activation] tracking error', err);
  }
}

/**
 * Mark a return visit if the last visit was on a previous calendar day.
 * Idempotent per day via localStorage.
 */
export function trackReturnVisitIfApplicable(): void {
  if (typeof window === 'undefined') return;

  const today = new Date().toISOString().slice(0, 10);
  const lastVisit = localStorage.getItem('quantis_last_visit_date');
  localStorage.setItem('quantis_last_visit_date', today);

  if (lastVisit && lastVisit !== today) {
    void trackActivationEvent('return_visit', { last_visit: lastVisit, today });
  }
}

/**
 * Fetch the current user's activation score.
 * Returns the default new-user state if no events exist yet.
 */
export async function fetchActivationScore(
  userId: string,
): Promise<ActivationScore> {
  const { data, error } = await supabase.rpc('get_user_activation_score', {
    p_user_id: userId,
  });

  if (error || !data) {
    logger.warn('[activation] score fetch failed', error?.message);
    return {
      score: 0,
      band: 'new',
      next_step: 'Enter your business idea and location to start your first analysis.',
      event_counts: {},
      unique_events: 0,
    };
  }

  return data as unknown as ActivationScore;
}

/**
 * UI metadata for each band — colors come from semantic tokens (no hex).
 */
export const BAND_META: Record<
  ActivationBand,
  { label: string; tone: string; description: string }
> = {
  new: {
    label: 'New',
    tone: 'text-muted-foreground',
    description: 'Just getting started.',
  },
  exploring: {
    label: 'Exploring',
    tone: 'text-blue-600 dark:text-blue-400',
    description: 'You\'re finding your way around.',
  },
  engaged: {
    label: 'Engaged',
    tone: 'text-amber-600 dark:text-amber-400',
    description: 'Strong activation — keep going.',
  },
  champion: {
    label: 'Champion',
    tone: 'text-emerald-600 dark:text-emerald-400',
    description: 'You\'re using Quantis like a pro.',
  },
};
