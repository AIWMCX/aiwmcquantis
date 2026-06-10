/**
 * AIWMC™ Quantis — production business-logic constants for the React app.
 *
 * Mirrors `supabase/functions/_shared/business-logic.ts` so the UI, PDF
 * exports, and tier gates use the exact same invariants as the engines.
 * Authoritative spec: /docs/QUANTIS_BUSINESS_LOGIC.md (v4.0.0).
 *
 * If you edit this file, update the edge twin in the same commit.
 */

export const QUANTIS_BUSINESS_LOGIC_VERSION = "4.0.0" as const;

export const PRODUCT_IDENTITY = {
  fullName: "AIWMC™ Quantis",
  shortName: "Quantis",
  legalEntity: "AIWMC™ LLC",
  domain: "aiwmcquantis.com",
  twitter: "@aiwmcquantis",
  themeColor: "#070D1A",
  category: "financial pre-mortem",
} as const;

export const TWELVE_FINANCIAL_VARIABLES = [
  "revenue_monthly_p50",
  "cogs_monthly",
  "gross_margin_pct",
  "operating_expenses_monthly",
  "net_profit_monthly",
  "breakeven_month_p50",
  "startup_investment",
  "payback_period_months",
  "ltv",
  "cac",
  "ltv_cac_ratio",
  "monthly_burn_rate",
] as const;
export type TwelveVariableKey = (typeof TWELVE_FINANCIAL_VARIABLES)[number];

export const MONTE_CARLO_ITERATIONS = 1_000 as const;
export const ENGINE_TIME_BUDGET_SEC = 90 as const;
export const BENCHMARK_COUNT = 97_500 as const;

export const LTV_CAC_THRESHOLDS = {
  critical: 1,
  highRisk: 2,
  caution: 3,
  healthy: 5,
  strong: 10,
} as const;

export const VERDICT_THRESHOLDS = {
  STRONG_PROCEED: 80,
  PROCEED_WITH_CAUTION: 60,
  PIVOT_RECOMMENDED: 40,
} as const;

export type Verdict =
  | "STRONG PROCEED"
  | "PROCEED WITH CAUTION"
  | "PIVOT RECOMMENDED"
  | "DO NOT PROCEED";

export function scoreToVerdict(score: number): Verdict {
  if (score >= VERDICT_THRESHOLDS.STRONG_PROCEED) return "STRONG PROCEED";
  if (score >= VERDICT_THRESHOLDS.PROCEED_WITH_CAUTION)
    return "PROCEED WITH CAUTION";
  if (score >= VERDICT_THRESHOLDS.PIVOT_RECOMMENDED)
    return "PIVOT RECOMMENDED";
  return "DO NOT PROCEED";
}

export const RISK_SEVERITY = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
} as const;

export const MANDATORY_DISCLAIMER =
  "This analysis is generated using statistical benchmarks and probabilistic " +
  "modeling for informational purposes only. It does not constitute financial, " +
  "legal, investment, or business advice. All projections are estimates based on " +
  "industry data and are not guarantees of future performance. Past benchmark " +
  "performance does not guarantee future results. Consult a licensed financial " +
  "advisor, accountant, or attorney before making significant business or " +
  "investment decisions. AIWMC™ LLC is not liable for business outcomes, losses, " +
  "or decisions made based on this analysis.";
