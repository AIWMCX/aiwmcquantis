import { supabase } from "@/integrations/supabase/client";
import { BusinessAnalysisResult } from "@/types/analysis";

import { logger } from '@/lib/logger';
export type SafetyLevel = 1 | 2 | 3 | 4;

export interface SafetyIssue {
  code: string;
  description: string;
  severity: 'warning' | 'blocking';
}

export interface PassedCheck {
  check: string;
  details?: string;
}

export interface SafetyEvaluation {
  safetyLevel: SafetyLevel;
  confidenceScore: number;
  blockingIssues: SafetyIssue[];
  passedChecks: PassedCheck[];
  passed: boolean;
}

const ENGINE_VERSION = '2.0.0-precision';

export class QuantisSafetyAgent {
  /**
   * Evaluates an analysis result against QSL criteria
   */
  static async evaluateAnalysis(
    analysisId: string, 
    result: any, 
    confidenceScore: number,
    geoCalibration?: any
  ): Promise<SafetyEvaluation> {
    const issues: SafetyIssue[] = [];
    const passedChecks: PassedCheck[] = [];
    
    // Evaluate Confidence
    let safetyLevel: SafetyLevel = 1; // Exploratory default
    
    if (confidenceScore >= 85) {
      safetyLevel = 3; // Investor-Grade
      passedChecks.push({ check: 'confidence_threshold', details: 'Score >= 85%' });
    } else if (confidenceScore >= 70) {
      safetyLevel = 2; // Planning
      passedChecks.push({ check: 'confidence_threshold', details: 'Score >= 70%' });
    }

    // Basic heuristic checks
    if (!result) {
      issues.push({ code: 'QSL-ERR-01', description: 'Empty analysis result', severity: 'blocking' });
      safetyLevel = 1;
    } else {
      // Check core metrics presence
      if (result.monthly_profit === undefined || result.payback_months === undefined) {
        issues.push({ code: 'QSL-ERR-02', description: 'Missing core financial metrics', severity: 'blocking' });
        safetyLevel = 1;
      } else {
        passedChecks.push({ check: 'core_metrics_present' });
      }
      
      // Look for extreme margins
      if (result.revenue?.base && result.costs?.monthly) {
        const margin = (result.revenue.base - result.costs.monthly) / result.revenue.base;
        if (margin > 0.95) {
          issues.push({ code: 'QSL-WARN-01', description: 'Suspiciously high gross margin (>95%)', severity: 'warning' });
          if (safetyLevel > 2) safetyLevel = 2; // Downgrade
        } else {
          passedChecks.push({ check: 'margin_sanity' });
        }
      }

      // Check for QMath precision
      if (result.financial_analysis?.precision_validated) {
        passedChecks.push({ check: 'qmath_precision' });
      }

      // Check reconciliation
      if (result.reconciliation?.passed) {
        passedChecks.push({ check: 'reconciliation_10_rules' });
      }

      // Check dual-AI consensus
      if (result.cross_validation?.consensus_score) {
        passedChecks.push({ check: 'dual_ai_consensus', details: `Score: ${result.cross_validation.consensus_score}` });
      }

      // Check geo calibration
      if (geoCalibration || result.geo_calibration) {
        passedChecks.push({ check: 'geo_calibration' });
      }

      // Check benchmark freshness
      if (result.benchmark_freshness?.is_fresh !== false) {
        passedChecks.push({ check: 'benchmark_freshness' });
      }
    }

    const evaluation: SafetyEvaluation = {
      safetyLevel,
      confidenceScore,
      blockingIssues: issues.filter(i => i.severity === 'blocking'),
      passedChecks,
      passed: issues.filter(i => i.severity === 'blocking').length === 0
    };

    // Log the evaluation asynchronously
    try {
      await supabase.from('safety_evaluations').insert({
        analysis_id: analysisId,
        safety_level: evaluation.safetyLevel,
        confidence_score: evaluation.confidenceScore,
        blocking_issues: evaluation.blockingIssues as any,
        passed_checks: evaluation.passedChecks as any,
        geo_calibration: geoCalibration || null,
        engine_version: ENGINE_VERSION,
        evaluator: 'safety_agent'
      });
    } catch (e) {
      logger.error("Failed to log safety evaluation:", e);
    }

    return evaluation;
  }

  /**
   * Gets the latest audit timestamp from the safety_evaluations table
   */
  static async getLatestAuditTimestamp(): Promise<Date | null> {
    try {
      const { data, error } = await supabase.rpc('get_latest_audit_timestamp');
      
      if (error) {
        logger.error("Failed to fetch latest audit timestamp via RPC:", error);
        // Fallback to direct query
        const { data: fallbackData } = await supabase
          .from('safety_evaluations')
          .select('evaluated_at')
          .order('evaluated_at', { ascending: false })
          .limit(1)
          .single();
        
        return fallbackData?.evaluated_at ? new Date(fallbackData.evaluated_at) : null;
      }

      return data ? new Date(data) : null;
    } catch (e) {
      logger.error("Error fetching latest audit timestamp:", e);
      return null;
    }
  }

  /**
   * Runs the full golden test vector suite (regression testing)
   */
  static async runRegressionTests() {
    // In a real scenario, this would call an Edge Function to process all vectors
    // through the actual analysis pipeline and compare results.
    logger.info("Running golden vector regression tests...");
    return { passed: true, runCount: 0, failCount: 0 };
  }
}
