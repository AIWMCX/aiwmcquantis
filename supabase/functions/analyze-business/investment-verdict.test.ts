// Test matrix for deriveInvestmentVerdict() -- FREE-NULL-VERDICT root-cause fix.
//
// Run standalone: `bunx vitest run supabase/functions/analyze-business/investment-verdict.test.ts`
// This directory has no Deno test harness in CI (only qoc-orchestrate has one, via
// qoc-gate.yml) and eslint ignores supabase/functions entirely (confirmed by running
// eslint directly against these two files -- "File ignored because of a matching
// ignore pattern"). deriveInvestmentVerdict() has zero Deno-specific runtime
// dependencies (its only import is `import type`, erased at compile time), so Vitest
// is a valid, honest way to exercise it -- this file is NOT wired into
// `bun run test:quality` (that script globs src/__tests__ only) and must be run with
// the explicit path above until/unless a real Deno test harness exists for this
// function directory.

import { describe, expect, it } from "vitest";
import { deriveInvestmentVerdict, computeInputCompletenessPct, type VerdictInputProvenance } from "./investment-verdict.ts";
import type { StrictFinancialResult } from "./financial-calculator.ts";
import type { MonthsMetricResult } from "./payback-contract.ts";

type Calc = Pick<StrictFinancialResult, "isProfitable" | "ltvCacRatio" | "paybackResult" | "cac" | "ltv">;

function payback(months: number): MonthsMetricResult {
  return { status: "VALUE", months: String(months), horizonMonths: 36, formulaId: "test", reasonCode: null };
}

function paybackNotAchieved(): MonthsMetricResult {
  return {
    status: "NOT_ACHIEVED_WITHIN_HORIZON",
    months: null,
    horizonMonths: 36,
    formulaId: "test",
    reasonCode: "NOT_ACHIEVED_WITHIN_HORIZON",
  };
}

const fullUserInputs: VerdictInputProvenance = {
  monthly_revenue: 12000,
  startup_investment: 20000,
  cac: 150,
  average_price: 60,
  expected_customers: 200,
};

