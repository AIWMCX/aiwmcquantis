

# Institutional Transformation — Pillars 1, 6, 7, 8 + OpEx Labor Model

## Overview

Add 5 infrastructure layers (source citations, benchmark freshness, capital readiness, coherence check, bottom-up OpEx) as new library files and UI components, then wire them into the existing results and form views.

## New Library Files

### `src/lib/benchmark-citations.ts`
- `BenchmarkCitation` type: `{ source, reportName, reportDate, sampleSize, geographicScope, lastRefreshed, dataVersion }`
- `SourcedMetric<T>` type wrapping any value with citation + `isEstimated` + `isStale` + `confidence`
- `SOURCE_REGISTRY` map: translates `source` field values (e.g. `'kerry_dataset'`) into human-readable names + report IDs + sample sizes
- `buildCitation(benchmark: IndustryBenchmark): BenchmarkCitation` — constructs from existing `source` + `lastUpdated` fields
- `formatCitation(citation): string` → `"IBISWorld OD6113 · Q1 2025 · n=1,247"`
- `formatCitationCompact(citation): string` → shorter version for table footers

### `src/lib/benchmark-freshness.ts`
- `FRESHNESS_THRESHOLDS` by data category (30/90/365 days)
- `FreshnessResult` type: `{ isStale, warningLevel, daysOld, colorToken }`
- `checkFreshness(lastUpdated: string, category?: string): FreshnessResult`
- `warningLevel`: `'fresh' | 'aging' | 'stale' | 'critical'`
- `getFreshnessIcon(level): string` → `✓ / ⚠ / ⚡`
- Used by citation rendering to append age badge

### `src/lib/coherence-check.ts`
- `CoherenceFlag` type: `{ type, message, suggestion }`
- `checkNarrativeCoherence(description, inputs, industryType): { passed, flags }`
- Checks: premium language + low ARPU, volume language + high CAC, zero churn, luxury + high volume targets
- Uses `BENCHMARK_DATABASE` p50 values for comparison thresholds

### `src/lib/opex-calculator.ts`
- `BottomUpOpEx` type: `{ labor, rent, utilities, insurance, supplies, marketing, total, userInputted, delta, deltaWarning }`
- `STAFFING_MODELS` for 10+ industries: `coffee_shop`, `fitness_boutique`, `restaurant`, `retail`, `salon`, `spa`, `coworking`, `tutoring`, `cleaning`, `food_truck`
- `BLS_WAGES` constants by MSA (Denver, LA, NYC, Chicago, etc.) with fallback national average
- `estimateOpEx(industry, inputs, location): BottomUpOpEx`
- `deltaWarning: boolean` when `|delta| / total > 0.25`

### `src/lib/quantis-safety-levels.ts` — Extend
- Add `CAPITAL_READINESS` map alongside existing `QSL_CONFIG`:
  ```
  [QSL.EXPLORATORY]: { fundingPath, verdict, whatMustChange, nextMilestone }
  [QSL.PLANNING]: { ... }
  [QSL.INVESTOR]: { ... }
  [QSL.LOAN]: { ... }
  ```
- Export `getCapitalReadiness(score: number)` helper
- No changes to existing functions/types

## New UI Components

### `src/components/analysis/CapitalReadinessSection.tsx`
- Props: `confidenceScore: number`
- Uses `getCapitalReadiness()` to render: QSL badge, funding paths list, verdict paragraph, "what must change" bullet list, next milestone
- Styled with `q-card` + left border matching QSL color

### `src/components/analysis/CoherenceFlags.tsx`
- Props: `description: string, inputs: any, industryType: string`
- Calls `checkNarrativeCoherence()` internally
- If `passed`: renders nothing
- If flags exist: renders each flag as a warning card with suggestion text

### `src/components/analysis/OpExWarning.tsx`
- Props: `industry: string, inputs: any, location: string, userOpEx: number`
- Calls `estimateOpEx()` internally
- If `deltaWarning` is false: renders nothing
- If true: renders yellow/orange alert card showing bottom-up estimate vs user input with BLS source citation

## Modified Files

### `src/components/analysis/BeatMissEngine.tsx`
- Import `buildCitation`, `formatCitationCompact`, `checkFreshness` from new libs
- Replace hardcoded `"Proprietary Industry Benchmark Database"` source text with `formatCitationCompact(buildCitation(bm))`
- Add freshness icon next to each row's source text
- Update footer to show full citation with freshness badge

### `src/components/analysis/CompetitiveMatrix.tsx`
- Same pattern: replace `"Proprietary Industry Benchmark Database"` with formatted citation
- Add freshness badge to footer

### `src/components/analysis/ResultsAccordionSections.tsx`
- Add `capitalReadinessContent?: React.ReactNode` prop
- Add new accordion section "Capital Readiness" with `Shield` icon, after Forensic Analysis

### `src/components/analysis/AnalysisResults.tsx`
- Import `CapitalReadinessSection`, `CoherenceFlags`
- Add `CoherenceFlags` inside the existing `forensicContent` wrapper (after QoE)
- Wire `capitalReadinessContent` prop with `<CapitalReadinessSection confidenceScore={result.confidence_score || 70} />`
- Import `OpExWarning` — but note this goes in the form, not results (see below)

### `src/components/analysis/AdvancedFinancialInputs.tsx`
- Import `OpExWarning`
- Render `<OpExWarning>` below the monthly expenses field, passing `industryType`, user's expense input, and location

## File Summary

| File | Change |
|------|--------|
| `src/lib/benchmark-citations.ts` | New |
| `src/lib/benchmark-freshness.ts` | New |
| `src/lib/coherence-check.ts` | New |
| `src/lib/opex-calculator.ts` | New |
| `src/lib/quantis-safety-levels.ts` | Extend with CAPITAL_READINESS |
| `src/components/analysis/CapitalReadinessSection.tsx` | New |
| `src/components/analysis/CoherenceFlags.tsx` | New |
| `src/components/analysis/OpExWarning.tsx` | New |
| `src/components/analysis/BeatMissEngine.tsx` | Add citation + freshness |
| `src/components/analysis/CompetitiveMatrix.tsx` | Add citation + freshness |
| `src/components/analysis/ResultsAccordionSections.tsx` | Add Capital Readiness section |
| `src/components/analysis/AnalysisResults.tsx` | Wire new components |
| `src/components/analysis/AdvancedFinancialInputs.tsx` | Add OpExWarning |

