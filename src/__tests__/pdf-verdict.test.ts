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
import { deriveReportVerdict } from '../hooks/pdf-verdict';

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
