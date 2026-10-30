/**
 * Hiring decision demo: "Can the business carry another employee before
 * demand catches up?"
 *
 * A services business is at delivery capacity. Hiring adds delivery hours
 * immediately and payroll immediately; revenue only follows as new clients
 * arrive to fill those hours. Without the hire, demand above capacity is
 * simply not served.
 *
 * Like the founder and consultant demos, revenue, customers, P&L and cash all
 * come from the canonical engine (generate3YearPL + generateCashFlow, with its
 * capacity constraint). The one layer added here is collection timing: the
 * engine books revenue in the month it is earned, so we hold back the growth
 * in receivables. Customers pay `collectionLagMonths` after the work, and
 * the receivables already outstanding at the start are carried as-is, so
 * only *new* revenue growth ties up cash. That is plain bookkeeping on the
 * engine's own netRevenue, not a second revenue model.
 */
import { generate3YearPL, generateCashFlow, type FinancialModelParams } from '@/lib/financial-engine';

export const HIRING_DEMO_VERSION = 'hiring-demo-v1';

export interface HiringDemoAssumptions {
  /** New client inquiries the business can win per month (demand). */
  newClientsPerMonth: number;
  /** Fully loaded monthly cost of the new hire (salary + taxes + benefits + tools). */
  hireMonthlyCost: number;
  /** Months between doing the work and getting paid (0 = paid on delivery). */
  collectionLagMonths: number;
  /** Gross margin on client work. */
  grossMargin: number;
}

export interface HiringDemoFixture {
  version: string;
  startingClients: number;
  /** Monthly revenue per client. */
  avgMonthlyFee: number;
  churnMonthly: number;
  hoursPerClientMonthly: number;
  /** Delivery hours available today (the team is already full). */
  currentHoursMonthly: number;
  /** Productive client hours the new hire adds per month. */
  hireAddsHoursMonthly: number;
  /** One-time recruiting + onboarding cost in month 1. */
  hireOneTimeCost: number;
  startingCash: number;
  fixedOpexMonthly: { salaries: number; rent: number; softwareAndTools: number; otherOpex: number };
  criteria: { cashFloor: number; maxPaybackMonths: number };
  base: HiringDemoAssumptions;
}

export const HIRING_DEMO_FIXTURE: HiringDemoFixture = {
  version: HIRING_DEMO_VERSION,
  // At capacity on day one: 180 h / 10 h per client = 18 clients.
  startingClients: 18,
  avgMonthlyFee: 3_000,
  churnMonthly: 0.02,
  hoursPerClientMonthly: 10,
  currentHoursMonthly: 180,
  hireAddsHoursMonthly: 140,
  hireOneTimeCost: 4_000,
  startingCash: 60_000,
  fixedOpexMonthly: { salaries: 24_000, rent: 2_500, softwareAndTools: 700, otherOpex: 1_300 },
  criteria: { cashFloor: 20_000, maxPaybackMonths: 12 },
  base: { newClientsPerMonth: 1.5, hireMonthlyCost: 6_500, collectionLagMonths: 1, grossMargin: 0.55 },
};

export const HORIZON = 18;

function params(f: HiringDemoFixture, a: HiringDemoAssumptions, withHire: boolean): FinancialModelParams {
  const unit = 1; // acquisition spend is only a device to inject N new clients/month
  return {
    initialCustomers: f.startingClients,
    growthRateMoM: 0,
    marketSaturationPct: 1,
    addressableMarket: 1_000_000_000,
    avgTicketSize: f.avgMonthlyFee,
    grossMarginPct: a.grossMargin,
    churnRateMonthly: f.churnMonthly,
    upsellRevenuePct: 0,
    cogsPct: 1 - a.grossMargin,
    rent: f.fixedOpexMonthly.rent,
    salaries: f.fixedOpexMonthly.salaries + (withHire ? a.hireMonthlyCost : 0),
    marketingSpend: 0,
    softwareAndTools: f.fixedOpexMonthly.softwareAndTools,
    otherOpex: f.fixedOpexMonthly.otherOpex,
    discountRefundPct: 0,
    acquisition: a.newClientsPerMonth > 0
      ? [{ monthlySpend: a.newClientsPerMonth * unit, cac: unit, startMonth: 1, endMonth: 36 }]
      : [],
    capacity: {
      hoursPerCustomerMonthly: f.hoursPerClientMonthly,
      availableHoursMonthly: f.currentHoursMonthly + (withHire ? f.hireAddsHoursMonthly : 0),
    },
  };
}

export interface HiringDemoMonth {
  month: number;
  cashWith: number;
  cashWithout: number;
  clientsWith: number;
  clientsWithout: number;
  revenueWith: number;
  /** Share of the hire's added hours actually filled by clients this month. */
  hireUtilization: number;
}

export type HiringDemoFailure = 'cash_floor' | 'payback_too_slow' | 'no_payback';

export interface HiringDemoResult {
  months: HiringDemoMonth[];
  /** First month the hire's cumulative cash impact is >= 0 (null = not within the horizon). */
  paybackMonth: number | null;
  lowestCash: number;
  lowestCashMonth: number;
  floorBreachMonth: number | null;
  /** First month cash breaks the floor even WITHOUT the hire (null = it never does).
   *  When set, the hire is not the only problem. */
  floorBreachWithoutHireMonth: number | null;
  /** Clients needed just to cover the hire's monthly cost at this margin. */
  clientsToCoverHire: number;
  /** Revenue needed per month just to cover the hire (cost ÷ margin). */
  revenueToCoverHire: number;
  holds: boolean;
  failures: HiringDemoFailure[];
}

