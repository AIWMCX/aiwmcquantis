/**
 * CONSENSUS EVALUATOR
 * 
 * Deterministic implementation for comparing multiple formula execution results.
 * This is the "hook" for Phase 2's dual-model AI consensus layer.
 * 
 * Currently: pure numeric agreement checking using QuantisMath.equals()
 * Future: pluggable AI model comparison via the ConsensusEvaluator interface
 * 
 * @module ConsensusEvaluator
 * @version 1.0.0
 */

import { QuantisMath } from './quantis-math';
import type { FormulaExecutionResult } from './formula-registry';

// ========== TYPES ==========

export type DivergenceType = 'none' | 'minor' | 'major' | 'critical';

export interface ConsensusResult {
  consensusScore: number;        // 0-100
  divergenceType: DivergenceType;
  mergedOutput: number;
  auditTrail: string;
  details: {
    maxDeviation: number;        // absolute max difference between any two results
    meanOutput: number;
    inputCount: number;
    outlierIndices: number[];    // indices of results that diverge significantly
  };
}

export interface ConsensusConfig {
  /** Tolerance for "none" divergence (default 0.001 = 0.1%) */
  toleranceNone: number;
  /** Tolerance for "minor" divergence (default 0.01 = 1%) */
  toleranceMinor: number;
  /** Tolerance for "major" divergence (default 0.05 = 5%) */
  toleranceMajor: number;
  /** Merge strategy: 'mean' | 'median' | 'highest_confidence' */
  mergeStrategy: 'mean' | 'median' | 'highest_confidence';
}

export interface ConsensusEvaluator {
  evaluate(results: FormulaExecutionResult[], config?: Partial<ConsensusConfig>): ConsensusResult;
}

// ========== DEFAULT CONFIG ==========

const DEFAULT_CONFIG: ConsensusConfig = {
  toleranceNone: 0.001,
  toleranceMinor: 0.01,
  toleranceMajor: 0.05,
  mergeStrategy: 'highest_confidence',
};

// ========== DETERMINISTIC EVALUATOR ==========

/**
 * Compares formula execution results using pure numeric agreement.
 * No AI model calls — deterministic only.
 */
export class DeterministicConsensusEvaluator implements ConsensusEvaluator {
  evaluate(results: FormulaExecutionResult[], config?: Partial<ConsensusConfig>): ConsensusResult {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    if (results.length === 0) {
      return {
        consensusScore: 0,
        divergenceType: 'critical',
        mergedOutput: 0,
        auditTrail: 'No results to evaluate',
        details: { maxDeviation: 0, meanOutput: 0, inputCount: 0, outlierIndices: [] },
      };
    }

    if (results.length === 1) {
      const r = results[0];
      return {
        consensusScore: r.confidence,
        divergenceType: 'none',
        mergedOutput: r.output,
        auditTrail: `Single result: ${r.formulaName} → ${r.output} (confidence: ${r.confidence}%)`,
        details: { maxDeviation: 0, meanOutput: r.output, inputCount: 1, outlierIndices: [] },
      };
    }

    // Calculate mean
    const outputs = results.map(r => r.output);
    const mean = QuantisMath.toNumber(
      QuantisMath.divide(
        outputs.reduce((sum, v) => QuantisMath.add(sum, v), QuantisMath.from(0)),
        outputs.length
      ),
      6
    );

    // Calculate max deviation (relative to mean)
    let maxDeviation = 0;
    const outlierIndices: number[] = [];

    for (let i = 0; i < outputs.length; i++) {
      const deviation = mean !== 0
        ? Math.abs((outputs[i] - mean) / mean)
        : Math.abs(outputs[i]);
      if (deviation > maxDeviation) maxDeviation = deviation;
      if (deviation > cfg.toleranceMajor) outlierIndices.push(i);
    }

    // Classify divergence
    let divergenceType: DivergenceType;
    if (maxDeviation <= cfg.toleranceNone) {
      divergenceType = 'none';
    } else if (maxDeviation <= cfg.toleranceMinor) {
      divergenceType = 'minor';
    } else if (maxDeviation <= cfg.toleranceMajor) {
      divergenceType = 'major';
    } else {
      divergenceType = 'critical';
    }

    // Calculate consensus score
    const consensusScore = Math.max(0, Math.min(100, Math.round(
      divergenceType === 'none' ? 100 :
      divergenceType === 'minor' ? 90 - (maxDeviation / cfg.toleranceMinor) * 10 :
      divergenceType === 'major' ? 70 - (maxDeviation / cfg.toleranceMajor) * 20 :
      Math.max(0, 50 - (maxDeviation - cfg.toleranceMajor) * 500)
    )));

    // Merge output based on strategy
    let mergedOutput: number;
    switch (cfg.mergeStrategy) {
      case 'mean':
        mergedOutput = mean;
        break;
      case 'median': {
        const sorted = [...outputs].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        mergedOutput = sorted.length % 2 === 0
          ? QuantisMath.toNumber(QuantisMath.divide(QuantisMath.add(sorted[mid - 1], sorted[mid]), 2), 6)
          : sorted[mid];
        break;
      }
      case 'highest_confidence':
      default: {
        let bestIdx = 0;
        for (let i = 1; i < results.length; i++) {
          if (results[i].confidence > results[bestIdx].confidence) bestIdx = i;
        }
        mergedOutput = results[bestIdx].output;
        break;
      }
    }

    // Build audit trail
    const resultSummaries = results.map((r, i) =>
      `[${i}] ${r.formulaName}: ${r.output} (conf: ${r.confidence}%)`
    ).join(' | ');

    const auditTrail = `Consensus(${results.length} results): score=${consensusScore}, divergence=${divergenceType}, maxDev=${(maxDeviation * 100).toFixed(3)}%, merged=${mergedOutput} | ${resultSummaries}`;

    return {
      consensusScore,
      divergenceType,
      mergedOutput,
      auditTrail,
      details: {
        maxDeviation,
        meanOutput: mean,
        inputCount: results.length,
        outlierIndices,
      },
    };
  }
}

/** Default singleton instance */
export const consensusEvaluator = new DeterministicConsensusEvaluator();
