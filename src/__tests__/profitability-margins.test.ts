/**
 * Profitability Margins — Handbook §19 Wave 2
 */
import { describe, it, expect } from 'vitest';
import { calculateProfitabilityMargins } from '../financial/profitability-margins';

describe('golden case — standard profitable business', () => {
  it('computes gross, operating, and net margin correctly', () => {
    const r = calculateProfitabilityMargins({
      revenue: '10000',
      cogs: '4000',
      operatingIncome: '1000',
      netIncome: '1000',
    });
    expect(r.grossMargin.status).toBe('VALUE');
    expect(r.grossMargin.value).toBe('0.6'); // (10000-4000)/10000
    expect(r.operatingMargin.value).toBe('0.1');
    expect(r.netMargin.value).toBe('0.1');
    expect(r.operatingEqualsNetIncome).toBe(true);
  });
});

describe('zero-revenue guard', () => {
  it('returns NOT_MEANINGFUL, never a divide-by-zero or sentinel', () => {
    const r = calculateProfitabilityMargins({
      revenue: '0',
      cogs: '0',
      operatingIncome: '-500',
      netIncome: '-500',
    });
    expect(r.grossMargin.status).toBe('NOT_MEANINGFUL');
    expect(r.grossMargin.reasonCode).toBe('ZERO_REVENUE_DENOMINATOR');
    expect(r.grossMargin.value).toBeNull();
    expect(JSON.stringify(r)).not.toMatch(/\b999\b/);
    expect(JSON.stringify(r)).not.toMatch(/Infinity|NaN/);
  });
});

describe('invalid inputs', () => {
  it('rejects negative revenue', () => {
    const r = calculateProfitabilityMargins({ revenue: '-100', cogs: '0', operatingIncome: '0', netIncome: '0' });
    expect(r.grossMargin.status).toBe('INVALID_INPUTS');
    expect(r.grossMargin.reasonCode).toBe('NEGATIVE_REVENUE');
  });

  it('rejects non-numeric input rather than throwing', () => {
    const r = calculateProfitabilityMargins({ revenue: 'nope', cogs: '0', operatingIncome: '0', netIncome: '0' });
    expect(r.grossMargin.status).toBe('INVALID_INPUTS');
  });
});

describe('reconciliation identity — in this engine, gross >= operating >= net', () => {
  it('holds for a normal cost structure where COGS <= total expenses', () => {
    const r = calculateProfitabilityMargins({
      revenue: '10000',
      cogs: '3000',
      operatingIncome: '500',
      netIncome: '500',
    });
    expect(Number(r.grossMargin.value)).toBeGreaterThanOrEqual(Number(r.operatingMargin.value));
  });
});

describe('property test', () => {
  it('net margin can never exceed 100% when netIncome <= revenue', () => {
    for (let net = -5000; net <= 10000; net += 1000) {
      const r = calculateProfitabilityMargins({
        revenue: '10000',
        cogs: '3000',
        operatingIncome: String(net),
        netIncome: String(net),
      });
      if (r.netMargin.value !== null) {
        expect(Number(r.netMargin.value)).toBeLessThanOrEqual(1);
      }
    }
  });
});
