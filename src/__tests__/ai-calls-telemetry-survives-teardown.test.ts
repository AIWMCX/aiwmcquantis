import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/llm-call.ts"),
  "utf8",
);

describe("ai_calls telemetry survives Edge Runtime teardown (legacy DeepSeek/Anthropic gateway path)", () => {
  it("never fires recordAiCall as a bare `void` promise (Edge Runtime can kill it before the insert lands)", () => {
    expect(source).not.toContain("void recordAiCall(");
  });

  it("wraps every recordAiCall() invocation in scheduleBackgroundWork, matching the Dahl path's own pattern", () => {
    const callSites = source.match(/recordAiCall\(\{/g) ?? [];
    const wrappedSites = source.match(/scheduleBackgroundWork\(recordAiCall\(\{/g) ?? [];
    expect(callSites.length).toBeGreaterThanOrEqual(7);
    expect(wrappedSites.length).toBe(callSites.length);
  });
});
