/**
 * Accuracy session 2026-08-04 (Confidence semantics, Priority 1).
 *
 * Acceptance criteria under test (from the session's accepted plan, plus
 * the round-2 review's corrections):
 *   1. No report displays a generic "Confidence Score" label implying
 *      forecast accuracy.
 *   2. Input completeness is labeled exactly as such.
 *   3. Outcome calibration displays NOT_AVAILABLE when no calibration
 *      record exists (always, currently -- no ingestion system exists).
 *   4. Formula, benchmark, scenario, and narrative reconciliation are
 *      separate statuses, not folded into one number.
 *   5. formula_reconciliation is derived from R-001..R-005 (Sum
 *      Integrity/Sign Consistency) specifically, not fabricated, and
 *      UNVERIFIED only when the reconciliation check didn't run at all.
 *   6. scenario_reconciliation is derived from R-011 (Scenario Coherence)
 *      specifically when available -- not the broader report_integrity
 *      field, which also carries R-001..R-005 failures once escalated.
 *   7. narrative_reconciliation distinguishes CORRECTED (firewall caught
 *      and fixed a real inconsistency) from PASS (nothing needed fixing).
 *   8. source_coverage is derived from real assumption-provenance
 *      classifications, never fabricated when none are available.
 */
import { describe, it, expect } from 'vitest';
import {
  buildQualityDimensions,
  type QualityDimensionsInput,
  type ReconciliationCheckSummary,
} from '../../supabase/functions/_shared/quality-dimensions.ts';

const BASE: QualityDimensionsInput = {
  inputCompleteness: 82,
  industryRelevance: 75,
  benchmarkSource: 'database',
  reportIntegrity: 'PASS',
  reportIntegrityIssues: undefined,
  narrativeWasModified: false,
  reconciliationChecks: null,
  assumptionOriginClasses: undefined,
};

const ALL_R_CHECKS: ReconciliationCheckSummary[] = [
  { rule: 'R-001', pass: true },
  { rule: 'R-002', pass: true },
  { rule: 'R-003', pass: true },
  { rule: 'R-004', pass: true },
  { rule: 'R-005', pass: true },
  { rule: 'R-006', pass: true },
  { rule: 'R-011', pass: true },
];

