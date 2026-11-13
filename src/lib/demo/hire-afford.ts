/**
 * "Can I afford to hire an employee?" calculator [F1, F3].
 *
 * Seven plain inputs an owner knows, mapped onto the same deterministic
 * hiring engine as /demo/hiring-decision (runHiringDemo). Revenue is modelled
 * in $1,000 "units" so the engine's client-capacity mechanics carry the
 * ramp: the hire adds capacity worth `newRevenueAtFull`, demand fills it over
 * `monthsToFull`, payroll starts in month 1, customers pay `daysToGetPaid`
 * later. Nothing here is a benchmark; every default is an editable example.
 */
import { runHiringDemo, type HiringDemoResult } from './hiring-decision-demo';
import { toHiringAssumptions, toHiringFixture, type HiringOwnInputs } from './hiring-own-numbers';

export interface HireAffordInputs {
  /** Cash in the bank today. */
  cashToday: number;
  /** Average monthly revenue today. */
  monthlyRevenue: number;
  /** Everything the business spends each month today, direct costs included. */
  monthlyCosts: number;
  /** The new employee's annual salary. */
  annualSalary: number;
  /** Extra monthly revenue the business can bill once the hire is fully busy. */
  newRevenueAtFull: number;
  /** Months until the hire is fully busy (1-18). */
  monthsToFull: number;
  /** Days between doing the work and getting paid (0-180). */
  daysToGetPaid: number;
  // Advanced (editable, shown collapsed)
  /** Share of each extra sales dollar kept after direct costs (0-1). */
  grossMargin: number;
  /** Payroll taxes, insurance and benefits on top of salary, as a share of salary. */
  employerCostPct: number;
  /** Recruiting, equipment and onboarding, paid in month 1. */
  oneTimeCost: number;
  /** The lowest bank balance you are willing to see. */
  safetyFloor: number;
}

export type HireAffordField = keyof HireAffordInputs;

/** Illustrative example: a 12-person services firm. Not a benchmark. */
export const HIRE_AFFORD_EXAMPLE: HireAffordInputs = {
  cashToday: 30_000,
  monthlyRevenue: 54_000,
  monthlyCosts: 52_800,
  annualSalary: 62_000,
  newRevenueAtFull: 20_000,
  monthsToFull: 6,
  daysToGetPaid: 60,
  grossMargin: 0.55,
  employerCostPct: 0.25,
  oneTimeCost: 4_000,
  safetyFloor: 0,
};

const UNIT = 1_000;
const HOURS_PER_UNIT = 10;

export function hireMonthlyCost(i: HireAffordInputs): number {
  return (i.annualSalary * (1 + i.employerCostPct)) / 12;
}

/** Direct costs today at the given margin; the rest of monthly costs is fixed. */
function fixedCosts(i: HireAffordInputs): number {
  return i.monthlyCosts - i.monthlyRevenue * (1 - i.grossMargin);
}

export function validateHireAfford(i: HireAffordInputs): Partial<Record<HireAffordField, string>> {
  const e: Partial<Record<HireAffordField, string>> = {};
  for (const k of Object.keys(i) as HireAffordField[]) {
    if (!Number.isFinite(i[k])) e[k] = 'Enter a number.';
  }
  const positive: HireAffordField[] = ['monthlyRevenue', 'annualSalary', 'newRevenueAtFull'];
  for (const k of positive) if (!e[k] && i[k] <= 0) e[k] = 'Must be more than 0.';
  const nonNegative: HireAffordField[] = ['cashToday', 'monthlyCosts', 'oneTimeCost', 'safetyFloor', 'daysToGetPaid', 'employerCostPct'];
  for (const k of nonNegative) if (!e[k] && i[k] < 0) e[k] = 'Cannot be negative.';
  if (!e.monthsToFull && (i.monthsToFull < 1 || i.monthsToFull > 18)) e.monthsToFull = 'Between 1 and 18 months.';
  if (!e.daysToGetPaid && i.daysToGetPaid > 180) e.daysToGetPaid = 'At most 180 days.';
  if (!e.grossMargin && (i.grossMargin <= 0 || i.grossMargin >= 1)) e.grossMargin = 'Between 1% and 99%.';
  if (!e.employerCostPct && i.employerCostPct > 1) e.employerCostPct = 'At most 100%.';
  if (!e.monthlyCosts && !e.monthlyRevenue && !e.grossMargin && fixedCosts(i) < 0) {
    e.monthlyCosts = `At a ${Math.round(i.grossMargin * 100)}% margin, direct costs alone are $${Math.round(i.monthlyRevenue * (1 - i.grossMargin)).toLocaleString('en-US')}. Raise monthly costs or the margin.`;
  }
  return e;
}

