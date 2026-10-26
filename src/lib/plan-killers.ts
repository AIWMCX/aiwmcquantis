import type { ActionableInsight } from '@/types/analysis';

/**
 * Insights the engine marks "warning" that are optimisation notes, not risks:
 * a very high LTV:CAC ("may be underinvesting in growth"), a payback that is
 * already "acceptable", a scale opportunity. Live 2026-10-25 a grooming van's
 * "What Kills This Plan" led with "LTV:CAC 18.4x is unusually high".
 */
export const NOT_A_PLAN_KILLER = new Set(['ltv_cac_high', 'payback_moderate', 'scale_opportunity']);

/** Real risks only, dangers before warnings, at most `limit`. */
export function planKillers(insights: ActionableInsight[], limit = 3): ActionableInsight[] {
  return insights
    .filter((i) => (i.status === 'danger' || i.status === 'warning') && !NOT_A_PLAN_KILLER.has(i.id))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'danger' ? -1 : 1))
    .slice(0, limit);
}
