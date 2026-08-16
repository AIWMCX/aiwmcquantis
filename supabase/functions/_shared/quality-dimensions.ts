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
 * ROUND-2 REVIEW FIX: the first version of this module got two dimensions
 * wrong by conflating signals that are actually separate real checks:
 *
 *   - formula_reconciliation was marked UNVERIFIED on the claim that "no
 *     per-report arithmetic-identity check exists." That was incorrect --
 *     reconciliation-check.ts's R-001..R-005 ("Sum Integrity — Revenue",
 *     "Sum Integrity — Expenses", "Sum Integrity — Net Profit", "Sign
 *     Consistency — Revenue", "Sign Consistency — Costs") are exactly
 *     per-report arithmetic-identity checks, already run on every
 *     analysis, and are precisely the set that CRITICAL_RECONCILIATION_RULES
 *     escalates report_integrity to BLOCK on. formula_reconciliation is now
 *     derived from whether all of R-001..R-005 passed.
 *   - scenario_reconciliation was derived from the entire report_integrity
 *     field, which is broader than scenario logic alone (it also carries
 *     the R-001..R-005 arithmetic failures once escalated). scenario_
 *     reconciliation is now derived specifically from R-011 ("Scenario
 *     Coherence", backed by checkScenarioMonotonicity()) when the full
 *     reconciliation check ran, falling back to the original
 *     report_integrity_issues-based signal only if it didn't.
 *
 * Every dimension is derived from a signal already computed live in
 * analyze-business/index.ts -- none are invented:
 *   - inputCompleteness: confidenceBreakdown.input_completeness.
 *   - sourceCoverage: assumptionOrigins (classifyAssumptionOrigins output,
 *     already computed and attached at _scenarioBaseInput.assumptionOrigins)
 *     -- the fraction of material assumptions with real provenance
 *     (USER_ACTUAL/DERIVED) vs. modeled/placeholder defaults.
 *   - benchmarkMatchQuality: confidenceBreakdown.industry_relevance and
 *     benchmarkSource.
 *   - scenarioReconciliation: reconciliationChecks' R-011 entry, or the
 *     report_integrity_issues fallback (see above).
 *   - narrativeReconciliation: enforceNarrativeIntegrity's `wasModified`
 *     flag (previously computed but discarded at the call site). Uses a
 *     PASS/CORRECTED/UNVERIFIED/FAIL vocabulary specific to this dimension
 *     (see QualityStatus) rather than collapsing "the firewall caught and
 *     fixed a real problem" into the same WARN bucket as "something looks
 *     a little off."
 *   - formulaReconciliation: reconciliationChecks' R-001..R-005 entries.
 *     Falls back to UNVERIFIED if the reconciliation check didn't run at
 *     all for this analysis (e.g. it threw and was caught).
 *   - outcomeCalibration: always NOT_AVAILABLE. No actual-business-outcome
 *     ingestion system exists yet (a separate, later workstream).
 */

export type QualityStatus =
  | 'PASS'
  | 'WARN'
  | 'FAIL'
  | 'UNVERIFIED'
  | 'NOT_AVAILABLE'
  /** narrative_reconciliation only: the firewall detected a real
   *  inconsistency and replaced the narrative -- worth surfacing
   *  distinctly from "nothing needed checking" (PASS) or "we don't know"
   *  (UNVERIFIED), since it's neither a clean pass nor an unknown. */
  | 'CORRECTED';

export interface QualityDimensions {
  /** 0-100. The only two dimensions expressed as a percentage -- the
   *  others are reconciliation-check statuses, not graded scores. */
  input_completeness: number;
  source_coverage: number;
  benchmark_match_quality: QualityStatus;
  scenario_reconciliation: QualityStatus;
  narrative_reconciliation: QualityStatus;
  formula_reconciliation: QualityStatus;
  outcome_calibration: QualityStatus;
  /** Evidence trail for auditability. */
  evidence: {
    source_coverage: string;
    benchmark_match_quality: string;
    scenario_reconciliation: string;
    narrative_reconciliation: string;
    formula_reconciliation: string;
    outcome_calibration: string;
  };
}

export interface ReconciliationCheckSummary {
  rule: string;
  pass: boolean;
  skipped?: boolean;
}

export type AssumptionOriginClass =
  | 'USER_ACTUAL'
  | 'DERIVED'
  | 'MODELED_BENCHMARK_PRIOR'
  | 'SYSTEM_ASSUMPTION'
  | 'PLACEHOLDER';

export interface QualityDimensionsInput {
  inputCompleteness: number;
  industryRelevance: number;
  benchmarkSource: string | undefined;
  reportIntegrity: 'PASS' | 'BLOCK' | undefined;
  reportIntegrityIssues: Array<{ code: string; message: string }> | undefined;
  narrativeWasModified: boolean;
  /** null when the reconciliation check didn't run for this analysis
   *  (e.g. it threw and was caught) -- formula/scenario reconciliation
   *  fall back to UNVERIFIED/the legacy signal in that case, they never
   *  fabricate a pass. */
  reconciliationChecks: ReconciliationCheckSummary[] | null;
  /** Real per-assumption provenance classes, already computed by
   *  classifyAssumptionOrigins(). Empty/undefined -> source_coverage is 0
   *  with an UNVERIFIED-equivalent evidence note, never fabricated. */
  assumptionOriginClasses: AssumptionOriginClass[] | undefined;
}

const FORMULA_RULES = new Set(['R-001', 'R-002', 'R-003', 'R-004', 'R-005']);
const SCENARIO_RULE = 'R-011';

function gradeSourceCoverage(classes: AssumptionOriginClass[] | undefined): {
  score: number;
  evidence: string;
} {
  if (!classes || classes.length === 0) {
    return { score: 0, evidence: 'No assumption-origin classification was available for this analysis.' };
  }
  const evidenced = classes.filter((c) => c === 'USER_ACTUAL' || c === 'DERIVED').length;
  const score = Math.round((evidenced / classes.length) * 100);
  return {
    score,
    evidence: `${evidenced} of ${classes.length} material assumptions (${score}%) have real provenance (user-provided or directly derived from it); the rest are modeled-benchmark or default placeholder values.`,
  };
}

export function buildQualityDimensions(input: QualityDimensionsInput): QualityDimensions {
  const benchmarkMatchQuality: QualityStatus =
    input.benchmarkSource === 'database' && input.industryRelevance >= 60
      ? 'PASS'
      : input.industryRelevance >= 40
        ? 'WARN'
        : 'FAIL';

  // formula_reconciliation: derived from R-001..R-005 (Sum Integrity /
  // Sign Consistency) specifically, not the whole report_integrity field.
  const formulaChecks = input.reconciliationChecks?.filter((c) => FORMULA_RULES.has(c.rule)) ?? null;
  const formulaReconciliation: QualityStatus =
    formulaChecks === null || formulaChecks.length === 0
      ? 'UNVERIFIED'
      : formulaChecks.every((c) => c.pass || c.skipped)
        ? 'PASS'
        : 'FAIL';

  // scenario_reconciliation: derived from R-011 (Scenario Coherence)
  // specifically when the reconciliation check ran; falls back to the
  // original report_integrity_issues-based heuristic otherwise (still real
  // signal, just less precise -- report_integrity_issues is seeded from
  // shapeFinancialAnalysis's own scenario-contradiction detector before any
  // R-0xx rule runs, so it's never empty by fabrication).
  const scenarioRuleCheck = input.reconciliationChecks?.find((c) => c.rule === SCENARIO_RULE);
  const issueCount = input.reportIntegrityIssues?.length ?? 0;
  let scenarioReconciliation: QualityStatus;
  let scenarioEvidence: string;
  if (scenarioRuleCheck) {
    scenarioReconciliation = scenarioRuleCheck.pass ? 'PASS' : 'FAIL';
    scenarioEvidence = scenarioRuleCheck.pass
      ? 'Scenario Coherence (R-011): pessimistic/base/optimistic cases move consistently.'
      : `Scenario Coherence (R-011) failed: ${issueCount} issue(s) detected -- ${input.reportIntegrityIssues?.map((i) => i.code).join(', ') ?? 'see report_integrity_issues'}.`;
  } else {
    scenarioReconciliation = input.reportIntegrity === 'BLOCK' ? 'FAIL' : issueCount > 0 ? 'WARN' : 'PASS';
    scenarioEvidence =
      issueCount > 0
        ? `${issueCount} scenario-consistency issue(s) detected (R-011 check unavailable this run, falling back to report_integrity_issues): ${input.reportIntegrityIssues?.map((i) => i.code).join(', ')}.`
        : 'No scenario-driver contradictions detected (R-011 check unavailable this run, falling back to report_integrity_issues).';
  }

  const narrativeReconciliation: QualityStatus = input.narrativeWasModified ? 'CORRECTED' : 'PASS';

  const { score: sourceCoverageScore, evidence: sourceCoverageEvidence } = gradeSourceCoverage(
    input.assumptionOriginClasses,
  );

  return {
    input_completeness: Math.max(0, Math.min(100, Math.round(input.inputCompleteness))),
    source_coverage: sourceCoverageScore,
    benchmark_match_quality: benchmarkMatchQuality,
    scenario_reconciliation: scenarioReconciliation,
    narrative_reconciliation: narrativeReconciliation,
    formula_reconciliation: formulaReconciliation,
    outcome_calibration: 'NOT_AVAILABLE',
    evidence: {
      source_coverage: sourceCoverageEvidence,
      benchmark_match_quality:
        input.benchmarkSource === 'database'
          ? `Matched against the proprietary benchmark database (industry relevance score ${input.industryRelevance}/100).`
          : `Using ${input.benchmarkSource ?? 'default'} benchmarks -- no direct database match (industry relevance score ${input.industryRelevance}/100).`,
      scenario_reconciliation: scenarioEvidence,
      narrative_reconciliation: input.narrativeWasModified
        ? 'The AI-authored executive summary contained a figure that did not reconcile with the computed financials within tolerance and was replaced with a deterministic, calculation-derived summary.'
        : 'The AI-authored executive summary reconciled with the computed financials within tolerance; no replacement was needed.',
      formula_reconciliation:
        formulaChecks === null || formulaChecks.length === 0
          ? 'The reconciliation check did not run for this analysis -- arithmetic-identity status is unknown, not assumed passing.'
          : `Sum Integrity / Sign Consistency checks (R-001..R-005): ${formulaChecks.filter((c) => c.pass).length}/${formulaChecks.length} passed.`,
      outcome_calibration: 'No actual-business-outcome ingestion system exists yet; forecast accuracy has not been empirically measured.',
    },
  };
}
