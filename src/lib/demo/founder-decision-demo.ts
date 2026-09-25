/**
 * Founder "Break the Model" demo — derives every displayed number from the
 * canonical time-series engine (generate3YearPL / generateCashFlow /
 * calculateUnitEconomics). This module only aggregates engine output and
 * searches it; it does not compute revenue, costs, or cash itself.
 *
 * The decision is evaluated as a counterfactual: the same company is run with
 * and without the proposed campaign, and the difference is the investment.
 */
import {
  calculateUnitEconomics,
  generate3YearPL,
  generateCashFlow,
  type AcquisitionCampaign,
  type FinancialModelParams,
} from '@/lib/financial-engine';

export const FOUNDER_DEMO_VERSION = 'founder-demo-v1';

export interface FounderDemoAssumptions {
  cac: number;
  churnMonthly: number;
  price: number;
  grossMargin: number;
}

export interface FounderDemoFixture {
  version: string;
  startingCustomers: number;
  startingCash: number;
  fixedOpexMonthly: { salaries: number; rent: number; softwareAndTools: number; otherOpex: number };
  /** Paid acquisition the company already runs every month. */
  alwaysOnAcquisitionMonthly: number;
  decision: { totalSpend: number; startMonth: number; endMonth: number };
  criteria: { cashFloor: number; maxPaybackMonths: number };
  base: FounderDemoAssumptions;
}

export const FOUNDER_DEMO_FIXTURE: FounderDemoFixture = {
  version: FOUNDER_DEMO_VERSION,
  startingCustomers: 420,
  startingCash: 300_000,
  fixedOpexMonthly: { salaries: 22_000, rent: 2_500, softwareAndTools: 2_000, otherOpex: 1_500 },
  alwaysOnAcquisitionMonthly: 20_000,
  decision: { totalSpend: 120_000, startMonth: 1, endMonth: 3 },
  criteria: { cashFloor: 175_000, maxPaybackMonths: 18 },
  base: { cac: 1_180, churnMonthly: 0.041, price: 149, grossMargin: 0.81 },
};

export type FounderDemoFailure = 'cash_floor' | 'payback_too_slow' | 'no_payback';

export interface FounderDemoMonth {
  month: number;
  cashWith: number;
  cashWithout: number;
  customersWith: number;
  revenueWith: number;
  ebitdaWith: number;
}

export interface FounderDemoQuarter {
  label: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  revenue: number;
  grossProfit: number;
  opex: number;
  acquisitionSpend: number;
  operatingCashFlow: number;
  endingCash: number;
  endingCustomers: number;
}

export interface FounderDemoResult {
  months: FounderDemoMonth[];
  quarters: FounderDemoQuarter[];
  /** First month from which monthly EBITDA stays >= 0 through the horizon. */
  operatingBreakEvenMonth: number | null;
  /** First month the campaign's cumulative cash impact returns to >= 0. */
  paybackMonth: number | null;
  /** Lowest cash balance between the campaign start and payback (or horizon end). */
  lowestCash: number;
  lowestCashMonth: number;
  floorBreachMonth: number | null;
  holds: boolean;
  failures: FounderDemoFailure[];
  customersFromDecision: number;
  unitEconomics: { ltv: number; ltvCacRatio: number; cacPaybackMonths: number };
}

const HORIZON = 36;

function modelParams(
  fixture: FounderDemoFixture,
  a: FounderDemoAssumptions,
  withDecision: boolean,
): FinancialModelParams {
  const acquisition: AcquisitionCampaign[] = [
    { monthlySpend: fixture.alwaysOnAcquisitionMonthly, cac: a.cac, startMonth: 1, endMonth: HORIZON },
  ];
  if (withDecision) {
    const { totalSpend, startMonth, endMonth } = fixture.decision;
    acquisition.push({
      monthlySpend: totalSpend / (endMonth - startMonth + 1),
      cac: a.cac,
      startMonth,
      endMonth,
    });
  }
  return {
    acquisition,
    initialCustomers: fixture.startingCustomers,
    growthRateMoM: 0,
    marketSaturationPct: 1,
    addressableMarket: 1_000_000_000,
    avgTicketSize: a.price,
    grossMarginPct: a.grossMargin,
    churnRateMonthly: a.churnMonthly,
    upsellRevenuePct: 0,
    cogsPct: 1 - a.grossMargin,
    rent: fixture.fixedOpexMonthly.rent,
    salaries: fixture.fixedOpexMonthly.salaries,
    marketingSpend: 0,
    softwareAndTools: fixture.fixedOpexMonthly.softwareAndTools,
    otherOpex: fixture.fixedOpexMonthly.otherOpex,
    discountRefundPct: 0,
  };
}

function runScenario(fixture: FounderDemoFixture, a: FounderDemoAssumptions, withDecision: boolean) {
  const pl = generate3YearPL(modelParams(fixture, a, withDecision));
  const cf = generateCashFlow(pl, {
    initialInvestment: 0,
    externalFunding: fixture.startingCash,
    capitalExpenditures: [],
    workingCapitalReserve: 0,
  });
  return { pl, cf };
}

