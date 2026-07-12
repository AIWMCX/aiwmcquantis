/**
 * Leverage / Financing Ratios — Handbook §19 Wave 3.
 *
 * The engine collects no debt inputs today, so every metric must type
 * as INSUFFICIENT_INPUTS with a specific reasonCode, and the JSON
 * payload must never leak any sentinel-style token.
 */
import { describe, it, expect } from 'vitest';
import { calculateLeverageRatios } from '../financial/leverage-ratios';

describe('every metric is INSUFFICIENT_INPUTS today', () => {
  it('returns typed unavailable states across all six ratios', () => {
    const r = calculateLeverageRatios();
    for (const key of [
      'debtToEquity',
      'debtToAssets',
      'debtToCapital',
      'debtToEbitda',
      'interestCoverage',
      'dscr',
    ] as const) {
      expect(r[key].status).toBe('INSUFFICIENT_INPUTS');
      expect(r[key].value).toBeNull();
      expect(r[key].reasonCode).not.toBeNull();
    }
  });

  it('reason codes name the specific missing input, not a generic string', () => {
    const r = calculateLeverageRatios();
    expect(r.debtToEquity.reasonCode).toBe('NO_DEBT_SCHEDULE_COLLECTED');
    expect(r.debtToAssets.reasonCode).toBe('NO_BALANCE_SHEET_COLLECTED');
    expect(r.debtToCapital.reasonCode).toBe('NO_DEBT_SCHEDULE_COLLECTED');
    expect(r.debtToEbitda.reasonCode).toBe('NO_DEBT_SCHEDULE_COLLECTED');
    expect(r.interestCoverage.reasonCode).toBe('NO_INTEREST_EXPENSE_COLLECTED');
    expect(r.dscr.reasonCode).toBe('NO_DEBT_SERVICE_COLLECTED');
  });
});

describe('JSON payload safety — never leaks a customer-facing sentinel', () => {
  it('never emits a forbidden token in serialization', () => {
    const r = calculateLeverageRatios();
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/\b999\b/);
    expect(json).not.toMatch(/Infinity|NaN/);
  });
});

describe('input shape is ignored today', () => {
  it('produces the same unavailable result regardless of caller-provided inputs', () => {
    const a = calculateLeverageRatios();
    const b = calculateLeverageRatios({
      totalDebt: '1000000',
      interestExpense: '50000',
      totalEquity: '500000',
      totalAssets: '2000000',
      ebitda: '250000',
      debtService: '100000',
    });
    expect(a).toEqual(b);
  });
});

describe('formulaId stability', () => {
  it('is exactly leverage_ratios.v1 (change this in the same PR that flips reason codes to VALUE)', () => {
    expect(calculateLeverageRatios().formulaId).toBe('leverage_ratios.v1');
  });
});
