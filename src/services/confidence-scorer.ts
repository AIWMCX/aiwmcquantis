/**
 * Confidence Scorer — Deterministic output confidence calculation
 * 
 * Combines consensus score, data quality, benchmark alignment,
 * freshness, and sample size into a single 0–100 score with tier.
 */

// ── Types ──

export type ConfidenceTier = 'verified' | 'confident' | 'estimated' | 'uncertain' | 'blocked';

export interface ConfidenceInput {
  /** 0–100, agreement between AI models */
  consensusScore: number;
  /** 0–100, % of required fields populated */
  dataCompleteness: number;
  /** 0–100, how close inputs are to industry benchmarks */
  benchmarkAlignment: number;
  /** Hours since data was last updated */
  dataFreshnessHours: number;
  /** Number of data points used */
  sampleSize: number;
}

export interface ConfidenceOutput {
  /** 0–100 final score */
  score: number;
  /** Tier label */
  tier: ConfidenceTier;
  /** Per-factor breakdown */
  breakdown: Record<string, number>;
  /** Human-readable warnings */
  warnings: string[];
}

// ── Badge Config ──

export const CONFIDENCE_BADGE_CONFIG: Record<
  ConfidenceTier,
  { label: string; color: string; icon: string; description: string }
> = {
  verified: {
    label: 'Verified',
    color: 'emerald',
    icon: 'ShieldCheck',
    description: 'High-confidence result backed by strong data and model agreement.',
  },
  confident: {
    label: 'Confident',
    color: 'blue',
    icon: 'CheckCircle2',
    description: 'Reliable result with good data coverage and benchmark alignment.',
  },
  estimated: {
    label: 'Estimated',
    color: 'amber',
    icon: 'Info',
    description: 'Reasonable estimate — some inputs lack benchmark support.',
  },
  uncertain: {
    label: 'Uncertain',
    color: 'orange',
    icon: 'AlertTriangle',
    description: 'Limited data confidence. Treat as directional guidance only.',
  },
  blocked: {
    label: 'Insufficient Data',
    color: 'red',
    icon: 'XCircle',
    description: 'Not enough data to produce a reliable estimate.',
  },
};

// ── Scoring ──

const WEIGHTS = {
  consensus: 0.35,
  completeness: 0.30,
  benchmark: 0.20,
};

function getTier(score: number): ConfidenceTier {
  if (score >= 95) return 'verified';
  if (score >= 80) return 'confident';
  if (score >= 65) return 'estimated';
  if (score >= 50) return 'uncertain';
  return 'blocked';
}

export function calculateOutputConfidence(params: ConfidenceInput): ConfidenceOutput {
  const warnings: string[] = [];

  // Weighted base score
  const consensusContrib = params.consensusScore * WEIGHTS.consensus;
  const completenessContrib = params.dataCompleteness * WEIGHTS.completeness;
  const benchmarkContrib = params.benchmarkAlignment * WEIGHTS.benchmark;

  const baseScore = consensusContrib + completenessContrib + benchmarkContrib;

  // Freshness penalty: -5% per 24h stale, max -20%
  const stalenessDays = params.dataFreshnessHours / 24;
  const freshnessPenalty = Math.min(stalenessDays * 5, 20);
  if (freshnessPenalty > 0) {
    warnings.push(`Data is ${Math.round(stalenessDays)} day(s) old (−${Math.round(freshnessPenalty * 10) / 10}% penalty)`);
  }

  // Sample size bonus
  let sampleBonus = 0;
  if (params.sampleSize >= 30) {
    sampleBonus = 5;
  } else if (params.sampleSize >= 10) {
    sampleBonus = 2;
  } else {
    warnings.push(`Small sample size (${params.sampleSize}) — results may not be representative`);
  }

  const rawScore = baseScore - freshnessPenalty + sampleBonus;
  const finalScore = Math.round(Math.max(0, Math.min(100, rawScore)) * 10) / 10;

  // Additional warnings
  if (params.consensusScore < 70) {
    warnings.push('AI models showed significant disagreement on this analysis');
  }
  if (params.dataCompleteness < 60) {
    warnings.push('Several required data fields are missing');
  }
  if (params.benchmarkAlignment < 50) {
    warnings.push('Input values diverge significantly from industry benchmarks');
  }

  return {
    score: finalScore,
    tier: getTier(finalScore),
    breakdown: {
      consensus: Math.round(consensusContrib * 100) / 100,
      completeness: Math.round(completenessContrib * 100) / 100,
      benchmark: Math.round(benchmarkContrib * 100) / 100,
      freshness_penalty: Math.round(-freshnessPenalty * 100) / 100,
      sample_bonus: sampleBonus,
    },
    warnings,
  };
}
