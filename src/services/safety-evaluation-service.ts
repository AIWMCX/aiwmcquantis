import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
export interface AuditInfo {
  lastAuditedAt: Date;
  safetyLevel: number;
  passedChecks: number;
  totalChecks: number;
  engineVersion: string;
}

export const DEFAULT_AUDIT_INFO: AuditInfo = {
  lastAuditedAt: new Date(),
  safetyLevel: 2,
  passedChecks: 8,
  totalChecks: 10,
  engineVersion: 'v2.0.0-precision',
};

/**
 * Fetches the latest system-level audit from safety_evaluations.
 *
 * Returns null when there is no recorded audit (no row, missing table, or an
 * error). Callers must then show nothing — never DEFAULT_AUDIT_INFO, which
 * would display an audit "today" that never happened (observed 2026-10-17:
 * the table is absent in production and every footer read "Automated
 * internal checks ran Today · QSL-2").
 */
export async function getLatestAuditInfo(): Promise<AuditInfo | null> {
  // No audit pipeline writes this table in production (it is absent there;
  // its only writer is the client-side safety agent). Querying it produced a
  // 404 on every page. Opt in once a real audit source exists.
  if (import.meta.env.VITE_ENABLE_AUDIT_BADGE !== 'true') return null;
  try {
    const { data, error } = await supabase
      .from('safety_evaluations')
      .select('evaluated_at, safety_level, passed_checks, engine_version')
      .in('evaluator', ['safety_agent', 'golden_vector_suite'])
      .is('analysis_id', null)
      .order('evaluated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        logger.debug('[audit-info] no audit available:', error.message);
      }
      return null;
    }
    if (!data || !data.evaluated_at) return null;

    return {
      lastAuditedAt: new Date(data.evaluated_at),
      safetyLevel: data.safety_level ?? 2,
      passedChecks: Array.isArray(data.passed_checks) ? data.passed_checks.length : 8,
      totalChecks: 10,
      engineVersion: data.engine_version || 'v2.0.0-precision',
    };
  } catch (err) {
    if (import.meta.env.DEV) {
      logger.debug('[audit-info] error:', (err as Error)?.message);
    }
    return null;
  }
}

/**
 * Returns a freshness label and color based on days since audit.
 */
export function getAuditFreshness(auditDate: Date): { label: string; color: string; isStale: boolean } {
  const now = new Date();
  const diffMs = now.getTime() - auditDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { label: 'Today', color: 'hsl(var(--q-status-green-hsl, 142 71% 45%))', isStale: false };
  }
  if (diffDays === 1) {
    return { label: 'Yesterday', color: 'hsl(var(--q-status-green-hsl, 142 71% 45%))', isStale: false };
  }
  if (diffDays <= 6) {
    return { label: `${diffDays} days ago`, color: 'hsl(var(--q-status-green-hsl, 142 71% 45%))', isStale: false };
  }
  if (diffDays <= 29) {
    return { label: `${diffDays} days ago`, color: 'hsl(var(--q-status-yellow-hsl, 45 93% 47%))', isStale: false };
  }
  return { label: `${diffDays} days ago ⚠`, color: 'hsl(var(--q-status-orange-hsl, 24 95% 53%))', isStale: true };
}

/**
 * Returns the QSL standard label for a given safety level.
 */
export function getQSLLabel(level: number): string {
  switch (level) {
    case 1: return 'Exploratory';
    case 2: return 'Planning Standard';
    case 3: return 'Investor Grade';
    case 4: return 'Loan Grade';
    default: return 'Planning Standard';
  }
}
