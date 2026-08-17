// Canonical investment-verdict derivation — 2026-08-16.
//
// FREE-NULL-VERDICT root-cause chain, in order discovered this session:
//   1. transformResponse() never set .verdict at all -- every tier got null.
//      (PR #33, first fix -- real but incomplete.)
//   2. PR #33 sourced verdict from the AI narrator's raw.investment_verdict.
//      That fixes the AI-narrator path, but the live free/anonymous "quick"
//      path goes through generateDeterministicFallbackResult() instead,
//      which never set investment_verdict on its output -- so PR #33's fix
//      never fired for the actual request real users hit. Confirmed by two
//      live production requests, both before and after PR #33 deployed,
//      both returning verdict:null for the same input.
//   3. A second, unused function (generateFallbackNarrator in
//      narrator-prompt.ts) already contained a correct verdict formula --
//      dead code, imported, never called.
//   4. Architecturally, sourcing the verdict from the AI narrator at all is
//      wrong: the AI may explain a financial conclusion, it must not
//      originate one (same principle Gate 4 / PR #27's confidence-semantics
//      work already established for the score/confidence field). Both the
//      narrator path and the fallback path now consume ONE canonical
//      derivation, fed by the SAME calc object (calculateStrictFinancials)
//      both paths already flow through inside transformResponse() before
//      this file's function is called -- see index.ts:1743 vs. the
//      transformResponse() return statement.
//
// This module is a pure classification function over already-computed
// canonical financial output. It must never recompute profitability,
// payback, or LTV:CAC itself -- see VERDICT_CONSUMERS.md for the full
// consumer inventory and why duplicate derivations were removed.

import type { StrictFinancialResult } from "./financial-calculator.ts";

export type InvestmentVerdict = "HIGH_RISK" | "MEDIUM_RISK" | "LOW_RISK" | "PROMISING";

/**
 * How much of the underlying financial state came from the user versus
 * benchmark defaults. A verdict computed almost entirely from benchmark
 * placeholders carries materially weaker evidentiary weight than one
 * grounded in the user's own numbers -- this must be visible to every
 * consumer, not silently collapsed into the same-looking verdict string.
 */
export type VerdictBasis = "USER_ACTUAL" | "MIXED" | "BENCHMARK_MODELED";

export interface InvestmentVerdictResult {
  verdict: InvestmentVerdict;
  basis: VerdictBasis;
  reasons: string[];
}

/** Minimal shape this function actually reads from caller-supplied inputs --
 *  intentionally decoupled from index.ts's OptionalFinancialInputs interface
 *  so this module has no import-cycle dependency on index.ts. */
export interface VerdictInputProvenance {
  monthly_revenue?: number;
  startup_investment?: number;
  cac?: number;
  average_price?: number;
  expected_customers?: number;
}

const PROVENANCE_FIELDS: (keyof VerdictInputProvenance)[] = [
  "monthly_revenue", "startup_investment", "cac", "average_price", "expected_customers",
];

function providedFieldCount(userInputs: VerdictInputProvenance | undefined): number {
  if (!userInputs) return 0;
  return PROVENANCE_FIELDS.filter((f) => typeof userInputs[f] === "number" && Number.isFinite(userInputs[f])).length;
}

function classifyBasis(userInputs: VerdictInputProvenance | undefined): VerdictBasis {
  const provided = providedFieldCount(userInputs);
  if (provided === 0) return "BENCHMARK_MODELED";
  if (provided >= 3) return "USER_ACTUAL";
  return "MIXED";
}

/**
 * Honest 0-100 "how much of this analysis's financial state came from the
 * user" percentage -- built 2026-08-17 as the second half of the score:90
 * TRUST DEFECT fix. The free wire payload originally replaced the deprecated
 * blended "score" with quality-dimensions.ts's confidenceBreakdown.input_completeness,
 * which turned out to have the SAME disease it was meant to cure: index.ts's
 * "AI-estimated fields that look non-default" bonus (~line 3367-3374) credits
 * completeness whenever the AI's own generated numbers merely differ from a
 * handful of arbitrary literal sentinels (mrr!==50000, startup_investment!==
 * 100000, cac!==industry_typical, ltv!==500) -- which is true for nearly
 * every AI response regardless of whether the user supplied anything. Live
 * proof: a bare idea+location request with zero financial_inputs scored
 * input_completeness:100. This function instead counts ONLY genuinely
 * user-supplied fields (the exact same PROVENANCE_FIELDS list classifyBasis
 * already uses for verdict_basis) -- zero AI/benchmark credit, ever.
 */
