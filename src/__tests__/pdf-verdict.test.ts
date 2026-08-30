/**
 * Real runtime tests for deriveReportVerdict() (src/hooks/pdf-verdict.ts).
 *
 * CodeRabbit catch on PR #88: the original tests only regex-matched
 * usePdfExport.ts's source text for tokens like "REVIEW REQUIRED" or
 * "isDegraded" -- a source token can survive after the runtime behavior
 * regresses, so those tests could pass while the actual verdict output was
 * wrong. deriveReportVerdict() has zero @react-pdf/renderer dependency
 * (extracted specifically for this reason), so it can be called directly
 * and asserted on for real.
 */
import { describe, it, expect } from 'vitest';
import { deriveReportVerdict, deriveDegradedFlags } from '../hooks/pdf-verdict';

const base = { confidenceScore: 80, monthlyProfit: 1000, paybackMonths: 6, isDegraded: false, integrityBlocked: false };

describe('deriveReportVerdict', () => {
  it('returns a clean VIABLE for a healthy, fully AI-narrated analysis', () => {
    expect(deriveReportVerdict(base)).toEqual({ text: 'VIABLE', tone: 'success' });
  });

  it('real production regression: a report_integrity BLOCK forces REVIEW REQUIRED regardless of how healthy the numbers otherwise look', () => {
    // Deliberately pass numbers that would otherwise be a clean VIABLE --
    // proves integrityBlocked overrides everything else, not just adds a
    // qualifier to it. This is the direct fix for the CashMatch AI
    // incident, whose scenarios were mathematically impossible yet still
    // showed a plain "VIABLE".
    const verdict = deriveReportVerdict({ ...base, integrityBlocked: true });
    expect(verdict).toEqual({ text: 'REVIEW REQUIRED', tone: 'danger' });
  });

  it('integrityBlocked wins even when isDegraded is also true', () => {
    const verdict = deriveReportVerdict({ ...base, integrityBlocked: true, isDegraded: true });
    expect(verdict.text).toBe('REVIEW REQUIRED');
  });

  it('qualifies VIABLE as deterministic-only when the AI narrator never ran', () => {
    expect(deriveReportVerdict({ ...base, isDegraded: true })).toEqual({
      text: 'VIABLE (DETERMINISTIC ONLY)',
      tone: 'success',
    });
  });

  it('qualifies NEEDS REFINEMENT as deterministic-only', () => {
    const input = { ...base, confidenceScore: 55, isDegraded: true };
    expect(deriveReportVerdict(input)).toEqual({ text: 'NEEDS REFINEMENT (DETERMINISTIC ONLY)', tone: 'warning' });
  });

  // CodeRabbit catch (first round): the HIGH RISK branch was originally
  // missing this qualifier while the other two branches had it.
  it('qualifies HIGH RISK as deterministic-only too, not just VIABLE/NEEDS REFINEMENT', () => {
    const input = { ...base, confidenceScore: 10, monthlyProfit: -500, isDegraded: true };
    expect(deriveReportVerdict(input)).toEqual({ text: 'HIGH RISK (DETERMINISTIC ONLY)', tone: 'danger' });
  });

  it('does not add a qualifier when the AI narrator succeeded', () => {
    const input = { ...base, confidenceScore: 10, monthlyProfit: -500 };
    expect(deriveReportVerdict(input)).toEqual({ text: 'HIGH RISK', tone: 'danger' });
  });
});

/**
 * Real runtime tests for deriveDegradedFlags() (Phase 5 5.12 independent
 * re-verification, 2026-08-29). Proves the actual bug this fix closed:
 * `used_fallback` lives at `metadata.used_fallback` on the real
 * analyze-business response shape (confirmed directly against
 * analyze-business/index.ts's `metadata: (() => {...})()` block), not at
 * the top level -- the pre-fix inline code read the wrong path and was
 * always false in production, on every degraded analysis, since it
 * shipped.
 */
describe('deriveDegradedFlags', () => {
  it('reads used_fallback from metadata (the REAL response shape) -- the exact path the pre-fix code got wrong', () => {
    const realShapedResult = {
      financial_analysis: {},
      metadata: { used_fallback: true, fallback_mode: true, fallback_reason: 'AI narrator did not return a valid tool call; deterministic engine used.' },
      report_integrity: 'PASS',
    };
    expect(deriveDegradedFlags(realShapedResult)).toEqual({ isDegraded: true, integrityBlocked: false });
  });

  it('regression guard: a top-level used_fallback (the OLD, broken path) is correctly ignored, not accidentally read', () => {
    // If this ever passes with isDegraded: true, the fix has regressed
    // back to reading the wrong (top-level) path.
    const wrongShapeResult = { used_fallback: true, metadata: {} };
    expect(deriveDegradedFlags(wrongShapeResult).isDegraded).toBe(false);
  });

  it('returns false/false for a normal, fully AI-narrated, non-blocked analysis', () => {
    const normalResult = { metadata: { used_fallback: false }, report_integrity: 'PASS' };
    expect(deriveDegradedFlags(normalResult)).toEqual({ isDegraded: false, integrityBlocked: false });
  });

  it('reads report_integrity from the top level (this path was already correct)', () => {
    const blockedResult = { metadata: { used_fallback: false }, report_integrity: 'BLOCK' };
    expect(deriveDegradedFlags(blockedResult)).toEqual({ isDegraded: false, integrityBlocked: true });
  });

  it('both flags can be true simultaneously (a degraded analysis that also fails integrity)', () => {
    const bothResult = { metadata: { used_fallback: true }, report_integrity: 'BLOCK' };
    expect(deriveDegradedFlags(bothResult)).toEqual({ isDegraded: true, integrityBlocked: true });
  });

  it('does not throw on null, undefined, or a completely empty object (defensive against a malformed raw result)', () => {
    expect(deriveDegradedFlags(null)).toEqual({ isDegraded: false, integrityBlocked: false });
    expect(deriveDegradedFlags(undefined)).toEqual({ isDegraded: false, integrityBlocked: false });
    expect(deriveDegradedFlags({})).toEqual({ isDegraded: false, integrityBlocked: false });
  });
});
