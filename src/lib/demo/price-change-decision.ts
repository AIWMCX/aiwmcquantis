/**
 * Price-change decision (buy-blockers #106): "Should I raise (or cut) my price?"
 *
 * Two runs of the canonical engine (generate3YearPL + generateCashFlow), with
 * and without the change, over the same 18 months. The change moves the
 * price; it can also lose some clients at once and change how many new
 * clients are won each month. The cost of serving a client stays the same in
 * dollars, so the margin per client moves with the price. Nothing here is a
 * second revenue model: the engine computes customers, revenue and cash.
 */
import { generate3YearPL, generateCashFlow, type FinancialModelParams } from '@/lib/financial-engine';

export const PRICE_CHANGE_VERSION = 'price-change-v1';
export const PRICE_HORIZON = 18;

export interface PriceChangeInputs {
  currentClients: number;
  /** Average monthly price per client today. */
  currentPrice: number;
  /** Gross margin at today's price (0-1). */
  grossMargin: number;
  churnMonthly: number;
  newClientsPerMonth: number;
  fixedCostsMonthly: number;
  startingCash: number;
  /** The change, as a fraction: 0.15 = +15%, -0.1 = -10%. */
  priceChangePct: number;
  /** Share of current clients who leave because of the change (0-1). */
  clientsLostPct: number;
  /** Change in new clients won per month: -0.2 = 20% fewer, 0.3 = 30% more. */
  newClientChangePct: number;
  /** The change must be ahead (cumulative cash) by this month. */
  judgeAtMonth: number;
}

export type PriceField = keyof PriceChangeInputs;

export const PRICE_CHANGE_EXAMPLE: PriceChangeInputs = {
  currentClients: 120,
  currentPrice: 80,
  grossMargin: 0.6,
  churnMonthly: 0.03,
  newClientsPerMonth: 6,
  fixedCostsMonthly: 4_500,
  startingCash: 15_000,
  priceChangePct: 0.15,
  clientsLostPct: 0.05,
  newClientChangePct: -0.1,
  judgeAtMonth: 6,
};

function params(i: PriceChangeInputs, withChange: boolean): FinancialModelParams {
  const price = withChange ? i.currentPrice * (1 + i.priceChangePct) : i.currentPrice;
  // Serving a client costs the same dollars after the change.
  const costPerClient = i.currentPrice * (1 - i.grossMargin);
  const cogsPct = Math.min(1, Math.max(0, costPerClient / price));
  const clients = withChange ? i.currentClients * (1 - i.clientsLostPct) : i.currentClients;
  const newPerMonth = withChange ? i.newClientsPerMonth * (1 + i.newClientChangePct) : i.newClientsPerMonth;
  const unit = 1; // acquisition spend is only a device to inject N new clients/month (as in the hiring demo)
  return {
    initialCustomers: clients,
    growthRateMoM: 0,
    marketSaturationPct: 1,
    addressableMarket: 1_000_000_000,
    avgTicketSize: price,
    grossMarginPct: 1 - cogsPct,
    churnRateMonthly: i.churnMonthly,
    upsellRevenuePct: 0,
    cogsPct,
    rent: 0,
    salaries: i.fixedCostsMonthly,
    marketingSpend: 0,
    softwareAndTools: 0,
    otherOpex: 0,
    discountRefundPct: 0,
    acquisition: newPerMonth > 0
      ? [{ monthlySpend: newPerMonth * unit, cac: unit, startMonth: 1, endMonth: 36 }]
      : [],
  };
}

function scenario(i: PriceChangeInputs, withChange: boolean) {
  const pl = generate3YearPL(params(i, withChange)).slice(0, PRICE_HORIZON);
  const cf = generateCashFlow(pl, { initialInvestment: 0, externalFunding: i.startingCash, capitalExpenditures: [], workingCapitalReserve: 0 });
  return { pl, cash: cf.map((c) => c.cumulativeCash) };
}

export interface PriceChangeMonth {
  month: number;
  cashWith: number;
  cashWithout: number;
  clientsWith: number;
  clientsWithout: number;
  grossProfitWith: number;
  grossProfitWithout: number;
}

export interface PriceChangeResult {
  months: PriceChangeMonth[];
  /** First month the change is ahead on cumulative cash and stays ahead to the horizon (null = never). */
  aheadFromMonth: number | null;
  /** Cash difference (with − without) at the judging month and at the horizon. */
  diffAtJudge: number;
  diffAtHorizon: number;
  /** Steady-state rule: share of clients you can lose and still earn the same gross profit. */
  breakEvenClientLossPct: number;
  holds: boolean;
}

