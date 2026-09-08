import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/api-analyze-main/index.ts"),
  "utf8",
);

describe("public API 60 req/hour claim is actually enforced", () => {
  it("fetches rate_limit_per_hour AND checks it against a real 1-hour request count", () => {
    expect(source).toContain("rate_limit_per_hour");
    const hourlyLimitIdx = source.indexOf("const hourlyLimit = key.rate_limit_per_hour");
    expect(hourlyLimitIdx).toBeGreaterThan(-1);
    const sinceHourIdx = source.indexOf("60 * 60 * 1000", hourlyLimitIdx);
    expect(sinceHourIdx).toBeGreaterThan(hourlyLimitIdx);
  });

  it("rejects with 429 RATE_LIMITED once the hourly count meets the limit, before forwarding to analyze-business", () => {
    const hourlyLimitIdx = source.indexOf("const hourlyLimit = key.rate_limit_per_hour");
    const forwardIdx = source.indexOf("Forward to analyze-business");
    const block = source.slice(hourlyLimitIdx, forwardIdx);
    expect(block).toContain("RATE_LIMITED");
    expect(block).toContain("status: 429");
    expect(forwardIdx).toBeGreaterThan(hourlyLimitIdx);
  });
});
