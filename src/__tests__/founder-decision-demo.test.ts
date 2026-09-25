/**
 * Founder "Break the Model" interactive demo (/demo/founder-decision-review).
 *
 * Two things this suite must prove, since the demo exists specifically to
 * let a buyer trust the numbers on screen:
 *
 * 1. Additive engine change is truly additive. `generate3YearPL`'s new
 *    optional `acquisition` param must not alter output for any call site
 *    that omits it (i.e. every existing caller). Pinned against the exact
 *    fixtures used to verify this by hand before the demo module was built.
 *
 * 2. The demo's own derived logic (payback detection, cash-floor breach,
 *    required-to-work solver) behaves correctly and monotonically -- a
 *    worse assumption must never make the decision look safer.
 */
import { describe, it, expect } from 'vitest';
import { generate3YearPL, generateCashFlow, type FinancialModelParams } from '@/lib/financial-engine';
import {
  FOUNDER_DEMO_FIXTURE,
  LEVER_SEARCH,
  runFounderDemo,
  solveRequiredToWork,
} from '@/lib/demo/founder-decision-demo';

describe('generate3YearPL: acquisition param is additive, not a behavior change', () => {
  const base: FinancialModelParams = {
    initialCustomers: 420,
    growthRateMoM: 0.03,
    marketSaturationPct: 0.5,
    addressableMarket: 20000,
    avgTicketSize: 149,
    grossMarginPct: 0.81,
    churnRateMonthly: 0.041,
    upsellRevenuePct: 0.05,
    cogsPct: 0.19,
    rent: 4000,
    salaries: 45000,
    marketingSpend: 10000,
    softwareAndTools: 3000,
    otherOpex: 2000,
    discountRefundPct: 0.02,
  };

  it('produces the exact pinned month-1/12/36 values with no acquisition param (flat scenario)', () => {
    const flat = { ...base, growthRateMoM: 0, churnRateMonthly: 0, upsellRevenuePct: 0, discountRefundPct: 0 };
    const pl = generate3YearPL(flat);
    for (const m of [0, 11, 35]) {
      expect(pl[m].activeCustomers).toBeCloseTo(420, 6);
      expect(pl[m].netRevenue).toBeCloseTo(62580, 2);
      expect(pl[m].cogs).toBeCloseTo(11890.2, 2);
      expect(pl[m].totalOpex).toBeCloseTo(64000, 2);
      expect(pl[m].ebitda).toBeCloseTo(-13310.2, 2);
    }
  });

  it('produces the exact pinned saas-growth values with no acquisition param', () => {
    const pl = generate3YearPL(base);
    expect(pl[0].activeCustomers).toBeCloseTo(402.78, 2);
    expect(pl[0].newCustomers).toBeCloseTo(0, 6);
    expect(pl[0].netRevenue).toBeCloseTo(61754.63, 1);
    expect(pl[1].activeCustomers).toBeCloseTo(398.35, 2);
    expect(pl[1].newCustomers).toBeCloseTo(12.08, 2);
    expect(pl[1].churnedCustomers).toBeCloseTo(16.51, 2);
  });

  it('respects the saturation cap identically with no acquisition param', () => {
    const capped = { ...base, growthRateMoM: 0.2, addressableMarket: 1200, marketSaturationPct: 0.6 };
    const pl = generate3YearPL(capped);
    const maxActive = Math.max(...pl.map((p) => p.activeCustomers));
    expect(maxActive).toBeCloseTo(694.29, 1);
    expect(maxActive).toBeLessThanOrEqual(1200 * 0.6 + 0.01);
  });

  it('produces identical cash-flow output with no acquisition param', () => {
    const pl = generate3YearPL(base);
    const capital = {
      initialInvestment: 50000,
      capitalExpenditures: [{ month: 3, amount: 5000, description: 'fixture capex' }],
      workingCapitalReserve: 0,
      loanRepaymentMonthly: 500,
      ownerDrawMonthly: 1000,
    };
    const cf = generateCashFlow(pl, capital);
    expect(cf[0].netCashFlow).toBeCloseTo(-15478.75, 1);
    expect(cf[0].cumulativeCash).toBeCloseTo(-65478.75, 1);
    expect(cf[2].capitalExpenditures).toBeCloseTo(5000, 6);
  });

  it('with an empty acquisition array behaves identically to omitting it (no organic growth double-count)', () => {
    const withEmpty = generate3YearPL({ ...base, acquisition: [] });
    const without = generate3YearPL(base);
    for (let i = 0; i < withEmpty.length; i++) {
      expect(withEmpty[i].activeCustomers).toBeCloseTo(without[i].activeCustomers, 6);
      expect(withEmpty[i].netRevenue).toBeCloseTo(without[i].netRevenue, 4);
    }
  });

  it('rejects a non-positive CAC in an acquisition campaign rather than silently dividing', () => {
    expect(() =>
      generate3YearPL({ ...base, acquisition: [{ monthlySpend: 1000, cac: 0, startMonth: 1, endMonth: 3 }] })
    ).toThrow(/CAC must be > 0/);
  });
});

