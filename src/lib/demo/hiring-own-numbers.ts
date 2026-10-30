/**
 * Hiring decision on the visitor's own numbers (buy-blockers #105).
 *
 * The hiring demo already runs the canonical engine on a fixture. This module
 * turns a visitor's own business facts into that fixture, checks them, scales
 * the "what must be true" search ranges to their size, and encodes everything
 * into a URL so the run can be saved and shared without an account.
 */
import {
  HIRING_DEMO_FIXTURE,
  HIRING_DEMO_VERSION,
  HIRING_LEVER_SEARCH,
  type HiringDemoAssumptions,
  type HiringDemoFixture,
} from './hiring-decision-demo';

export interface HiringOwnInputs {
  startingClients: number;
  avgMonthlyFee: number;
  hoursPerClientMonthly: number;
  currentHoursMonthly: number;
  hireAddsHoursMonthly: number;
  hireOneTimeCost: number;
  startingCash: number;
  /** Everything the business pays each month today, before the hire. */
  fixedCostsMonthly: number;
  churnMonthly: number;
  cashFloor: number;
  maxPaybackMonths: number;
  newClientsPerMonth: number;
  hireMonthlyCost: number;
  collectionLagMonths: number;
  grossMargin: number;
}

export type HiringOwnField = keyof HiringOwnInputs;

const ex = HIRING_DEMO_FIXTURE;

/** The example business, as a starting point for the form. */
export const HIRING_OWN_DEFAULTS: HiringOwnInputs = {
  startingClients: ex.startingClients,
  avgMonthlyFee: ex.avgMonthlyFee,
  hoursPerClientMonthly: ex.hoursPerClientMonthly,
  currentHoursMonthly: ex.currentHoursMonthly,
  hireAddsHoursMonthly: ex.hireAddsHoursMonthly,
  hireOneTimeCost: ex.hireOneTimeCost,
  startingCash: ex.startingCash,
  fixedCostsMonthly: Object.values(ex.fixedOpexMonthly).reduce((s, v) => s + v, 0),
  churnMonthly: ex.churnMonthly,
  cashFloor: ex.criteria.cashFloor,
  maxPaybackMonths: ex.criteria.maxPaybackMonths,
  ...ex.base,
};

/** Short URL keys, stable once shipped (saved links depend on them). */
const KEYS: Record<HiringOwnField, string> = {
  startingClients: 'c',
  avgMonthlyFee: 'fee',
  hoursPerClientMonthly: 'hpc',
  currentHoursMonthly: 'hrs',
  hireAddsHoursMonthly: 'add',
  hireOneTimeCost: 'once',
  startingCash: 'cash',
  fixedCostsMonthly: 'fix',
  churnMonthly: 'churn',
  cashFloor: 'floor',
  maxPaybackMonths: 'pb',
  newClientsPerMonth: 'new',
  hireMonthlyCost: 'hire',
  collectionLagMonths: 'lag',
  grossMargin: 'gm',
};

export const HIRING_OWN_FIELDS = Object.keys(KEYS) as HiringOwnField[];

/** Returns a message per invalid field; empty when the inputs can run. */
export function validateHiringOwn(i: HiringOwnInputs): Partial<Record<HiringOwnField, string>> {
  const e: Partial<Record<HiringOwnField, string>> = {};
  for (const k of HIRING_OWN_FIELDS) {
    if (!Number.isFinite(i[k])) e[k] = 'Enter a number.';
  }
  const positive: HiringOwnField[] = ['avgMonthlyFee', 'hoursPerClientMonthly', 'currentHoursMonthly', 'hireAddsHoursMonthly', 'hireMonthlyCost', 'maxPaybackMonths'];
  for (const k of positive) if (!e[k] && i[k] <= 0) e[k] = 'Must be more than 0.';
  const nonNegative: HiringOwnField[] = ['startingClients', 'hireOneTimeCost', 'startingCash', 'fixedCostsMonthly', 'cashFloor', 'newClientsPerMonth', 'collectionLagMonths'];
  for (const k of nonNegative) if (!e[k] && i[k] < 0) e[k] = 'Cannot be negative.';
  if (!e.grossMargin && (i.grossMargin <= 0 || i.grossMargin >= 1)) e.grossMargin = 'Between 1% and 99%.';
  if (!e.churnMonthly && (i.churnMonthly < 0 || i.churnMonthly >= 1)) e.churnMonthly = 'Between 0% and 99%.';
  if (!e.collectionLagMonths && i.collectionLagMonths > 6) e.collectionLagMonths = 'At most 6 months.';
  if (!e.maxPaybackMonths && i.maxPaybackMonths > 18) e.maxPaybackMonths = 'At most 18 months (the model runs 18).';
  if (!e.startingClients && !e.currentHoursMonthly && !e.hoursPerClientMonthly
      && i.startingClients * i.hoursPerClientMonthly > i.currentHoursMonthly * 1.0001) {
    e.currentHoursMonthly = `Your ${i.startingClients} clients need ${Math.round(i.startingClients * i.hoursPerClientMonthly)} hours; raise team hours or lower hours per client.`;
  }
  return e;
}

