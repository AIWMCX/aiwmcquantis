/**
 * Quality dimensions — replaces the single "Confidence Score" percentage
 * with separately-labeled, honestly-derived dimensions.
 *
 * Session objective (accuracy master prompt, Priority 1 / Workstream 1):
 * the report cover displayed one percentage under the literal label
 * "Confidence Score." The underlying number (`reliability_score`, capped
 * 15-95) is a 40/30/20/10 weighted blend of input completeness, data
 * quality, validation-rule score, and industry/benchmark relevance -- not
 * a measure of forecast accuracy, and not even purely "input completeness."
 * A user reading "95% Confidence" reasonably infers something about
 * predictive accuracy that this number has never measured.
 *
 * This module does not invent new checks. Every dimension below is
 * derived from a signal that was already being computed live in
 * analyze-business/index.ts before this change -- it was simply never
 * surfaced as its own labeled status:
 *   - inputCompleteness: confidenceBreakdown.input_completeness (already
 *     computed, 40% of the old blended score, genuinely measures input
 *     coverage).
 *   - benchmarkMatchQuality: derived from confidenceBreakdown.industry_relevance
 *     and benchmarkSource, already computed.
 *   - scenarioReconciliation: derived from report_integrity /
 *     report_integrity_issues (the existing scenario-contradiction gate,
 *     P0-6), already computed.
 *   - narrativeReconciliation: derived from enforceNarrativeIntegrity's
 *     `wasModified` flag (previously computed but discarded at the call
 *     site -- this module is the first consumer of it).
 *   - formulaReconciliation: UNVERIFIED. No per-report arithmetic-identity
 *     check exists yet as a runtime signal (only CI-time golden-vector
 *     tests). Deliberately not fabricated -- see the accuracy master
 *     prompt's rule against inventing a status without real evidence.
 *     A real implementation is a separate, later workstream (full-report
 *     numeric firewall).
 *   - outcomeCalibration: always NOT_AVAILABLE. No actual-business-outcome
 *     ingestion system exists yet (a separate, later workstream).
 */

export type QualityStatus = 'PASS' | 'WARN' | 'FAIL' | 'UNVERIFIED' | 'NOT_AVAILABLE';

export interface QualityDimensions {
  /** 0-100. The only dimension expressed as a percentage -- the others are
   *  binary-ish reconciliation checks, not graded scores. */
  input_completeness: number;
  benchmark_match_quality: QualityStatus;
  scenario_reconciliation: QualityStatus;
  narrative_reconciliation: QualityStatus;
  formula_reconciliation: QualityStatus;
  outcome_calibration: QualityStatus;
  /** Evidence trail for each non-percentage dimension, for auditability. */
  evidence: {
    benchmark_match_quality: string;
    scenario_reconciliation: string;
    narrative_reconciliation: string;
    formula_reconciliation: string;
    outcome_calibration: string;
  };
}

export interface QualityDimensionsInput {
  inputCompleteness: number;
  industryRelevance: number;
  benchmarkSource: string | undefined;
  reportIntegrity: 'PASS' | 'BLOCK' | undefined;
  reportIntegrityIssues: Array<{ code: string; message: string }> | undefined;
  narrativeWasModified: boolean;
}

export function buildQualityDimensions(input: QualityDimensionsInput): QualityDimensions {
  const benchmarkMatchQuality: QualityStatus =
    input.benchmarkSource === 'database' && input.industryRelevance >= 60
      ? 'PASS'
      : input.industryRelevance >= 40
        ? 'WARN'
        : 'FAIL';

  const issueCount = input.reportIntegrityIssues?.length ?? 0;
  const scenarioReconciliation: QualityStatus =
    input.reportIntegrity === 'BLOCK' ? 'FAIL' : issueCount > 0 ? 'WARN' : 'PASS';

  const narrativeReconciliation: QualityStatus = input.narrativeWasModified ? 'WARN' : 'PASS';

  return {
    input_completeness: Math.max(0, Math.min(100, Math.round(input.inputCompleteness))),
    benchmark_match_quality: benchmarkMatchQuality,
    scenario_reconciliation: scenarioReconciliation,
    narrative_reconciliation: narrativeReconciliation,
    formula_reconciliation: 'UNVERIFIED',
    outcome_calibration: 'NOT_AVAILABLE',
    evidence: {
      benchmark_match_quality:
        input.benchmarkSource === 'database'
          ? `Matched against the proprietary benchmark database (industry relevance score ${input.industryRelevance}/100).`
          : `Using ${input.benchmarkSource ?? 'default'} benchmarks -- no direct database match (industry relevance score ${input.industryRelevance}/100).`,
      scenario_reconciliation:
        issueCount > 0
          ? `${issueCount} scenario-consistency issue(s) detected: ${input.reportIntegrityIssues?.map((i) => i.code).join(', ')}.`
          : 'No scenario-driver contradictions detected between pessimistic/base/optimistic cases.',
      narrative_reconciliation: input.narrativeWasModified
        ? 'The AI-authored executive summary contained a figure that did not reconcile with the computed financials within tolerance and was replaced with a deterministic, calculation-derived summary.'
        : 'The AI-authored executive summary reconciled with the computed financials within tolerance; no replacement was needed.',
      formula_reconciliation:
        'No per-report arithmetic-identity check is wired as a runtime signal yet. CI-time golden-vector tests exist but are not yet surfaced per-analysis.',
      outcome_calibration: 'No actual-business-outcome ingestion system exists yet; forecast accuracy has not been empirically measured.',
    },
  };
}
