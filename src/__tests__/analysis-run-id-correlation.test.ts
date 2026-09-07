import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/analyze-business/index.ts"),
  "utf8",
);

describe("AI-run correlation (Priority 5 / Workstream F fix)", () => {
  it("generates a durable analysisRunId before the first provider call", () => {
    const runIdIdx = source.indexOf("const analysisRunId = crypto.randomUUID();");
    const aiCallIdx = source.indexOf("await aiCall(");
    expect(runIdIdx).toBeGreaterThan(-1);
    expect(aiCallIdx).toBeGreaterThan(runIdIdx);
  });

  it("does NOT pass analysisId to aiCall() -- ai_calls.analysis_id has a FK to analyses(id), and analysisRunId never corresponds to a real analyses row at write time, so passing it makes every insert violate the FK and silently drop the whole telemetry row (live-confirmed 2026-09-06: a direct insert with a fabricated analysis_id reproduced error 23503)", () => {
    const aiCallIdx = source.indexOf("await aiCall(");
    const optsBlockEnd = source.indexOf("dahlAlias: 'fast_reasoning',", aiCallIdx);
    const optsBlock = source.slice(aiCallIdx, optsBlockEnd);
    expect(optsBlock).not.toContain("analysisId: analysisRunId");
    expect(optsBlock).not.toContain("analysisId:");
  });

  it("still keeps the run id correlatable via metadata (no FK on a jsonb column) instead of the FK'd analysis_id column", () => {
    const aiCallIdx = source.indexOf("await aiCall(");
    const optsBlockEnd = source.indexOf("dahlAlias: 'fast_reasoning',", aiCallIdx);
    const optsBlock = source.slice(aiCallIdx, optsBlockEnd);
    expect(optsBlock).toContain("analysis_run_id: analysisRunId");
  });

  it("returns the run id in the response payload so the caller can persist it on the saved analyses row", () => {
    const payloadIdx = source.indexOf("const fullPayload = {");
    const runIdFieldIdx = source.indexOf("analysis_run_id: analysisRunId,", payloadIdx);
    expect(payloadIdx).toBeGreaterThan(-1);
    expect(runIdFieldIdx).toBeGreaterThan(payloadIdx);
    // Must appear before the payload closes -- a loose indexOf could match
    // some unrelated later occurrence, so bound it to a small window.
    expect(runIdFieldIdx - payloadIdx).toBeLessThan(500);
  });
});