export function toHiringFixture(i: HiringOwnInputs): HiringDemoFixture {
  return {
    version: `${HIRING_DEMO_VERSION}-own`,
    startingClients: i.startingClients,
    avgMonthlyFee: i.avgMonthlyFee,
    churnMonthly: i.churnMonthly,
    hoursPerClientMonthly: i.hoursPerClientMonthly,
    currentHoursMonthly: i.currentHoursMonthly,
    hireAddsHoursMonthly: i.hireAddsHoursMonthly,
    hireOneTimeCost: i.hireOneTimeCost,
    startingCash: i.startingCash,
    fixedOpexMonthly: { salaries: i.fixedCostsMonthly, rent: 0, softwareAndTools: 0, otherOpex: 0 },
    criteria: { cashFloor: i.cashFloor, maxPaybackMonths: Math.round(i.maxPaybackMonths) },
    base: toHiringAssumptions(i),
  };
}

export function toHiringAssumptions(i: HiringOwnInputs): HiringDemoAssumptions {
  return {
    newClientsPerMonth: i.newClientsPerMonth,
    hireMonthlyCost: i.hireMonthlyCost,
    collectionLagMonths: Math.round(i.collectionLagMonths),
    grossMargin: i.grossMargin,
  };
}

/** Search ranges wide enough for a business of this size. */
export function hiringSearchFor(i: HiringOwnInputs): typeof HIRING_LEVER_SEARCH {
  const s = HIRING_LEVER_SEARCH;
  return {
    newClientsPerMonth: { ...s.newClientsPerMonth, max: Math.max(s.newClientsPerMonth.max, i.newClientsPerMonth * 3) },
    hireMonthlyCost: {
      ...s.hireMonthlyCost,
      min: Math.min(s.hireMonthlyCost.min, Math.max(100, i.hireMonthlyCost * 0.25)),
      max: Math.max(s.hireMonthlyCost.max, i.hireMonthlyCost * 2.5),
      tolerance: Math.max(s.hireMonthlyCost.tolerance, i.hireMonthlyCost * 0.002),
    },
    collectionLagMonths: { ...s.collectionLagMonths, max: Math.max(s.collectionLagMonths.max, 6) },
    grossMargin: { ...s.grossMargin, min: 0.05, max: 0.95 },
  };
}

/** Slider ranges around the visitor's own values. */
export function hiringSliderRangeFor(i: HiringOwnInputs) {
  const step = (v: number) => (v >= 10_000 ? 250 : v >= 2_000 ? 100 : 25);
  return {
    newClientsPerMonth: { min: 0, max: Math.max(4, Math.ceil(i.newClientsPerMonth * 3)), step: 0.1 },
    hireMonthlyCost: {
      min: Math.max(100, Math.round(i.hireMonthlyCost * 0.4 / 100) * 100),
      max: Math.round(i.hireMonthlyCost * 2 / 100) * 100,
      step: step(i.hireMonthlyCost),
    },
    collectionLagMonths: { min: 0, max: 6, step: 1 },
    grossMargin: { min: 0.05, max: 0.95, step: 0.01 },
  };
}

export function encodeHiringOwn(i: HiringOwnInputs): string {
  const p = new URLSearchParams({ own: '1' });
  for (const k of HIRING_OWN_FIELDS) p.set(KEYS[k], String(Math.round(i[k] * 10_000) / 10_000));
  return p.toString();
}

/** Null when the link is not an own-numbers link or any value is missing. */
export function decodeHiringOwn(params: URLSearchParams): HiringOwnInputs | null {
  if (params.get('own') !== '1') return null;
  const out = {} as HiringOwnInputs;
  for (const k of HIRING_OWN_FIELDS) {
    const raw = params.get(KEYS[k]);
    if (raw === null || raw.trim() === '') return null;
    const v = Number(raw);
    if (!Number.isFinite(v)) return null;
    out[k] = v;
  }
  return out;
}
