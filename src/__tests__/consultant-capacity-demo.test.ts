/**
 * Consultant "Capacity vs. Demand" interactive demo (/demo/consultant-founding-pilot).
 *
 * Two things this suite must prove:
 *
 * 1. Additive engine change is truly additive. `generate3YearPL`'s new
 *    optional `capacity` param must not alter output for any call site that
 *    omits it (existing callers, including the founder demo's `acquisition`
 *    param), and must correctly cap active customers when present.
 *
 * 2. The demo's own derived logic (capacityBinds, hoursGap, lost-revenue
 *    reconciliation) is honest about the EXISTING customer base, not just
 *    the newly claimed demand -- a claim that looks low in isolation must
 *    still be flagged as binding once it's added to a business that's
 *    already partially booked.
 */
import { describe, it, expect } from 'vitest';
import { generate3YearPL, type FinancialModelParams } from '@/lib/financial-engine';
import { CONSULTANT_DEMO_FIXTURE, runConsultantDemo } from '@/lib/demo/consultant-capacity-demo';

describe('generate3YearPL: capacity param is additive, not a behavior change', () => {
  const base: FinancialModelParams = {
    initialCustomers: 15,
    growthRateMoM: 0.15,
    marketSaturationPct: 1,
    addressableMarket: 1_000_000,
    avgTicketSize: 120,
    grossMarginPct: 0.55,
    churnRateMonthly: 0.02,
    upsellRevenuePct: 0,
    cogsPct: 0.45,
    rent: 3000,
    salaries: 8000,
    marketingSpend: 1500,
    softwareAndTools: 300,
    otherOpex: 500,
    discountRefundPct: 0,
  };

  it('omitting capacity leaves growth unconstrained (demand exceeds a 20-seat ceiling by month 36)', () => {
    const pl = generate3YearPL(base);
    expect(pl[35].activeCustomers).toBeGreaterThan(20);
  });

  it('a present capacity constraint caps active customers at availableHoursMonthly / hoursPerCustomerMonthly', () => {
    const pl = generate3YearPL({ ...base, capacity: { hoursPerCustomerMonthly: 52, availableHoursMonthly: 1040 } });
    const maxActive = Math.max(...pl.map((p) => p.activeCustomers));
    expect(maxActive).toBeLessThanOrEqual(20.0001);
    expect(maxActive).toBeGreaterThanOrEqual(19.99);
  });

  it('omitting capacity is deterministic and unaffected by unrelated calls', () => {
    const a = generate3YearPL(base);
    const b = generate3YearPL(base);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].activeCustomers).toBeCloseTo(b[i].activeCustomers, 9);
    }
  });

  it('rejects a non-positive hoursPerCustomerMonthly rather than dividing by zero', () => {
    expect(() =>
      generate3YearPL({ ...base, capacity: { hoursPerCustomerMonthly: 0, availableHoursMonthly: 1000 } })
    ).toThrow(/hoursPerCustomerMonthly must be > 0/);
  });

  it('capacity caps paid-acquisition-driven demand as well as organic growth', () => {
    const pl = generate3YearPL({
      ...base,
      growthRateMoM: 0,
      acquisition: [{ monthlySpend: 10000, cac: 50, startMonth: 1, endMonth: 36 }],
      capacity: { hoursPerCustomerMonthly: 52, availableHoursMonthly: 1040 },
    });
    const maxActive = Math.max(...pl.map((p) => p.activeCustomers));
    expect(maxActive).toBeLessThanOrEqual(20.0001);
  });
});

describe('runConsultantDemo: capacity signal accounts for the existing base, not just new claims', () => {
  const base = CONSULTANT_DEMO_FIXTURE.base;

  it('the shipped base fixture (claim 30/mo) binds hard against a 20-seat capacity', () => {
    const r = runConsultantDemo(base);
    expect(r.maxServableCustomers).toBeCloseTo(20, 6);
    // (12 existing + 30 claimed) * 52 hrs = 2184 required vs 1040 available.
    expect(r.requiredHoursForClaim).toBe(2184);
    expect(r.hoursGap).toBe(1144);
    expect(r.capacityBinds).toBe(true);
    expect(r.year1RevenueGap).toBeGreaterThan(0);
  });

  it('served customers never exceed the capacity ceiling in any month', () => {
    const r = runConsultantDemo(base);
    expect(r.months.every((m) => m.servedCustomers <= 20.0001)).toBe(true);
  });

  it('a claim low enough to fit alongside the existing base does not bind capacity', () => {
    // (12 existing + 3 claimed) * 52 = 780 < 1040 available.
    const r = runConsultantDemo({ ...base, claimedMonthlyDemand: 3 });
    expect(r.capacityBinds).toBe(false);
    expect(r.months[0].servedCustomers).toBeCloseTo(r.months[0].demandCustomers, 6);
  });

  it('a claim that looks "low" in isolation still binds once the existing base is counted', () => {
    // This is the exact bug caught during verification: comparing only the
    // claimed rate (10 * 52 = 520 < 1040) against capacity looks safe, but
    // the business is not starting from zero -- it already has 12 customers
    // consuming capacity, so the true requirement is (12+10)*52 = 1144.
    const r = runConsultantDemo({ ...base, claimedMonthlyDemand: 10 });
    expect(r.requiredHoursForClaim).toBe(1144);
    expect(r.capacityBinds).toBe(true);
  });

  it('served count saturates at capacity and is non-decreasing across a demand sweep', () => {
    let prevMax = -Infinity;
    for (let claim = 5; claim <= 60; claim += 5) {
      const r = runConsultantDemo({ ...base, claimedMonthlyDemand: claim });
      const maxServed = Math.max(...r.months.map((m) => m.servedCustomers));
      expect(maxServed).toBeLessThanOrEqual(20.0001);
      expect(maxServed).toBeGreaterThanOrEqual(prevMax - 0.01);
      prevMax = maxServed;
    }
  });
});
