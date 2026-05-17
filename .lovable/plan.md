# Benchmark-First Analysis Pipeline — Hardening Plan

## Problem (confirmed from code + DB)

- `benchmark_master_*` tables hold **97,500 rows** and `benchmark_lookup` RPC + V2 engine (`benchmark-engine-v2.ts`) exist and work.
- `analyze-business/index.ts` calls `getBenchmarkSummary(...)` at L3267, but when the **AI narrator fails** the whole result switches to `usedFallback=true` (L3576+) and the deterministic path **drops the V2 benchmark percentiles from the output JSON**. The PDF then prints "Estimated — Engine fallback (no direct row)" with no P25/P50/P75.
- When the edge function itself errors, `src/services/analysisApi.ts → emergencyFallbackAnalysis` runs **client-side with zero DB access**, producing the "0.1 vs 999 month CAC payback" contradictions reported in the PDFs.
- There is no single canonical metric object — `cac_payback_months` is recomputed in narrator, in fallback, and in `analysisContract`, which is how two different values land in the same report.

## Goal

Every analysis (success path **and** fallback path) carries a `benchmarks{}` block populated from the real `benchmark_master_*` tables, with one canonical value per metric and explicit `match_type` per row. No silent client-side fallback.

---

## Step 1 — Decouple "narrator failed" from "benchmarks failed"

File: `supabase/functions/analyze-business/index.ts`

- Compute `v2BenchmarkSummary` **before** the narrator call (already is). Persist it in a `benchmarkRecords` map keyed by metric.
- When `usedFallback=true` (narrator failed), keep using `v2BenchmarkSummary` to populate the response's `benchmarks` block instead of stripping it.
- Always include in the response:
  ```ts
  meta: {
    engine_mode: usedFallback ? "deterministic" : "full",
    benchmark_mode: v2BenchmarkSummary ? "live" : "unavailable",
    benchmark_match_summary: { direct: N, similar: M, none: K }
  }
  ```
- Stop labeling deterministic+live-benchmarks output as "Fallback used because: Failed to send a request to the Edge Function." That message is wrong — the function did run.

## Step 2 — Build a canonical `BenchmarkRecord` per metric

New module: `supabase/functions/analyze-business/benchmark-records.ts`

```ts
type MatchType = 'direct' | 'similar' | 'none';
interface BenchmarkRecord {
  metric: string;            // 'gross_margin' | 'cac_payback_months' | …
  unit: 'percent'|'months'|'usd'|'ratio';
  value: number | null;      // engine-computed value
  p25: number | null; median: number | null; p75: number | null;
  sample_size: number; source: string | null; dataset_date: string | null;
  match_type: MatchType; match_level: string | null;
}
```

`buildBenchmarkRecords(summary, computed)` returns one record per metric in a fixed list:
`gross_margin, operating_margin, net_margin, cac, ltv, ltv_cac_ratio, cac_payback_months, churn_monthly, retention_12m, arpu, revenue_growth_yoy, rent_pct_rev, payroll_pct_rev, marketing_pct_rev, survival_years`.

The `benchmarks` block in the response is this array. PDF/UI reads only from here — no parallel inference.

## Step 3 — Single source of truth for derived metrics

New module: `supabase/functions/_shared/canonical-metrics.ts` (mirrored client-side at `src/lib/canonical-metrics.ts`).

- One function `computeCanonicalMetrics(inputs)` returns `{ mrr, arr, gross_margin, net_margin, cac, ltv, ltv_cac, cac_payback_months, project_payback_years }`.
- Hard invariants (enforced inside the function):
  - If `net_profit ≤ 0` → `cac_payback_months = null`, `ltv_cac = min(rawLtvCac, 3)`, `notes.push('CAC payback not meaningful — negative unit economics')`.
  - If `gross_margin ≤ 0` → `ltv = null`, `cac_payback_months = null`.
  - Never emit sentinel values like `0.1` or `999`.
- Narrator, fallback path, response builder, and PDF all consume this **one** object. Delete duplicate math in `analysisApi.emergencyFallbackAnalysis` and `narrator-prompt.ts`.

## Step 4 — Kill the silent client-side emergency fallback

File: `src/services/analysisApi.ts`

- Replace `emergencyFallbackAnalysis` with a hard error surfaced to the UI: `ANALYSIS_UNAVAILABLE` with a retry CTA. Reasoning: a client-side fabricated report with no DB access is exactly what produced the contradictions the reviewer flagged.
- Keep one retry with backoff (already there). After retries, throw — do not fabricate.
- Add a feature flag `VITE_ALLOW_CLIENT_FALLBACK=false` (default) so we can ship safely; setting `true` falls back to a **server proxy** that still calls `benchmark_lookup` via the anon client and never invents percentiles.

## Step 5 — Server-side narrator failure path that still uses benchmarks

In `analyze-business/index.ts` when narrator fails:

1. Use `computeCanonicalMetrics`.
2. Use `v2BenchmarkSummary` to fill `benchmarks[]`.
3. Generate scenarios deterministically from canonical metrics × (0.75 / 1.0 / 1.2) revenue, recomputing P&L — never apply different multipliers to derived ratios.
4. Set `confidence_score = clamp(40, 60, base)`, `engine_mode = 'deterministic'`, `benchmark_mode = 'live'`.
5. `analysis_limitations` lists exactly: narrator unreachable, which metrics had `match_type='none'`, and which inputs were missing.

