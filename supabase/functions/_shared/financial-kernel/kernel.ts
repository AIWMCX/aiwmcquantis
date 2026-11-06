/**
 * AIWMC financial kernel v1 (Phase 1, contract set item 1).
 *
 * One deterministic, runtime-neutral calculation module: Deno edge functions,
 * Vite/React and Vitest all import this file. Plan and migration order:
 * docs/phase1/financial-kernel-plan.md.
 *
 * Contract:
 *  - The kernel never chooses inputs. Benchmarks, location multipliers, user
 *    overrides and AI estimates are resolved by the caller, which passes the
 *    resolved monthly P&L lines as decimal strings (plus a provenance map that
 *    the kernel echoes but never reads).
 *  - Every metric is a MetricResult: a status, a decimal-string value or null,
 *    a reason code and the formula id that produced it. No placeholder numbers
 *    stand in for "not achievable" or "no data".
 *  - Formulas match the live engine (analyze-business/financial-calculator.ts)
 *    except where the plan lists a deliberate change.
 */
import { KDecimal, KernelInputError, money, months2, parseDecimal, ratio } from './decimal.ts';
import { projectSeries } from './projection.ts';
import { FORMULA_IDS, KERNEL_NAME, KERNEL_VERSION } from './version.ts';

export { KernelInputError };

export type MetricStatus =
  | 'VALUE'
  | 'NOT_ACHIEVED_WITHIN_HORIZON'
  | 'NOT_APPLICABLE'
  | 'NOT_ACHIEVABLE'
  | 'NOT_MEANINGFUL'
  | 'INSUFFICIENT_INPUTS'
  | 'INVALID_INPUTS';

export type MetricUnit = 'USD' | 'USD/month' | 'ratio' | 'percent' | 'months' | 'month_index';

export interface MetricResult {
  formulaId: string;
  unit: MetricUnit;
  status: MetricStatus;
  /** Decimal string when status is VALUE, else null. */
  value: string | null;
  reasonCode: string | null;
  flags: string[];
}

export interface KernelInputV1 {
  /** Steady-state monthly revenue. */
  monthlyRevenue: string;
  monthlyCogs: string;
  /** Variable operating costs that scale with volume (today: marketing/acquisition). */
  monthlyVariableOpex: string;
  /** Salaries, rent, utilities, other. */
  monthlyFixedCosts: string;
  startupInvestment: string;
  /** Average price per order. */
  unitPrice: string;
  ordersPerCustomerPerMonth: string;
  /** Gross margin per unit, ratio 0-1. */
  unitGrossMarginRatio: string;
  /** Monthly churn as a ratio 0-1 (not a percent). Null when unknown. */
  monthlyChurnRate: string | null;
  /** Null when unknown. */
  cac: string | null;
  /** Assumed effective annual discount rate, ratio. Default '0.10'. */
  annualDiscountRate?: string;
  /** NPV horizon in months. Default 36. */
  npvHorizonMonths?: number;
  /** Projection horizon for break-even month and payback. Default 60. */
  horizonMonths?: number;
  /** When set, revenueForTargetProfit is computed for this monthly profit. */
  targetMonthlyProfit?: string;
  /** Where each input came from; echoed, never read. Keys are input names. */
  provenance?: Record<string, string>;
}

export interface KernelResultV1 {
  kernel: { name: typeof KERNEL_NAME; version: typeof KERNEL_VERSION };
  assumptions: {
    projection: string;
    horizonMonths: number;
    npvHorizonMonths: number;
    annualDiscountRate: string;
  };
  totals: { monthlyTotalExpenses: string; isProfitable: boolean };
  metrics: {
    grossProfit: MetricResult;
    grossMarginRatio: MetricResult;
    netProfit: MetricResult;
    netMarginRatio: MetricResult;
    contributionMarginRatio: MetricResult;
    breakEvenRevenue: MetricResult;
    revenueForTargetProfit: MetricResult;
    operatingBreakEvenMonth: MetricResult;
    investmentPaybackMonth: MetricResult;
    investmentPaybackMonthsFractional: MetricResult;
    roiYear1Percent: MetricResult;
    npv: MetricResult;
    customerLifetimeMonths: MetricResult;
    ltv: MetricResult;
    ltvCacRatio: MetricResult;
    cacPaybackMonths: MetricResult;
  };
  provenance: Record<string, string>;
}

