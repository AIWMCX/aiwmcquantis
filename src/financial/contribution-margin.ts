import Decimal from "decimal.js";

/**
 * Contribution Margin & CVP calculator — Handbook §19 Wave 1.
 *
 * Implements docs/WAVE1_CONTRIBUTION_MARGIN_CVP_FORMULA_CONTRACTS_2026-07-12.md
 * exactly: contribution per unit/total/ratio, break-even units/revenue/
 * target-profit, margin of safety, degree of operating leverage. Every
 * status is typed — no customer-facing sentinel values, no silent
 * divide-by-zero, no unstable-but-unflagged operating-leverage figure
 * near zero operating income.
 *
 * Deliberately does NOT reuse src/financial/result.ts's MonthsMetricResult
 * (that contract is specifically for *_months metrics). This module's
 * result shapes are its own, per the CVP formula contract's own status
 * vocabulary (NOT_MEANINGFUL, NOT_ACHIEVABLE) which differs from the
 * payback contract's (NOT_ACHIEVED_WITHIN_HORIZON, NOT_APPLICABLE).
 */

const FORMULA_ID = "cvp.contribution_margin_breakeven.v1";

// Below this fraction of revenue, operating income is treated as "near
// zero" for degree-of-operating-leverage purposes — DOL is mathematically
// unstable (approaches ±∞) as operating income approaches zero from either
// side. Per the contract's explicit numeric guard-band requirement.
const OPERATING_INCOME_NEAR_ZERO_THRESHOLD = new Decimal("0.005"); // 0.5%

export interface CvpInput {
  /** Net revenue for the period. Must be >= 0. */
  revenue: string;
  /** Σ of cost lines classified 'fixed' (+ the fixed portion of any step_fixed line). */
  fixedCosts: string;
  /** Σ of cost lines classified 'variable'. */
  variableCosts: string;
  /** Optional — enables per-unit figures (contributionPerUnit, breakEvenUnits). */
  unitsSold?: string;
  pricePerUnit?: string;
  /** Operating income for the same period (EBIT or equivalent). Required for DOL. */
  operatingIncome: string;
  /** Defaults to `revenue` when omitted — the "expected sales" for margin-of-safety. */
  expectedSales?: string;
  /** Optional — enables the target-profit-units calculation. */
  targetOperatingProfit?: string;
}

export type CvpStatus = "VALUE" | "INSUFFICIENT_INPUTS" | "INVALID_INPUTS";

interface BreakEvenBlock {
  status: "VALUE" | "NOT_ACHIEVABLE" | "INSUFFICIENT_INPUTS";
  reasonCode: string | null;
  breakEvenUnits: string | null;
  breakEvenRevenue: string | null;
  targetProfitUnits: string | null;
}

interface MarginOfSafetyBlock {
  status: "VALUE" | "NOT_MEANINGFUL" | "INSUFFICIENT_INPUTS";
  reasonCode: string | null;
  amount: string | null;
  pct: string | null;
}

interface OperatingLeverageBlock {
  status: "VALUE" | "NOT_MEANINGFUL" | "INSUFFICIENT_INPUTS";
  reasonCode: string | null;
  degreeOfOperatingLeverage: string | null;
}

export interface CvpResult {
  status: CvpStatus;
  formulaId: string;
  reasonCode: string | null;
  warnings: string[];
  contributionPerUnit: string | null;
  totalContribution: string | null;
  contributionMarginRatio: string | null;
  breakEven: BreakEvenBlock;
  marginOfSafety: MarginOfSafetyBlock;
  operatingLeverage: OperatingLeverageBlock;
}

function toDecimal(value: string, field: string): Decimal {
  const parsed = new Decimal(value);
  if (!parsed.isFinite()) throw new Error(`${field} must be finite`);
  return parsed;
}

const UNAVAILABLE_BREAK_EVEN: BreakEvenBlock = {
  status: "INSUFFICIENT_INPUTS",
  reasonCode: "UPSTREAM_CONTRIBUTION_UNAVAILABLE",
  breakEvenUnits: null,
  breakEvenRevenue: null,
  targetProfitUnits: null,
};

const UNAVAILABLE_MOS: MarginOfSafetyBlock = {
  status: "INSUFFICIENT_INPUTS",
  reasonCode: "UPSTREAM_BREAKEVEN_UNAVAILABLE",
  amount: null,
  pct: null,
};