describe('buildQualityDimensions', () => {
  it('passes input_completeness through unchanged (clamped 0-100)', () => {
    expect(buildQualityDimensions(BASE).input_completeness).toBe(82);
    expect(buildQualityDimensions({ ...BASE, inputCompleteness: 150 }).input_completeness).toBe(100);
    expect(buildQualityDimensions({ ...BASE, inputCompleteness: -10 }).input_completeness).toBe(0);
  });

  it('grades benchmark_match_quality PASS only for a real database match with decent relevance', () => {
    expect(buildQualityDimensions(BASE).benchmark_match_quality).toBe('PASS');
    expect(
      buildQualityDimensions({ ...BASE, benchmarkSource: 'hardcoded', industryRelevance: 75 }).benchmark_match_quality,
    ).toBe('WARN');
    expect(
      buildQualityDimensions({ ...BASE, benchmarkSource: 'hardcoded', industryRelevance: 20 }).benchmark_match_quality,
    ).toBe('FAIL');
  });

  describe('scenario_reconciliation (round-2 fix: R-011-specific, not the whole report_integrity)', () => {
    it('derives PASS/FAIL from the R-011 check specifically when reconciliationChecks is available', () => {
      expect(buildQualityDimensions({ ...BASE, reconciliationChecks: ALL_R_CHECKS }).scenario_reconciliation).toBe(
        'PASS',
      );
      const withFailedScenario = ALL_R_CHECKS.map((c) => (c.rule === 'R-011' ? { ...c, pass: false } : c));
      expect(
        buildQualityDimensions({ ...BASE, reconciliationChecks: withFailedScenario }).scenario_reconciliation,
      ).toBe('FAIL');
    });

    it('is not affected by an unrelated R-001..R-005 failure when R-011 itself passes', () => {
      // This is exactly the round-2 review's point: report_integrity can be
      // BLOCK from an arithmetic-identity failure that has nothing to do
      // with scenario logic. scenario_reconciliation must not inherit FAIL
      // from that.
      const arithmeticFailureOnly = ALL_R_CHECKS.map((c) => (c.rule === 'R-001' ? { ...c, pass: false } : c));
      expect(
        buildQualityDimensions({
          ...BASE,
          reportIntegrity: 'BLOCK',
          reconciliationChecks: arithmeticFailureOnly,
        }).scenario_reconciliation,
      ).toBe('PASS');
    });

    it('falls back to the report_integrity_issues heuristic when reconciliationChecks is null', () => {
      expect(buildQualityDimensions(BASE).scenario_reconciliation).toBe('PASS');
      expect(
        buildQualityDimensions({
          ...BASE,
          reportIntegrity: 'PASS',
          reportIntegrityIssues: [{ code: 'SCENARIO_MONOTONICITY', message: 'x' }],
        }).scenario_reconciliation,
      ).toBe('WARN');
      expect(
        buildQualityDimensions({
          ...BASE,
          reportIntegrity: 'BLOCK',
          reportIntegrityIssues: [{ code: 'RECONCILIATION_R-001', message: 'x' }],
        }).scenario_reconciliation,
      ).toBe('FAIL');
    });
  });

  describe('formula_reconciliation (round-2 fix: derived from R-001..R-005, not fabricated UNVERIFIED)', () => {
    it('is PASS when all of R-001..R-005 pass', () => {
      expect(buildQualityDimensions({ ...BASE, reconciliationChecks: ALL_R_CHECKS }).formula_reconciliation).toBe(
        'PASS',
      );
    });

    it('is FAIL when any of R-001..R-005 fails, even if R-011 (scenario) passes', () => {
      const arithmeticFailureOnly = ALL_R_CHECKS.map((c) => (c.rule === 'R-003' ? { ...c, pass: false } : c));
      expect(
        buildQualityDimensions({ ...BASE, reconciliationChecks: arithmeticFailureOnly }).formula_reconciliation,
      ).toBe('FAIL');
    });

    it('is UNVERIFIED only when the reconciliation check did not run at all', () => {
      expect(buildQualityDimensions({ ...BASE, reconciliationChecks: null }).formula_reconciliation).toBe(
        'UNVERIFIED',
      );
      expect(buildQualityDimensions({ ...BASE, reconciliationChecks: [] }).formula_reconciliation).toBe('UNVERIFIED');
    });
  });

  describe('narrative_reconciliation (round-2 fix: CORRECTED distinct from PASS)', () => {
    it('is PASS when the narrative never needed correction', () => {
      expect(buildQualityDimensions(BASE).narrative_reconciliation).toBe('PASS');
    });

    it('is CORRECTED, not a generic WARN, when the firewall replaced the narrative', () => {
      expect(buildQualityDimensions({ ...BASE, narrativeWasModified: true }).narrative_reconciliation).toBe(
        'CORRECTED',
      );
    });
  });

  describe('source_coverage (new dimension, round-2 review item 4)', () => {
    it('grades the fraction of assumptions that are the customer-typed figures (USER_ACTUAL only)', () => {
      const result = buildQualityDimensions({
        ...BASE,
        assumptionOriginClasses: ['USER_ACTUAL', 'DERIVED', 'MODELED_BENCHMARK_PRIOR', 'PLACEHOLDER'],
      });
      // 2026-11-05: DERIVED is an AI estimate from the description, not provenance.
      expect(result.source_coverage).toBe(25);
      expect(result.evidence.source_coverage).toContain('1 is an AI estimate');
    });

    it('is 0, not fabricated, when no assumption-origin classification is available', () => {
      expect(buildQualityDimensions({ ...BASE, assumptionOriginClasses: undefined }).source_coverage).toBe(0);
      expect(buildQualityDimensions({ ...BASE, assumptionOriginClasses: [] }).source_coverage).toBe(0);
    });
  });

  it('never claims outcome_calibration is available -- no actual-outcome ingestion exists yet', () => {
    expect(buildQualityDimensions(BASE).outcome_calibration).toBe('NOT_AVAILABLE');
  });

  it('includes a non-empty evidence string for every non-percentage dimension', () => {
    const result = buildQualityDimensions({ ...BASE, reconciliationChecks: ALL_R_CHECKS });
    expect(result.evidence.source_coverage.length).toBeGreaterThan(0);
    expect(result.evidence.benchmark_match_quality.length).toBeGreaterThan(0);
    expect(result.evidence.scenario_reconciliation.length).toBeGreaterThan(0);
    expect(result.evidence.narrative_reconciliation.length).toBeGreaterThan(0);
    expect(result.evidence.formula_reconciliation.length).toBeGreaterThan(0);
    expect(result.evidence.outcome_calibration.length).toBeGreaterThan(0);
  });

  it('produces exactly the seven documented dimension keys -- no accidental extra/missing fields', () => {
    const result = buildQualityDimensions(BASE);
    expect(Object.keys(result).sort()).toEqual(
      [
        'input_completeness',
        'source_coverage',
        'benchmark_match_quality',
        'scenario_reconciliation',
        'narrative_reconciliation',
        'formula_reconciliation',
        'outcome_calibration',
        'evidence',
      ].sort(),
    );
  });
});
