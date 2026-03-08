

# Phase 6 — Stress Map & Explainable Quantis

## What Exists

- **`src/components/analysis/AnalysisResults.tsx`** — 569-line dashboard with 5-tab layout (Overview, Simulation, Sensitivity, Benchmarks, Reliability). Has an internal `MetricCard` sub-component (lines 520–531) — simple display-only, no explain capability.
- **`src/components/analysis/CopyableMetric.tsx`** — Richer metric card with copy-to-clipboard, tooltips, icons. No explain/audit trail.
- **`src/services/confidence-scorer.ts`** — Exports `ConfidenceTier`, `ConfidenceOutput`, `CONFIDENCE_BADGE_CONFIG` with tier→color/icon mappings.
- **`src/lib/benchmark-calibrator.ts`** — `BENCHMARK_DATABASE` with p10/p25/p50/p75/p90 per industry×parameter. Can supply benchmark data for the ExplainPanel.
- **`src/types/analysis.ts`** — `CalculationAuditEntry` already has `{ formula, inputs, result, isValid, notes }`. `BusinessAnalysisResult` has `validation.calculation_audit`.

No StressMap, ExplainPanel, or explainable MetricCard exist.

## Implementation

### File 1: `src/components/analysis/StressMap.tsx` (New)

**StressMapProps** as specified. Component layout:

1. **Risk Index Gauge** — SVG circle with animated `stroke-dashoffset` (CSS transition 1s ease-out). Color bands: green (0–30), yellow (31–60), orange (61–80), red (81–100). Score number centered.

2. **2×2 Grid** — Four cards (Market 🌍, Margin 📊, Capital 💰, Operations ⚙️). Each has:
   - Progress bar colored by score threshold (red/yellow/lime/green)
   - Bold score number
   - Explanation text + italic recommendation
   - Click handler → `onBlockClick`

3. **`calculateStressScores(result: BusinessAnalysisResult)`** exported function:
   - `marginScore`: gross margin vs benchmark p50 (uses `BENCHMARK_DATABASE`)
   - `capitalScore`: runway months mapped 0–100 (< 3mo = 0, > 18mo = 100)
   - `marketScore`: LTV/CAC ratio mapped (< 1 = 0, > 3 = 100)
   - `operationsScore`: based on burn rate + payroll % of revenue
   - `overallRiskIndex`: weighted average (market 30%, margin 25%, capital 25%, operations 20%), inverted (high score = low risk)
   - Generates explanation and recommendation strings per dimension

4. **Animated gradient background** — CSS `@keyframes` gradient shift based on risk tier, applied as a subtle overlay on the card.

### File 2: `src/components/analysis/ExplainPanel.tsx` (New)

Slide-in right drawer (CSS transform + transition, no dialog library needed):

- **Section 1 "Calculation Chain"**: Renders `formulaSteps[]` as numbered monospace steps
- **Section 2 "Benchmark Position"**: Horizontal SVG bar with p25/p50/p75 markers and a positioned dot for the current value, colored by zone
- **Section 3 "AI Model Contributions"**: Simple horizontal stacked bar showing model weights/values
- **Section 4 "Confidence"**: Tier badge from `CONFIDENCE_BADGE_CONFIG` + score + explanation
- **Footer**: Data freshness timestamp

Uses a backdrop overlay with click-to-close. Keyboard accessible (Escape to close).

### File 3: `src/components/analysis/MetricCard.tsx` (New — replaces internal MetricCard)

Replaces the simple internal `MetricCard` in AnalysisResults. Props: `{ label, value, unit, trend?, delta?, explainData? }`.

- Renders value with optional trend arrow and delta
- Small "?" icon button (top-right) when `explainData` is provided
- Confidence tier colored dot (top-right corner)
- Clicking "?" opens `ExplainPanel` (internal `useState` for open/close)
- Falls back gracefully when no explainData (behaves like current MetricCard)

### File 4: `src/components/analysis/AnalysisResults.tsx` (Edit)

- Add a 6th tab "Risk Map" (or place StressMap in Overview tab below SWOT)
- Import `StressMap` and `calculateStressScores`
- Replace internal `MetricCard` usage with the new exported `MetricCard` component (backward compatible — existing props still work, explainData is optional)
- Wire stress scores from `result` data

### Files Summary

| File | Action |
|------|--------|
| `src/components/analysis/StressMap.tsx` | New — risk heatmap + scoring logic |
| `src/components/analysis/ExplainPanel.tsx` | New — audit trail drawer |
| `src/components/analysis/MetricCard.tsx` | New — explainable metric card |
| `src/components/analysis/AnalysisResults.tsx` | Edit — add Risk Map tab, wire new MetricCard |

