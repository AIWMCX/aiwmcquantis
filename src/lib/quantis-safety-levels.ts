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
    label: 'CPA-Review Grade',
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

// ─── Capital Readiness Layer ─────────────────────────────────

export interface CapitalReadiness {
  fundingPath: string[];
  verdict: string;
  whatMustChange: string[];
  nextMilestone: string;
}

export const CAPITAL_READINESS: Record<QSL, CapitalReadiness> = {
  [QSL.EXPLORATORY]: {
    fundingPath: ['Friends & Family', 'Self-Funding', 'Microloans'],
    verdict: 'Exploratory. Not ready for external capital conversations.',
    whatMustChange: [
      'Increase confidence to 70%+: add financial inputs (CAC, churn, pricing)',
      'Validate core assumptions with market research',
      'Complete at least 5 of 7 advanced financial fields',
    ],
    nextMilestone: 'Reach QSL-2 Planning Grade (70%+ confidence)',
  },
  [QSL.PLANNING]: {
    fundingPath: ['SBDC Loan', 'SBA Microloan', 'Local Angel Investors', 'Crowdfunding'],
    verdict: 'Planning grade. Suitable for SBDC counselors and early angel conversations.',
    whatMustChange: [
      'Provide break-even path below Month 16',
      'Demonstrate LTV:CAC above 5×',
      'Add location-specific cost validation',
    ],
    nextMilestone: 'Reach QSL-3 Investor Grade (85%+ confidence)',
  },
  [QSL.INVESTOR]: {
    fundingPath: ['Angel Investors', 'Pre-Seed Funds', 'Accelerators', 'SBA 7(a) Loan'],
    verdict: 'Investor grade. Analysis meets projection standards for early funding discussions.',
    whatMustChange: [
      'Add founder credentials and team experience',
      'Validate market size with primary research',
      'Include competitive differentiation evidence',
    ],
    nextMilestone: 'Expert CPA review for formal loan applications',
  },
  [QSL.LOAN]: {
    fundingPath: ['Bank SBA Loans', 'USDA Business Loans', 'Credit Union Business Loans', 'Commercial Lines of Credit'],
    verdict: 'Loan-grade projection quality. Requires CPA validation before submission.',
    whatMustChange: [
      'Obtain CPA review and validation letter',
      'Prepare supporting documentation package',
    ],
    nextMilestone: 'External CPA validation → ready for formal applications',
  },
};

/**
 * Get capital readiness information based on confidence score
 */
export function getCapitalReadiness(score: number): CapitalReadiness & { qsl: QSL; config: QSLConfig } {
  const qsl = getQSLFromConfidence(score);
  return {
    ...CAPITAL_READINESS[qsl],
    qsl,
    config: QSL_CONFIG[qsl],
  };
}
