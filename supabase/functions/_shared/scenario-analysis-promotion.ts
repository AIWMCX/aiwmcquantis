/**
 * Pure logic for promote-scenario-to-analysis (Phase D step 7 — spec
 * AIWMC_Quantis_Scenario_Evidence_System_Spec.md §9): a promoted scenario
 * creates a NEW analysis row (Analysis v2), never mutates the original.
 *
 * The new analysis keeps everything from the original result (business
 * plan, market analysis, etc.) except financial_analysis, which is replaced
 * with the scenario run's recalculated output — the same output already
 * proven to come from the real calculateStrictFinancials engine
 * (financial-analysis-shape.ts). No new numbers are invented here.
 */

// deno-lint-ignore no-explicit-any
type AnyResult = Record<string, any>;

export function mergeScenarioIntoAnalysisResult(
  originalResult: AnyResult,
  scenarioFinancialAnalysis: AnyResult,
): AnyResult {
  return {
    ...originalResult,
    financial_analysis: scenarioFinancialAnalysis,
  };
}

/**
 * Mirrors src/types/analysis.ts's getMonthlyProfit/getPaybackMonths exactly
 * (Deno can't import from src/ — see repo's dual-port convention). Keep
 * these two in sync if either side changes.
 */
export function getMonthlyProfitMirror(financial: AnyResult | undefined): number {
  if (financial?.scenarios?.base?.net_profit !== undefined) {
    return financial.scenarios.base.net_profit;
  }
  return financial?.monthly_profit ?? 0;
}

export function getPaybackMonthsMirror(financial: AnyResult | undefined): number {
  return financial?.returns?.payback_period_months ?? financial?.payback_period_months ?? 0;
}
