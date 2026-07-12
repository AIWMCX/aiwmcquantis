/**
 * Contribution Margin & CVP — Handbook §19 Wave 1
 *
 * Tests the 3 golden cases named explicitly in
 * docs/WAVE1_CONTRIBUTION_MARGIN_CVP_FORMULA_CONTRACTS_2026-07-12.md,
 * plus the property tests and mutation-guard cases from the same contract.
 */
import { describe, it, expect } from 'vitest';
import { calculateCvp, type CvpInput } from '../financial/contribution-margin';

describe('golden case (a) — standard healthy business, hand-computed', () => {
  const input: CvpInput = {
    revenue: '10000',
    fixedCosts: '5000',
    variableCosts: '4000',
    unitsSold: '100',
    pricePerUnit: '100',
    operatingIncome: '1000', // revenue - variableCosts - fixedCosts = 10000-4000-5000
  };

  it('computes contribution per unit, total, and ratio correctly', () => {
    const r = calculateCvp(input);
    expect(r.status).toBe('VALUE');
    // price(100) - variableCostPerUnit(4000/100=40) = 60
    expect(r.contributionPerUnit).toBe('60');
    expect(r.totalContribution).toBe('6000');
    expect(r.contributionMarginRatio).toBe('0.6');
  });

  it('computes break-even units and revenue correctly', () => {
    const r = calculateCvp(input);
    expect(r.breakEven.status).toBe('VALUE');
    // 5000 / 60 = 83.33
    expect(r.breakEven.breakEvenUnits).toBe('83.33');
    // 5000 / 0.6 = 8333.33
    expect(r.breakEven.breakEvenRevenue).toBe('8333.33');
  });

  it('computes margin of safety correctly', () => {
    const r = calculateCvp(input);
    expect(r.marginOfSafety.status).toBe('VALUE');
    // 10000 - 8333.33 = 1666.67
    expect(r.marginOfSafety.amount).toBe('1666.67');
  });

  it('computes degree of operating leverage correctly', () => {
    const r = calculateCvp(input);
    expect(r.operatingLeverage.status).toBe('VALUE');
    // 6000 / 1000 = 6
    expect(r.operatingLeverage.degreeOfOperatingLeverage).toBe('6');
  });

  it('computes target-profit units when a target is supplied', () => {
    const r = calculateCvp({ ...input, targetOperatingProfit: '1000' });
    // (5000 + 1000) / 60 = 100
    expect(r.breakEven.targetProfitUnits).toBe('100');
  });
});

describe('golden case (b) — revenue is zero, never a divide-by-zero or sentinel', () => {
  it('returns null ratio with an explicit reason, not 999/Infinity/NaN', () => {
    const r = calculateCvp({
      revenue: '0',
      fixedCosts: '1000',
      variableCosts: '0',
      operatingIncome: '-1000',
    });
    expect(r.contributionMarginRatio).toBeNull();
    expect(r.reasonCode).toBe('ZERO_REVENUE_DENOMINATOR');
    expect(r.breakEven.status).toBe('INSUFFICIENT_INPUTS');
    // Explicitly assert the class of bug this whole module exists to prevent.
    expect(JSON.stringify(r)).not.toMatch(/\b999\b/);
    expect(JSON.stringify(r)).not.toMatch(/Infinity|NaN/);
  });
});

describe('golden case (c) — variable cost per unit exceeds price (genuine loss-leader)', () => {
  it('computes a negative contribution, warns, and marks break-even NOT_ACHIEVABLE', () => {
    const r = calculateCvp({
      revenue: '1000', // 100 units x $10
      fixedCosts: '500',
      variableCosts: '1500', // $15/unit variable cost > $10 price
      unitsSold: '100',
      pricePerUnit: '10',
      operatingIncome: '-1000',
    });
    expect(r.contributionPerUnit).toBe('-5');
    expect(r.warnings.some((w) => w.includes('negative'))).toBe(true);
    expect(r.breakEven.status).toBe('NOT_ACHIEVABLE');
    expect(r.breakEven.reasonCode).toBe('NON_POSITIVE_CONTRIBUTION_PER_UNIT');
    // Not achievable at any volume — must never report a fabricated break-even.
    expect(r.breakEven.breakEvenUnits).toBeNull();
  });
});

