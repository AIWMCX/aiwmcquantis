/**
 * Leverage / Financing Ratios — Handbook §19 Wave 3.
 *
 * Implements docs/WAVE3_LEVERAGE_RATIOS_FORMULA_CONTRACT_2026-07-12.md.
 *
 * The engine currently collects no debt schedule, no interest expense,
 * no separate equity/asset tracking, and no EBITDA layer distinct from
 * netIncome. Per the CTO-verdict rule ("typed unavailable states over
 * fabricated proxies"), every metric in this wave types as
 * INSUFFICIENT_INPUTS with a reasonCode identifying exactly which input
 * is missing. When debt-schedule inputs are added to the form, this is
 * the single place to swap the reason codes for real computations.
 */

export type LeverageStatus = "VALUE" | "NOT_MEANINGFUL" | "INSUFFICIENT_INPUTS" | "INVALID_INPUTS";

export interface LeverageMetric {
  status: LeverageStatus;
  reasonCode: string | null;
  value: string | null;
}

export interface LeverageRatiosInput {
  totalDebt?: string;
  interestExpense?: string;
  debtService?: string;
  totalEquity?: string;
  totalAssets?: string;
  ebitda?: string;
  ebit?: string;
  netOperatingIncome?: string;
}

export interface LeverageRatiosResult {
  formulaId: string;
  debtToEquity: LeverageMetric;
  debtToAssets: LeverageMetric;
  debtToCapital: LeverageMetric;
  debtToEbitda: LeverageMetric;
  interestCoverage: LeverageMetric;
  dscr: LeverageMetric;
}

const FORMULA_ID = "leverage_ratios.v1";

const REASONS = {
  NO_DEBT_SCHEDULE_COLLECTED: "NO_DEBT_SCHEDULE_COLLECTED",
  NO_BALANCE_SHEET_COLLECTED: "NO_BALANCE_SHEET_COLLECTED",
  NO_INTEREST_EXPENSE_COLLECTED: "NO_INTEREST_EXPENSE_COLLECTED",
  NO_DEBT_SERVICE_COLLECTED: "NO_DEBT_SERVICE_COLLECTED",
} as const;

function unavailable(reasonCode: string): LeverageMetric {
  return { status: "INSUFFICIENT_INPUTS", reasonCode, value: null };
}

export function calculateLeverageRatios(_input: LeverageRatiosInput = {}): LeverageRatiosResult {
  void _input;
  return {
    formulaId: FORMULA_ID,
    debtToEquity: unavailable(REASONS.NO_DEBT_SCHEDULE_COLLECTED),
    debtToAssets: unavailable(REASONS.NO_BALANCE_SHEET_COLLECTED),
    debtToCapital: unavailable(REASONS.NO_DEBT_SCHEDULE_COLLECTED),
    debtToEbitda: unavailable(REASONS.NO_DEBT_SCHEDULE_COLLECTED),
    interestCoverage: unavailable(REASONS.NO_INTEREST_EXPENSE_COLLECTED),
    dscr: unavailable(REASONS.NO_DEBT_SERVICE_COLLECTED),
  };
}
