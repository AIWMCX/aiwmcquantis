/**
 * Second-location decision (buy-blockers #106): "Should I open a second location?"
 *
 * Two runs of the canonical engine (generate3YearPL + generateCashFlow), with
 * and without the second location, over 36 months. The location adds capacity
 * (clients it can serve), a one-off opening cost, its own monthly fixed costs
 * and its own new clients, which ramp up linearly to full rate. Some of those
 * new clients would have come to the first location anyway (cannibalization),
 * so only the rest count as extra. Capacity is pooled: a client turned away at
 * a full first location can be served at the second.
 */
import { generate3YearPL, generateCashFlow, type AcquisitionCampaign, type FinancialModelParams } from '@/lib/financial-engine';

export const LOCATION_VERSION = 'second-location-v1';
export const LOCATION_HORIZON = 36;

export interface LocationInputs {
  /** First location today. */
  currentClients: number;
  /** Average monthly revenue per client. */
  pricePerClient: number;
  grossMargin: number;
  churnMonthly: number;
  newClientsPerMonth: number;
  /** Most clients the first location can serve at once. */
  capacityFirst: number;
  fixedCostsMonthly: number;
  startingCash: number;
  /** The second location. */
  openingCost: number;
  extraFixedMonthly: number;
  capacitySecond: number;
  /** New clients per month at the second location once ramped up. */
  newClientsSecond: number;
  /** Months to reach that rate (linear ramp; 0 = from month 1). */
  rampMonths: number;
  /** Share of the second location's new clients who would have come to the first anyway (0-1). */
  cannibalizationPct: number;
  /** The second location must be ahead (cumulative cash) by this month. */
  judgeAtMonth: number;
  /** Cash must never fall below this. */
  cashFloor: number;
}

export type LocationField = keyof LocationInputs;

export const LOCATION_EXAMPLE: LocationInputs = {
  currentClients: 180,
  pricePerClient: 120,
  grossMargin: 0.55,
  churnMonthly: 0.04,
  newClientsPerMonth: 12,
  capacityFirst: 220,
  fixedCostsMonthly: 9_000,
  startingCash: 120_000,
  openingCost: 80_000,
  extraFixedMonthly: 6_000,
  capacitySecond: 200,
  newClientsSecond: 14,
  rampMonths: 6,
  cannibalizationPct: 0.2,
  judgeAtMonth: 36,
  cashFloor: 10_000,
};

const UNIT = 1; // acquisition spend is only a device to inject N new clients/month (as in the hiring demo)

function campaigns(i: LocationInputs, withSecond: boolean): AcquisitionCampaign[] {
  const out: AcquisitionCampaign[] = [];
  if (i.newClientsPerMonth > 0) {
    out.push({ monthlySpend: i.newClientsPerMonth * UNIT, cac: UNIT, startMonth: 1, endMonth: LOCATION_HORIZON });
  }
  if (!withSecond) return out;
  const extra = i.newClientsSecond * (1 - i.cannibalizationPct);
  if (extra <= 0) return out;
  const ramp = Math.max(0, Math.round(i.rampMonths));
  for (let m = 1; m <= ramp; m++) {
    out.push({ monthlySpend: (extra * m) / (ramp + 1) * UNIT, cac: UNIT, startMonth: m, endMonth: m });
  }
  out.push({ monthlySpend: extra * UNIT, cac: UNIT, startMonth: ramp + 1, endMonth: LOCATION_HORIZON });
  return out;
}

function params(i: LocationInputs, withSecond: boolean): FinancialModelParams {
  const cogsPct = 1 - i.grossMargin;
  return {
    initialCustomers: Math.min(i.currentClients, i.capacityFirst),
    growthRateMoM: 0,
    marketSaturationPct: 1,
    addressableMarket: 1_000_000_000,
    avgTicketSize: i.pricePerClient,
    grossMarginPct: i.grossMargin,
    churnRateMonthly: i.churnMonthly,
    upsellRevenuePct: 0,
    cogsPct,
    rent: 0,
    salaries: i.fixedCostsMonthly + (withSecond ? i.extraFixedMonthly : 0),
    marketingSpend: 0,
    softwareAndTools: 0,
    otherOpex: 0,
    discountRefundPct: 0,
    acquisition: campaigns(i, withSecond),
    // Capacity in clients: one "hour" per client.
    capacity: {
      hoursPerCustomerMonthly: 1,
      availableHoursMonthly: i.capacityFirst + (withSecond ? i.capacitySecond : 0),
    },
  };
}

