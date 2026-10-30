import { describe, it, expect } from 'vitest';
import {
  LOCATION_EXAMPLE,
  decodeLocation,
  encodeLocation,
  runLocation,
  solveLocationRequiredToWork,
  validateLocation,
} from '@/lib/demo/second-location-decision';

describe('second-location decision (#106)', () => {
  it('the example is valid, pays back late, and keeps cash above the floor', () => {
    expect(validateLocation(LOCATION_EXAMPLE)).toEqual({});
    const r = runLocation(LOCATION_EXAMPLE);
    expect(r.holds).toBe(true);
    expect(r.paybackMonth).not.toBeNull();
    expect(r.paybackMonth!).toBeGreaterThan(12);
    expect(r.lowestCash).toBeGreaterThanOrEqual(LOCATION_EXAMPLE.cashFloor);
  });

  it('the opening cost leaves the bank in month 1', () => {
    const r = runLocation(LOCATION_EXAMPLE);
    const m1 = r.months[0];
    expect(m1.cashWithout - m1.cashWith).toBeGreaterThan(LOCATION_EXAMPLE.openingCost * 0.95);
  });

  it('capacity is the ceiling: one location never serves more than it can', () => {
    const r = runLocation(LOCATION_EXAMPLE);
    for (const m of r.months) {
      expect(m.clientsWithout).toBeLessThanOrEqual(LOCATION_EXAMPLE.capacityFirst + 1e-6);
      expect(m.clientsWith).toBeLessThanOrEqual(LOCATION_EXAMPLE.capacityFirst + LOCATION_EXAMPLE.capacitySecond + 1e-6);
    }
    expect(r.firstFullMonth).not.toBeNull();
  });

  it('full cannibalization means no extra clients, so it never pays back', () => {
    const r = runLocation({ ...LOCATION_EXAMPLE, cannibalizationPct: 1 });
    expect(r.paybackMonth).toBeNull();
    expect(r.holds).toBe(false);
  });

  it('a slower ramp pays back later', () => {
    const fast = runLocation({ ...LOCATION_EXAMPLE, rampMonths: 0 });
    const slow = runLocation({ ...LOCATION_EXAMPLE, rampMonths: 12 });
    expect(fast.diffAtHorizon).toBeGreaterThan(slow.diffAtHorizon);
  });

  it('too little cash breaks the floor even when it pays back', () => {
    const r = runLocation({ ...LOCATION_EXAMPLE, startingCash: 60_000 });
    expect(r.lowestCash).toBeLessThan(LOCATION_EXAMPLE.cashFloor);
    expect(r.holds).toBe(false);
  });

  it('each boundary is where the verdict flips', () => {
    for (const x of solveLocationRequiredToWork(LOCATION_EXAMPLE)) {
      expect(x.threshold).not.toBeNull();
      expect(x.unbounded).toBe(false);
      const t = x.threshold!;
      const worse = x.lever === 'newClientsSecond' ? t - 0.2 : x.lever === 'cannibalizationPct' ? t + 0.01 : t * 1.02 + 50;
      expect(runLocation({ ...LOCATION_EXAMPLE, [x.lever]: t }).holds).toBe(true);
      expect(runLocation({ ...LOCATION_EXAMPLE, [x.lever]: worse }).holds).toBe(false);
    }
  });

  it('rejects impossible inputs', () => {
    const e = validateLocation({ ...LOCATION_EXAMPLE, currentClients: 300, grossMargin: 1, cannibalizationPct: 1.2, judgeAtMonth: 40 });
    expect(Object.keys(e).sort()).toEqual(['cannibalizationPct', 'currentClients', 'grossMargin', 'judgeAtMonth']);
  });

  it('a saved link round-trips every input', () => {
    const mine = { ...LOCATION_EXAMPLE, openingCost: 145_500, cannibalizationPct: 0.125, rampMonths: 9 };
    expect(decodeLocation(new URLSearchParams(encodeLocation(mine)))).toEqual(mine);
    expect(decodeLocation(new URLSearchParams('from=hero'))).toBeNull();
  });
});