const LIFETIME_CAP_MONTHS = 120;

const value = (formulaId: string, unit: MetricUnit, v: string, flags: string[] = []): MetricResult => ({
  formulaId, unit, status: 'VALUE', value: v, reasonCode: null, flags,
});
const none = (formulaId: string, unit: MetricUnit, status: Exclude<MetricStatus, 'VALUE'>, reasonCode: string): MetricResult => ({
  formulaId, unit, status, value: null, reasonCode, flags: [],
});

function horizon(n: number | undefined, fallback: number, field: string): number {
  const h = n ?? fallback;
  if (!Number.isInteger(h) || h < 1 || h > 600) throw new KernelInputError(`${field} must be an integer in 1..600`);
  return h;
}

export function computeFinancialKernelV1(input: KernelInputV1): KernelResultV1 {
  const rev = parseDecimal(input.monthlyRevenue, 'monthlyRevenue');
  const cogs = parseDecimal(input.monthlyCogs, 'monthlyCogs');
  const varOpex = parseDecimal(input.monthlyVariableOpex, 'monthlyVariableOpex');
  const fixed = parseDecimal(input.monthlyFixedCosts, 'monthlyFixedCosts');
  const investment = parseDecimal(input.startupInvestment, 'startupInvestment');
  const unitPrice = parseDecimal(input.unitPrice, 'unitPrice');
  const orders = parseDecimal(input.ordersPerCustomerPerMonth, 'ordersPerCustomerPerMonth');
  const unitGm = parseDecimal(input.unitGrossMarginRatio, 'unitGrossMarginRatio');
  const churn = input.monthlyChurnRate == null ? null : parseDecimal(input.monthlyChurnRate, 'monthlyChurnRate');
  const cac = input.cac == null ? null : parseDecimal(input.cac, 'cac');
  const discountRate = parseDecimal(input.annualDiscountRate ?? '0.10', 'annualDiscountRate');
  const H = horizon(input.horizonMonths, 60, 'horizonMonths');
  const npvH = horizon(input.npvHorizonMonths, 36, 'npvHorizonMonths');
  const target = input.targetMonthlyProfit == null ? null : parseDecimal(input.targetMonthlyProfit, 'targetMonthlyProfit');

  const totalExpenses = cogs.plus(varOpex).plus(fixed);
  const net = rev.minus(totalExpenses);
  const gross = rev.minus(cogs);

  const negativePnl = [rev, cogs, varOpex, fixed].some((d) => d.isNegative());
  const pnlInvalid = (id: string, unit: MetricUnit) => none(id, unit, 'INVALID_INPUTS', 'NEGATIVE_PNL_LINE');
  const investmentInvalid = investment.isNegative();

  // ── Steady-state P&L ──────────────────────────────────────────────
  const grossProfit = negativePnl ? pnlInvalid(FORMULA_IDS.grossProfit, 'USD/month') : value(FORMULA_IDS.grossProfit, 'USD/month', money(gross));
  const netProfit = negativePnl ? pnlInvalid(FORMULA_IDS.netProfit, 'USD/month') : value(FORMULA_IDS.netProfit, 'USD/month', money(net));
  const marginOf = (x: KDecimal, id: string) =>
    negativePnl ? pnlInvalid(id, 'ratio')
      : rev.isZero() ? none(id, 'ratio', 'NOT_MEANINGFUL', 'ZERO_REVENUE')
        : value(id, 'ratio', ratio(x.dividedBy(rev)));
  const grossMarginRatio = marginOf(gross, FORMULA_IDS.grossProfit);
  const netMarginRatio = marginOf(net, FORMULA_IDS.netProfit);

  // ── CVP ───────────────────────────────────────────────────────────
  let contributionMarginRatio: MetricResult;
  let breakEvenRevenue: MetricResult;
  let revenueForTargetProfit: MetricResult;
  if (negativePnl) {
    contributionMarginRatio = pnlInvalid(FORMULA_IDS.contributionMarginRatio, 'ratio');
    breakEvenRevenue = pnlInvalid(FORMULA_IDS.breakEvenRevenue, 'USD/month');
    revenueForTargetProfit = pnlInvalid(FORMULA_IDS.revenueForTargetProfit, 'USD/month');
  } else if (rev.isZero()) {
    contributionMarginRatio = none(FORMULA_IDS.contributionMarginRatio, 'ratio', 'NOT_MEANINGFUL', 'ZERO_REVENUE');
    breakEvenRevenue = none(FORMULA_IDS.breakEvenRevenue, 'USD/month', 'NOT_MEANINGFUL', 'ZERO_REVENUE');
    revenueForTargetProfit = none(FORMULA_IDS.revenueForTargetProfit, 'USD/month', 'NOT_MEANINGFUL', 'ZERO_REVENUE');
  } else {
    const cmRatio = new KDecimal(1).minus(cogs.plus(varOpex).dividedBy(rev));
    contributionMarginRatio = value(FORMULA_IDS.contributionMarginRatio, 'ratio', ratio(cmRatio));
    if (cmRatio.lessThanOrEqualTo(0)) {
      breakEvenRevenue = none(FORMULA_IDS.breakEvenRevenue, 'USD/month', 'NOT_ACHIEVABLE', 'NON_POSITIVE_CONTRIBUTION_MARGIN');
      revenueForTargetProfit = none(FORMULA_IDS.revenueForTargetProfit, 'USD/month', 'NOT_ACHIEVABLE', 'NON_POSITIVE_CONTRIBUTION_MARGIN');
    } else {
      breakEvenRevenue = value(FORMULA_IDS.breakEvenRevenue, 'USD/month', money(fixed.dividedBy(cmRatio)));
      revenueForTargetProfit = target == null
        ? none(FORMULA_IDS.revenueForTargetProfit, 'USD/month', 'INSUFFICIENT_INPUTS', 'NO_TARGET_PROFIT')
        : value(FORMULA_IDS.revenueForTargetProfit, 'USD/month', money(fixed.plus(target).dividedBy(cmRatio)));
    }
  }

  // ── Projection-based metrics ──────────────────────────────────────
  const series = negativePnl ? [] : projectSeries(rev, totalExpenses, Math.max(H, 12));
  let operatingBreakEvenMonth: MetricResult;
  if (negativePnl) {
    operatingBreakEvenMonth = pnlInvalid(FORMULA_IDS.operatingBreakEvenMonth, 'month_index');
  } else {
    const hit = series.slice(0, H).find((p) => p.revenue.greaterThanOrEqualTo(p.expenses));
    operatingBreakEvenMonth = hit
      ? value(FORMULA_IDS.operatingBreakEvenMonth, 'month_index', String(hit.month))
      : none(FORMULA_IDS.operatingBreakEvenMonth, 'month_index', 'NOT_ACHIEVED_WITHIN_HORIZON', 'NO_MONTH_WITH_REVENUE_AT_LEAST_EXPENSES');
  }

  let investmentPaybackMonth: MetricResult;
  let investmentPaybackMonthsFractional: MetricResult;
  const paybackNone = (status: Exclude<MetricStatus, 'VALUE'>, reason: string) => {
    investmentPaybackMonth = none(FORMULA_IDS.investmentPaybackMonth, 'month_index', status, reason);
    investmentPaybackMonthsFractional = none(FORMULA_IDS.investmentPaybackFractional, 'months', status, reason);
  };
  if (negativePnl) paybackNone('INVALID_INPUTS', 'NEGATIVE_PNL_LINE');
  else if (investmentInvalid) paybackNone('INVALID_INPUTS', 'NEGATIVE_INVESTMENT');
  else if (investment.isZero()) {
    investmentPaybackMonth = value(FORMULA_IDS.investmentPaybackMonth, 'month_index', '0', ['NO_INVESTMENT']);
    investmentPaybackMonthsFractional = value(FORMULA_IDS.investmentPaybackFractional, 'months', '0.00', ['NO_INVESTMENT']);
  } else if (net.lessThanOrEqualTo(0)) paybackNone('NOT_APPLICABLE', 'NON_POSITIVE_STEADY_STATE_PROFIT');
  else {
    let cumulative = new KDecimal(0);
    let found = false;
    for (const p of series.slice(0, H)) {
      const before = cumulative;
      cumulative = cumulative.plus(p.profit);
      if (cumulative.greaterThanOrEqualTo(investment)) {
        investmentPaybackMonth = value(FORMULA_IDS.investmentPaybackMonth, 'month_index', String(p.month));
        const fraction = p.profit.greaterThan(0) ? investment.minus(before).dividedBy(p.profit) : new KDecimal(1);
        investmentPaybackMonthsFractional = value(FORMULA_IDS.investmentPaybackFractional, 'months', months2(new KDecimal(p.month - 1).plus(fraction)));
        found = true;
        break;
      }
    }
    if (!found) paybackNone('NOT_ACHIEVED_WITHIN_HORIZON', 'CUMULATIVE_PROFIT_BELOW_INVESTMENT');
  }

  let roiYear1Percent: MetricResult;
  if (negativePnl) roiYear1Percent = pnlInvalid(FORMULA_IDS.roiYear1, 'percent');
  else if (investmentInvalid) roiYear1Percent = none(FORMULA_IDS.roiYear1, 'percent', 'INVALID_INPUTS', 'NEGATIVE_INVESTMENT');
  else if (investment.isZero()) roiYear1Percent = none(FORMULA_IDS.roiYear1, 'percent', 'NOT_APPLICABLE', 'NO_INVESTMENT');
  else {
    const y1 = series.slice(0, 12).reduce((s, p) => s.plus(p.profit), new KDecimal(0));
    roiYear1Percent = value(FORMULA_IDS.roiYear1, 'percent', y1.dividedBy(investment).times(100).toDecimalPlaces(2).toFixed(2));
  }

  let npv: MetricResult;
  if (negativePnl) npv = pnlInvalid(FORMULA_IDS.npv, 'USD');
  else if (investmentInvalid) npv = none(FORMULA_IDS.npv, 'USD', 'INVALID_INPUTS', 'NEGATIVE_INVESTMENT');
  else if (discountRate.lessThanOrEqualTo(-1)) npv = none(FORMULA_IDS.npv, 'USD', 'INVALID_INPUTS', 'DISCOUNT_RATE_AT_OR_BELOW_MINUS_100_PERCENT');
  else {
    const monthlyFactor = new KDecimal(1).plus(discountRate).pow(new KDecimal(1).dividedBy(12));
    let acc = investment.negated();
    let discount = new KDecimal(1);
    for (let m = 1; m <= npvH; m += 1) {
      discount = discount.times(monthlyFactor);
      acc = acc.plus(net.dividedBy(discount));
    }
    npv = value(FORMULA_IDS.npv, 'USD', money(acc));
  }

  // ── Unit economics ────────────────────────────────────────────────
  let customerLifetimeMonths: MetricResult;
  let lifetime: KDecimal | null = null;
  if (churn == null) {
    customerLifetimeMonths = none(FORMULA_IDS.customerLifetime, 'months', 'INSUFFICIENT_INPUTS', 'CHURN_MISSING');
  } else if (churn.isNegative() || churn.greaterThan(1)) {
    customerLifetimeMonths = none(FORMULA_IDS.customerLifetime, 'months', 'INVALID_INPUTS', 'CHURN_OUTSIDE_0_1');
  } else if (churn.isZero()) {
    lifetime = new KDecimal(LIFETIME_CAP_MONTHS);
    customerLifetimeMonths = value(FORMULA_IDS.customerLifetime, 'months', lifetime.toFixed(1), ['ZERO_CHURN_CAPPED']);
  } else {
    const raw = new KDecimal(1).dividedBy(churn).toDecimalPlaces(1);
    const capped = raw.greaterThan(LIFETIME_CAP_MONTHS);
    lifetime = capped ? new KDecimal(LIFETIME_CAP_MONTHS) : raw;
    customerLifetimeMonths = value(FORMULA_IDS.customerLifetime, 'months', lifetime.toFixed(1), capped ? ['LIFETIME_CAPPED'] : []);
  }

  const unitInvalid = unitPrice.isNegative() || orders.isNegative() || unitGm.greaterThan(1) || unitGm.lessThan(-1);
  const unitContribution = unitPrice.times(unitGm).times(orders);
  let ltvD: KDecimal | null = null;
  let ltv: MetricResult;
  if (unitInvalid) ltv = none(FORMULA_IDS.ltv, 'USD', 'INVALID_INPUTS', 'UNIT_INPUT_OUT_OF_RANGE');
  else if (lifetime == null) ltv = none(FORMULA_IDS.ltv, 'USD', customerLifetimeMonths.status as Exclude<MetricStatus, 'VALUE'>, customerLifetimeMonths.reasonCode ?? 'LIFETIME_UNAVAILABLE');
  else {
    ltvD = unitContribution.times(lifetime);
    ltv = value(FORMULA_IDS.ltv, 'USD', money(ltvD), customerLifetimeMonths.flags);
  }

  let ltvCacRatio: MetricResult;
  let cacPaybackMonths: MetricResult;
  if (cac == null) {
    ltvCacRatio = none(FORMULA_IDS.ltvCacRatio, 'ratio', 'INSUFFICIENT_INPUTS', 'CAC_MISSING');
    cacPaybackMonths = none(FORMULA_IDS.cacPayback, 'months', 'INSUFFICIENT_INPUTS', 'CAC_MISSING');
  } else if (cac.isNegative()) {
    ltvCacRatio = none(FORMULA_IDS.ltvCacRatio, 'ratio', 'INVALID_INPUTS', 'NEGATIVE_CAC');
    cacPaybackMonths = none(FORMULA_IDS.cacPayback, 'months', 'INVALID_INPUTS', 'NEGATIVE_CAC');
  } else {
    ltvCacRatio = ltvD == null
      ? none(FORMULA_IDS.ltvCacRatio, 'ratio', ltv.status as Exclude<MetricStatus, 'VALUE'>, ltv.reasonCode ?? 'LTV_UNAVAILABLE')
      : cac.isZero() ? none(FORMULA_IDS.ltvCacRatio, 'ratio', 'NOT_MEANINGFUL', 'ZERO_CAC')
        : value(FORMULA_IDS.ltvCacRatio, 'ratio', ratio(ltvD.dividedBy(cac)));
    cacPaybackMonths = unitInvalid ? none(FORMULA_IDS.cacPayback, 'months', 'INVALID_INPUTS', 'UNIT_INPUT_OUT_OF_RANGE')
      : unitContribution.lessThanOrEqualTo(0) ? none(FORMULA_IDS.cacPayback, 'months', 'NOT_APPLICABLE', 'NON_POSITIVE_UNIT_CONTRIBUTION')
        : value(FORMULA_IDS.cacPayback, 'months', months2(cac.dividedBy(unitContribution)));
  }

  return {
    kernel: { name: KERNEL_NAME, version: KERNEL_VERSION },
    assumptions: {
      projection: FORMULA_IDS.projection,
      horizonMonths: H,
      npvHorizonMonths: npvH,
      annualDiscountRate: discountRate.toString(),
    },
    totals: { monthlyTotalExpenses: money(totalExpenses), isProfitable: !negativePnl && net.greaterThan(0) },
    metrics: {
      grossProfit, grossMarginRatio, netProfit, netMarginRatio,
      contributionMarginRatio, breakEvenRevenue, revenueForTargetProfit,
      operatingBreakEvenMonth,
      investmentPaybackMonth: investmentPaybackMonth!,
      investmentPaybackMonthsFractional: investmentPaybackMonthsFractional!,
      roiYear1Percent, npv,
      customerLifetimeMonths, ltv, ltvCacRatio, cacPaybackMonths,
    },
    provenance: { ...(input.provenance ?? {}) },
  };
}
