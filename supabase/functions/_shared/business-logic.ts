/**
 * AIWMC™ QUANTIS — PRODUCTION BUSINESS LOGIC (runtime constants)
 *
 * SINGLE SOURCE OF TRUTH for engine-facing invariants.
 * Authoritative spec: /docs/QUANTIS_BUSINESS_LOGIC.md (v4.0.0)
 *
 * Every analysis engine, narrator, validator, and tier gate MUST import
 * from this file — never hard-code these values inline. When the spec
 * doc changes, update this file in the same commit and bump VERSION.
 *
 * DO NOT delete or rename exported symbols without a migration plan —
 * they are referenced across edge functions, the React app, and tests.
 */

export const QUANTIS_BUSINESS_LOGIC_VERSION = "4.0.0" as const;
export const QUANTIS_BUSINESS_LOGIC_SOURCE_DOC =
  "docs/QUANTIS_BUSINESS_LOGIC.md" as const;

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Product identity
// ─────────────────────────────────────────────────────────────────────────────
export const PRODUCT_IDENTITY = {
  fullName: "AIWMC™ Quantis",
  shortName: "Quantis",
  legalEntity: "AIWMC™ LLC",
  trademarkSerial: "99538355",
  hq: "Denver, Colorado, USA",
  domain: "aiwmcquantis.com",
  twitter: "@aiwmcquantis",
  themeColor: "#070D1A",
  category: "financial pre-mortem",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — The 12 financial variables (canonical output keys)
// A partial output is a failed output. Every analysis MUST include all 12.
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — 7-Layer AI Safety Architecture (labels for telemetry + UI)
// ─────────────────────────────────────────────────────────────────────────────
export const SAFETY_LAYERS = [
  { id: 1, label: "Input sanitization & business type classification" },
  { id: 2, label: "Benchmark matching with confidence scoring" },
  { id: 3, label: "Location cost adjustment using city multipliers" },
  { id: 4, label: "Dual-AI consensus validation" },
  { id: 5, label: "Sanity checks — margin, ratios, unit economics" },
  { id: 6, label: "Reconciliation against historical analysis data" },
  { id: 7, label: "Human-readable source attribution" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 — Engine timing budget (90 sec promise)
// ─────────────────────────────────────────────────────────────────────────────
export const ENGINE_TIMING_BUDGET_MS = {
  inputParse: 5_000,
  benchmarkMatch: 10_000,
  cityAdjust: 5_000,
  deterministic: 15_000,
  monteCarlo: 30_000,
  qaAndOutput: 15_000,
  buffer: 10_000,
  total: 90_000,
} as const;

export const MONTE_CARLO_ITERATIONS = 1_000 as const;

// ─────────────────────────────────────────────────────────────────────────────
// Section 7 — Confidence score thresholds
// ─────────────────────────────────────────────────────────────────────────────
export const CONFIDENCE_THRESHOLDS = {
  high: 0.8,
  good: 0.6,
  medium: 0.4,
  low: 0.2,
  // Below `medium` → widen Monte Carlo distributions by 30 %
  monteCarloWidenFactor: 1.3,
  monteCarloWidenBelow: 0.5,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Section 12 — Unit economics health thresholds
// ─────────────────────────────────────────────────────────────────────────────
export const LTV_CAC_THRESHOLDS = {
  critical: 1, // <1 every customer is a net loss
  highRisk: 2,
  caution: 3,
  healthy: 5,
  strong: 10, // >10 → flag, verify
} as const;

export const CAC_PAYBACK_MONTHS = {
  excellent: 6,
  good: 12,
  acceptable: 18,
  warning: 24,
  // >24 → critical
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Section 13 — Risk severity (drives UI ordering and color)
// ─────────────────────────────────────────────────────────────────────────────
export const RISK_SEVERITY = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
} as const;
export type RiskSeverity =
  (typeof RISK_SEVERITY)[keyof typeof RISK_SEVERITY];

// ─────────────────────────────────────────────────────────────────────────────
// Section 15 — Tier architecture
// ─────────────────────────────────────────────────────────────────────────────
export const TIERS = {
  free: {
    id: "free",
    priceMonthly: 0,
    priceAnnual: 0,
    analysesPerMonth: 5,
    pdfExport: false,
    monteCarloP10P90: false,
    fullPnl: false,
  },
  plus: {
    id: "plus",
    priceMonthly: 17,
    priceAnnual: 149,
    analysesPerMonth: Infinity,
    pdfExport: true,
    monteCarloP10P90: true,
    fullPnl: true,
  },
  pro: {
    id: "pro",
    priceMonthly: 49,
    priceAnnual: 469,
    analysesPerMonth: Infinity,
    pdfExport: true,
    whiteLabel: true,
    bulkAnalysis: true,
    apiAccess: true,
    teamSeatsIncluded: 3,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Section 17 — Validation score → verdict mapping
// ─────────────────────────────────────────────────────────────────────────────
export const VERDICT_THRESHOLDS = {
  STRONG_PROCEED: 80,
  PROCEED_WITH_CAUTION: 60,
  PIVOT_RECOMMENDED: 40,
  // <40 → DO_NOT_PROCEED
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

// ─────────────────────────────────────────────────────────────────────────────
// Section 20 — Gross margin floors by vertical (anti-BS gate)
// Engine MUST flag (never silently accept) margins outside the range.
// ─────────────────────────────────────────────────────────────────────────────
export const GROSS_MARGIN_BENCHMARKS: Record<
  string,
  { min: number; max: number; floor: number }
> = {
  saas_b2b: { min: 70, max: 88, floor: 65 },
  consulting: { min: 68, max: 85, floor: 60 },
  barbershop: { min: 68, max: 78, floor: 60 },
  restaurant_upscale: { min: 60, max: 72, floor: 55 },
  food_truck: { min: 55, max: 70, floor: 50 },
  fitness_studio: { min: 50, max: 68, floor: 45 },
  specialty_coffee: { min: 62, max: 74, floor: 58 },
  ecommerce_dtc: { min: 45, max: 62, floor: 38 },
  dental_clinic: { min: 52, max: 68, floor: 45 },
  real_estate_brokerage: { min: 40, max: 60, floor: 35 },
  pharmacy: { min: 22, max: 38, floor: 20 },
  dropshipping: { min: 15, max: 35, floor: 12 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section 24 — Mandatory legal disclaimer (every output, every tier)
// ─────────────────────────────────────────────────────────────────────────────
export const MANDATORY_DISCLAIMER =
  "This analysis is generated using statistical benchmarks and probabilistic " +
  "modeling for informational purposes only. It does not constitute financial, " +
  "legal, investment, or business advice. All projections are estimates based on " +
  "industry data and are not guarantees of future performance. Past benchmark " +
  "performance does not guarantee future results. Consult a licensed financial " +
  "advisor, accountant, or attorney before making significant business or " +
  "investment decisions. AIWMC™ LLC is not liable for business outcomes, losses, " +
  "or decisions made based on this analysis." as const;

// ─────────────────────────────────────────────────────────────────────────────
// Section 21 — Anti-hallucination: live-example invariants.
// These exact numbers are published on the live site and MUST never be
// contradicted by any engine output, narrator, or generated copy.
// ─────────────────────────────────────────────────────────────────────────────
export const LIVE_EXAMPLE_INVARIANTS = [
  { slug: "coffee-shop-denver", revMonthly: 28_500, gmPct: 62, breakevenMonth: 8, ltvCac: 4.2 },
  { slug: "restaurant-miami", revMonthly: 95_000, gmPct: 68, breakevenMonth: 6 },
  { slug: "consulting-firm-new-york", revMonthly: 48_000, gmPct: 72, breakevenMonth: 4, ltvCac: 6.8 },
  { slug: "saas-project-management", mrrMonth12: 12_400, gmPct: 82, breakevenMonth: 14, ltvCac: 3.1 },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Validation helpers (used by hybrid-validator + analyze-business pipeline)
// ─────────────────────────────────────────────────────────────────────────────

/** Asserts an analysis output object contains all 12 financial variables. */
export function assertTwelveVariables(
  output: Record<string, unknown>,
): { ok: true } | { ok: false; missing: TwelveVariableKey[] } {
  const missing = TWELVE_FINANCIAL_VARIABLES.filter(
    (k) => output[k] === undefined || output[k] === null,
  );
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

/** Returns true if a gross-margin % is plausible for the given vertical key. */
export function isMarginInRange(verticalKey: string, marginPct: number): {
  inRange: boolean;
  benchmark: { min: number; max: number; floor: number } | null;
} {
  const bm = GROSS_MARGIN_BENCHMARKS[verticalKey] ?? null;
  if (!bm) return { inRange: true, benchmark: null };
  return {
    inRange: marginPct >= bm.floor && marginPct <= bm.max + 10,
    benchmark: bm,
  };
}
