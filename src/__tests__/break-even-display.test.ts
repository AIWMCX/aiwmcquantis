import { describe, expect, it } from 'vitest';
import { breakEvenMonthsForDisplay, breakEvenMonthsLabel, canonicalBreakEven } from '@/lib/break-even';

// Shape taken from production analysis 08d75e2a (2026-09-27): a loss-making
// SaaS case where the legacy block said 244 units / $36,282 and the CVP block
// said 160.7 units / $23,944.61 — both rendered in the same result view.
const lossMaking = {
  mrr: 1639,
  breakeven: { breakeven_units: 244, breakeven_months: 0, breakeven_revenue: 36282 },
  cvp: {
    status: 'VALUE',
    breakEven: { status: 'VALUE', breakEvenUnits: '160.7', breakEvenRevenue: '23944.61', targetProfitUnits: '765.1' },
  },
};

describe('breakEvenMonthsForDisplay', () => {
  it('treats the engine 0 sentinel as not reached, never "0 mo"', () => {
    expect(breakEvenMonthsForDisplay(lossMaking)).toBeNull();
    expect(breakEvenMonthsLabel(lossMaking, -3011)).toBe('Not reached');
  });

  it('passes real month counts through', () => {
    const profitable = { breakeven: { breakeven_months: 14 } };
    expect(breakEvenMonthsForDisplay(profitable)).toBe(14);
    expect(breakEvenMonthsLabel(profitable, 2400)).toBe('14 mo');
  });

  it('is N/A when nothing is known', () => {
    expect(breakEvenMonthsLabel(undefined, undefined)).toBe('N/A');
  });
});

describe('canonicalBreakEven', () => {
  it('prefers the CVP contract over the floor-guarded legacy figure', () => {
    expect(canonicalBreakEven(lossMaking)).toEqual({ status: 'value', units: 161, revenue: 23944.61, source: 'cvp' });
  });

  it('reports NOT_ACHIEVABLE instead of a fake legacy number', () => {
    const underwater = { breakeven: { breakeven_revenue: 999999 }, cvp: { breakEven: { status: 'NOT_ACHIEVABLE' } } };
    expect(canonicalBreakEven(underwater).status).toBe('not_achievable');
  });

  it('falls back to legacy only for analyses saved before CVP existed', () => {
    const preCvp = { breakeven: { breakeven_units: 120, breakeven_revenue: 18000 } };
    expect(canonicalBreakEven(preCvp)).toEqual({ status: 'value', units: 120, revenue: 18000, source: 'legacy' });
  });
});

describe('costs that do not reconcile', () => {
  // Same production report: base scenario revenue 1639, variable 820,
  // fixed 11965 (benchmark), but net profit −3011 (from the user's $4,650
  // monthly total). 1639 − 820 − 11965 = −11146 ≠ −3011.
  const conflicting = {
    ...lossMaking,
    scenarios: { base: { revenue: 1639, variable_costs: 820, fixed_costs: 11965, net_profit: -3011 } },
  };

  it('withholds any break-even figure instead of showing a wrong one', () => {
    expect(canonicalBreakEven(conflicting)).toEqual({ status: 'inconsistent', units: null, revenue: null, source: null });
  });

  it('still shows break-even when the base scenario reconciles', () => {
    const coherent = { ...lossMaking, scenarios: { base: { revenue: 1639, variable_costs: 820, fixed_costs: 3830, net_profit: -3011 } } };
    expect(canonicalBreakEven(coherent).status).toBe('value');
  });
});