/** The same inputs in the full hiring model's terms (for "open the full model"). */
export function toHiringOwn(i: HireAffordInputs): HiringOwnInputs {
  const startingUnits = i.monthlyRevenue / UNIT;
  const addedUnits = i.newRevenueAtFull / UNIT;
  return {
    startingClients: startingUnits,
    avgMonthlyFee: UNIT,
    hoursPerClientMonthly: HOURS_PER_UNIT,
    currentHoursMonthly: startingUnits * HOURS_PER_UNIT,
    hireAddsHoursMonthly: addedUnits * HOURS_PER_UNIT,
    hireOneTimeCost: i.oneTimeCost,
    startingCash: i.cashToday,
    fixedCostsMonthly: fixedCosts(i),
    churnMonthly: 0,
    cashFloor: i.safetyFloor,
    maxPaybackMonths: 12,
    newClientsPerMonth: addedUnits / Math.round(i.monthsToFull),
    hireMonthlyCost: hireMonthlyCost(i),
    collectionLagMonths: Math.min(6, Math.round(i.daysToGetPaid / 30)),
    grossMargin: i.grossMargin,
  };
}

export type HireAffordVerdict = 'affordable' | 'tight' | 'not_yet';

export interface HireAffordResult {
  engine: HiringDemoResult;
  monthlyCost: number;
  verdict: HireAffordVerdict;
  /** Lowest bank balance in 18 months with the hire, and the month it happens. */
  lowestCash: number;
  lowestCashMonth: number;
  /** First month cash is below the safety floor (null = never). */
  floorBreachMonth: number | null;
  /** Same, without the hire: when set, the hire is not the only problem. */
  floorBreachWithoutHireMonth: number | null;
  /** First month the hire has paid for itself in cash (null = not within 18 months). */
  paybackMonth: number | null;
  /** Monthly revenue the hire must bring just to cover their own cost. */
  revenueToCoverHire: number;
}

export function runHireAfford(i: HireAffordInputs): HireAffordResult {
  const own = toHiringOwn(i);
  const engine = runHiringDemo(toHiringAssumptions(own), toHiringFixture(own));
  const verdict: HireAffordVerdict =
    engine.floorBreachMonth !== null || engine.paybackMonth === null
      ? 'not_yet'
      : engine.paybackMonth > 12
        ? 'tight'
        : 'affordable';
  return {
    engine,
    monthlyCost: hireMonthlyCost(i),
    verdict,
    lowestCash: engine.lowestCash,
    lowestCashMonth: engine.lowestCashMonth,
    floorBreachMonth: engine.floorBreachMonth,
    floorBreachWithoutHireMonth: engine.floorBreachWithoutHireMonth,
    paybackMonth: engine.paybackMonth,
    revenueToCoverHire: engine.revenueToCoverHire,
  };
}

/** Shown on the page and in its FAQPage JSON-LD. */
export const HIRE_AFFORD_FAQ: [string, string][] = [
  ['How do I know if I can afford to hire an employee?',
    'Look at your bank balance month by month after the hire, not at annual profit. The hire is affordable when your lowest balance stays above the amount you need to feel safe, and the extra sales eventually cover the full cost of the person.'],
  ['How much does an employee really cost per month?',
    'Salary divided by 12, plus payroll taxes, insurance and benefits, plus one-time recruiting and equipment. The calculator lets you set the extra cost as a percentage of salary; use the figure from your payroll provider.'],
  ['Why does my cash drop after a hire even if the business is profitable?',
    'Because payroll goes out every month from the start, while the new revenue builds up over several months and customers pay you weeks after the work is done.'],
  ['What changes the answer the most?',
    'Usually how fast customers pay and how fast the new person gets fully busy. Try changing those two inputs first.'],
  ['Is this financial advice?',
    'No. It is a deterministic calculation on the numbers you enter. Your inputs are not checked facts, and the result is only as good as they are.'],
];