function scenario(i: LocationInputs, withSecond: boolean) {
  const pl = generate3YearPL(params(i, withSecond)).slice(0, LOCATION_HORIZON);
  const cf = generateCashFlow(pl, {
    initialInvestment: 0,
    externalFunding: i.startingCash,
    capitalExpenditures: withSecond && i.openingCost > 0
      ? [{ month: 1, amount: i.openingCost, description: 'Second location opening cost' }]
      : [],
    workingCapitalReserve: 0,
  });
  return { pl, cash: cf.map((c) => c.cumulativeCash) };
}

export interface LocationMonth {
  month: number;
  cashWith: number;
  cashWithout: number;
  clientsWith: number;
  clientsWithout: number;
}

export interface LocationResult {
  months: LocationMonth[];
  /** First month the second location is ahead on cumulative cash and stays ahead (null = never in 36 months). */
  paybackMonth: number | null;
  diffAtJudge: number;
  diffAtHorizon: number;
  /** Lowest cash with the second location, and when. */
  lowestCash: number;
  lowestCashMonth: number;
  /** Month the first location alone hits its capacity (null = never). */
  firstFullMonth: number | null;
  holds: boolean;
}

export function runLocation(i: LocationInputs): LocationResult {
  const w = scenario(i, true);
  const wo = scenario(i, false);
  const months: LocationMonth[] = w.pl.map((p, k) => ({
    month: p.month,
    cashWith: w.cash[k],
    cashWithout: wo.cash[k],
    clientsWith: p.activeCustomers,
    clientsWithout: wo.pl[k].activeCustomers,
  }));

  let paybackMonth: number | null = null;
  for (let k = months.length - 1; k >= 0; k--) {
    if (months[k].cashWith - months[k].cashWithout >= 0) paybackMonth = months[k].month;
    else break;
  }

  let lowest = months[0];
  for (const m of months) if (m.cashWith < lowest.cashWith) lowest = m;
  const lowestCash = Math.min(i.startingCash, lowest.cashWith);

  const full = months.find((m) => m.clientsWithout >= i.capacityFirst - 1e-6);
  const judge = months[Math.min(months.length, Math.max(1, Math.round(i.judgeAtMonth))) - 1];
  const last = months[months.length - 1];
  const diffAtJudge = judge.cashWith - judge.cashWithout;

  return {
    months,
    paybackMonth,
    diffAtJudge,
    diffAtHorizon: last.cashWith - last.cashWithout,
    lowestCash,
    lowestCashMonth: lowestCash === i.startingCash && lowest.cashWith >= i.startingCash ? 0 : lowest.month,
    firstFullMonth: full ? full.month : null,
    holds: diffAtJudge >= 0 && lowestCash >= i.cashFloor,
  };
}

/** Levers whose boundary is shown under "What must be true". */
export type LocationLever = 'newClientsSecond' | 'openingCost' | 'cannibalizationPct' | 'extraFixedMonthly';

export function locationLeverSearch(i: LocationInputs): Record<LocationLever, { min: number; max: number; tolerance: number; worseWhen: 'higher' | 'lower' }> {
  return {
    newClientsSecond: { min: 0, max: Math.max(50, i.newClientsSecond * 4), tolerance: 0.05, worseWhen: 'lower' },
    openingCost: { min: 0, max: Math.max(500_000, i.openingCost * 4), tolerance: 100, worseWhen: 'higher' },
    cannibalizationPct: { min: 0, max: 1, tolerance: 0.002, worseWhen: 'higher' },
    extraFixedMonthly: { min: 0, max: Math.max(50_000, i.extraFixedMonthly * 4), tolerance: 10, worseWhen: 'higher' },
  };
}

export interface LocationRequiredToWork {
  lever: LocationLever;
  threshold: number | null;
  unbounded: boolean;
}

