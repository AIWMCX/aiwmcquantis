/**
 * Real runtime tests for src/hooks/pdf-quality-dimensions.ts.
 *
 * GTM-audit item #7 (2026-08-25): the PDF cover previously showed a
 * single "Confidence Score" percentage -- a 40/30/20/10 blend a reader
 * reasonably reads as forecast accuracy, which it never measured. This
 * module's maps/functions back the decomposed breakdown that replaces it.
 */
import { describe, it, expect } from 'vitest';
import {
  QUALITY_STATUS_LABEL,
  QUALITY_STATUS_COLOR,
  QUALITY_STATUS_IS_EVALUATED,
  sourceCoverageColor,
} from '../hooks/pdf-quality-dimensions';
import type { QualityStatus } from '../types/analysis';

const ALL_STATUSES: QualityStatus[] = ['PASS', 'WARN', 'FAIL', 'CORRECTED', 'UNVERIFIED', 'NOT_AVAILABLE'];

describe('quality-status maps', () => {
  it('define a label, color, and evaluated-flag for every QualityStatus value', () => {
    for (const status of ALL_STATUSES) {
      expect(QUALITY_STATUS_LABEL[status]).toBeTruthy();
      expect(QUALITY_STATUS_COLOR[status]).toMatch(/^#[0-9a-f]{6}$/i);
      expect(typeof QUALITY_STATUS_IS_EVALUATED[status]).toBe('boolean');
    }
  });

  // The whole point of this fix: UNVERIFIED/NOT_AVAILABLE must never read
  // as an equivalent outcome to an actual PASS/WARN/FAIL/CORRECTED verdict.
  it('marks UNVERIFIED and NOT_AVAILABLE as not evaluated, everything else as evaluated', () => {
    expect(QUALITY_STATUS_IS_EVALUATED.UNVERIFIED).toBe(false);
    expect(QUALITY_STATUS_IS_EVALUATED.NOT_AVAILABLE).toBe(false);
    expect(QUALITY_STATUS_IS_EVALUATED.PASS).toBe(true);
    expect(QUALITY_STATUS_IS_EVALUATED.WARN).toBe(true);
    expect(QUALITY_STATUS_IS_EVALUATED.FAIL).toBe(true);
    expect(QUALITY_STATUS_IS_EVALUATED.CORRECTED).toBe(true);
  });

  it('gives UNVERIFIED a label that says so explicitly, not a bare pass/fail word', () => {
    expect(QUALITY_STATUS_LABEL.UNVERIFIED.toLowerCase()).toContain('not evaluated');
  });
});

describe('sourceCoverageColor', () => {
  it('is green at or above 70', () => {
    expect(sourceCoverageColor(70)).toBe('#22c55e');
    expect(sourceCoverageColor(100)).toBe('#22c55e');
  });
  it('is amber between 40 and 69', () => {
    expect(sourceCoverageColor(40)).toBe('#f59e0b');
    expect(sourceCoverageColor(69)).toBe('#f59e0b');
  });
  it('is red below 40', () => {
    expect(sourceCoverageColor(0)).toBe('#ef4444');
    expect(sourceCoverageColor(39)).toBe('#ef4444');
  });
});
