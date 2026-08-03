import Decimal from "decimal.js";

export interface MonthlyFinancialRow {
  month: number;
  revenue: string;
  cogs: string;
  grossProfit: string;
  opex: string;
  ebitda: string;
  depreciation: string;
  amortization: string;
  interestExpense: string;
  taxes: string;
  netIncome: string;
  capex: string;
  deltaWorkingCapital: string;
  debtPrincipal: string;
  newDebt: string;
  newEquity: string;
  freeCashFlow: string;
  beginningCash: string;
  endingCash: string;
}

export interface ReconciliationIssue {
  month: number;
  code: string;
  expected: string;
  actual: string;
  delta: string;
}

const D = (value: string): Decimal => new Decimal(value);

function compare(
  month: number,
  code: string,
  expected: Decimal,
  actual: Decimal,
  tolerance: Decimal,
): ReconciliationIssue | null {
  const delta = actual.minus(expected);
  return delta.abs().greaterThan(tolerance)
    ? {
        month,
        code,
        expected: expected.toString(),
        actual: actual.toString(),
        delta: delta.toString(),
      }
    : null;
}

/**
 * Recomputes the full income-statement-to-cash waterfall from raw inputs
 * (revenue -> gross profit -> EBITDA -> EBIT -> EBT -> net income -> FCF ->
 * ending cash) and compares each derived value against what was stored.
 * Complements src/lib/reconciliation-engine.ts, which validates sum
 * integrity, sign consistency, and benchmark boundaries on already-derived
 * fields but does not recompute net income, FCF, or the cash roll-forward
 * from scratch.
 *
 * NOT CURRENTLY APPLICABLE (documented 2026-08-02, P0-25 investigation):
 * `MonthlyFinancialRow` requires depreciation, amortization, interest
 * expense, taxes, capex, and debt principal/new-debt/new-equity fields --
 * a genuine three-statement model. The live engine
 * (analyze-business/financial-calculator.ts) deliberately does not compute
 * any of these (see AnalysisResults.tsx/formula-registry.ts's "Operating
 * Profit" relabeling, 2026-08-02: no depreciation schedule, debt structure,
 * or tax rate exists anywhere in the live path). Wiring this in would mean
 * either fabricating zero-values for all of those fields (defeating the
 * whole point of the check) or building the full three-statement engine
 * first. Kept as a reviewed, correct spec for that future engine, not
 * active production code -- see reconciliation-engine.ts's header for the
 * sibling module in the same situation, and reconciliation-check.ts for
 * what actually runs against today's single-snapshot engine.
 */
export function reconcileMonthlyRow(
  row: MonthlyFinancialRow,
  tolerance = "0.01",
): ReconciliationIssue[] {
  const t = new Decimal(tolerance);
  const issues: ReconciliationIssue[] = [];

  const grossProfit = D(row.revenue).minus(row.cogs);
  const ebitda = grossProfit.minus(row.opex);
  const ebit = ebitda.minus(row.depreciation).minus(row.amortization);
  const ebt = ebit.minus(row.interestExpense);
  const netIncome = ebt.minus(row.taxes);
  const freeCashFlow = netIncome
    .plus(row.depreciation)
    .plus(row.amortization)
    .minus(row.capex)
    .minus(row.deltaWorkingCapital)
    .minus(row.debtPrincipal)
    .plus(row.newDebt)
    .plus(row.newEquity);
  const endingCash = D(row.beginningCash).plus(freeCashFlow);

  const checks: Array<ReconciliationIssue | null> = [
    compare(row.month, "GROSS_PROFIT_RECONCILIATION", grossProfit, D(row.grossProfit), t),
    compare(row.month, "EBITDA_RECONCILIATION", ebitda, D(row.ebitda), t),
    compare(row.month, "NET_INCOME_RECONCILIATION", netIncome, D(row.netIncome), t),
    compare(row.month, "FCF_RECONCILIATION", freeCashFlow, D(row.freeCashFlow), t),
    compare(row.month, "CASH_ROLLFORWARD_RECONCILIATION", endingCash, D(row.endingCash), t),
  ];

  for (const issue of checks) if (issue) issues.push(issue);
  return issues;
}
