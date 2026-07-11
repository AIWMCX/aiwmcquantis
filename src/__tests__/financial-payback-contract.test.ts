/**
 * Financial Integrity — Payback Contract Tests (Handbook §19 Wave 1)
 * Proves the typed MonthsMetricResult contract replaces the 999 sentinel
 * with an explicit unavailable state, and that CAC payback uses cumulative
 * customer contribution margin rather than company-wide net profit.
 */
import { describe, expect, it } from 'vitest';
import { calculateInvestmentPayback } from '@/financial/payback';
import { calculateCacPayback } from '@/financial/cac-payback';
import { assertNoNumericSentinel } from '@/financial/result';

describe('investment payback', () => {
  it('returns a fractional crossing month', () => {
    const result = calculateInvestmentPayback('100', ['20', '20', '20', '20', '40']);
    expect(result).toEqual({
      status: 'VALUE',
      months: '4.5',
      horizonMonths: 5,
      formulaId: 'investment_payback.cumulative_fcf.v1',
      reasonCode: null,
    });
  });

  it('returns a typed unavailable state instead of 999', () => {
    const result = calculateInvestmentPayback('100', ['-5', '10', '10']);
    expect(result.status).toBe('NOT_ACHIEVED_WITHIN_HORIZON');
    expect(result.months).toBeNull();
    expect(() => assertNoNumericSentinel(result)).not.toThrow();
  });
});

describe('CAC payback', () => {
  it('uses cumulative customer contribution, not company net profit', () => {
    const result = calculateCacPayback('120', ['20', '20', '20', '20', '20', '20']);
    expect(result.status).toBe('VALUE');
    expect(result.months).toBe('6');
  });

  it('does not expose magic values', () => {
    const result = calculateCacPayback('120', ['10', '10', '10']);
    expect(result.months).not.toBe('999');
    expect(result.status).toBe('NOT_ACHIEVED_WITHIN_HORIZON');
  });
});