export function runPriceChange(i: PriceChangeInputs): PriceChangeResult {
  const w = scenario(i, true);
  const wo = scenario(i, false);
  const months: PriceChangeMonth[] = w.pl.map((p, k) => ({
    month: p.month,
    cashWith: w.cash[k],
    cashWithout: wo.cash[k],
    clientsWith: p.activeCustomers,
    clientsWithout: wo.pl[k].activeCustomers,
    grossProfitWith: p.grossProfit,
    grossProfitWithout: wo.pl[k].grossProfit,
  }));

  let aheadFromMonth: number | null = null;
  for (let k = months.length - 1; k >= 0; k--) {
    if (months[k].cashWith - months[k].cashWithout >= 0) aheadFromMonth = months[k].month;
    else break;
  }

  const judge = months[Math.min(months.length, Math.max(1, Math.round(i.judgeAtMonth))) - 1];
  const last = months[months.length - 1];
  const diffAtJudge = judge.cashWith - judge.cashWithout;

  // Gross profit per client before = P·m; after = P(1+x) − P(1−m) = P(m+x).
  // Same total when clients fall by x / (m + x). Meaningless for cuts below −m.
  const x = i.priceChangePct;
  const m = i.grossMargin;
  const breakEvenClientLossPct = m + x > 0 ? x / (m + x) : Number.NaN;

  return {
    months,
    aheadFromMonth,
    diffAtJudge,
    diffAtHorizon: last.cashWith - last.cashWithout,
    breakEvenClientLossPct,
    holds: diffAtJudge >= 0,
  };
}

/** Levers whose boundary is shown under "What must be true". */
export type PriceLever = 'clientsLostPct' | 'newClientChangePct';

export const PRICE_LEVER_SEARCH: Record<PriceLever, { min: number; max: number; tolerance: number; worseWhen: 'higher' | 'lower' }> = {
  clientsLostPct: { min: 0, max: 0.9, tolerance: 0.001, worseWhen: 'higher' },
  newClientChangePct: { min: -1, max: 2, tolerance: 0.002, worseWhen: 'lower' },
};

export interface PriceRequiredToWork {
  lever: PriceLever;
  threshold: number | null;
  unbounded: boolean;
}

/** Bisection per lever, as in the hiring and founder demos (cash is monotone in each). */
export function solvePriceRequiredToWork(i: PriceChangeInputs): PriceRequiredToWork[] {
  return (Object.keys(PRICE_LEVER_SEARCH) as PriceLever[]).map((lever) => {
    const { min, max, tolerance, worseWhen } = PRICE_LEVER_SEARCH[lever];
    const holdsAt = (v: number) => runPriceChange({ ...i, [lever]: v }).holds;
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

export function validatePriceChange(i: PriceChangeInputs): Partial<Record<PriceField, string>> {
  const e: Partial<Record<PriceField, string>> = {};
  for (const k of Object.keys(i) as PriceField[]) if (!Number.isFinite(i[k])) e[k] = 'Enter a number.';
  if (!e.currentClients && i.currentClients <= 0) e.currentClients = 'Must be more than 0.';
  if (!e.currentPrice && i.currentPrice <= 0) e.currentPrice = 'Must be more than 0.';
  if (!e.grossMargin && (i.grossMargin <= 0 || i.grossMargin >= 1)) e.grossMargin = 'Between 1% and 99%.';
  if (!e.churnMonthly && (i.churnMonthly < 0 || i.churnMonthly >= 1)) e.churnMonthly = 'Between 0% and 99%.';
  for (const k of ['newClientsPerMonth', 'fixedCostsMonthly', 'startingCash'] as PriceField[]) {
    if (!e[k] && i[k] < 0) e[k] = 'Cannot be negative.';
  }
  if (!e.priceChangePct && (i.priceChangePct <= -0.9 || i.priceChangePct > 3)) e.priceChangePct = 'Between −90% and +300%.';
  if (!e.priceChangePct && i.priceChangePct === 0) e.priceChangePct = 'Enter the change you are considering.';
  if (!e.clientsLostPct && (i.clientsLostPct < 0 || i.clientsLostPct > 0.9)) e.clientsLostPct = 'Between 0% and 90%.';
  if (!e.newClientChangePct && (i.newClientChangePct < -1 || i.newClientChangePct > 2)) e.newClientChangePct = 'Between −100% and +200%.';
  if (!e.judgeAtMonth && (i.judgeAtMonth < 1 || i.judgeAtMonth > PRICE_HORIZON)) e.judgeAtMonth = `Between 1 and ${PRICE_HORIZON}.`;
  return e;
}

const KEYS: Record<PriceField, string> = {
  currentClients: 'c', currentPrice: 'p', grossMargin: 'gm', churnMonthly: 'churn',
  newClientsPerMonth: 'new', fixedCostsMonthly: 'fix', startingCash: 'cash',
  priceChangePct: 'chg', clientsLostPct: 'lost', newClientChangePct: 'win', judgeAtMonth: 'by',
};
export const PRICE_FIELDS = Object.keys(KEYS) as PriceField[];

export function encodePriceChange(i: PriceChangeInputs): string {
  const p = new URLSearchParams({ own: '1' });
  for (const k of PRICE_FIELDS) p.set(KEYS[k], String(Math.round(i[k] * 10_000) / 10_000));
  return p.toString();
}

export function decodePriceChange(params: URLSearchParams): PriceChangeInputs | null {
  if (params.get('own') !== '1') return null;
  const out = {} as PriceChangeInputs;
  for (const k of PRICE_FIELDS) {
    const raw = params.get(KEYS[k]);
    if (raw === null || raw.trim() === '') return null;
    const v = Number(raw);
    if (!Number.isFinite(v)) return null;
    out[k] = v;
  }
  return out;
}

