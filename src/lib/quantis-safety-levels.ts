/**
 * Quantis Safety Levels (QSL) - Governance classification layer
 * Maps confidence scores (0-100) to 4 trust tiers for appropriate use-case guidance
 */

export enum QSL {
  EXPLORATORY = 1,
  PLANNING = 2,
  INVESTOR = 3,
  LOAN = 4,
}

export interface QSLConfig {
  badge: string;
  label: string;
  sub: string;
  disclaimer: string;
  color: string;
  bg: string;
  border: string;
  minConfidence: number;
  maxConfidence: number;
}

export const QSL_CONFIG: Record<QSL, QSLConfig> = {
  [QSL.EXPLORATORY]: {
    badge: 'QSL-1',
    label: 'Exploratory',
    sub: 'For ideation only',
    disclaimer: 'Confidence below 70%. Do not use for funding decisions.',
    color: 'hsl(var(--q-status-orange-hsl, 24 95% 53%))',
    bg: 'hsl(24 60% 10%)',
    border: 'hsl(24 50% 18%)',
    minConfidence: 0,
    maxConfidence: 69,
  },
  [QSL.PLANNING]: {
    badge: 'QSL-2',
    label: 'Planning Grade',
    sub: 'Internal business planning',
    disclaimer: 'Suitable for planning and early-stage decisions.',
    color: 'hsl(var(--q-status-yellow-hsl, 43 96% 50%))',
    bg: 'hsl(43 60% 10%)',
    border: 'hsl(43 50% 18%)',
    minConfidence: 70,
    maxConfidence: 84,
  },
  [QSL.INVESTOR]: {
    badge: 'QSL-3',
    label: 'Investor Grade',
    sub: 'Suitable for funding decks',
    disclaimer: 'Meets investor-grade standards. Review key assumptions first.',
    color: 'hsl(var(--q-status-green-hsl, 160 84% 39%))',
    bg: 'hsl(160 50% 10%)',
    border: 'hsl(160 40% 20%)',
    minConfidence: 85,
    maxConfidence: 94,
  },
  [QSL.LOAN]: {
    badge: 'QSL-4',
    label: 'Loan Grade',
    sub: 'Expert validation required',
    disclaimer: 'Requires CPA validation before loan applications.',
    color: 'hsl(var(--q-accent-primary-hsl, 216 90% 60%))',
    bg: 'hsl(216 50% 10%)',
    border: 'hsl(216 40% 20%)',
    minConfidence: 95,
    maxConfidence: 100,
  },
} as const;

/**
 * Maps a confidence score (0-100) to the appropriate QSL tier
 */
export function getQSLFromConfidence(score: number): QSL {
  const clampedScore = Math.max(0, Math.min(100, score));
  
  if (clampedScore >= 95) return QSL.LOAN;
  if (clampedScore >= 85) return QSL.INVESTOR;
  if (clampedScore >= 70) return QSL.PLANNING;
  return QSL.EXPLORATORY;
}

/**
 * Get the QSL configuration for a given confidence score
 */
export function getQSLConfig(score: number): QSLConfig {
  const level = getQSLFromConfidence(score);
  return QSL_CONFIG[level];
}

/**
 * Check if QSL level allows pulsing animation (high confidence tiers)
 */
export function shouldPulse(level: QSL): boolean {
  return level === QSL.INVESTOR || level === QSL.LOAN;
}
