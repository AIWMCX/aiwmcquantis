/**
 * projection.ramp6_growth.v1 in decimal arithmetic. Same assumptions as
 * analyze-business/operating-projection.ts (the live float version), which the
 * parity tests compare against.
 */
import { KDecimal } from './decimal.ts';

export const RAMP_V1 = ['0.30', '0.45', '0.60', '0.75', '0.90', '1.00'] as const;
export const POST_RAMP_REVENUE_GROWTH_V1 = '0.05';
export const POST_RAMP_EXPENSE_GROWTH_V1 = '0.025';
export const FIXED_EXPENSE_SHARE_V1 = '0.6';

export interface ProjectedMonth {
  month: number;
  revenue: KDecimal;
  expenses: KDecimal;
  profit: KDecimal;
}

export function projectMonth(steadyRevenue: KDecimal, steadyExpenses: KDecimal, month: number): ProjectedMonth {
  if (!Number.isInteger(month) || month < 1) throw new RangeError('month must be a positive integer');
  let revenue: KDecimal;
  let expenses: KDecimal;
  if (month <= RAMP_V1.length) {
    const scale = new KDecimal(RAMP_V1[month - 1]);
    const fixedShare = new KDecimal(FIXED_EXPENSE_SHARE_V1);
    revenue = steadyRevenue.times(scale);
    expenses = steadyExpenses.times(fixedShare).plus(steadyExpenses.times(new KDecimal(1).minus(fixedShare)).times(scale));
  } else {
    const n = month - RAMP_V1.length;
    revenue = steadyRevenue.times(new KDecimal(1).plus(POST_RAMP_REVENUE_GROWTH_V1).pow(n));
    expenses = steadyExpenses.times(new KDecimal(1).plus(POST_RAMP_EXPENSE_GROWTH_V1).pow(n));
  }
  return { month, revenue, expenses, profit: revenue.minus(expenses) };
}

export function projectSeries(steadyRevenue: KDecimal, steadyExpenses: KDecimal, horizonMonths: number): ProjectedMonth[] {
  const out: ProjectedMonth[] = [];
  for (let m = 1; m <= horizonMonths; m += 1) out.push(projectMonth(steadyRevenue, steadyExpenses, m));
  return out;
}