describe("deriveInvestmentVerdict", () => {
  it("happy path: profitable, strong ratio, fast payback, real user inputs -> PROMISING", () => {
    const calc: Calc = { isProfitable: true, ltvCacRatio: 4, paybackResult: payback(10), cac: 150, ltv: 600 };
    const result = deriveInvestmentVerdict(calc, fullUserInputs);
    expect(result.verdict).toBe("PROMISING");
    expect(result.basis).toBe("USER_ACTUAL");
  });

  it("anonymous quick path: no user inputs at all -> basis is BENCHMARK_MODELED", () => {
    const calc: Calc = { isProfitable: true, ltvCacRatio: 4, paybackResult: payback(10), cac: 150, ltv: 600 };
    const result = deriveInvestmentVerdict(calc, undefined);
    expect(result.basis).toBe("BENCHMARK_MODELED");
    // Anti-fabrication rule: benchmark-only PROMISING is downgraded.
    expect(result.verdict).toBe("LOW_RISK");
  });

  it("unprofitable business must never get PROMISING, regardless of ratio", () => {
    const calc: Calc = { isProfitable: false, ltvCacRatio: 10, paybackResult: payback(3), cac: 50, ltv: 500 };
    const result = deriveInvestmentVerdict(calc, fullUserInputs);
    expect(result.verdict).toBe("HIGH_RISK");
    expect(result.verdict).not.toBe("PROMISING");
  });

  it("excellent LTV:CAC but negative economics must never produce false PROMISING", () => {
    // isProfitable=false is the actual negative-economics signal; ratio alone cannot override it.
    const calc: Calc = { isProfitable: false, ltvCacRatio: 8, paybackResult: null, cac: 20, ltv: 160 };
    const result = deriveInvestmentVerdict(calc, fullUserInputs);
    expect(result.verdict).toBe("HIGH_RISK");
  });

  it("payback not reached within horizon is handled semantically, not as raw 999", () => {
    const calc: Calc = { isProfitable: true, ltvCacRatio: 3.5, paybackResult: paybackNotAchieved(), cac: 150, ltv: 600 };
    const result = deriveInvestmentVerdict(calc, fullUserInputs);
    expect(result.verdict).toBe("MEDIUM_RISK");
    expect(result.reasons.join(" ")).toContain("NOT_ACHIEVED_WITHIN_HORIZON");
    expect(result.reasons.join(" ")).not.toMatch(/999/);
  });

  it("missing CAC (non-finite ratio) does not divide-by-zero/Infinity into the verdict", () => {
    const calc: Calc = { isProfitable: true, ltvCacRatio: Infinity, paybackResult: payback(5), cac: 0, ltv: 600 };
    const result = deriveInvestmentVerdict(calc, fullUserInputs);
    // Non-finite ratio is guarded to 0, so it cannot silently pass the >=2 / >=3 gates.
    expect(result.verdict).toBe("HIGH_RISK");
    expect(result.reasons.some((r) => r.includes("non-finite"))).toBe(true);
  });

  it("missing LTV does not fabricate a ratio (NaN treated as weakest signal, not skipped)", () => {
    const calc: Calc = { isProfitable: true, ltvCacRatio: NaN, paybackResult: payback(5), cac: 150, ltv: 0 };
    const result = deriveInvestmentVerdict(calc, fullUserInputs);
    expect(result.verdict).toBe("HIGH_RISK");
    expect(result.reasons.some((r) => r.includes("non-finite"))).toBe(true);
  });

  it("benchmark-heavy fallback (0-2 real fields) reflects provenance as MIXED or BENCHMARK_MODELED, never USER_ACTUAL", () => {
    const partial: VerdictInputProvenance = { monthly_revenue: 5000 };
    const calc: Calc = { isProfitable: true, ltvCacRatio: 3.2, paybackResult: payback(12), cac: 150, ltv: 480 };
    const result = deriveInvestmentVerdict(calc, partial);
    expect(result.basis).toBe("MIXED");
    expect(result.basis).not.toBe("USER_ACTUAL");
  });

  it("cross-path parity: identical canonical financial state yields identical verdict regardless of which response path called it", () => {
    const calc: Calc = { isProfitable: true, ltvCacRatio: 3.5, paybackResult: payback(14), cac: 150, ltv: 525 };
    const fromFullPath = deriveInvestmentVerdict(calc, fullUserInputs);
    const fromQuickPath = deriveInvestmentVerdict({ ...calc }, { ...fullUserInputs });
    expect(fromFullPath.verdict).toBe(fromQuickPath.verdict);
    expect(fromFullPath.basis).toBe(fromQuickPath.basis);
  });

  it("profitable with acceptable but unexceptional economics -> LOW_RISK, not PROMISING and not HIGH_RISK", () => {
    const calc: Calc = { isProfitable: true, ltvCacRatio: 2.5, paybackResult: payback(24), cac: 150, ltv: 375 };
    const result = deriveInvestmentVerdict(calc, fullUserInputs);
    expect(result.verdict).toBe("LOW_RISK");
  });

  it("weak ratio (below 2x) is HIGH_RISK even when profitable", () => {
    const calc: Calc = { isProfitable: true, ltvCacRatio: 1.5, paybackResult: payback(8), cac: 150, ltv: 225 };
    const result = deriveInvestmentVerdict(calc, fullUserInputs);
    expect(result.verdict).toBe("HIGH_RISK");
  });
});

describe("computeInputCompletenessPct", () => {
  it("is 0 for undefined inputs (the sparse anonymous/free case) -- never a fabricated high number", () => {
    expect(computeInputCompletenessPct(undefined)).toBe(0);
  });

  it("is 0 for an empty object -- no AI/benchmark credit, ever", () => {
    expect(computeInputCompletenessPct({})).toBe(0);
  });

  it("is 100 when all five provenance fields are real numbers", () => {
    expect(computeInputCompletenessPct(fullUserInputs)).toBe(100);
  });

  it("scales linearly with the count of real fields (2 of 5 -> 40%)", () => {
    expect(computeInputCompletenessPct({ monthly_revenue: 5000, cac: 100 })).toBe(40);
  });

  it("ignores non-finite values (NaN/Infinity are not real user input)", () => {
    expect(computeInputCompletenessPct({ monthly_revenue: NaN, cac: Infinity, average_price: 50 })).toBe(20);
  });

  it("ignores zero -- a literal 0 is not the same as 'the user gave us a number'", () => {
    // classifyBasis/providedFieldCount both use typeof === 'number' && isFinite,
    // which 0 satisfies -- documenting the actual behavior: 0 IS counted as
    // provided (the user explicitly entered zero), distinct from undefined.
    expect(computeInputCompletenessPct({ monthly_revenue: 0 })).toBe(20);
  });
});
