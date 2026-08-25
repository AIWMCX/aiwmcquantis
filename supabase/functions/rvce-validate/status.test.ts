// Test matrix for computeRvceStatus()/fmtMetricValue() -- P0 RVCE fix
// (2026-08-25): out-of-range values silently showing green "Validated".
//
// Run standalone: `bunx vitest run supabase/functions/rvce-validate/status.test.ts`
// Same situation as ../analyze-business/investment-verdict.test.ts: this
// directory has no Deno test harness in CI (only qoc-orchestrate has one,
// via qoc-gate.yml) and eslint ignores supabase/functions entirely.
// computeRvceStatus()/fmtMetricValue() have zero Deno-specific runtime
// dependencies (that's the whole reason they were extracted into their own
// status.ts, out of index.ts which imports `serve` from deno.land), so
// Vitest is a valid, honest way to exercise them -- not wired into
// `bun run test:quality` (that script globs src/__tests__ only) and must be
// run with the explicit path above until/unless a real Deno test harness
// exists for this function directory.

import { describe, expect, it } from "vitest";
import { computeRvceStatus, fmtMetricValue } from "./status.ts";

describe("computeRvceStatus", () => {
  it("returns OK when the value sits within [p25, p75], regardless of the sigma score", () => {
    expect(computeRvceStatus("ltv", 150, 100, 200, 0)).toBe("OK");
    expect(computeRvceStatus("ltv", 100, 100, 200, 0)).toBe("OK"); // inclusive lower bound
    expect(computeRvceStatus("ltv", 200, 100, 200, 0)).toBe("OK"); // inclusive upper bound
  });

  it("real production regression: Customer LTV $391 above a displayed P75 of $200 must NOT be OK", () => {
    // The exact real-report figures. Even with a small discrepancy (large
    // effStd from a skewed source distribution -- the actual root cause),
    // a value outside [p25, p75] can never be 'OK'.
    const status = computeRvceStatus("ltv", 391, /* p25 */ 100, /* p75 */ 200, /* discrepancy */ 0.4);
    expect(status).not.toBe("OK");
  });

  it("real production regression: Rent $156 below a displayed P25 of $235 must NOT be OK", () => {
    const status = computeRvceStatus("opex_rent_monthly", 156, /* p25 */ 235, /* p75 */ 320, /* discrepancy */ -0.3);
    expect(status).not.toBe("OK");
  });

  it("grades severity by sigma ONLY once a value is already known to be out of range", () => {
    // Same out-of-range value, two different discrepancy magnitudes ->
    // WARN vs OUTLIER, proving discrepancy still controls severity even
    // though it no longer controls in-range/out-of-range membership.
    expect(computeRvceStatus("ltv", 250, 100, 200, 1.5)).toBe("WARN");
    expect(computeRvceStatus("ltv", 250, 100, 200, 2.5)).toBe("OUTLIER");
  });

  it("a value that is out of range but happens to have a small sigma score is still not OK", () => {
    // This is the exact bug class: effStd wide enough that |discrepancy| < 1
    // even though the value is clearly outside [p25, p75].
    expect(computeRvceStatus("ltv", 210, 100, 200, 0.2)).toBe("WARN");
    expect(computeRvceStatus("ltv", 210, 100, 200, 0.2)).not.toBe("OK");
  });

  it("CodeRabbit catch (PR #86): classifies at the SAME precision fmtMetricValue displays, not raw full precision", () => {
    // Raw value (200.4) is numerically ABOVE raw p75 (200.3) -- outside the
    // range by 0.1 at full precision -- but both round to the same whole
    // dollar ($200) that fmtMetricValue would actually display, matching
    // its Math.round() precision for '$' metrics. Must classify OK: the
    // user sees identical numbers for "value" and "upper bound" and would
    // find any other status inexplicable.
    expect(computeRvceStatus("ltv", 200.4, 100, 200.3, 0)).toBe("OK");
    // Same shape for a percentage metric, at fmtMetricValue's 1dp precision
    // instead of whole dollars: raw value (71.04) is above raw p75 (71.02),
    // but both display as "71.0%".
    expect(computeRvceStatus("gross_margin_pct", 71.04, 60, 71.02, 0)).toBe("OK");
  });
});

describe("fmtMetricValue", () => {
  it("formats a *_pct metric as a percentage, never as a dollar figure", () => {
    // Real production bug: a gross_margin_pct median of 71 was previously
    // rendered as "$71" in notes text built with a hardcoded `$` prefix.
    expect(fmtMetricValue("gross_margin_pct", 71)).toBe("71.0%");
    expect(fmtMetricValue("gross_margin_pct", 71)).not.toContain("$");
  });

  it("formats a *_ratio metric with an 'x' suffix", () => {
    expect(fmtMetricValue("ltv_cac_ratio", 3.6)).toBe("3.60x");
  });

  it("formats a *_months metric in months", () => {
    expect(fmtMetricValue("cac_payback_months", 5.9)).toBe("5.9 mo");
  });

  it("formats everything else as a dollar figure", () => {
    expect(fmtMetricValue("ltv", 391)).toBe("$391");
    expect(fmtMetricValue("opex_rent_monthly", 156)).toBe("$156");
  });

  it("returns an em-dash for non-finite values", () => {
    expect(fmtMetricValue("ltv", NaN)).toBe("—");
  });
});