describe('runFounderDemo: base fixture holds and every lever degrades monotonically', () => {
  const base = FOUNDER_DEMO_FIXTURE.base;

  it('the shipped base-case fixture holds (payback inside the stated limit, cash never breaches the floor)', () => {
    const r = runFounderDemo(base);
    expect(r.holds).toBe(true);
    expect(r.failures).toEqual([]);
    expect(r.paybackMonth).not.toBeNull();
    expect(r.paybackMonth as number).toBeLessThanOrEqual(FOUNDER_DEMO_FIXTURE.criteria.maxPaybackMonths);
    expect(r.floorBreachMonth).toBeNull();
  });

  it('raising CAC never improves the lowest cash point reached (monotone, sampled across a sweep)', () => {
    let prev = Infinity;
    for (let cac = 800; cac <= 2200; cac += 100) {
      const r = runFounderDemo({ ...base, cac });
      expect(r.lowestCash).toBeLessThanOrEqual(prev + 0.01);
      prev = r.lowestCash;
    }
  });

  it('doubling churn breaks the decision (cash floor and/or payback)', () => {
    const r = runFounderDemo({ ...base, churnMonthly: base.churnMonthly * 2 });
    expect(r.holds).toBe(false);
    expect(r.failures.length).toBeGreaterThan(0);
  });

  it('a campaign that is cash-positive immediately reports payback at the campaign start month, not "no payback"', () => {
    // CAC low enough that the campaign's own new-customer revenue outpaces
    // its spend from month 1 -- this is the exact case that silently
    // mis-reported "no_payback" before the payback-detection fix, because
    // the old logic only recognized payback on a negative-to-positive
    // transition and never fired when the balance was never negative.
    const r = runFounderDemo({ ...base, cac: 100 });
    expect(r.paybackMonth).toBe(FOUNDER_DEMO_FIXTURE.decision.startMonth);
    expect(r.failures).not.toContain('no_payback');
  });
});

describe('solveRequiredToWork: thresholds are consistent with direct evaluation', () => {
  const base = FOUNDER_DEMO_FIXTURE.base;

  it('every lever\'s reported threshold is the actual boundary (holds just inside it, fails just outside it)', () => {
    for (const r of solveRequiredToWork(base)) {
      if (r.threshold === null || r.unbounded) continue;
      const { worseWhen, tolerance } = LEVER_SEARCH[r.lever];
      const nudge = worseWhen === 'higher' ? tolerance * 3 : -tolerance * 3;
      const justInside = runFounderDemo({ ...base, [r.lever]: r.threshold });
      const justOutside = runFounderDemo({ ...base, [r.lever]: r.threshold + nudge });
      expect(justInside.holds).toBe(true);
      expect(justOutside.holds).toBe(false);
    }
  });
});
