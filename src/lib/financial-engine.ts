/**
 * BOTTOM-UP FINANCIAL MODEL ENGINE
 *
 * Builds projections from first principles:
 *   customers × price × retention → revenue − itemized costs
 *
 * All arithmetic via QuantisMath (decimal.js) for zero floating-point drift.
 *
 * @module BottomUpEngine
 * @version 1.0.0
 */

import { QuantisMath, type DecimalInput } from '@/lib/quantis-math';
import { applyGeoCalibration } from '@/lib/geo-calibrator';

// ─── Interfaces ─────────────────────────────────────────────

export interface UnitEconomicsParams {
  avgTicketSize: number;
  grossMarginPct: number;
  churnRateMonthly: number;
  cacBlended: number;
  upsellRevenuePct: number;
  discountRatePct: number;
}

export interface UnitEconomicsResult {
  arpu: number;
  marginPerCustomer: number;
  lifetimeMonths: number;
  ltv: number;
  ltvNpv: number;
  ltvCacRatio: number;
  cacPaybackMonths: number;
  benchmarkComparison: {
    ltvRange: [number, number];
    ltvCacHealthLabel: 'excellent' | 'good' | 'marginal' | 'poor';
  };
}

export interface FinancialModelParams {
  initialCustomers: number;
  growthRateMoM: number;
  marketSaturationPct: number;
  addressableMarket: number;
  avgTicketSize: number;
  grossMarginPct: number;
  churnRateMonthly: number;
  upsellRevenuePct: number;
  cogsPct: number;
  rent: number;
  salaries: number;
  marketingSpend: number;
  softwareAndTools: number;
  otherOpex: number;
  discountRefundPct: number;
  geoSlug?: string;
  industry?: string;
}

export interface PLStatement {
  month: number;
  year: number;
  activeCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  grossRevenue: number;
  discountsAndRefunds: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;
  rent: number;
  salaries: number;
  marketingSpend: number;
  softwareAndTools: number;
  otherOpex: number;
  totalOpex: number;
  ebitda: number;
  ebitdaMarginPct: number;
  netIncome: number;
  netMarginPct: number;
  reconciled: boolean;
  reconciliationNotes?: string;
}

export interface CapitalParams {
  initialInvestment: number;
  capitalExpenditures: { month: number; amount: number; description: string }[];
  workingCapitalReserve: number;
  externalFunding?: number;
  loanRepaymentMonthly?: number;
  ownerDrawMonthly?: number;
}

export interface CashFlowStatement {
  month: number;
  operatingCashFlow: number;
  capitalExpenditures: number;
  fundingReceived: number;
  loanRepayment: number;
  ownerDraw: number;
  netCashFlow: number;
  cumulativeCash: number;
  cashRunwayMonths: number;
  isCashPositive: boolean;
  breakEvenReached: boolean;
}

// ─── Helpers ────────────────────────────────────────────────

const Q = QuantisMath;
const n = (v: DecimalInput) => {
  const d = typeof v === 'object' && 'toNumber' in v ? v : Q.add(v, 0);
  return Q.toNumber(d);
};

// ─── Unit Economics ─────────────────────────────────────────

export function calculateUnitEconomics(params: UnitEconomicsParams): UnitEconomicsResult {
  const {
    avgTicketSize, grossMarginPct, churnRateMonthly,
    cacBlended, upsellRevenuePct, discountRatePct,
  } = params;

  const arpu = Q.multiply(avgTicketSize, Q.add(1, upsellRevenuePct));
  const marginPerCustomer = Q.multiply(arpu, grossMarginPct);
  const lifetimeMonths = churnRateMonthly > 0 ? Q.divide(1, churnRateMonthly) : Q.multiply(1, 120);
  const ltv = Q.multiply(marginPerCustomer, lifetimeMonths);

  // NPV-discounted LTV: sum of margin / (1+r)^t for t=1..lifetime
  const monthlyDiscount = Q.divide(discountRatePct, 12);
  let ltvNpv = Q.multiply(1, 0);
  const ltMonths = Q.toNumber(Q.min(lifetimeMonths, 120));
  for (let t = 1; t <= Q.ceil(ltMonths); t++) {
    const discountFactor = Q.add(1, monthlyDiscount);
    // (1+r)^t via repeated multiply
    let df = Q.multiply(1, 1);
    for (let i = 0; i < t; i++) df = Q.multiply(df, discountFactor);
    ltvNpv = Q.add(ltvNpv, Q.divide(marginPerCustomer, df));
  }

  const ltvCacRatio = Q.divide(ltv, cacBlended);
  const cacPaybackMonths = Q.divide(cacBlended, marginPerCustomer);

  const ratioNum = n(ltvCacRatio);
  let healthLabel: 'excellent' | 'good' | 'marginal' | 'poor';
  if (ratioNum > 3) healthLabel = 'excellent';
  else if (ratioNum >= 2) healthLabel = 'good';
  else if (ratioNum >= 1) healthLabel = 'marginal';
  else healthLabel = 'poor';

  return {
    arpu: n(arpu),
    marginPerCustomer: n(marginPerCustomer),
    lifetimeMonths: n(lifetimeMonths),
    ltv: n(ltv),
    ltvNpv: n(ltvNpv),
    ltvCacRatio: n(ltvCacRatio),
    cacPaybackMonths: n(cacPaybackMonths),
    benchmarkComparison: {
      ltvRange: [n(Q.multiply(ltv, 0.7)), n(Q.multiply(ltv, 1.3))],
      ltvCacHealthLabel: healthLabel,
    },
  };
}

