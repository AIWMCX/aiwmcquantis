/**
 * CAC payback must be in months: CAC divided by MONTHLY gross profit per
 * customer (avg ticket × gross margin × orders per month). Before this test
 * the orders-per-month term was missing, so a customer who buys 6 times a
 * month showed a payback 6× too long. The master prompt already defines it
 * this way ("CAC / monthly gross profit per customer").
 */
import { describe, it, expect } from 'vitest';
import { QuantisMath } from '../lib/quantis-math';
import { QMath } from '../../supabase/functions/analyze-business/quantis-math-server';

const n = (d: { toNumber: () => number }) => d.toNumber();

describe('CAC payback is measured in months, not orders', () => {
  it('golden case: coffee shop, 6 orders a month (QT-TR-2026-001 Appendix B inputs)', () => {
    // CAC $25, avg check $7, gross margin 70%, 6 orders/month:
    // monthly gross profit per customer = 7 × 0.7 × 6 = $29.40 → 25 / 29.40 = 0.85 → clamped to 1.
    expect(n(QMath.cacPaybackMonths(25, 7, 0.7, 6))).toBe(1);
    // A CAC large enough to sit inside the clamp shows the exact value: 300 / 29.40 = 10.204…
    expect(n(QMath.cacPaybackMonths(300, 7, 0.7, 6))).toBeCloseTo(10.204, 3);
  });

  it('purchase frequency divides payback proportionally', () => {
    const once = n(QMath.cacPaybackMonths(300, 10, 0.5, 1));
    const sixTimes = n(QMath.cacPaybackMonths(300, 10, 0.5, 6));
    expect(once).toBeCloseTo(60, 6);
    expect(sixTimes).toBeCloseTo(10, 6);
  });

  it('one order a month reproduces the previous value (no change for monthly-purchase businesses)', () => {
    expect(n(QMath.cacPaybackMonths(150, 75, 0.65, 1))).toBeCloseTo(150 / (75 * 0.65), 6);
  });

  it('less than one order a month lengthens payback', () => {
    expect(n(QMath.cacPaybackMonths(2000, 120, 0.55, 0.5))).toBeCloseTo(2000 / (120 * 0.55 * 0.5), 6);
  });

  it('zero orders per month is unrecoverable (capped at 120), never a division by zero', () => {
    expect(n(QMath.cacPaybackMonths(100, 50, 0.5, 0))).toBe(120);
    expect(n(QuantisMath.cacPaybackMonths(100, 50, 0.5, 0))).toBe(120);
  });

  it('client and server implementations agree', () => {
    for (const [cac, t, gm, f] of [[25, 7, 0.7, 6], [300, 7, 0.7, 6], [2000, 120, 0.55, 0.5]] as const) {
      expect(n(QuantisMath.cacPaybackMonths(cac, t, gm, f))).toBeCloseTo(n(QMath.cacPaybackMonths(cac, t, gm, f)), 6);
    }
  });
});