describe('degree of operating leverage — near-zero operating income guard', () => {
  it('returns NOT_MEANINGFUL instead of an unstable/huge DOL figure', () => {
    const r = calculateCvp({
      revenue: '10000',
      fixedCosts: '5000',
      variableCosts: '4000',
      operatingIncome: '10', // 0.1% of revenue, below the 0.5% threshold
    });
    expect(r.operatingLeverage.status).toBe('NOT_MEANINGFUL');
    expect(r.operatingLeverage.reasonCode).toBe('OPERATING_INCOME_NEAR_ZERO');
    expect(r.operatingLeverage.degreeOfOperatingLeverage).toBeNull();
  });
});

describe('invalid inputs', () => {
  it('rejects negative revenue', () => {
    const r = calculateCvp({ revenue: '-100', fixedCosts: '0', variableCosts: '0', operatingIncome: '0' });
    expect(r.status).toBe('INVALID_INPUTS');
    expect(r.reasonCode).toBe('NEGATIVE_REVENUE_OR_COST');
  });

  it('rejects non-numeric input rather than throwing', () => {
    const r = calculateCvp({ revenue: 'not-a-number', fixedCosts: '0', variableCosts: '0', operatingIncome: '0' });
    expect(r.status).toBe('INVALID_INPUTS');
  });
});

describe('property tests', () => {
  it('contributionMarginRatio is never greater than 1 across a range of cost structures', () => {
    for (let variablePct = 0; variablePct <= 1; variablePct += 0.05) {
      const revenue = 10000;
      const variableCosts = revenue * variablePct;
      const r = calculateCvp({
        revenue: String(revenue),
        fixedCosts: '2000',
        variableCosts: String(variableCosts),
        operatingIncome: '500',
      });
      if (r.contributionMarginRatio !== null) {
        expect(Number(r.contributionMarginRatio)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('increasing fixed costs cannot decrease break-even units (monotonicity)', () => {
    const base: CvpInput = {
      revenue: '10000',
      fixedCosts: '5000',
      variableCosts: '4000',
      unitsSold: '100',
      pricePerUnit: '100',
      operatingIncome: '1000',
    };
    const r1 = calculateCvp(base);
    const r2 = calculateCvp({ ...base, fixedCosts: '8000' });
    expect(Number(r2.breakEven.breakEvenUnits)).toBeGreaterThan(Number(r1.breakEven.breakEvenUnits));
  });

  it('breakEvenRevenue == breakEvenUnits × pricePerUnit (internal consistency)', () => {
    const r = calculateCvp({
      revenue: '10000',
      fixedCosts: '5000',
      variableCosts: '4000',
      unitsSold: '100',
      pricePerUnit: '100',
      operatingIncome: '1000',
    });
    const impliedRevenue = Number(r.breakEven.breakEvenUnits) * 100;
    expect(impliedRevenue).toBeCloseTo(Number(r.breakEven.breakEvenRevenue), 0);
  });
});

describe('mutation guard — the reference-image formula error must never resurface', () => {
  it('break-even units is FixedCosts / ContributionPerUnit, not FixedCosts + ContributionMargin', () => {
    const r = calculateCvp({
      revenue: '10000',
      fixedCosts: '5000',
      variableCosts: '4000',
      unitsSold: '100',
      pricePerUnit: '100',
      operatingIncome: '1000',
    });
    // The wrong formula (5000 + 60 = 5060) would be wildly different from
    // the correct answer (5000 / 60 = 83.33) — this test would catch either
    // a reintroduction of the error or a unit mismatch.
    expect(Number(r.breakEven.breakEvenUnits)).toBeCloseTo(83.33, 1);
    expect(Number(r.breakEven.breakEvenUnits)).not.toBeCloseTo(5060, 0);
  });
});
