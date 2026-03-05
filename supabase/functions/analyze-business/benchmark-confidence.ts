/**
 * BENCHMARK CONFIDENCE DECAY + SOURCE SCORING
 * 
 * Computes a dynamic confidence score for benchmark data based on:
 * 1. Staleness (how old the data is)
 * 2. Sample size (more data = higher confidence)
 * 3. Source authority (government > industry report > dataset)
 * 
 * This feeds into:
 * - Reliability score shown to users
 * - AI prompt hedging (lower confidence → more cautious language)
 * - Consensus evaluator thresholds
 */

export interface BenchmarkConfidenceResult {
  adjustedScore: number;          // 0-100
  stalenessFactor: number;        // 0-1
  sampleSizeFactor: number;       // 0-1
  sourceWeight: number;           // 0-1
  isStale: boolean;               // true if >2 years old
  confidenceLabel: 'high' | 'medium' | 'low';
  hedgingLevel: 'none' | 'light' | 'moderate' | 'heavy';
  explanation: string;
}

const SOURCE_WEIGHTS: Record<string, number> = {
  'government_data': 0.95,
  'industry_report': 0.90,
  'kerry_dataset': 0.85,
  'proprietary': 0.88,
  'default_benchmarks': 0.70,
  'user_upload': 0.75,
};

/**
 * Calculate benchmark confidence with staleness decay
 */
export function computeBenchmarkConfidence(
  baseScore: number,
  lastUpdated: string | null,
  sampleSize: number | null,
  source: string | null
): BenchmarkConfidenceResult {
  // 1. Staleness factor
  let stalenessFactor = 1.0;
  let isStale = false;
  
  if (lastUpdated) {
    const updatedAt = new Date(lastUpdated);
    const now = new Date();
    const monthsOld = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsOld < 6) {
      stalenessFactor = 1.0;
    } else if (monthsOld < 12) {
      stalenessFactor = 0.95;
    } else if (monthsOld < 18) {
      stalenessFactor = 0.85;
    } else if (monthsOld < 24) {
      stalenessFactor = 0.75;
      isStale = true;
    } else {
      stalenessFactor = 0.60;
      isStale = true;
    }
  } else {
    // No date = assume moderately stale
    stalenessFactor = 0.80;
  }

  // 2. Sample size factor: log(sampleSize) / log(100), capped at 1.0
  let sampleSizeFactor = 0.5; // default for unknown
  if (sampleSize !== null && sampleSize > 0) {
    sampleSizeFactor = Math.min(1.0, Math.log(sampleSize) / Math.log(100));
  }

  // 3. Source weight
  const sourceWeight = SOURCE_WEIGHTS[source || 'default_benchmarks'] || 0.70;

  // Compute adjusted score
  const rawAdjusted = baseScore * stalenessFactor * sampleSizeFactor * sourceWeight;
  const adjustedScore = Math.round(Math.max(10, Math.min(100, rawAdjusted)));

  // Determine confidence label
  let confidenceLabel: BenchmarkConfidenceResult['confidenceLabel'];
  if (adjustedScore >= 70) confidenceLabel = 'high';
  else if (adjustedScore >= 45) confidenceLabel = 'medium';
  else confidenceLabel = 'low';

  // Determine hedging level for AI prompts
  let hedgingLevel: BenchmarkConfidenceResult['hedgingLevel'];
  if (adjustedScore >= 75) hedgingLevel = 'none';
  else if (adjustedScore >= 55) hedgingLevel = 'light';
  else if (adjustedScore >= 35) hedgingLevel = 'moderate';
  else hedgingLevel = 'heavy';

  // Build explanation
  const explanationParts: string[] = [];
  if (isStale) explanationParts.push('benchmark data is outdated (>18 months)');
  if ((sampleSize ?? 0) < 30) explanationParts.push('limited sample size');
  if (sourceWeight < 0.80) explanationParts.push('using default/generic benchmarks');
  if (explanationParts.length === 0) explanationParts.push('benchmark data is current and well-sourced');

  return {
    adjustedScore,
    stalenessFactor,
    sampleSizeFactor,
    sourceWeight,
    isStale,
    confidenceLabel,
    hedgingLevel,
    explanation: `Confidence ${adjustedScore}%: ${explanationParts.join('; ')}`,
  };
}

/**
 * Generate hedging language for AI prompts based on confidence
 */
export function getHedgingPrefix(hedgingLevel: BenchmarkConfidenceResult['hedgingLevel']): string {
  switch (hedgingLevel) {
    case 'none':
      return '';
    case 'light':
      return 'Based on available industry data, ';
    case 'moderate':
      return 'Note: these projections use estimated benchmarks with moderate confidence. ';
    case 'heavy':
      return '⚠️ IMPORTANT: Limited benchmark data available for this industry. Projections carry higher uncertainty. ';
  }
}
