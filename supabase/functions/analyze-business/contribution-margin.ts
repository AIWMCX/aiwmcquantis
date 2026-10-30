/**
 * Contribution Margin & CVP — Deno-compatible port for the live engine.
 *
 * Server-side port of src/financial/contribution-margin.ts (Handbook §19
 * Wave 1), following the same npm:decimal.js-via-esm.sh convention already
 * established by quantis-math-server.ts and payback-contract.ts in this
 * directory. Logic is identical to the webapp-side module — kept in sync
 * by hand since Deno cannot import from src/.
 */
import { Decimal } from "npm:decimal.js@10.4.3";

const FORMULA_ID = "cvp.contribution_margin_breakeven.v1";
const OPERATING_INCOME_NEAR_ZERO_THRESHOLD = new Decimal("0.005"); // 0.5%

export interface CvpInput {
  revenue: string;
  fixedCosts: string;
  variableCosts: string;
  unitsSold?: string;
  pricePerUnit?: string;
  operatingIncome: string;
  expectedSales?: string;
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

  const totalContribution = revenue.minus(variableCosts);

  if (totalContribution.greaterThan(revenue)) {
    warnings.push("TotalContribution exceeds Revenue — variable costs computed as negative.");
  }

  let contributionMarginRatio: Decimal | null = null;
  if (!revenue.isZero()) {
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
      warnings.push("Per-unit price/units provided but not numeric — per-unit contribution unavailable.");
    }
  }

  const contributionReasonCode = revenue.isZero() ? "ZERO_REVENUE_DENOMINATOR" : null;

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
    status: "VALUE",
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
