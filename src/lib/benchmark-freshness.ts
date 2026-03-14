/**
 * Benchmark Freshness Detection
 * Flags stale data with graduated warning levels.
 */

export type FreshnessWarningLevel = 'fresh' | 'aging' | 'stale' | 'critical';

export interface FreshnessResult {
  isStale: boolean;
  warningLevel: FreshnessWarningLevel;
  daysOld: number;
  colorToken: string;
}

// Thresholds in days by data category
const FRESHNESS_THRESHOLDS: Record<string, { aging: number; stale: number; critical: number }> = {
  monthly_market_data: { aging: 30, stale: 60, critical: 90 },
  quarterly_survey:    { aging: 90, stale: 180, critical: 270 },
  annual_industry:     { aging: 365, stale: 548, critical: 730 },
  geo_rent_data:       { aging: 180, stale: 365, critical: 548 },
  default:             { aging: 90, stale: 180, critical: 365 },
};

/**
 * Check freshness of a benchmark based on its lastUpdated timestamp
 */
export function checkFreshness(lastUpdated: string, category: string = 'default'): FreshnessResult {
  const thresholds = FRESHNESS_THRESHOLDS[category] || FRESHNESS_THRESHOLDS.default;
  const updatedDate = new Date(lastUpdated);
  const now = new Date();
  const daysOld = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));

  let warningLevel: FreshnessWarningLevel;
  let colorToken: string;

  if (daysOld >= thresholds.critical) {
    warningLevel = 'critical';
    colorToken = 'var(--q-status-red)';
  } else if (daysOld >= thresholds.stale) {
    warningLevel = 'stale';
    colorToken = 'var(--q-status-orange)';
  } else if (daysOld >= thresholds.aging) {
    warningLevel = 'aging';
    colorToken = 'var(--q-status-yellow)';
  } else {
    warningLevel = 'fresh';
    colorToken = 'var(--q-status-green)';
  }

  return {
    isStale: warningLevel === 'stale' || warningLevel === 'critical',
    warningLevel,
    daysOld,
    colorToken,
  };
}

/**
 * Get display icon for freshness level
 */
export function getFreshnessIcon(level: FreshnessWarningLevel): string {
  switch (level) {
    case 'fresh': return '✓';
    case 'aging': return '⏳';
    case 'stale': return '⚠';
    case 'critical': return '⚡';
  }
}

/**
 * Get human-readable freshness label
 */
export function getFreshnessLabel(result: FreshnessResult): string {
  if (result.daysOld < 30) return 'Fresh';
  if (result.daysOld < 90) return `${result.daysOld}d old`;
  const months = Math.round(result.daysOld / 30);
  return `${months}mo old`;
}
