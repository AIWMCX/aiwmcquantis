import { describe, expect, it } from 'vitest';
import {
  HIRING_DEMO_FIXTURE as F,
  runHiringDemo,
  solveHiringRequiredToWork,
} from '@/lib/demo/hiring-decision-demo';

describe('hiring demo — hand-checked reference values', () => {
  const r = runHiringDemo(F.base);

  it('month 1 with the hire matches a hand calculation', () => {
    // 18 clients + 1.5 new − 2% churn (0.36) = 19.14 clients
    // revenue 19.14 × $3,000 = $57,420 → gross profit at 55% = $31,581
    // opex 24,000 + 6,500 hire + 2,500 + 700 + 1,300 = $35,000 → net −$3,419
    // cash 60,000 − 3,419 − 4,000 recruiting = 52,581
    // receivables growth (lag 1): 57,420 − 54,000 = 3,420 → 49,161
    expect(r.months[0].clientsWith).toBeCloseTo(19.14, 2);
    expect(r.months[0].cashWith).toBeCloseTo(49_161, -1);
  });

  it('month 1 without the hire: capped at capacity (18), +$1,200 profit, no receivables growth', () => {
    // capacity 180 h / 10 h = 18 → revenue $54,000, GP $29,700, opex $28,500
    expect(r.months[0].clientsWithout).toBeCloseTo(18, 5);
    expect(r.months[0].cashWithout).toBeCloseTo(61_200, -1);
  });

  it('revenue needed just to cover the hire = cost ÷ margin', () => {
    expect(r.revenueToCoverHire).toBeCloseTo(6_500 / 0.55, 6); // $11,818.18
    expect(r.clientsToCoverHire).toBeCloseTo(6_500 / 0.55 / 3_000, 6); // 3.94 clients
  });

  it('base case holds: pays back inside 12 months and stays above the cash floor', () => {
    expect(r.holds).toBe(true);
    expect(r.paybackMonth).toBe(11);
    expect(r.lowestCash).toBeGreaterThan(F.criteria.cashFloor);
  });

  it('new clients never exceed the capacity the hire adds', () => {
    const cap = (F.currentHoursMonthly + F.hireAddsHoursMonthly) / F.hoursPerClientMonthly;
    for (const m of r.months) expect(m.clientsWith).toBeLessThanOrEqual(cap + 1e-9);
    for (const m of r.months) expect(m.hireUtilization).toBeLessThanOrEqual(1);
  });
});

describe('hiring demo — the decision breaks for the right reasons', () => {
  it('slower demand: the hire never pays back within 18 months', () => {
    const r = runHiringDemo({ ...F.base, newClientsPerMonth: 0.7 });
    expect(r.holds).toBe(false);
    expect(r.failures).toContain('no_payback');
  });

  it('customers paying one month later delays payback past the 12-month limit', () => {
    const r = runHiringDemo({ ...F.base, collectionLagMonths: 2 });
    expect(r.failures).toEqual(['payback_too_slow']);
    expect(r.paybackMonth).toBe(14);
  });

  it('collection timing changes cash, not revenue', () => {
    const a = runHiringDemo({ ...F.base, collectionLagMonths: 0 });
    const b = runHiringDemo({ ...F.base, collectionLagMonths: 2 });
    expect(a.months.map((m) => m.revenueWith)).toEqual(b.months.map((m) => m.revenueWith));
    expect(b.lowestCash).toBeLessThan(a.lowestCash);
  });

  it('each lever is monotone: worse input never improves lowest cash', () => {
    const base = runHiringDemo(F.base).lowestCash;
    expect(runHiringDemo({ ...F.base, hireMonthlyCost: 8_000 }).lowestCash).toBeLessThan(base);
    expect(runHiringDemo({ ...F.base, grossMargin: 0.45 }).lowestCash).toBeLessThan(base);
    expect(runHiringDemo({ ...F.base, newClientsPerMonth: 1 }).lowestCash).toBeLessThan(base);
  });

  it('"what must be true" thresholds bracket the base case', () => {
    const t = Object.fromEntries(solveHiringRequiredToWork(F.base).map((x) => [x.lever, x]));
    expect(t.newClientsPerMonth.threshold!).toBeLessThan(F.base.newClientsPerMonth);
    expect(t.hireMonthlyCost.threshold!).toBeGreaterThan(F.base.hireMonthlyCost);
    expect(t.grossMargin.threshold!).toBeLessThan(F.base.grossMargin);
    expect(t.collectionLagMonths.threshold).toBe(1);
    // And at each threshold the decision still holds.
    expect(runHiringDemo({ ...F.base, newClientsPerMonth: t.newClientsPerMonth.threshold! }).holds).toBe(true);
    expect(runHiringDemo({ ...F.base, hireMonthlyCost: t.hireMonthlyCost.threshold! }).holds).toBe(true);
  });
});
