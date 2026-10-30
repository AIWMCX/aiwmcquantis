import { describe, it, expect } from 'vitest';
import {
  HIRING_DEMO_FIXTURE,
  runHiringDemo,
  solveHiringRequiredToWork,
} from '@/lib/demo/hiring-decision-demo';
import {
  HIRING_OWN_DEFAULTS,
  decodeHiringOwn,
  encodeHiringOwn,
  hiringSearchFor,
  toHiringAssumptions,
  toHiringFixture,
  validateHiringOwn,
  type HiringOwnInputs,
} from '@/lib/demo/hiring-own-numbers';

describe('hiring decision on your own numbers (#105)', () => {
  it('the example inputs give exactly the example result', () => {
    const own = runHiringDemo(toHiringAssumptions(HIRING_OWN_DEFAULTS), toHiringFixture(HIRING_OWN_DEFAULTS));
    const demo = runHiringDemo(HIRING_DEMO_FIXTURE.base, HIRING_DEMO_FIXTURE);
    expect(own.paybackMonth).toBe(demo.paybackMonth);
    expect(own.lowestCash).toBeCloseTo(demo.lowestCash, 6);
    expect(own.holds).toBe(demo.holds);
  });

  it('the example inputs are valid', () => {
    expect(validateHiringOwn(HIRING_OWN_DEFAULTS)).toEqual({});
  });

  it('rejects impossible inputs with a reason', () => {
    const bad: HiringOwnInputs = { ...HIRING_OWN_DEFAULTS, avgMonthlyFee: 0, grossMargin: 1.2, startingCash: -5, hireMonthlyCost: Number.NaN };
    const e = validateHiringOwn(bad);
    expect(e.avgMonthlyFee).toBeTruthy();
    expect(e.grossMargin).toBeTruthy();
    expect(e.startingCash).toBeTruthy();
    expect(e.hireMonthlyCost).toBeTruthy();
  });

  it('flags clients that need more hours than the team has', () => {
    const e = validateHiringOwn({ ...HIRING_OWN_DEFAULTS, startingClients: 30 });
    expect(e.currentHoursMonthly).toMatch(/300 hours/);
  });

  it('says when cash breaks the floor even without the hire', () => {
    const losing: HiringOwnInputs = {
      ...HIRING_OWN_DEFAULTS,
      startingClients: 6, avgMonthlyFee: 2_000, hoursPerClientMonthly: 12, currentHoursMonthly: 80,
      fixedCostsMonthly: 9_000, startingCash: 20_000, cashFloor: 5_000, grossMargin: 0.5,
    };
    const r = runHiringDemo(toHiringAssumptions(losing), toHiringFixture(losing));
    expect(r.floorBreachWithoutHireMonth).not.toBeNull();
    const demo = runHiringDemo(HIRING_DEMO_FIXTURE.base, HIRING_DEMO_FIXTURE);
    expect(demo.floorBreachWithoutHireMonth).toBeNull();
  });

  it('a saved link round-trips every input', () => {
    const mine: HiringOwnInputs = { ...HIRING_OWN_DEFAULTS, startingClients: 7, avgMonthlyFee: 1250, grossMargin: 0.425, churnMonthly: 0.035 };
    expect(decodeHiringOwn(new URLSearchParams(encodeHiringOwn(mine)))).toEqual(mine);
  });

  it('ignores links that are not own-number links or are incomplete', () => {
    expect(decodeHiringOwn(new URLSearchParams('from=hero'))).toBeNull();
    expect(decodeHiringOwn(new URLSearchParams('own=1&c=5'))).toBeNull();
    expect(decodeHiringOwn(new URLSearchParams(encodeHiringOwn(HIRING_OWN_DEFAULTS).replace('fee=3000', 'fee=abc')))).toBeNull();
  });

  it('a bigger hire still gets a real boundary, not "holds across full range"', () => {
    const big: HiringOwnInputs = {
      ...HIRING_OWN_DEFAULTS,
      startingClients: 40, avgMonthlyFee: 8_000, hoursPerClientMonthly: 10, currentHoursMonthly: 400,
      hireAddsHoursMonthly: 150, hireMonthlyCost: 18_000, hireOneTimeCost: 15_000,
      startingCash: 250_000, fixedCostsMonthly: 160_000, cashFloor: 80_000, newClientsPerMonth: 1.5,
    };
    const search = hiringSearchFor(big);
    expect(search.hireMonthlyCost.max).toBeGreaterThanOrEqual(45_000);
    const cost = solveHiringRequiredToWork(toHiringAssumptions(big), toHiringFixture(big), search)
      .find((x) => x.lever === 'hireMonthlyCost')!;
    expect(cost.unbounded).toBe(false);
    expect(cost.threshold).not.toBeNull();
    const at = runHiringDemo({ ...toHiringAssumptions(big), hireMonthlyCost: cost.threshold! }, toHiringFixture(big));
    expect(at.holds).toBe(true);
  });
});