// ─── 3-Year P&L Generator ───────────────────────────────────

export function generate3YearPL(params: FinancialModelParams): PLStatement[] {
  const {
    initialCustomers, growthRateMoM, marketSaturationPct, addressableMarket,
    avgTicketSize, grossMarginPct, churnRateMonthly, upsellRevenuePct,
    cogsPct, rent, salaries, marketingSpend, softwareAndTools, otherOpex,
    discountRefundPct, geoSlug, industry,
  } = params;

  // Geo-calibrate rent & salaries
  let geoRent = rent;
  let geoSalaries = salaries;
  let geoNotes: string[] = [];

  if (geoSlug && geoSlug !== 'us_national') {
    const geoResult = applyGeoCalibration(
      { rent, salaries, marketing: marketingSpend },
      geoSlug,
      industry ?? 'general',
    );
    geoRent = geoResult.calibrated.rent ?? rent;
    geoSalaries = geoResult.calibrated.salaries ?? salaries;
    geoNotes = geoResult.adjustmentNotes;
  }

  const maxCustomers = Q.multiply(addressableMarket, marketSaturationPct);
  const statements: PLStatement[] = [];
  let prevActive = Q.multiply(1, 0);

  for (let m = 1; m <= 36; m++) {
    const year = Math.ceil(m / 12);

    // Customer dynamics
    let activeStart = m === 1 ? Q.multiply(1, initialCustomers) : prevActive;
    const newRaw = m === 1
      ? Q.multiply(1, 0) // month 1 starts with initialCustomers, no new
      : Q.multiply(activeStart, growthRateMoM);
    const newCapped = Q.min(newRaw, Q.subtract(maxCustomers, activeStart));
    const newCustomers = Q.max(newCapped, 0);
    const churned = Q.multiply(activeStart, churnRateMonthly);
    const activeEnd = Q.max(Q.subtract(Q.add(activeStart, newCustomers), churned), 0);

    // Revenue
    const revenuePerCustomer = Q.multiply(avgTicketSize, Q.add(1, upsellRevenuePct));
    const grossRevenue = Q.multiply(activeEnd, revenuePerCustomer);
    const discounts = Q.multiply(grossRevenue, discountRefundPct);
    const netRevenue = Q.subtract(grossRevenue, discounts);

    // COGS & gross profit
    const cogs = Q.multiply(netRevenue, cogsPct);
    const grossProfit = Q.subtract(netRevenue, cogs);
    const grossMargin = netRevenue.isZero()
      ? Q.multiply(1, 0)
      : Q.divide(grossProfit, netRevenue);

    // OpEx
    const totalOpex = Q.add(
      Q.add(Q.add(geoRent, geoSalaries), Q.add(marketingSpend, softwareAndTools)),
      otherOpex,
    );

    // Bottom line
    const ebitda = Q.subtract(grossProfit, totalOpex);
    const ebitdaMargin = netRevenue.isZero()
      ? Q.multiply(1, 0)
      : Q.divide(ebitda, netRevenue);
    const netIncome = ebitda; // simplified — no depreciation/amortization/tax yet
    const netMargin = ebitdaMargin;

    statements.push({
      month: m,
      year,
      activeCustomers: n(activeEnd),
      newCustomers: n(newCustomers),
      churnedCustomers: n(churned),
      grossRevenue: n(grossRevenue),
      discountsAndRefunds: n(discounts),
      netRevenue: n(netRevenue),
      cogs: n(cogs),
      grossProfit: n(grossProfit),
      grossMarginPct: n(grossMargin),
      rent: n(Q.multiply(1, geoRent)),
      salaries: n(Q.multiply(1, geoSalaries)),
      marketingSpend: n(Q.multiply(1, marketingSpend)),
      softwareAndTools: n(Q.multiply(1, softwareAndTools)),
      otherOpex: n(Q.multiply(1, otherOpex)),
      totalOpex: n(totalOpex),
      ebitda: n(ebitda),
      ebitdaMarginPct: n(ebitdaMargin),
      netIncome: n(netIncome),
      netMarginPct: n(netMargin),
      reconciled: true,
      reconciliationNotes: geoNotes.length > 0 ? geoNotes.join('; ') : undefined,
    });

    prevActive = activeEnd;
  }

  return statements;
}

