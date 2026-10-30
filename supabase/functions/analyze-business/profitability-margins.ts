/**
 * Profitability Margins — Deno-compatible port for the live engine.
 * Server-side port of src/financial/profitability-margins.ts (Handbook
 * §19 Wave 2), same convention as contribution-margin.ts / payback-contract.ts
 * in this directory.
 */
import { Decimal } from "npm:decimal.js@10.4.3";

const FORMULA_ID = "profitability_margins.v1";

export type MarginStatus = "VALUE" | "NOT_MEANINGFUL" | "INVALID_INPUTS";

export interface MarginResult {
  status: MarginStatus;
  reasonCode: string | null;
  value: string | null;
}

export interface ProfitabilityMarginsInput {
  revenue: string;
  cogs: string;
  operatingIncome: string;
  netIncome: string;
}

export interface ProfitabilityMarginsResult {
  formulaId: string;
  operatingEqualsNetIncome: boolean;
  grossMargin: MarginResult;
  operatingMargin: MarginResult;
  netMargin: MarginResult;
}

function toDecimal(value: string, field: string): Decimal {
  const parsed = new Decimal(value);
  if (!parsed.isFinite()) throw new Error(`${field} must be finite`);
  return parsed;
}

function computeMargin(numerator: Decimal, revenue: Decimal): MarginResult {
  if (revenue.isZero()) {
    return { status: "NOT_MEANINGFUL", reasonCode: "ZERO_REVENUE_DENOMINATOR", value: null };
  }
  return { status: "VALUE", reasonCode: null, value: numerator.dividedBy(revenue).toDecimalPlaces(4).toString() };
}

const INVALID_MARGIN: MarginResult = { status: "INVALID_INPUTS", reasonCode: "INVALID_NUMERIC_INPUT", value: null };

export function calculateProfitabilityMargins(input: ProfitabilityMarginsInput): ProfitabilityMarginsResult {
  let revenue: Decimal;
  let cogs: Decimal;
  let operatingIncome: Decimal;
  let netIncome: Decimal;
  try {
    revenue = toDecimal(input.revenue, "revenue");
    cogs = toDecimal(input.cogs, "cogs");
    operatingIncome = toDecimal(input.operatingIncome, "operatingIncome");
    netIncome = toDecimal(input.netIncome, "netIncome");
  } catch {
    return {
      formulaId: FORMULA_ID,
      operatingEqualsNetIncome: true,
      grossMargin: INVALID_MARGIN,
      operatingMargin: INVALID_MARGIN,
      netMargin: INVALID_MARGIN,
    };
  }

  if (revenue.isNegative()) {
    return {
      formulaId: FORMULA_ID,
      operatingEqualsNetIncome: operatingIncome.equals(netIncome),
      grossMargin: { status: "INVALID_INPUTS", reasonCode: "NEGATIVE_REVENUE", value: null },
      operatingMargin: { status: "INVALID_INPUTS", reasonCode: "NEGATIVE_REVENUE", value: null },
      netMargin: { status: "INVALID_INPUTS", reasonCode: "NEGATIVE_REVENUE", value: null },
    };
  }

  const grossProfit = revenue.minus(cogs);

  return {
    formulaId: FORMULA_ID,
    operatingEqualsNetIncome: operatingIncome.equals(netIncome),
    grossMargin: computeMargin(grossProfit, revenue),
    operatingMargin: computeMargin(operatingIncome, revenue),
    netMargin: computeMargin(netIncome, revenue),
  };
}
