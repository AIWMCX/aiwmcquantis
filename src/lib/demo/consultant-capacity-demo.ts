/**
 * Consultant "Capacity vs. Demand" demo — the aha moment for the $499
 * Consultant Founding Pilot: a client's stated monthly demand and the
 * business's actual delivery capacity are two different numbers, and
 * Quantis reconciles them instead of counting demand it cannot serve.
 *
 * Like the founder demo, this only aggregates and searches the canonical
 * engine's output (generate3YearPL) -- it does not compute revenue, hours,
 * or capacity math itself.
 */
import { generate3YearPL, type FinancialModelParams } from '@/lib/financial-engine';

export const CONSULTANT_DEMO_VERSION = 'consultant-demo-v1';

export interface ConsultantDemoAssumptions {
  /** What the client says they can bring in per month. */
  claimedMonthlyDemand: number;
  hoursPerCustomer: number;
  availableHoursMonthly: number;
}

export interface ConsultantDemoFixture {
  version: string;
  startingCustomers: number;
  avgTicketSize: number;
  grossMargin: number;
  churnMonthly: number;
  fixedOpexMonthly: { salaries: number; rent: number; softwareAndTools: number; otherOpex: number };
  base: ConsultantDemoAssumptions;
}

export const CONSULTANT_DEMO_FIXTURE: ConsultantDemoFixture = {
  version: CONSULTANT_DEMO_VERSION,
  // Must stay <= the capacity ceiling below (1,040 / 52 = 20) -- a starting
  // count already over capacity would mean the business was impossibly
  // overbooked before any new demand, which isn't a coherent baseline.
  startingCustomers: 12,
  avgTicketSize: 165,
  grossMargin: 0.58,
  churnMonthly: 0.03,
  fixedOpexMonthly: { salaries: 9_500, rent: 2_200, softwareAndTools: 300, otherOpex: 600 },
  base: { claimedMonthlyDemand: 30, hoursPerCustomer: 52, availableHoursMonthly: 1_040 },
};

const HORIZON = 12;

function paramsFor(fixture: ConsultantDemoFixture, a: ConsultantDemoAssumptions, applyCapacity: boolean): FinancialModelParams {
  return {
    initialCustomers: fixture.startingCustomers,
    growthRateMoM: 0,
    marketSaturationPct: 1,
    addressableMarket: 1_000_000_000,
    avgTicketSize: fixture.avgTicketSize,
    grossMarginPct: fixture.grossMargin,
    churnRateMonthly: fixture.churnMonthly,
    upsellRevenuePct: 0,
    cogsPct: 1 - fixture.grossMargin,
    rent: fixture.fixedOpexMonthly.rent,
    salaries: fixture.fixedOpexMonthly.salaries,
    marketingSpend: 0,
    softwareAndTools: fixture.fixedOpexMonthly.softwareAndTools,
    otherOpex: fixture.fixedOpexMonthly.otherOpex,
    discountRefundPct: 0,
    acquisition: [{
      monthlySpend: a.claimedMonthlyDemand * a.hoursPerCustomer, // arbitrary unit spend; only the resulting count matters
      cac: a.hoursPerCustomer,
      startMonth: 1,
      endMonth: HORIZON,
    }],
    ...(applyCapacity
      ? { capacity: { hoursPerCustomerMonthly: a.hoursPerCustomer, availableHoursMonthly: a.availableHoursMonthly } }
      : {}),
  };
}

export interface ConsultantDemoMonth {
  month: number;
  demandCustomers: number;
  servedCustomers: number;
  revenueServed: number;
  revenueLostToCapacity: number;
}

export interface ConsultantDemoResult {
  maxServableCustomers: number;
  requiredHoursForClaim: number;
  hoursGap: number;
  capacityBinds: boolean;
  months: ConsultantDemoMonth[];
  /** Month-12 snapshot, the number a consultant would put in front of a client. */
  year1DemandRevenue: number;
  year1ServedRevenue: number;
  year1RevenueGap: number;
}

export function runConsultantDemo(
  a: ConsultantDemoAssumptions,
  fixture: ConsultantDemoFixture = CONSULTANT_DEMO_FIXTURE,
): ConsultantDemoResult {
  const demandOnly = generate3YearPL(paramsFor(fixture, a, false)).slice(0, HORIZON);
  const served = generate3YearPL(paramsFor(fixture, a, true)).slice(0, HORIZON);

  const maxServableCustomers = a.availableHoursMonthly / a.hoursPerCustomer;
  // Hours required to serve the claimed new demand ON TOP OF the customers
  // already being served -- the existing base consumes capacity too, so
  // comparing the claimed rate alone against availableHoursMonthly would
  // understate how quickly capacity actually binds.
  const requiredHoursForClaim = (fixture.startingCustomers + a.claimedMonthlyDemand) * a.hoursPerCustomer;
  const hoursGap = Math.max(0, requiredHoursForClaim - a.availableHoursMonthly);

  const months: ConsultantDemoMonth[] = demandOnly.map((d, i) => ({
    month: d.month,
    demandCustomers: d.activeCustomers,
    servedCustomers: served[i].activeCustomers,
    revenueServed: served[i].netRevenue,
    revenueLostToCapacity: Math.max(0, d.netRevenue - served[i].netRevenue),
  }));

  return {
    maxServableCustomers,
    requiredHoursForClaim,
    hoursGap,
    capacityBinds: hoursGap > 0,
    months,
    year1DemandRevenue: demandOnly[HORIZON - 1].netRevenue,
    year1ServedRevenue: served[HORIZON - 1].netRevenue,
    year1RevenueGap: demandOnly[HORIZON - 1].netRevenue - served[HORIZON - 1].netRevenue,
  };
}
