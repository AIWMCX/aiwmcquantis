/**
 * Accuracy session 2026-08-04 (Confidence semantics, Priority 1).
 *
 * Acceptance criteria under test (from the session's accepted plan):
 *   1. No report displays a generic "Confidence Score" label implying
 *      forecast accuracy.
 *   2. Input completeness is labeled exactly as such.
 *   3. Outcome calibration displays NOT_AVAILABLE when no calibration
 *      record exists (always, currently -- no ingestion system exists).
 *   4. Formula, benchmark, scenario, and narrative reconciliation are
 *      separate statuses, not folded into one number.
 *   5. formula_reconciliation is UNVERIFIED rather than fabricated, since
 *      no real per-report arithmetic-identity check is wired yet.
 */
import { describe, it, expect } from 'vitest';
import {
  buildQualityDimensions,
  type QualityDimensionsInput,
} from '../../supabase/functions/_shared/quality-dimensions.ts';

const BASE: QualityDimensionsInput = {
  inputCompleteness: 82,
  industryRelevance: 75,
  benchmarkSource: 'database',
  reportIntegrity: 'PASS',
  reportIntegrityIssues: undefined,
  narrativeWasModified: false,
};

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

  it('derives scenario_reconciliation from report_integrity / report_integrity_issues, not a new rule', () => {
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

  it('derives narrative_reconciliation from the previously-discarded wasModified flag', () => {
    expect(buildQualityDimensions(BASE).narrative_reconciliation).toBe('PASS');
    expect(buildQualityDimensions({ ...BASE, narrativeWasModified: true }).narrative_reconciliation).toBe('WARN');
  });

  it('never fabricates formula_reconciliation -- always UNVERIFIED until a real check exists', () => {
    expect(buildQualityDimensions(BASE).formula_reconciliation).toBe('UNVERIFIED');
    expect(buildQualityDimensions({ ...BASE, reportIntegrity: 'BLOCK' }).formula_reconciliation).toBe('UNVERIFIED');
  });

  it('never claims outcome_calibration is available -- no actual-outcome ingestion exists yet', () => {
    expect(buildQualityDimensions(BASE).outcome_calibration).toBe('NOT_AVAILABLE');
  });

  it('includes a non-empty evidence string for every non-percentage dimension', () => {
    const result = buildQualityDimensions(BASE);
    expect(result.evidence.benchmark_match_quality.length).toBeGreaterThan(0);
    expect(result.evidence.scenario_reconciliation.length).toBeGreaterThan(0);
    expect(result.evidence.narrative_reconciliation.length).toBeGreaterThan(0);
    expect(result.evidence.formula_reconciliation.length).toBeGreaterThan(0);
    expect(result.evidence.outcome_calibration.length).toBeGreaterThan(0);
  });

  it('produces exactly the six documented dimension keys -- no accidental extra/missing fields', () => {
    const result = buildQualityDimensions(BASE);
    expect(Object.keys(result).sort()).toEqual(
      [
        'input_completeness',
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
