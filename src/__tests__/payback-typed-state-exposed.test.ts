import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/analyze-business/index.ts"),
  "utf8",
);
const schemaSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/analyze-business/boundary-schemas.ts"),
  "utf8",
);

describe("payback's typed state (VALUE/NOT_APPLICABLE/etc) reaches the wire payload, not just the legacy 999 number", () => {
  it("exposes payback_status and payback_reason_code from calc.paybackResult alongside the unchanged legacy field", () => {
    const idx = source.indexOf("result.financial_analysis.payback_period_months = calc.paybackMonths");
    expect(idx).toBeGreaterThan(-1);
    const block = source.slice(idx, idx + 600);
    expect(block).toContain("result.financial_analysis.payback_status = calc.paybackResult?.status ?? null");
    expect(block).toContain("result.financial_analysis.payback_reason_code = calc.paybackResult?.reasonCode ?? null");
    expect(block).toContain("result.financial_analysis.returns.payback_status = calc.paybackResult?.status ?? null");
    expect(block).toContain("result.financial_analysis.returns.payback_reason_code = calc.paybackResult?.reasonCode ?? null");
  });

  it("does not change the legacy payback_period_months contract (still calc.paybackMonths, still numeric 999 on the horizon/unprofitable cases)", () => {
    expect(source).toContain("result.financial_analysis.payback_period_months = calc.paybackMonths;");
    expect(source).toContain("result.financial_analysis.returns.payback_period_months = calc.paybackMonths;");
  });

  it("declares the new fields in the response boundary schema so they aren't silently stripped", () => {
    expect(schemaSource).toContain("payback_status");
    expect(schemaSource).toContain("payback_reason_code");
    // .passthrough() already means unknown keys survive, but the fields
    // should be explicitly declared for discoverability -- this assertion
    // guards against someone later replacing .passthrough() with .strict()
    // and silently dropping these without noticing.
    const returnsIdx = schemaSource.indexOf("returns: z");
    const returnsBlockEnd = schemaSource.indexOf(".passthrough()", returnsIdx);
    const returnsBlock = schemaSource.slice(returnsIdx, returnsBlockEnd);
    expect(returnsBlock).toContain("payback_status");
    expect(returnsBlock).toContain("payback_reason_code");
  });
});