export function runFounderDemo(
  a: FounderDemoAssumptions,
  fixture: FounderDemoFixture = FOUNDER_DEMO_FIXTURE,
): FounderDemoResult {
  const withD = runScenario(fixture, a, true);
  const without = runScenario(fixture, a, false);

  const months: FounderDemoMonth[] = withD.pl.map((p, i) => ({
    month: p.month,
    cashWith: withD.cf[i].cumulativeCash,
    cashWithout: without.cf[i].cumulativeCash,
    customersWith: p.activeCustomers,
    revenueWith: p.netRevenue,
    ebitdaWith: p.ebitda,
  }));

  const quarters: FounderDemoQuarter[] = (['Q1', 'Q2', 'Q3', 'Q4'] as const).map((label, q) => {
    const slice = withD.pl.slice(q * 3, q * 3 + 3);
    const cfSlice = withD.cf.slice(q * 3, q * 3 + 3);
    const sum = (f: (p: (typeof slice)[number]) => number) => slice.reduce((s, p) => s + f(p), 0);
    return {
      label,
      revenue: sum((p) => p.netRevenue),
      grossProfit: sum((p) => p.grossProfit),
      opex: sum((p) => p.totalOpex),
      acquisitionSpend: sum((p) => p.marketingSpend),
      operatingCashFlow: cfSlice.reduce((s, c) => s + c.operatingCashFlow, 0),
      endingCash: cfSlice[cfSlice.length - 1].cumulativeCash,
      endingCustomers: slice[slice.length - 1].activeCustomers,
    };
  });

  let operatingBreakEvenMonth: number | null = null;
  for (let i = months.length - 1; i >= 0 && months[i].ebitdaWith >= 0; i--) {
    operatingBreakEvenMonth = months[i].month;
  }

  // Payback = first month at/after the campaign starts where its cumulative
  // cash impact (with-decision minus without) is >= 0. Covers both the
  // ordinary case (impact dips negative, then recovers) and the campaign
  // being net cash-positive from its very first month (impact never dips at
  // all -- that's payback in the campaign's own start month, not "no
  // payback"; the two are commercially opposite outcomes and must not share
  // a code path that only fires on a negative-to-positive transition).
  const { startMonth } = fixture.decision;
  let paybackMonth: number | null = null;
  for (const m of months) {
    if (m.month < startMonth) continue;
    if (m.cashWith - m.cashWithout >= 0) {
      paybackMonth = m.month;
      break;
    }
  }

  const windowEnd = paybackMonth ?? HORIZON;
  const window = months.filter((m) => m.month >= startMonth && m.month <= windowEnd);
  const lowest = window.reduce((lo, m) => (m.cashWith < lo.cashWith ? m : lo), window[0]);
  const breach = window.find((m) => m.cashWith < fixture.criteria.cashFloor);

  const failures: FounderDemoFailure[] = [];
  if (paybackMonth === null) failures.push('no_payback');
  else if (paybackMonth > fixture.criteria.maxPaybackMonths) failures.push('payback_too_slow');
  if (breach) failures.push('cash_floor');

  const ue = calculateUnitEconomics({
    avgTicketSize: a.price,
    grossMarginPct: a.grossMargin,
    churnRateMonthly: a.churnMonthly,
    cacBlended: a.cac,
    upsellRevenuePct: 0,
    discountRatePct: 0.1,
  });

  return {
    months,
    quarters,
    operatingBreakEvenMonth,
    paybackMonth,
    lowestCash: lowest.cashWith,
    lowestCashMonth: lowest.month,
    floorBreachMonth: breach ? breach.month : null,
    holds: failures.length === 0,
    failures,
    customersFromDecision: fixture.decision.totalSpend / a.cac,
    unitEconomics: { ltv: ue.ltv, ltvCacRatio: ue.ltvCacRatio, cacPaybackMonths: ue.cacPaybackMonths },
  };
}

type Lever = keyof FounderDemoAssumptions;

export const LEVER_SEARCH: Record<Lever, { min: number; max: number; tolerance: number; worseWhen: 'higher' | 'lower' }> = {
  cac: { min: 100, max: 10_000, tolerance: 1, worseWhen: 'higher' },
  churnMonthly: { min: 0.001, max: 0.3, tolerance: 0.0005, worseWhen: 'higher' },
  price: { min: 10, max: 1_000, tolerance: 1, worseWhen: 'lower' },
  grossMargin: { min: 0.1, max: 0.99, tolerance: 0.005, worseWhen: 'lower' },
};

export interface RequiredToWork {
  lever: Lever;
  /** Boundary value at which the decision still holds; null when it cannot hold anywhere in range. */
  threshold: number | null;
  /** True when the decision holds even at the most adverse end of the search range. */
  unbounded: boolean;
}

/**
 * For each lever, holding the others at `a`, finds the most adverse value at
 * which the decision still holds. Every lever is monotone in the engine
 * (higher CAC or churn, lower price or margin, can never improve cash), so
 * bisection is exact to `tolerance`.
 */
export function solveRequiredToWork(
  a: FounderDemoAssumptions,
  fixture: FounderDemoFixture = FOUNDER_DEMO_FIXTURE,
): RequiredToWork[] {
  return (Object.keys(LEVER_SEARCH) as Lever[]).map((lever) => {
    const { min, max, tolerance, worseWhen } = LEVER_SEARCH[lever];
    const holdsAt = (v: number) => runFounderDemo({ ...a, [lever]: v }, fixture).holds;
    const best = worseWhen === 'higher' ? min : max;
    const worst = worseWhen === 'higher' ? max : min;
    if (!holdsAt(best)) return { lever, threshold: null, unbounded: false };
    if (holdsAt(worst)) return { lever, threshold: worst, unbounded: true };
    let good = best;
    let bad = worst;
    while (Math.abs(bad - good) > tolerance) {
      const mid = (good + bad) / 2;
      if (holdsAt(mid)) good = mid;
      else bad = mid;
    }
    return { lever, threshold: good, unbounded: false };
  });
}
