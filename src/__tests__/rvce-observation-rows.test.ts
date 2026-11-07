import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildObservationRows,
  type RvceEvidenceSample,
} from "../../supabase/functions/rvce-validate/observation-rows";

// rvce-validate cut evidence_samples to the tier's observation limit
// (Free 20, Plus 40, Pro 100) and then persisted that cut list. With 10
// metrics x up to 5 samples, a Free run lost every sample for the later
// metrics, and rvce_observations recorded them as no_external_evidence_found
// even though they were validated against real sources.

const ids = { correlationId: "00000000-0000-0000-0000-000000000001", analysisId: null };

const METRICS = Array.from({ length: 10 }, (_, i) => `metric_${i + 1}`);

const samplesFor = (metric: string, n = 5): RvceEvidenceSample[] =>
  Array.from({ length: n }, (_, i) => ({
    metric,
    source: `Source ${i + 1}`,
    url: `https://example.org/${metric}/${i + 1}`,
    summary: `$${100 + i} — Source ${i + 1}`,
    value: 100 + i,
    provider: "tavily",
  }));

const allOk = Object.fromEntries(METRICS.map((m) => [m, { status: "OK", discrepancy_score: 0 }]));
const allSamples = METRICS.flatMap((m) => samplesFor(m));

const reasons = (rows: Record<string, unknown>[]) => rows.map((r) => r.rejection_reason);

describe("rvce_observations rows", () => {
  it("records every validated metric's evidence when given the full list", () => {
    const rows = buildObservationRows(
      { analysis_id: "x", metrics_validation: allOk, evidence_samples: allSamples },
      ids,
    );
    expect(rows).toHaveLength(50);
    expect(reasons(rows)).not.toContain("no_external_evidence_found");
    expect(new Set(rows.map((r) => r.metric_code))).toEqual(new Set(METRICS));
  });

  it("never stores a validated metric as 'no evidence' when its samples were not passed in", () => {
    const freeTierCut = allSamples.slice(0, 20); // what the old call site persisted
    const rows = buildObservationRows(
      { analysis_id: "x", metrics_validation: allOk, evidence_samples: freeTierCut },
      ids,
    );
    expect(reasons(rows)).not.toContain("no_external_evidence_found");
    const missing = rows.filter((r) => r.raw_value === null);
    expect(missing.map((r) => r.metric_code)).toEqual(METRICS.slice(4));
    expect(new Set(reasons(missing))).toEqual(new Set(["evidence_not_recorded"]));
  });

  it("keeps 'no evidence' for a NO_DATA metric whose providers answered, and the failure for one whose providers failed", () => {
    const rows = buildObservationRows(
      {
        analysis_id: "x",
        metrics_validation: {
          answered: { status: "NO_DATA", discrepancy_score: 0 },
          failed: { status: "NO_DATA", discrepancy_score: 0 },
        },
        evidence_samples: [],
        search_diagnostics: [
          {
            metric: "answered",
            provider_attempts: [
              { provider: "tavily", outcome: "success", reason: null, error_code: null, result_count: 0 },
            ],
          },
          {
            metric: "failed",
            provider_attempts: [
              { provider: "tavily", outcome: "failed", reason: "rate_limited", error_code: "HTTP_429", result_count: 0 },
              { provider: "duckduckgo", outcome: "failed", reason: "timed_out", error_code: "TIMEOUT", result_count: 0 },
            ],
          },
        ],
      },
      ids,
    );
    expect(reasons(rows)).toEqual([
      "no_external_evidence_found",
      "search_provider_failed:tavily=rate_limited,duckduckgo=timed_out",
    ]);
  });

  it("labels web rows by provider, benchmark rows as internal, and rejects outliers", () => {
    const rows = buildObservationRows(
      {
        analysis_id: "11111111-1111-4111-8111-111111111111",
        metrics_validation: {
          web: { status: "OUTLIER", discrepancy_score: 3 },
          bench: { status: "OK", discrepancy_score: 0 },
        },
        evidence_samples: [
          { metric: "web", source: "S", url: "https://example.org/a", summary: "$1 — S", value: 1, provider: "duckduckgo" },
          { metric: "bench", source: "AIWMC Quantis Benchmark Master", url: "", summary: "$2 — B", value: 2 },
        ],
      },
      { correlationId: ids.correlationId, analysisId: "11111111-1111-4111-8111-111111111111" },
    );
    expect(rows).toEqual([
      expect.objectContaining({
        metric_code: "web",
        extraction_method: "rvce_web_search:duckduckgo",
        accepted: false,
        rejection_reason: "outlier_vs_reference",
        source_quality: 0.3,
      }),
      expect.objectContaining({
        metric_code: "bench",
        extraction_method: "internal_benchmark_master",
        source_url: null,
        accepted: true,
        rejection_reason: null,
        source_quality: 0.9,
      }),
    ]);
  });
});

describe("rvce-validate persistence wiring", () => {
  const src = readFileSync("supabase/functions/rvce-validate/index.ts", "utf8");

  it("persists the full evidence list, while the response keeps the tier limit", () => {
    expect(src).toMatch(/evidence_samples: evidenceSamples\.slice\(0, obsLimit\)/);
    expect(src).toMatch(/persistObservations\(adminClient, \{ \.\.\.payload_out, evidence_samples: evidenceSamples \}\)/);
    expect(src).not.toMatch(/persistObservations\(adminClient, payload_out\)/);
    expect(src).toMatch(/buildObservationRows\(/);
  });
});