const UNAVAILABLE_DOL: OperatingLeverageBlock = {
  status: "INSUFFICIENT_INPUTS",
  reasonCode: "UPSTREAM_CONTRIBUTION_UNAVAILABLE",
  degreeOfOperatingLeverage: null,
};

/**
 * Computes contribution margin, break-even, margin of safety, and degree
 * of operating leverage in one pass, honoring the contract's dependency
 * chain (break-even depends on contribution margin's outputs; margin of
 * safety depends on break-even's outputs).
 */
export function calculateCvp(input: CvpInput): CvpResult {
  const warnings: string[] = [];

  let revenue: Decimal;
  let fixedCosts: Decimal;
  let variableCosts: Decimal;
  let operatingIncome: Decimal;
  try {
    revenue = toDecimal(input.revenue, "revenue");
    fixedCosts = toDecimal(input.fixedCosts, "fixedCosts");
    variableCosts = toDecimal(input.variableCosts, "variableCosts");
    operatingIncome = toDecimal(input.operatingIncome, "operatingIncome");
  } catch (err) {
    return {
      status: "INVALID_INPUTS",
      formulaId: FORMULA_ID,
      reasonCode: err instanceof Error ? err.message : "INVALID_NUMERIC_INPUT",
      warnings,
      contributionPerUnit: null,
      totalContribution: null,
      contributionMarginRatio: null,
      breakEven: UNAVAILABLE_BREAK_EVEN,
      marginOfSafety: UNAVAILABLE_MOS,
      operatingLeverage: UNAVAILABLE_DOL,
    };
  }

  if (revenue.isNegative() || fixedCosts.isNegative() || variableCosts.isNegative()) {
    return {
      status: "INVALID_INPUTS",
      formulaId: FORMULA_ID,
      reasonCode: "NEGATIVE_REVENUE_OR_COST",
      warnings,
      contributionPerUnit: null,
      totalContribution: null,
      contributionMarginRatio: null,
      breakEven: UNAVAILABLE_BREAK_EVEN,
      marginOfSafety: UNAVAILABLE_MOS,
      operatingLeverage: UNAVAILABLE_DOL,
    };
  }

  // ── Metric 1: contribution per unit / total / ratio ──
  const totalContribution = revenue.minus(variableCosts);

  if (totalContribution.greaterThan(revenue)) {
    // Would require variableCosts < 0, already guarded above, but kept as
    // an explicit reconciliation invariant per the contract.
    warnings.push("TotalContribution exceeds Revenue — variable costs computed as negative.");
  }

  let contributionMarginRatio: Decimal | null = null;
  if (revenue.isZero()) {
    // NOT_MEANINGFUL, never a divide-by-zero, never a customer-facing sentinel.
  } else {
    contributionMarginRatio = totalContribution.dividedBy(revenue);
  }

  let contributionPerUnit: Decimal | null = null;
  if (input.unitsSold !== undefined && input.pricePerUnit !== undefined) {
    try {
      const units = toDecimal(input.unitsSold, "unitsSold");
      const price = toDecimal(input.pricePerUnit, "pricePerUnit");
      if (units.greaterThan(0)) {
        const variableCostPerUnit = variableCosts.dividedBy(units);
        contributionPerUnit = price.minus(variableCostPerUnit);
        if (contributionPerUnit.isNegative()) {
          warnings.push(
            `ContributionPerUnit is negative ($${contributionPerUnit.toFixed(2)}) — variable cost per unit exceeds price.`,
          );
        }
      }
    } catch {
      // Per-unit figures stay unavailable; portfolio-level ratio still stands.
      warnings.push("Per-unit price/units provided but not numeric — per-unit contribution unavailable.");
    }
  }

  const contributionResultStatus: CvpStatus = "VALUE";
  const contributionReasonCode = revenue.isZero() ? "ZERO_REVENUE_DENOMINATOR" : null;

  // ── Metric 2: break-even (depends on Metric 1) ──
  let breakEven: BreakEvenBlock;
  const canComputeBreakEven = contributionPerUnit !== null || contributionMarginRatio !== null;
  if (!canComputeBreakEven) {
    breakEven = {
      status: "INSUFFICIENT_INPUTS",
      reasonCode: "NO_CONTRIBUTION_BASIS_AVAILABLE",
      breakEvenUnits: null,
      breakEvenRevenue: null,
      targetProfitUnits: null,
    };
  } else if (
    (contributionPerUnit !== null && contributionPerUnit.lessThanOrEqualTo(0)) &&
    (contributionMarginRatio !== null && contributionMarginRatio.lessThanOrEqualTo(0))
  ) {
    breakEven = {
      status: "NOT_ACHIEVABLE",
      reasonCode: "NON_POSITIVE_CONTRIBUTION_PER_UNIT",
      breakEvenUnits: null,
      breakEvenRevenue: null,
      targetProfitUnits: null,
    };
  } else {
    const breakEvenUnits =
      contributionPerUnit !== null && contributionPerUnit.greaterThan(0)
        ? fixedCosts.dividedBy(contributionPerUnit)
        : null;
    const breakEvenRevenue =
      contributionMarginRatio !== null && contributionMarginRatio.greaterThan(0)
        ? fixedCosts.dividedBy(contributionMarginRatio)
        : null;
    let targetProfitUnits: Decimal | null = null;
    if (input.targetOperatingProfit !== undefined && contributionPerUnit !== null && contributionPerUnit.greaterThan(0)) {
      try {
        const target = toDecimal(input.targetOperatingProfit, "targetOperatingProfit");
        targetProfitUnits = fixedCosts.plus(target).dividedBy(contributionPerUnit);
      } catch {
        warnings.push("targetOperatingProfit provided but not numeric — target-profit-units unavailable.");
      }
    }
    breakEven = {
      status: "VALUE",
      reasonCode: null,
      breakEvenUnits: breakEvenUnits !== null ? breakEvenUnits.toDecimalPlaces(2).toString() : null,
      breakEvenRevenue: breakEvenRevenue !== null ? breakEvenRevenue.toDecimalPlaces(2).toString() : null,
      targetProfitUnits: targetProfitUnits !== null ? targetProfitUnits.toDecimalPlaces(2).toString() : null,
    };
  }

  // ── Metric 3: margin of safety (depends on Metric 2's break-even revenue) ──
  let marginOfSafety: MarginOfSafetyBlock;
  const expectedSales = input.expectedSales !== undefined ? new Decimal(input.expectedSales) : revenue;
  if (breakEven.status !== "VALUE" || breakEven.breakEvenRevenue === null) {
    marginOfSafety = {
      status: "INSUFFICIENT_INPUTS",
      reasonCode: "UPSTREAM_BREAKEVEN_UNAVAILABLE",
      amount: null,
      pct: null,
    };
  } else if (expectedSales.lessThanOrEqualTo(0)) {
    marginOfSafety = {
      status: "NOT_MEANINGFUL",
      reasonCode: "ZERO_OR_NEGATIVE_EXPECTED_SALES",
      amount: null,
      pct: null,
    };
  } else {
    const breakEvenRevenueDec = new Decimal(breakEven.breakEvenRevenue);
    const amount = expectedSales.minus(breakEvenRevenueDec);
    const pct = amount.dividedBy(expectedSales);
    marginOfSafety = {
      status: "VALUE",
      reasonCode: null,
      amount: amount.toDecimalPlaces(2).toString(),
      pct: pct.toDecimalPlaces(4).toString(),
    };
  }

  // ── Degree of operating leverage ──
  let operatingLeverage: OperatingLeverageBlock;
  const nearZeroThreshold = revenue.times(OPERATING_INCOME_NEAR_ZERO_THRESHOLD);
  if (operatingIncome.abs().lessThan(nearZeroThreshold.greaterThan(0) ? nearZeroThreshold : new Decimal("0.01"))) {
    operatingLeverage = {
      status: "NOT_MEANINGFUL",
      reasonCode: "OPERATING_INCOME_NEAR_ZERO",
      degreeOfOperatingLeverage: null,
    };
  } else {
    const dol = totalContribution.dividedBy(operatingIncome);
    operatingLeverage = {
      status: "VALUE",
      reasonCode: null,
      degreeOfOperatingLeverage: dol.toDecimalPlaces(3).toString(),
    };
  }

  return {
    status: contributionResultStatus,
    formulaId: FORMULA_ID,
    reasonCode: contributionReasonCode,
    warnings,
    contributionPerUnit: contributionPerUnit !== null ? contributionPerUnit.toDecimalPlaces(4).toString() : null,
    totalContribution: totalContribution.toDecimalPlaces(2).toString(),
    contributionMarginRatio: contributionMarginRatio !== null ? contributionMarginRatio.toDecimalPlaces(4).toString() : null,
    breakEven,
    marginOfSafety,
    operatingLeverage,
  };
}