/** Bisection per lever, as in the hiring and price demos (the verdict is monotone in each). */
export function solveLocationRequiredToWork(i: LocationInputs): LocationRequiredToWork[] {
  const search = locationLeverSearch(i);
  return (Object.keys(search) as LocationLever[]).map((lever) => {
    const { min, max, tolerance, worseWhen } = search[lever];
    const holdsAt = (v: number) => runLocation({ ...i, [lever]: v }).holds;
    const best = worseWhen === 'higher' ? min : max;
    const worst = worseWhen === 'higher' ? max : min;
    if (!holdsAt(best)) return { lever, threshold: null, unbounded: false };
    if (holdsAt(worst)) return { lever, threshold: worst, unbounded: true };
    let good = best;
    let bad = worst;
    while (Math.abs(bad - good) > tolerance) {
      const mid = (good + bad) / 2;
      if (holdsAt(mid)) good = mid; else bad = mid;
    }
    return { lever, threshold: good, unbounded: false };
  });
}

export function validateLocation(i: LocationInputs): Partial<Record<LocationField, string>> {
  const e: Partial<Record<LocationField, string>> = {};
  for (const k of Object.keys(i) as LocationField[]) if (!Number.isFinite(i[k])) e[k] = 'Enter a number.';
  if (!e.pricePerClient && i.pricePerClient <= 0) e.pricePerClient = 'Must be more than 0.';
  if (!e.grossMargin && (i.grossMargin <= 0 || i.grossMargin >= 1)) e.grossMargin = 'Between 1% and 99%.';
  if (!e.churnMonthly && (i.churnMonthly < 0 || i.churnMonthly >= 1)) e.churnMonthly = 'Between 0% and 99%.';
  if (!e.capacityFirst && i.capacityFirst <= 0) e.capacityFirst = 'Must be more than 0.';
  if (!e.capacitySecond && i.capacitySecond <= 0) e.capacitySecond = 'Must be more than 0.';
  for (const k of ['currentClients', 'newClientsPerMonth', 'fixedCostsMonthly', 'startingCash', 'openingCost', 'extraFixedMonthly', 'newClientsSecond', 'cashFloor'] as LocationField[]) {
    if (!e[k] && i[k] < 0) e[k] = 'Cannot be negative.';
  }
  if (!e.currentClients && !e.capacityFirst && i.currentClients > i.capacityFirst) e.currentClients = 'More than the first location can serve.';
  if (!e.rampMonths && (i.rampMonths < 0 || i.rampMonths > 24)) e.rampMonths = 'Between 0 and 24.';
  if (!e.cannibalizationPct && (i.cannibalizationPct < 0 || i.cannibalizationPct > 1)) e.cannibalizationPct = 'Between 0% and 100%.';
  if (!e.judgeAtMonth && (i.judgeAtMonth < 1 || i.judgeAtMonth > LOCATION_HORIZON)) e.judgeAtMonth = `Between 1 and ${LOCATION_HORIZON}.`;
  return e;
}

const KEYS: Record<LocationField, string> = {
  currentClients: 'c', pricePerClient: 'p', grossMargin: 'gm', churnMonthly: 'churn',
  newClientsPerMonth: 'new', capacityFirst: 'cap', fixedCostsMonthly: 'fix', startingCash: 'cash',
  openingCost: 'open', extraFixedMonthly: 'fix2', capacitySecond: 'cap2', newClientsSecond: 'new2',
  rampMonths: 'ramp', cannibalizationPct: 'cann', judgeAtMonth: 'by', cashFloor: 'floor',
};
export const LOCATION_FIELDS = Object.keys(KEYS) as LocationField[];

export function encodeLocation(i: LocationInputs): string {
  const p = new URLSearchParams({ own: '1' });
  for (const k of LOCATION_FIELDS) p.set(KEYS[k], String(Math.round(i[k] * 10_000) / 10_000));
  return p.toString();
}

export function decodeLocation(params: URLSearchParams): LocationInputs | null {
  if (params.get('own') !== '1') return null;
  const out = {} as LocationInputs;
  for (const k of LOCATION_FIELDS) {
    const raw = params.get(KEYS[k]);
    if (raw === null || raw.trim() === '') return null;
    const v = Number(raw);
    if (!Number.isFinite(v)) return null;
    out[k] = v;
  }
  return out;
}
