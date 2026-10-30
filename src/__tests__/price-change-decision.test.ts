import { describe, it, expect } from 'vitest';
import {
  PRICE_CHANGE_EXAMPLE,
  decodePriceChange,
  encodePriceChange,
  runPriceChange,
  solvePriceRequiredToWork,
  validatePriceChange,
} from '@/lib/demo/price-change-decision';
import { isPriceDecision, isHiringDecision } from '@/lib/location-input';

describe('price-change decision (#106)', () => {
  it('the example is valid and the raise pays off', () => {
    expect(validatePriceChange(PRICE_CHANGE_EXAMPLE)).toEqual({});
    const r = runPriceChange(PRICE_CHANGE_EXAMPLE);
    expect(r.holds).toBe(true);
    expect(r.diffAtHorizon).toBeGreaterThan(0);
  });

  it('the rule of thumb is x / (m + x)', () => {
    const r = runPriceChange({ ...PRICE_CHANGE_EXAMPLE, priceChangePct: 0.2, grossMargin: 0.3 });
    expect(r.breakEvenClientLossPct).toBeCloseTo(0.4, 10);
  });

  it('with no lost clients and no change in new clients, a raise is always ahead', () => {
    const r = runPriceChange({ ...PRICE_CHANGE_EXAMPLE, clientsLostPct: 0, newClientChangePct: 0 });
    expect(r.aheadFromMonth).toBe(1);
    for (const m of r.months) expect(m.clientsWith).toBeCloseTo(m.clientsWithout, 6);
  });

  it('losing more clients than the break-even makes it fail', () => {
    const r = runPriceChange({ ...PRICE_CHANGE_EXAMPLE, clientsLostPct: 0.35 });
    expect(r.holds).toBe(false);
  });

  it('the client-loss boundary sits near the rule of thumb and is where it flips', () => {
    const lost = solvePriceRequiredToWork(PRICE_CHANGE_EXAMPLE).find((x) => x.lever === 'clientsLostPct')!;
    expect(lost.threshold).not.toBeNull();
    expect(Math.abs(lost.threshold! - runPriceChange(PRICE_CHANGE_EXAMPLE).breakEvenClientLossPct)).toBeLessThan(0.05);
    expect(runPriceChange({ ...PRICE_CHANGE_EXAMPLE, clientsLostPct: lost.threshold! }).holds).toBe(true);
    expect(runPriceChange({ ...PRICE_CHANGE_EXAMPLE, clientsLostPct: lost.threshold! + 0.01 }).holds).toBe(false);
  });

  it('a price cut needs more new clients to pay off', () => {
    const cut = { ...PRICE_CHANGE_EXAMPLE, priceChangePct: -0.2, clientsLostPct: 0, newClientChangePct: 0 };
    expect(runPriceChange(cut).holds).toBe(false);
    const win = solvePriceRequiredToWork(cut).find((x) => x.lever === 'newClientChangePct')!;
    expect(win.threshold === null || win.threshold > 0).toBe(true);
  });

  it('rejects impossible inputs', () => {
    const e = validatePriceChange({ ...PRICE_CHANGE_EXAMPLE, currentPrice: 0, grossMargin: 1, priceChangePct: 0, judgeAtMonth: 30 });
    expect(Object.keys(e).sort()).toEqual(['currentPrice', 'grossMargin', 'judgeAtMonth', 'priceChangePct']);
  });

  it('a saved link round-trips every input', () => {
    const mine = { ...PRICE_CHANGE_EXAMPLE, currentClients: 37, currentPrice: 249, priceChangePct: 0.125 };
    expect(decodePriceChange(new URLSearchParams(encodePriceChange(mine)))).toEqual(mine);
    expect(decodePriceChange(new URLSearchParams('from=hero'))).toBeNull();
  });

  it('routes price questions from the hero, and not hiring questions', () => {
    for (const q of ['Should I raise my prices by 15%?', 'increase our rates for new clients', 'Should we cut our monthly fee']) {
      expect(isPriceDecision(q)).toBe(true);
    }
    for (const q of ['Should I hire a second technician?', 'Open a coffee shop in Denver']) {
      expect(isPriceDecision(q)).toBe(false);
    }
    expect(isHiringDecision('Should I raise my prices by 15%?')).toBe(false);
  });
});
