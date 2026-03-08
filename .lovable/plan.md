

# Phase 5 — Auto-Calibration + GIGO Prevention

## What Exists

- **`supabase/functions/analyze-business/embedded-benchmarks.ts`** — 1,246-line file with 50+ `EmbeddedBenchmark` entries from the Kerry dataset. Contains per-industry min/max/avg for margins, CAC, LTV, fixed costs, etc. but NOT percentile distributions (no p10/p25/p50/p75/p90 per parameter).
- **`src/components/analysis/BenchmarkConfidenceIndicator.tsx`** — Existing confidence badge for benchmark staleness (high/medium/low).
- **`src/components/analysis/AdvancedFinancialInputs.tsx`** — 292-line input form with `FIELD_CONFIGS` array rendering labeled inputs with tooltips. No validation warnings or autofill.
- **`src/types/analysis.ts`** — `BusinessInputVariables` (12 vars), `OptionalFinancialInputs`, `ValidationWarning` interfaces.

No `benchmark-calibrator.ts` or `BenchmarkWarning.tsx` exist.

## Implementation

### File 1: `src/lib/benchmark-calibrator.ts` (New)

- `IndustryBenchmark` interface with `{ industryType, parameter, p10, p25, p50, p75, p90, unit, source, lastUpdated }`
- `BENCHMARK_DATABASE: IndustryBenchmark[]` — 10 industries × 12 parameters = 120 entries with realistic percentile distributions derived from embedded benchmarks data
- `autofillMissingParams(partialParams, industryType)` → fills gaps with p50 values, returns `{ filledParams, autofilledFields, confidence }`
- `validateParamAgainstBenchmarks(param, value, industryType)` → returns `{ isValid, warningLevel, message, benchmarkRange, percentile }` where:
  - Within p25–p75 → "none"
  - p10–p25 or p75–p90 → "mild"
  - Beyond p10 or p90 but within 2× → "strong"
  - Beyond 2× of p10/p90 → "critical"

### File 2: `src/components/analysis/BenchmarkWarning.tsx` (New)

Renders validation output per-field:
- `none`: nothing
- `mild`: small yellow dot
- `strong`: yellow banner with "Use median" button
- `critical`: red banner with "Adjust to realistic" button
- Pure Tailwind, receives `warningLevel`, `message`, `benchmarkRange`, `onUseMedian` callback

### File 3: `src/components/analysis/AdvancedFinancialInputs.tsx` (Edit)

- Import `validateParamAgainstBenchmarks` and `BenchmarkWarning`
- After each input field, call validation against current industry and render `BenchmarkWarning` inline
- Add "Auto-fill from benchmarks" button that calls `autofillMissingParams`

### Files Summary

| File | Action |
|------|--------|
| `src/lib/benchmark-calibrator.ts` | New — benchmark database + autofill + validation |
| `src/components/analysis/BenchmarkWarning.tsx` | New — inline warning UI |
| `src/components/analysis/AdvancedFinancialInputs.tsx` | Edit — wire validation + autofill |

