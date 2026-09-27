import { supabase } from '@/integrations/supabase/client';
import { recordFunnelEvent } from '@/lib/analytics';

/**
 * First Decision Experience, Wave 3: the ONE routing resolver.
 *
 * Deliberately a pure function (resolveFirstExperience) plus a thin async
 * orchestrator (resolveFirstExperienceForUser) that fetches the inputs --
 * so the actual precedence logic is exhaustively unit-testable without a
 * database or React tree, per the spec's emphasis on this being the
 * highest-regression-risk piece of the wave.
 *
 * This resolver is called from exactly ONE place: src/pages/Auth.tsx's
 * existing post-sign-in navigate() decision -- and only on the branch that
 * would otherwise hardcode '/app' (no returnUrl, no checkout in flight).
 * An explicit returnUrl/checkout is a higher-precedence deep link and
 * bypasses this resolver entirely, by construction, before it is ever
 * called -- see Auth.tsx.
 */

export type FirstExperienceDestination = 'FIRST_DEMO' | 'RESUME_DEMO' | 'START_DECISION' | 'NORMAL_APP';

export interface FirstExperienceDemoStateSummary {
  hasStartedBefore: boolean;
  hasCompletedBefore: boolean;
  hasSkippedBefore: boolean;
}

export interface FirstExperienceResolverInput {
  /** Admins always land on the normal app -- never forced through onboarding. */
  isAdmin: boolean;
  /** Derived from public.analyses (has this user ever completed a REAL
   *  analysis). Once true, this always outranks demo state: a real user
   *  with prior meaningful product use never sees onboarding again,
   *  regardless of whether they also happened to poke at the demo. */
  hasCompletedRealAnalysis: boolean;
  /** null = no first_experience_demo_state row at all (never touched it). */
  demoState: FirstExperienceDemoStateSummary | null;
}

/**
 * Pure precedence logic -- no I/O, no React, no Supabase. Every branch is
 * total (every input shape maps to exactly one destination).
 */
export function resolveFirstExperience(input: FirstExperienceResolverInput): FirstExperienceDestination {
  if (input.isAdmin) return 'NORMAL_APP';
  if (input.hasCompletedRealAnalysis) return 'NORMAL_APP';

  const demo = input.demoState;
  if (!demo || !demo.hasStartedBefore) return 'FIRST_DEMO';
  if (demo.hasCompletedBefore || demo.hasSkippedBefore) return 'START_DECISION';
  return 'RESUME_DEMO';
}

/**
 * Wave 4 (2026-09-26): /app/new-decision now exists -- a lightweight
 * "what decision are you trying to make?" intent-capture step that hands
 * off into the same real analysis workflow at /app (no second analysis
 * engine). START_DECISION and NORMAL_APP are no longer the same
 * destination: NORMAL_APP (an existing, already-active user) still goes
 * straight to /app; START_DECISION (a user who has never run a real
 * analysis) is routed through the intent step first. Gated by
 * isEnabled('new_decision_v1') by the /app/new-decision PAGE itself (it
 * redirects straight to /app when the flag is off), not here -- this
 * function stays a pure destination->path mapping with no env reads, so
 * when the flag is off the net behavior is unchanged even though this
 * function still resolves to the new path.
 */
export function destinationToPath(destination: FirstExperienceDestination): string {
  switch (destination) {
    case 'FIRST_DEMO':
      return '/app/start';
    case 'RESUME_DEMO':
      return '/app/start?resume=1';
    case 'START_DECISION':
      return '/app/new-decision';
    case 'NORMAL_APP':
      return '/app';
  }
}

/**
 * Feature flag (spec section 17): one switch, no DB revert needed to roll
 * back. This codebase has no DB-backed frontend flag system (audited before
 * writing this) -- the closest existing pattern is a VITE_* build-time env
 * var (src/services/analysisApi.ts's VITE_ALLOW_CLIENT_FALLBACK).
 *
 * Fails CLOSED, not open: this is the highest-regression-risk change in the
 * whole First Decision Experience effort (it touches every sign-in), so an
 * absent env var must mean "off", never "on". Set
 * VITE_FIRST_EXPERIENCE_ROUTING_V1=true explicitly (Preview environment for
 * acceptance testing; Production only once the founder has verified it) to
 * enable. This was flipped from fail-open during code review -- an earlier
 * version defaulted to enabled, which would have activated this for every
 * production user the moment the PR merged, regardless of acceptance
 * testing outcome.
 */
export function isFirstExperienceRoutingEnabled(): boolean {
  return import.meta.env.VITE_FIRST_EXPERIENCE_ROUTING_V1 === 'true';
}

/**
 * Async orchestrator: fetches the two pieces of server truth this resolver
 * needs and calls the pure function above. Fails safe (spec section 13) --
 * on any error, returns NORMAL_APP rather than trapping the user or
 * fabricating a completion state.
 */
export async function resolveFirstExperienceForUser(userId: string): Promise<FirstExperienceDestination> {
  try {
    const [analysisResult, adminResult, demoResult] = await Promise.all([
      (supabase as any).rpc('has_completed_real_analysis'),
      supabase.from('user_roles').select('role').eq('user_id', userId).in('role', ['admin', 'content_admin']),
      (supabase as any).rpc('get_first_experience_demo_state'),
    ]);

    if (analysisResult.error) throw analysisResult.error;
    if (adminResult.error) throw adminResult.error;
    if (demoResult.error) throw demoResult.error;

    const isAdmin = (adminResult.data ?? []).length > 0;
    const hasCompletedRealAnalysis = analysisResult.data === true;
    const demoRow = Array.isArray(demoResult.data) ? demoResult.data[0] : demoResult.data;
    const demoState: FirstExperienceDemoStateSummary | null = demoRow
      ? {
          hasStartedBefore: !!demoRow.demo_started_at,
          hasCompletedBefore: !!demoRow.demo_completed_at,
          hasSkippedBefore: !!demoRow.demo_skipped_at,
        }
      : null;

    const destination = resolveFirstExperience({ isAdmin, hasCompletedRealAnalysis, demoState });

    recordFunnelEvent('first_experience_resolved', {
      resolved_state: destination,
      resolver_version: 'v1',
      source_route: '/auth',
    });
    if (destination !== 'NORMAL_APP') {
      recordFunnelEvent('first_experience_redirected', {
        destination,
        resolver_version: 'v1',
        source_route: '/auth',
      });
    }

    return destination;
  } catch (err) {
    recordFunnelEvent('first_experience_resolved', {
      resolved_state: 'NORMAL_APP',
      resolver_version: 'v1',
      source_route: '/auth',
      resolution_failed: true,
    });
    return 'NORMAL_APP';
  }
}