function scenario(f: HiringDemoFixture, a: HiringDemoAssumptions, withHire: boolean) {
  const pl = generate3YearPL(params(f, a, withHire)).slice(0, HORIZON);
  const cf = generateCashFlow(pl, {
    initialInvestment: 0,
    externalFunding: f.startingCash,
    capitalExpenditures: withHire ? [{ month: 1, amount: f.hireOneTimeCost, description: 'Recruiting and onboarding' }] : [],
    workingCapitalReserve: 0,
  });
  // Collection timing: receivables = revenue of the last `lag` months.
  // Receivables before month 1 reflect the steady-state starting book, so
  // only revenue growth beyond it ties up cash.
  const lag = Math.max(0, Math.round(a.collectionLagMonths));
  const baseRevenue = f.startingClients * f.avgMonthlyFee;
  const rev = pl.map((p) => p.netRevenue);
  const receivablesAt = (i: number) => {
    let s = 0;
    for (let k = i - lag + 1; k <= i; k++) s += k >= 0 ? rev[k] : baseRevenue;
    return s;
  };
  const startingReceivables = lag * baseRevenue;
  const cash = cf.map((c, i) => c.cumulativeCash - (receivablesAt(i) - startingReceivables));
  return { pl, cash };
}

export function runHiringDemo(a: HiringDemoAssumptions, f: HiringDemoFixture = HIRING_DEMO_FIXTURE): HiringDemoResult {
  const w = scenario(f, a, true);
  const wo = scenario(f, a, false);

  const months: HiringDemoMonth[] = w.pl.map((p, i) => {
    const extraClients = Math.max(0, p.activeCustomers - f.currentHoursMonthly / f.hoursPerClientMonthly);
    return {
      month: p.month,
      cashWith: w.cash[i],
      cashWithout: wo.cash[i],
      clientsWith: p.activeCustomers,
      clientsWithout: wo.pl[i].activeCustomers,
      revenueWith: p.netRevenue,
      hireUtilization: Math.min(1, (extraClients * f.hoursPerClientMonthly) / f.hireAddsHoursMonthly),
    };
  });

  let paybackMonth: number | null = null;
  for (const m of months) {
    if (m.cashWith - m.cashWithout >= 0) { paybackMonth = m.month; break; }
  }

  const lowest = months.reduce((lo, m) => (m.cashWith < lo.cashWith ? m : lo), months[0]);
  const breach = months.find((m) => m.cashWith < f.criteria.cashFloor);
  const breachWithout = months.find((m) => m.cashWithout < f.criteria.cashFloor);

  const failures: HiringDemoFailure[] = [];
  if (paybackMonth === null) failures.push('no_payback');
  else if (paybackMonth > f.criteria.maxPaybackMonths) failures.push('payback_too_slow');
  if (breach) failures.push('cash_floor');

  const revenueToCoverHire = a.hireMonthlyCost / a.grossMargin;
  return {
    months,
    paybackMonth,
    lowestCash: lowest.cashWith,
    lowestCashMonth: lowest.month,
    floorBreachMonth: breach ? breach.month : null,
    floorBreachWithoutHireMonth: breachWithout ? breachWithout.month : null,
    clientsToCoverHire: revenueToCoverHire / f.avgMonthlyFee,
    revenueToCoverHire,
    holds: failures.length === 0,
    failures,
  };
}

type Lever = keyof HiringDemoAssumptions;

export const HIRING_LEVER_SEARCH: Record<Lever, { min: number; max: number; tolerance: number; worseWhen: 'higher' | 'lower' }> = {
  newClientsPerMonth: { min: 0, max: 6, tolerance: 0.05, worseWhen: 'lower' },
  hireMonthlyCost: { min: 3_000, max: 15_000, tolerance: 25, worseWhen: 'higher' },
  collectionLagMonths: { min: 0, max: 4, tolerance: 1, worseWhen: 'higher' },
  grossMargin: { min: 0.2, max: 0.9, tolerance: 0.005, worseWhen: 'lower' },
};

export interface HiringRequiredToWork {
  lever: Lever;
  threshold: number | null;
  unbounded: boolean;
}

/** Same bisection as the founder demo: each lever is monotone in cash. */
export function solveHiringRequiredToWork(
  a: HiringDemoAssumptions,
  f: HiringDemoFixture = HIRING_DEMO_FIXTURE,
  search: typeof HIRING_LEVER_SEARCH = HIRING_LEVER_SEARCH,
): HiringRequiredToWork[] {
  return (Object.keys(search) as Lever[]).map((lever) => {
    const { min, max, tolerance, worseWhen } = search[lever];
    const norm = (v: number) => (lever === 'collectionLagMonths' ? Math.round(v) : v);
    const holdsAt = (v: number) => runHiringDemo({ ...a, [lever]: norm(v) }, f).holds;
    const best = worseWhen === 'higher' ? min : max;
    const worst = worseWhen === 'higher' ? max : min;
    if (!holdsAt(best)) return { lever, threshold: null, unbounded: false };
    if (holdsAt(worst)) return { lever, threshold: worst, unbounded: true };
    if (lever === 'collectionLagMonths') {
      let t = min;
      for (let v = min; v <= max; v++) { if (holdsAt(v)) t = v; else break; }
      return { lever, threshold: t, unbounded: false };
    }
    let good = best;
    let bad = worst;
    while (Math.abs(bad - good) > tolerance) {
      const mid = (good + bad) / 2;
      if (holdsAt(mid)) good = mid; else bad = mid;
    }
    return { lever, threshold: good, unbounded: false };
  });
}
