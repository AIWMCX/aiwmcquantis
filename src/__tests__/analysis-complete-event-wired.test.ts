import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/analyze-business/index.ts"),
  "utf8",
);

describe("analysis_complete_events canonical emitter is actually wired (2026-09-15 fix)", () => {
  it("imports emitAnalysisComplete from the shared emitter module", () => {
    expect(source).toContain(
      "import { emitAnalysisComplete } from '../_shared/analysis-complete-event.ts';",
    );
  });

  it("calls emitAnalysisComplete on the success path, fire-and-forget wrapped in try/catch", () => {
    const idx = source.indexOf("await emitAnalysisComplete({");
    expect(idx).toBeGreaterThan(-1);
    const block = source.slice(idx - 200, idx + 500);
    expect(block).toContain("try {");
    expect(block).toContain("catch (completeEventErr)");
    // Non-fatal: a failure here must only log, never throw back up or affect
    // the response -- matches the emitter's own fire-and-forget contract.
    expect(block).toMatch(/catch \(completeEventErr\) \{\s*log\.warn/);
  });

  it("passes a tier value that always satisfies the table's CHECK constraint (free|plus|pro), never a raw unvalidated plan_id", () => {
    const idx = source.indexOf("await emitAnalysisComplete({");
    const block = source.slice(idx, idx + 400);
    expect(block).toMatch(/tier:\s*\(\['free', 'plus', 'pro'\] as const\)\.includes/);
    expect(block).toContain(": 'free',");
  });

  it("is wired at the same call site as the already-proven emitAnalysisSnapshot, not a new/untested location", () => {
    const snapshotIdx = source.indexOf("await emitAnalysisSnapshot({");
    const completeIdx = source.indexOf("await emitAnalysisComplete({");
    expect(snapshotIdx).toBeGreaterThan(-1);
    expect(completeIdx).toBeGreaterThan(snapshotIdx);
    // Should be within a few dozen lines of each other, not scattered
    // elsewhere in this 3600+ line handler.
    const between = source.slice(snapshotIdx, completeIdx);
    expect(between.split("\n").length).toBeLessThan(60);
  });
});
