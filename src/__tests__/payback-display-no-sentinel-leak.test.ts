/**
 * GLASSWING v2.0 Pillar 1.1 — regression lock for the payback sentinel.
 *
 * The engine internally uses 999 as a "never pays back" marker for
 * payback_period_months and cac_payback_months. Every render site in the
 * app funnels through formatPaybackDisplay() (src/lib/formatPayback.ts)
 * before showing the value to a customer — confirmed by grep across
 * AccuracyTransparentResults.tsx, AnalysisResults.tsx, CapacityCheckCard.tsx,
 * FinancialSummary.tsx, ReportExecutiveSummary.tsx, ViralCard.tsx, and
 * components/analysis/AnalysisHistory.tsx (the last one was found rendering
 * the raw sentinel directly as "999 mo." in production on 2026-08-02 — a
 * real user's history list showed it on ~30 analyses — and fixed the same
 * day; this list is the actual audit trail, not a design intent).
 *
 * This test locks that behavior as a CI-blocking invariant: no future
 * change to formatPaybackDisplay may reintroduce a raw "999" (or
 * Infinity/NaN) in customer-visible output, across the full boundary
 * range a real analysis could produce.
 */
import { describe, it, expect } from 'vitest';
import { formatPaybackDisplay } from '../lib/formatPayback';

describe('formatPaybackDisplay never leaks the engine sentinel', () => {
  it('renders "N/A (unprofitable)" for the exact sentinel value', () => {
    expect(formatPaybackDisplay(999)).toBe('N/A (unprofitable)');
  });

  it('renders "N/A (unprofitable)" for any value at or above the sentinel', () => {
    for (const months of [999, 1000, 5000, 999999]) {
      const out = formatPaybackDisplay(months);
      expect(out).not.toMatch(/\b999\b/);
      expect(out).toBe('N/A (unprofitable)');
    }
  });

  it('renders "N/A (unprofitable)" whenever profit is non-positive, regardless of months', () => {
    for (const months of [0, 1, 12, 36, 999]) {
      for (const profit of [0, -1, -50000]) {
        const out = formatPaybackDisplay(months, profit);
        expect(out).not.toMatch(/\b999\b/);
        expect(out).toBe('N/A (unprofitable)');
      }
    }
  });

  it('never emits a forbidden token across the full plausible input range', () => {
    const monthsToTry = [-1, 0, 0.5, 1, 6, 11.9, 12, 24, 36, 60, 998, 999, 1000, NaN, Infinity];
    const profitsToTry = [undefined, -100000, -1, 0, 1, 100000];
    for (const months of monthsToTry) {
      for (const profit of profitsToTry) {
        const out = formatPaybackDisplay(months, profit);
        expect(out).not.toMatch(/\b999\b/);
        expect(out).not.toMatch(/Infinity|NaN/);
      }
    }
  });

  it('still renders real values correctly for profitable, achievable paybacks', () => {
    expect(formatPaybackDisplay(6, 5000)).toBe('6 months');
    expect(formatPaybackDisplay(24, 5000)).toBe('2.0 years');
  });

  it('distinguishes a PROFITABLE business that exceeds the 60-month horizon from a genuinely unprofitable one', () => {
    // financial-calculator.ts sets the 999 sentinel for two different
    // reasons: finalNetProfit <= 0 (genuinely unprofitable), or
    // finalNetProfit > 0 but the investment is too large to pay back
    // within the 60-month simulation window. Collapsing both to
    // "unprofitable" falsely labels a profitable, capital-intensive
    // business as loss-making.
    expect(formatPaybackDisplay(999, 100000)).toBe('N/A (exceeds 5-year horizon)');
    expect(formatPaybackDisplay(999, 1)).toBe('N/A (exceeds 5-year horizon)');
    expect(formatPaybackDisplay(999, 0)).toBe('N/A (unprofitable)');
    expect(formatPaybackDisplay(999, -1)).toBe('N/A (unprofitable)');
    expect(formatPaybackDisplay(999)).toBe('N/A (unprofitable)');
  });
});
