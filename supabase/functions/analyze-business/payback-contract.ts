/**
 * PAYBACK CONTRACT — Deno-Compatible Typed Payback Result
 *
 * Server-side port of src/financial/{result,payback}.ts (Handbook §19 Wave 1)
 * for edge-function use, following the same npm:decimal.js-via-esm.sh
 * convention already established by quantis-math-server.ts in this directory.
 *
 * Used alongside (not in place of) the existing ramp-aware paybackMonths
 * integer computation in index.ts: this module recomputes payback from the
 * same monthly free-cash-flow series through a typed, tested contract, so
 * a drift between the two signals a regression in the ramp simulation.
 */
import { Decimal } from "npm:decimal.js@10.4.3";

export type MonthsMetricResult =
  | {
      status: "VALUE";
      months: string;
      horizonMonths: number;
      formulaId: string;
      reasonCode: null;
    }
  | {
      status:
        | "NOT_ACHIEVED_WITHIN_HORIZON"
        | "NOT_APPLICABLE"
        | "INSUFFICIENT_INPUTS"
        | "INVALID_INPUTS"
        | "MODEL_UNSUPPORTED";
      months: null;
      horizonMonths: number;
      formulaId: string;
      reasonCode: string;
    };

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

/**
 * Detects when a scenario's stated direction of change (revenue up/down)
 * moves net profit the opposite way with no explanation available in the
 * numeric payload alone (Handbook §9.1). Non-blocking by design: flags for
 * audit/warning rather than rejecting the request, since scenario structures
 * legitimately vary (e.g. marketing-heavy businesses can see optimistic
 * profit dip if acquisition spend scales faster than the modeled revenue
 * gain) and outright blocking a live analysis needs a product decision,
 * not a silent engine-level rejection.
 */
export interface ScenarioMonotonicityIssue {
  code: "OPTIMISTIC_PROFIT_WORSE" | "BASE_PROFIT_WORSE_THAN_PESSIMISTIC";
  message: string;
}

export function checkScenarioMonotonicity(scenarios: {
  pessimistic: { revenue: number; net_profit: number };
  base: { revenue: number; net_profit: number };
  optimistic: { revenue: number; net_profit: number };
}): ScenarioMonotonicityIssue[] {
  const issues: ScenarioMonotonicityIssue[] = [];
  const { pessimistic, base, optimistic } = scenarios;

  if (optimistic.revenue > base.revenue && optimistic.net_profit < base.net_profit) {
    issues.push({
      code: "OPTIMISTIC_PROFIT_WORSE",
      message: `Optimistic revenue ($${optimistic.revenue}) exceeds base ($${base.revenue}) but optimistic net profit ($${optimistic.net_profit}) is worse than base ($${base.net_profit}).`,
    });
  }

  if (base.revenue > pessimistic.revenue && base.net_profit < pessimistic.net_profit) {
    issues.push({
      code: "BASE_PROFIT_WORSE_THAN_PESSIMISTIC",
      message: `Base revenue ($${base.revenue}) exceeds pessimistic ($${pessimistic.revenue}) but base net profit ($${base.net_profit}) is worse than pessimistic ($${pessimistic.net_profit}).`,
    });
  }

  return issues;
}

/**
 * Financial invariants (2026-08-25 GTM-audit item #1): unlike scenario
 * monotonicity above -- which the module header explains CAN legitimately
 * flip direction for a marketing-heavy business -- these are unconditional
 * mathematical facts with zero legitimate exception:
 *   gross_profit  <= revenue           (gross_profit = revenue - COGS)
 *   operating_profit <= gross_profit   (operating_profit = gross_profit - non-COGS opex, opex >= 0)
 * and therefore operating_profit <= revenue transitively.
 *
 * Root-caused from a real production report (CashMatch AI, 2026-08-24) whose
 * scenario table showed Pessimistic/Base/Optimistic operating profit
 * ($56,005/$71,360/$90,157) all exceeding their own gross profit
 * ($21,796/$31,373/$41,280) -- a structurally impossible relationship that
 * shipped in all three scenarios simultaneously, undetected, because nothing
 * in the pipeline ever checked this directly. checkScenarioMonotonicity()
 * only compares scenarios against EACH OTHER (direction of change); it does
 * not check that any single scenario is internally coherent. This does.
 *
 * Non-blocking here, by the same design precedent as
 * checkScenarioMonotonicity() (see its docstring): this function only
 * detects and reports. The caller (index.ts) is what decides these are
 * severe enough to escalate report_integrity to BLOCK, since -- unlike
 * monotonicity -- there is no legitimate business shape that violates
 * these two inequalities.
 */
export interface FinancialInvariantViolation {
  code:
    | "GROSS_PROFIT_EXCEEDS_REVENUE"
    | "OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT";
  scope: "pessimistic" | "base" | "optimistic";
  message: string;
}

/** Whole-dollar rounding accumulates across a few adds -- same $2 tolerance
 *  reconciliation-check.ts uses elsewhere in this pipeline, so a rounding
 *  artifact never gets reported as a structural violation. */
const INVARIANT_TOLERANCE = 2;

function checkOneScenarioInvariants(
  scope: "pessimistic" | "base" | "optimistic",
  scenario: { revenue: number; gross_profit: number; net_profit: number },
): FinancialInvariantViolation[] {
  const issues: FinancialInvariantViolation[] = [];
  if (scenario.gross_profit > scenario.revenue + INVARIANT_TOLERANCE) {
    issues.push({
      code: "GROSS_PROFIT_EXCEEDS_REVENUE",
      scope,
      message: `[${scope}] Gross profit ($${scenario.gross_profit}) exceeds revenue ($${scenario.revenue}). gross_profit = revenue - COGS can never exceed revenue.`,
    });
  }
  if (scenario.net_profit > scenario.gross_profit + INVARIANT_TOLERANCE) {
    issues.push({
      code: "OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT",
      scope,
      message: `[${scope}] Operating profit ($${scenario.net_profit}) exceeds gross profit ($${scenario.gross_profit}). operating_profit = gross_profit - non-COGS operating expenses can never exceed gross_profit when those expenses are non-negative.`,
    });
  }
  return issues;
}

export function checkFinancialInvariants(scenarios: {
  pessimistic: { revenue: number; gross_profit: number; net_profit: number };
  base: { revenue: number; gross_profit: number; net_profit: number };
  optimistic: { revenue: number; gross_profit: number; net_profit: number };
}): FinancialInvariantViolation[] {
  return [
    ...checkOneScenarioInvariants("pessimistic", scenarios.pessimistic),
    ...checkOneScenarioInvariants("base", scenarios.base),
    ...checkOneScenarioInvariants("optimistic", scenarios.optimistic),
  ];
}