export function computeInputCompletenessPct(userInputs: VerdictInputProvenance | undefined): number {
  return Math.round((providedFieldCount(userInputs) / PROVENANCE_FIELDS.length) * 100);
}

/**
 * Derives ONE canonical investment verdict from an already-computed
 * StrictFinancialResult. Every consumer (free wire payload, paid response,
 * hybrid validator, PDF, dashboard) must read this result, not compute its
 * own.
 *
 * Threshold rationale (carried over from the one place this logic
 * previously existed correctly, generateFallbackNarrator in
 * narrator-prompt.ts -- re-verified against calc's real field set before
 * reuse, not copied blindly):
 *   - Not profitable -> HIGH_RISK, full stop. Profitability gates every
 *     other signal; an excellent LTV:CAC ratio on a loss-making business is
 *     not a PROMISING business (explicit anti-fabrication requirement).
 *   - ltvCacRatio < 2 -> HIGH_RISK. Below 2x, acquisition spend is not
 *     covering its own cost with meaningful margin.
 *   - paybackResult.status !== "VALUE" (NOT_ACHIEVED_WITHIN_HORIZON,
 *     INSUFFICIENT_INPUTS, INVALID_INPUTS, MODEL_UNSUPPORTED) while
 *     profitable -> MEDIUM_RISK. Uses the typed payback contract
 *     (payback-contract.ts) directly -- never the raw numeric
 *     paybackMonths/999 sentinel, per this session's own prior payback-999
 *     display-leak fix.
 *   - ltvCacRatio >= 3 AND payback achieved within horizon at <= 18 months
 *     -> PROMISING.
 *   - Everything else profitable -> LOW_RISK.
 *
 * Anti-fabrication guard (mandate S6): a PROMISING verdict computed from
 * BENCHMARK_MODELED inputs is downgraded to LOW_RISK with an explicit
 * reason. A benchmark-default LTV:CAC clearing an arbitrary threshold is
 * not the same evidentiary claim as a user's own numbers clearing it, and
 * must not be presented identically.
 */
export function deriveInvestmentVerdict(
  calc: Pick<StrictFinancialResult, "isProfitable" | "ltvCacRatio" | "paybackResult" | "cac" | "ltv">,
  userInputs: VerdictInputProvenance | undefined,
): InvestmentVerdictResult {
  const reasons: string[] = [];
  const basis = classifyBasis(userInputs);

  // No divide-by-zero / Infinity leak: if the engine ever produced a
  // non-finite ratio (malformed cac=0 upstream despite its own guards),
  // treat it as the weakest signal rather than propagate NaN/Infinity into
  // a customer-facing verdict.
  const ltvCacRatio = Number.isFinite(calc.ltvCacRatio) ? calc.ltvCacRatio : 0;
  if (!Number.isFinite(calc.ltvCacRatio)) {
    reasons.push("LTV:CAC ratio was non-finite (cac or ltv missing/zero) -- treated as weakest signal");
  }

  let verdict: InvestmentVerdict;

  if (!calc.isProfitable) {
    verdict = "HIGH_RISK";
    reasons.push("Business is not profitable at the computed cost/revenue structure");
  } else if (ltvCacRatio < 2) {
    verdict = "HIGH_RISK";
    reasons.push(`LTV:CAC ratio of ${ltvCacRatio.toFixed(1)}x is below the 2x minimum viability threshold`);
  } else if (calc.paybackResult?.status !== "VALUE") {
    verdict = "MEDIUM_RISK";
    reasons.push(
      calc.paybackResult
        ? `Investment payback not achieved within the modeled horizon (${calc.paybackResult.status})`
        : "Payback could not be computed",
    );
  } else if (ltvCacRatio >= 3 && calc.paybackResult && Number(calc.paybackResult.months) <= 18) {
    verdict = "PROMISING";
    reasons.push(`LTV:CAC ratio of ${ltvCacRatio.toFixed(1)}x with payback in ${calc.paybackResult.months} months`);
  } else {
    verdict = "LOW_RISK";
    reasons.push("Profitable with acceptable but not exceptional unit economics");
  }

  if (verdict === "PROMISING" && basis === "BENCHMARK_MODELED") {
    verdict = "LOW_RISK";
    reasons.push(
      "Downgraded from PROMISING: the underlying numbers are entirely benchmark-modeled placeholders, " +
      "not user-supplied data -- a modeled LTV:CAC clearing a threshold is not the same evidentiary claim " +
      "as the user's own numbers clearing it",
    );
  }

  return { verdict, basis, reasons };
}