## Step 6 — Public benchmark API contract (already in DB, expose properly)

The `benchmark_lookup(metric, sector, business_model, country, city_tier, stage, size)` RPC already exists and returns the right shape. We will:

- Expose a thin Edge Function `POST /benchmarks/query` for external testing and CI — accepts `{ context, metrics[] }`, fans out to `benchmark_lookup` per metric in parallel, returns `{ matches: BenchmarkRecord[] }`.
- This is the contract the spec the user pasted describes; `match_type` derives from RPC `match_level` (`exact`/`no_size`/`no_city` → `direct`, `sector_model`/`sector_only` → `similar`, missing → `none`).

## Step 7 — Output schema contract enforced by Zod

File: `supabase/functions/analyze-business/schemas.ts` — add:

```ts
const BenchmarkRecordSchema = z.object({ metric: z.string(), unit: z.enum(['percent','months','usd','ratio']),
  value: z.number().nullable(), p25: z.number().nullable(), median: z.number().nullable(), p75: z.number().nullable(),
  sample_size: z.number(), source: z.string().nullable(), dataset_date: z.string().nullable(),
  match_type: z.enum(['direct','similar','none']), match_level: z.string().nullable() });
const ResponseSchema = z.object({
  meta: z.object({ engine_mode: z.enum(['full','deterministic']),
                   benchmark_mode: z.enum(['live','unavailable']),
                   confidence_score: z.number().min(0).max(100) }),
  benchmarks: z.array(BenchmarkRecordSchema),
  financial_analysis: …, scenarios: …, analysis_limitations: z.array(z.string())
});
```

Response is `ResponseSchema.parse(...)` — invalid shape returns 500 instead of leaking inconsistent JSON to the PDF.

## Step 8 — PDF and UI read only `benchmarks[]`

Files: `src/components/analysis/AccuracyTransparentResults.tsx`, PDF templates.

- Remove every place that re-derives a percentile string locally.
- Render `match_type='none'` rows as **"Not benchmarked — insufficient comparable data"** (no fake numbers, no "verified" badge).
- The "95,500 datapoints verified" badge only renders if `meta.benchmark_mode === 'live' && benchmark_match_summary.direct + similar > 0`.

## Step 9 — Integration tests (CI gate)

New file: `src/__tests__/benchmark-pipeline-e2e.test.ts` + `supabase/functions/analyze-business/__tests__/benchmark-records_test.ts`.

Tests required to pass before merge:

1. **Direct match**: seed sector=B2B SaaS row; analysis returns `benchmarks[gross_margin].match_type === 'direct'` and median equals seeded value.
2. **Similar match**: seed only sector-level row; sub-sector mismatch returns `match_type === 'similar'`.
3. **No match**: unknown sector → `match_type === 'none'`, `median === null`, no fabricated number.
4. **Narrator down**: mock LLM 500; assert `engine_mode === 'deterministic'`, `benchmark_mode === 'live'`, benchmarks block still populated, no client fallback.
5. **Edge function down**: mock invoke error; UI surfaces `ANALYSIS_UNAVAILABLE` — never returns a fabricated `BusinessAnalysisResult`.
6. **Coherence invariant**: negative net profit → `cac_payback_months === null` everywhere in response; never `0.1` and never `999`.
7. **Schema**: `ResponseSchema.parse(realResponse)` succeeds on 10 golden cases.

CI: wire into existing `vitest` and `supabase test_edge_functions` jobs.

## Step 10 — Observability

- Log `benchmark_match_summary` to `analyses.metadata` jsonb so admin dashboard can plot `% direct / % similar / % none` per industry.
- Add tile to `QuantisHealth.tsx`: "Benchmark coverage (7d): X% direct, Y% similar, Z% none".

---

## Out of scope (this plan)

- Rebuilding the benchmark dataset itself (rows are already in DB).
- AI consensus gate (Month 1 Week 2 — separate plan).
- Streaming SSE results (Month 1 Week 4).
- Pricing / landing / SEO work.

## Files touched

Create: `supabase/functions/analyze-business/benchmark-records.ts`, `supabase/functions/_shared/canonical-metrics.ts`, `src/lib/canonical-metrics.ts`, `supabase/functions/benchmarks-query/index.ts`, `src/__tests__/benchmark-pipeline-e2e.test.ts`, `supabase/functions/analyze-business/__tests__/benchmark-records_test.ts`.

Edit: `supabase/functions/analyze-business/index.ts` (response builder + fallback branch), `supabase/functions/analyze-business/schemas.ts` (Zod response schema), `supabase/functions/analyze-business/narrator-prompt.ts` (use canonical metrics), `src/services/analysisApi.ts` (remove emergency fallback fabrication), `src/components/analysis/AccuracyTransparentResults.tsx` (read benchmarks[] only), PDF templates, `src/pages/admin/QuantisHealth.tsx` (coverage tile).

## Acceptance

After ship, a new analysis must show in the PDF for at least 8 of the 15 metrics: a real `P25 / Median / P75` row with source + sample size, `match_type` chip = direct or similar, **and the same `cac_payback_months` value in every section.** Narrator outages no longer downgrade the benchmark block.