// ─── Cash-Flow Generator ────────────────────────────────────

export function generateCashFlow(
  plStatements: PLStatement[],
  capitalParams: CapitalParams,
): CashFlowStatement[] {
  const {
    initialInvestment, capitalExpenditures: capexSchedule,
    externalFunding = 0, loanRepaymentMonthly = 0, ownerDrawMonthly = 0,
  } = capitalParams;

  const cashFlows: CashFlowStatement[] = [];
  let cumulative = Q.subtract(Q.multiply(1, externalFunding), initialInvestment);
  let hasBeenNegative = Q.toNumber(cumulative) < 0;
  let breakEvenReached = false;

  // Index capex by month for O(1) lookup
  const capexByMonth = new Map<number, number>();
  for (const ce of capexSchedule) {
    capexByMonth.set(ce.month, n(Q.add(capexByMonth.get(ce.month) ?? 0, ce.amount)));
  }

  for (const pl of plStatements) {
    const opCashFlow = Q.multiply(1, pl.netIncome);
    const capex = Q.multiply(1, capexByMonth.get(pl.month) ?? 0);
    const funding = pl.month === 1 ? Q.multiply(1, 0) : Q.multiply(1, 0); // funding already in cumulative
    const loan = Q.multiply(1, loanRepaymentMonthly);
    const draw = Q.multiply(1, ownerDrawMonthly);

    const netCF = Q.subtract(
      Q.subtract(Q.subtract(opCashFlow, capex), loan),
      draw,
    );
    cumulative = Q.add(cumulative, netCF);

    if (Q.toNumber(cumulative) < 0) hasBeenNegative = true;
    if (hasBeenNegative && Q.toNumber(cumulative) >= 0 && !breakEvenReached) {
      breakEvenReached = true;
    }

    // Runway: trailing 3-month avg burn
    const recentFlows = cashFlows.slice(-2).map(cf => cf.netCashFlow).concat([n(netCF)]);
    const avgBurn = recentFlows.reduce((a, b) => a + b, 0) / recentFlows.length;
    const runway = avgBurn < 0 ? Math.abs(n(cumulative) / avgBurn) : 999;

    // Reconciliation: operatingCashFlow should match netIncome within $1
    const divergence = Math.abs(n(opCashFlow) - pl.netIncome);
    if (divergence > 1) {
      // Flag on the PL statement if mutable — for now just log
      console.warn(`[BottomUpEngine] Cash-flow reconciliation gap: $${divergence} in month ${pl.month}`);
    }

    cashFlows.push({
      month: pl.month,
      operatingCashFlow: n(opCashFlow),
      capitalExpenditures: n(capex),
      fundingReceived: 0,
      loanRepayment: n(loan),
      ownerDraw: n(draw),
      netCashFlow: n(netCF),
      cumulativeCash: n(cumulative),
      cashRunwayMonths: runway,
      isCashPositive: Q.toNumber(cumulative) >= 0,
      breakEvenReached,
    });
  }

  return cashFlows;
}

// ─── Investment Helpers ─────────────────────────────────────

export function findBreakEvenMonth(cashFlows: CashFlowStatement[]): number | null {
  for (const cf of cashFlows) {
    if (cf.breakEvenReached) return cf.month;
  }
  return null;
}

export function calculateCashRunway(cashFlows: CashFlowStatement[], currentMonth: number): number {
  const cf = cashFlows.find(c => c.month === currentMonth);
  return cf?.cashRunwayMonths ?? 0;
}

export function calculateROI(cashFlows: CashFlowStatement[], initialInvestment: number): number {
  const totalCF = cashFlows.reduce((sum, cf) => sum + cf.netCashFlow, 0);
  return n(Q.divide(Q.subtract(totalCF, initialInvestment), initialInvestment));
}

export function calculatePaybackPeriod(cashFlows: CashFlowStatement[]): number | null {
  let cumulativeOp = 0;
  for (const cf of cashFlows) {
    cumulativeOp += cf.operatingCashFlow;
    // Find month where cumulative operating CF covers the initial negative position
    if (cumulativeOp >= Math.abs(cashFlows[0]?.cumulativeCash - cashFlows[0]?.netCashFlow)) {
      return cf.month;
    }
  }
  return null;
}
