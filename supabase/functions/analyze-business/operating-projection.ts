/**
 * Shared operating forecast assumptions used by break-even and investment
 * payback. Month 1–6 revenue ramps from 30% to 100%; after month 6 revenue
 * grows 5% monthly and total expenses grow 2.5% monthly. Total expenses are
 * modeled as 60% fixed and 40% variable during the ramp.
 */
const RAMP = [0.3, 0.45, 0.6, 0.75, 0.9, 1];

export function projectOperatingMonth(
  steadyRevenue: number,
  steadyExpenses: number,
  month: number,
): { revenue: number; expenses: number } {
  if (!Number.isInteger(month) || month < 1) {
    throw new RangeError('month must be a positive integer');
  }
  if (![steadyRevenue, steadyExpenses].every(Number.isFinite)) {
    throw new TypeError('steady revenue and expenses must be finite');
  }

  if (month <= RAMP.length) {
    const scale = RAMP[month - 1];
    const fixedExpenses = steadyExpenses * 0.6;
    const variableExpenses = steadyExpenses * 0.4;
    return {
      revenue: steadyRevenue * scale,
      expenses: fixedExpenses + variableExpenses * scale,
    };
  }

  const periodsAfterRamp = month - RAMP.length;
  return {
    revenue: steadyRevenue * Math.pow(1.05, periodsAfterRamp),
    expenses: steadyExpenses * Math.pow(1.025, periodsAfterRamp),
  };
}

/** First modeled month where operating cash flow is non-negative, else null. */
export function calculateOperatingBreakEvenMonth(
  steadyRevenue: number,
  steadyExpenses: number,
  horizonMonths = 60,
): number | null {
  if (!Number.isInteger(horizonMonths) || horizonMonths < 1) {
    throw new RangeError('horizonMonths must be a positive integer');
  }
  for (let month = 1; month <= horizonMonths; month += 1) {
    const projection = projectOperatingMonth(steadyRevenue, steadyExpenses, month);
    if (projection.revenue >= projection.expenses) return month;
  }
  return null;
}

/** First month cumulative modeled operating cash flow recovers initial capital. */
export function calculateInvestmentPaybackMonth(
  startupInvestment: number,
  steadyRevenue: number,
  steadyExpenses: number,
  horizonMonths = 60,
): number {
  if (startupInvestment <= 0) return 0;
  if (steadyRevenue - steadyExpenses <= 0) return 999;
  let cumulativeCashFlow = 0;
  for (let month = 1; month <= horizonMonths; month += 1) {
    const projection = projectOperatingMonth(steadyRevenue, steadyExpenses, month);
    cumulativeCashFlow += projection.revenue - projection.expenses;
    if (cumulativeCashFlow >= startupInvestment) return month;
  }
  return 999;
}
