import Decimal from "decimal.js";
import type { MonthsMetricResult } from "./result";

const FORMULA_ID = "investment_payback.cumulative_fcf.v1";

function parseMoney(value: string, field: string): Decimal {
  const parsed = new Decimal(value);
  if (!parsed.isFinite()) throw new Error(`${field} must be finite`);
  return parsed;
}

/**
 * Calculates the first fractional month in which cumulative free cash flow
 * recovers the initial investment. The initial investment is treated as a
 * month-zero cash outflow.
 */
export function calculateInvestmentPayback(
  initialInvestment: string,
  monthlyFreeCashFlows: readonly string[],
): MonthsMetricResult {
  const horizonMonths = monthlyFreeCashFlows.length;
  const investment = parseMoney(initialInvestment, "initialInvestment");

  if (investment.isNegative()) {
    return {
      status: "INVALID_INPUTS",
      months: null,
      horizonMonths,
      formulaId: FORMULA_ID,
      reasonCode: "INITIAL_INVESTMENT_NEGATIVE",
    };
  }

  if (horizonMonths === 0) {
    return {
      status: "INSUFFICIENT_INPUTS",
      months: null,
      horizonMonths,
      formulaId: FORMULA_ID,
      reasonCode: "NO_MONTHLY_FCF_SERIES",
    };
  }

  let cumulative = investment.negated();
  if (cumulative.greaterThanOrEqualTo(0)) {
    return {
      status: "VALUE",
      months: "0",
      horizonMonths,
      formulaId: FORMULA_ID,
      reasonCode: null,
    };
  }

  for (let index = 0; index < monthlyFreeCashFlows.length; index += 1) {
    const current = parseMoney(monthlyFreeCashFlows[index]!, `monthlyFreeCashFlows[${index}]`);
    const before = cumulative;
    cumulative = cumulative.plus(current);

    if (cumulative.greaterThanOrEqualTo(0)) {
      const completedMonths = new Decimal(index);
      const fraction = current.greaterThan(0)
        ? before.negated().dividedBy(current)
        : new Decimal(1);
      return {
        status: "VALUE",
        months: completedMonths.plus(fraction).toDecimalPlaces(2).toString(),
        horizonMonths,
        formulaId: FORMULA_ID,
        reasonCode: null,
      };
    }
  }

  return {
    status: "NOT_ACHIEVED_WITHIN_HORIZON",
    months: null,
    horizonMonths,
    formulaId: FORMULA_ID,
    reasonCode: "CUMULATIVE_FCF_BELOW_ZERO",
  };
}
