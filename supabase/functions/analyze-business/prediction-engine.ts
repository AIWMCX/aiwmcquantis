/**
 * PREDICTION ENGINE v0 — Model Confidence Scoring
 * 
 * Deterministic weighted-average confidence model.
 * Answers: "How much should you trust this analysis?"
 * 
 * NOT ML — honest, interpretable, improvable as case memory grows.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export interface ConfidenceFactor {
  factor: string;
  score: number;   // 0-1
  weight: number;  // 0-1
  explanation: string;
}

export interface ModelConfidenceResult {
  confidence: number;                                    // 0-1
  assumption_risk: number;                               // 0-1
  recommendation_level: 'safe' | 'caution' | 'high_risk';
  factors: ConfidenceFactor[];
  similar_cases_count: number;
}

interface PredictionInput {
  // Input completeness signals
  hasFinancialInputs: boolean;
  hasDocuments: boolean;
  hasSpecificIndustry: boolean;  // not "general"
  ideaLength: number;
  
  // Benchmark quality
  benchmarkAdjustedScore: number;   // 0-100 from benchmark-confidence
  
  // Sensitivity fragility
  maxTornadoSwing: number;          // largest absolute swing from tornado
  baseNetProfit: number;            // base case net profit
  
  // Sanity check results
  totalSanityRules: number;
  criticalFlagsCount: number;
  warningFlagsCount: number;
  
  // Context
  industryId: string;
  location: string;
}

/**
 * Count similar cases from analysis_cases table
 * Non-blocking — returns 0 if DB fails
 */
async function countSimilarCases(industryId: string, location: string): Promise<number> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return 0;

    const client = createClient(supabaseUrl, serviceRoleKey);
    
    const { count, error } = await client
      .from('analysis_cases')
      .select('*', { count: 'exact', head: true })
      .eq('industry_id', industryId);
    
    if (error) {
      console.error('Similar cases query failed:', error.message);
      return 0;
    }
    
    return count || 0;
  } catch (e) {
    console.error('countSimilarCases error:', e);
    return 0;
  }
}

/**
 * Compute model confidence score
 */
export async function computeModelConfidence(input: PredictionInput): Promise<ModelConfidenceResult> {
  const factors: ConfidenceFactor[] = [];

  // === Factor 1: Input Completeness (weight 0.20) ===
  let inputScore = 0.3; // base: at minimum they provided idea + location
  if (input.hasFinancialInputs) inputScore += 0.25;
  if (input.hasDocuments) inputScore += 0.2;
  if (input.hasSpecificIndustry) inputScore += 0.15;
  if (input.ideaLength > 100) inputScore += 0.1;
  inputScore = Math.min(1, inputScore);
  
  factors.push({
    factor: 'Input Completeness',
    score: Math.round(inputScore * 100) / 100,
    weight: 0.20,
    explanation: input.hasFinancialInputs 
      ? 'Financial inputs provided — higher precision possible'
      : 'No custom financials — relying on industry benchmarks',
  });

  // === Factor 2: Benchmark Match Quality (weight 0.25) ===
  const benchmarkScore = Math.min(1, input.benchmarkAdjustedScore / 100);
  
  factors.push({
    factor: 'Benchmark Quality',
    score: Math.round(benchmarkScore * 100) / 100,
    weight: 0.25,
    explanation: benchmarkScore >= 0.7
      ? 'Strong benchmark data available for this industry'
      : benchmarkScore >= 0.4
      ? 'Moderate benchmark coverage — some estimates used'
      : 'Limited benchmarks — results have higher uncertainty',
  });

  // === Factor 3: Sensitivity Fragility (weight 0.20) ===
  // Inverse: if small changes cause big swings, confidence is lower
  let fragilityScore = 0.5;
  if (input.baseNetProfit > 0 && input.maxTornadoSwing > 0) {
    const swingRatio = input.maxTornadoSwing / Math.max(input.baseNetProfit, 1);
    // swingRatio > 2 = very fragile, < 0.5 = robust
    if (swingRatio < 0.5) fragilityScore = 0.9;
    else if (swingRatio < 1.0) fragilityScore = 0.7;
    else if (swingRatio < 2.0) fragilityScore = 0.5;
    else if (swingRatio < 4.0) fragilityScore = 0.3;
    else fragilityScore = 0.1;
  }
  
  factors.push({
    factor: 'Model Stability',
    score: Math.round(fragilityScore * 100) / 100,
    weight: 0.20,
    explanation: fragilityScore >= 0.7
      ? 'Model is stable — small input changes have proportional effects'
      : fragilityScore >= 0.4
      ? 'Model has moderate sensitivity — key assumptions should be validated'
      : 'Model is fragile — small assumption changes cause large profit swings',
  });

  // === Factor 4: Sanity Check Pass Rate (weight 0.20) ===
  let sanityScore = 1.0;
  if (input.totalSanityRules > 0) {
    const criticalPenalty = input.criticalFlagsCount * 0.3;
    const warningPenalty = input.warningFlagsCount * 0.1;
    sanityScore = Math.max(0, 1 - criticalPenalty - warningPenalty);
  }
  
  factors.push({
    factor: 'Sanity Check Pass Rate',
    score: Math.round(sanityScore * 100) / 100,
    weight: 0.20,
    explanation: sanityScore >= 0.8
      ? 'All key sanity checks passed — assumptions look realistic'
      : sanityScore >= 0.5
      ? 'Some sanity flags triggered — review flagged assumptions'
      : 'Multiple sanity violations detected — assumptions may be unrealistic',
  });

  // === Factor 5: Similar Case History (weight 0.15) ===
  const similarCases = await countSimilarCases(input.industryId, input.location);
  let caseScore = 0.2; // baseline even with 0 cases
  if (similarCases >= 50) caseScore = 0.95;
  else if (similarCases >= 20) caseScore = 0.8;
  else if (similarCases >= 10) caseScore = 0.6;
  else if (similarCases >= 3) caseScore = 0.4;
  else if (similarCases >= 1) caseScore = 0.3;
  
  factors.push({
    factor: 'Historical Case Data',
    score: Math.round(caseScore * 100) / 100,
    weight: 0.15,
    explanation: similarCases > 0
      ? `${similarCases} similar analyses in this industry inform our confidence`
      : 'No prior cases in this industry — first analysis, lower calibration',
  });

  // === Compute weighted confidence ===
  const confidence = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  
  // === Compute assumption risk (inverse of sanity + fragility) ===
  const assumption_risk = Math.round((1 - (sanityScore * 0.6 + fragilityScore * 0.4)) * 100) / 100;

  // === Determine recommendation level ===
  let recommendation_level: ModelConfidenceResult['recommendation_level'];
  if (confidence >= 0.65 && input.criticalFlagsCount === 0) {
    recommendation_level = 'safe';
  } else if (confidence >= 0.40 || input.criticalFlagsCount <= 1) {
    recommendation_level = 'caution';
  } else {
    recommendation_level = 'high_risk';
  }

  return {
    confidence: Math.round(confidence * 100) / 100,
    assumption_risk,
    recommendation_level,
    factors,
    similar_cases_count: similarCases,
  };
}
