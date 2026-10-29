import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { whatHasToBeTrue } from '@/lib/what-has-to-be-true';

// Buy-blockers #145/#68: the result led with a verdict label and six tabs.
// It now states the conditions the decision rests on, from the report's own numbers.
const base = {
  monthlyRevenue: 40000, monthlyProfit: 5000, breakEvenRevenue: 30000, breakEvenStatus: 'VALUE',
  costsInconsistent: false, paybackMonths: 14.2, runwayMonths: 36, planKillerHeadlines: ['Rent above 15% of revenue'],
};

describe('whatHasToBeTrue', () => {
  it('states break-even, cushion, payback and the risks', () => {
    expect(whatHasToBeTrue(base)).toEqual([
      'Revenue has to reach about $30,000 a month to break even. This plan assumes $40,000, so revenue can fall about 25% before it stops covering costs.',
      'The investment pays back in about 15 months, so the plan has to hold for that long.',
      'The risks that would break it have to stay under control: Rent above 15% of revenue.',
    ]);
  });

  it('names the shortfall and the funding gap', () => {
    const l = whatHasToBeTrue({ ...base, monthlyRevenue: 25000, runwayMonths: 8, planKillerHeadlines: [] });
    expect(l[0]).toMatch(/\$25,000, which is \$5,000 short/);
    expect(l[1]).toMatch(/lasts about 8\. The gap has to be funded/);
  });

  it('says nothing about break-even when costs do not reconcile, and handles losses', () => {
    const l = whatHasToBeTrue({ ...base, costsInconsistent: true, monthlyProfit: -1000, planKillerHeadlines: [] });
    expect(l).toEqual(['The base case loses money every month, so the investment does not pay back until revenue rises or costs fall.']);
  });

  it('the result screen renders it and no longer calls an implausible LTV:CAC healthy', () => {
    const src = readFileSync('src/components/analysis/AccuracyTransparentResults.tsx', 'utf8');
    expect(src).toMatch(/data-testid="what-has-to-be-true"/);
    expect(src).toMatch(/ltvCacReading\(metrics\.ltvCac\) === 'implausible'/);
  });
});
