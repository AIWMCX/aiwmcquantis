/**
 * "What has to be true" — the conditions a plan depends on, in plain numbers,
 * shown right under the verdict (buy-blockers #145/#68). The result used to
 * open on a verdict label and six tabs; a reader had to dig to learn which
 * numbers the decision actually rests on.
 *
 * Pure: every line is derived from figures the report already computed. No
 * new numbers, no advice beyond the arithmetic.
 */

export interface WhatHasToBeTrueInput {
  /** Base-case monthly revenue the plan assumes. */
  monthlyRevenue: number;
  /** Base-case monthly net profit (negative = loss). */
  monthlyProfit: number;
  /** CVP break-even revenue per month, when the engine produced one. */
  breakEvenRevenue: number | null;
  /** CVP status: 'VALUE' | 'NOT_ACHIEVABLE' | 'INSUFFICIENT_INPUTS'. */
  breakEvenStatus: string | null;
  /** True when the report's own costs do not reconcile to its profit. */
  costsInconsistent: boolean;
  /** Months for cumulative profit to recover the startup investment (>= 99 = never). */
  paybackMonths: number;
  /** Months of cash the plan shows. */
  runwayMonths: number;
  /** Headlines of the risks that would break the plan, most serious first. */
  planKillerHeadlines: string[];
}

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export function whatHasToBeTrue(i: WhatHasToBeTrueInput): string[] {
  const lines: string[] = [];

  if (!i.costsInconsistent && i.breakEvenStatus === 'VALUE' && i.breakEvenRevenue !== null && i.breakEvenRevenue > 0) {
    const be = i.breakEvenRevenue;
    const base = `Revenue has to reach about ${usd(be)} a month to break even.`;
    if (i.monthlyRevenue >= be) {
      const cushion = Math.round((1 - be / Math.max(i.monthlyRevenue, 1)) * 100);
      lines.push(`${base} This plan assumes ${usd(i.monthlyRevenue)}, so revenue can fall about ${cushion}% before it stops covering costs.`);
    } else {
      lines.push(`${base} This plan assumes ${usd(i.monthlyRevenue)}, which is ${usd(be - i.monthlyRevenue)} short.`);
    }
  } else if (!i.costsInconsistent && i.breakEvenStatus === 'NOT_ACHIEVABLE') {
    lines.push('At these margins no level of sales covers the fixed costs. Prices or costs have to change first.');
  }

  if (i.monthlyProfit <= 0) {
    lines.push('The base case loses money every month, so the investment does not pay back until revenue rises or costs fall.');
  } else if (i.paybackMonths < 99) {
    const p = Math.ceil(i.paybackMonths);
    if (i.runwayMonths >= p) {
      lines.push(`The investment pays back in about ${p} months, so the plan has to hold for that long.`);
    } else {
      lines.push(`The investment pays back in about ${p} months, but the cash shown lasts about ${i.runwayMonths}. The gap has to be funded.`);
    }
  }

  const killers = i.planKillerHeadlines.filter(Boolean).slice(0, 2);
  if (killers.length > 0) {
    lines.push(`The risks that would break it have to stay under control: ${killers.join('; ')}.`);
  }

  return lines;
}
