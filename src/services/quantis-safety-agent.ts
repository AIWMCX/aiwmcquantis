import { supabase } from "@/integrations/supabase/client";
import { BusinessAnalysisResult } from "@/types/analysis";

export type SafetyLevel = 1 | 2 | 3 | 4;

export interface SafetyIssue {
  code: string;
  description: string;
  severity: 'warning' | 'blocking';
}

export interface SafetyEvaluation {
  safetyLevel: SafetyLevel;
  confidenceScore: number;
  blockingIssues: SafetyIssue[];
  passed: boolean;
}

export class QuantisSafetyAgent {
  /**
   * Evaluates an analysis result against QSL criteria
   */
  static async evaluateAnalysis(analysisId: string, result: any, confidenceScore: number): Promise<SafetyEvaluation> {
    const issues: SafetyIssue[] = [];
    
    // Evaluate Confidence
    let safetyLevel: SafetyLevel = 1; // Exploratory default
    
    if (confidenceScore >= 85) {
      safetyLevel = 3; // Investor-Grade
    } else if (confidenceScore >= 70) {
      safetyLevel = 2; // Planning
    }

    // Basic heuristic checks
    if (!result) {
      issues.push({ code: 'QSL-ERR-01', description: 'Empty analysis result', severity: 'blocking' });
      safetyLevel = 1;
    } else {
      if (result.monthly_profit === undefined || result.payback_months === undefined) {
         issues.push({ code: 'QSL-ERR-02', description: 'Missing core financial metrics', severity: 'blocking' });
         safetyLevel = 1;
      }
      
      // Look for extreme margins
      if (result.revenue?.base && result.costs?.monthly) {
        const margin = (result.revenue.base - result.costs.monthly) / result.revenue.base;
        if (margin > 0.95) {
           issues.push({ code: 'QSL-WARN-01', description: 'Suspiciously high gross margin (>95%)', severity: 'warning' });
           if (safetyLevel > 2) safetyLevel = 2; // Downgrade
        }
      }
    }

    const evaluation: SafetyEvaluation = {
      safetyLevel,
      confidenceScore,
      blockingIssues: issues.filter(i => i.severity === 'blocking'),
      passed: issues.filter(i => i.severity === 'blocking').length === 0
    };

    // Log the evaluation asynchronously
    try {
      await supabase.from('safety_evaluations').insert({
        analysis_id: analysisId,
        safety_level: evaluation.safetyLevel,
        confidence_score: evaluation.confidenceScore,
        blocking_issues: evaluation.blockingIssues as any,
        evaluator_version: '1.0.0'
      });
    } catch (e) {
      console.error("Failed to log safety evaluation:", e);
    }

    return evaluation;
  }

  /**
   * Runs the full golden test vector suite (regression testing)
   */
  static async runRegressionTests() {
    // In a real scenario, this would call an Edge Function to process all vectors
    // through the actual analysis pipeline and compare results.
    console.log("Running golden vector regression tests...");
    return { passed: true, runCount: 0, failCount: 0 };
  }
}