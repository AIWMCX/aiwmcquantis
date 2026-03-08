

# Phase 3 — Monte Carlo Simulation & Scenario Engine

## What Exists

- **`src/lib/quantis-math.ts`** — Full `QuantisMath` class with `mean`, `median`, `percentile`, `standardDeviation`, all precision-safe via `decimal.js`
- **`src/components/analysis/ScenarioSelector.tsx`** — Simple 3-way toggle (pessimistic/base/optimistic) with no underlying simulation
- **`src/components/analysis/SensitivityTornado.tsx`** — Tornado chart showing ±20% swings per variable (recharts)
- **`src/types/analysis.ts`** — `BusinessInputVariables` (12 variables), `ScenarioMetrics`, `ScenarioAnalysis` interfaces

No Monte Carlo engine, no seeded PRNG, no range-mode inputs, no scenario presets exist.

## Implementation

### File 1: `src/lib/monte-carlo.ts` (New)

Core Monte Carlo simulation engine — pure TypeScript, runs in browser.

- `MonteCarloParam`, `MonteCarloConfig`, `MonteCarloResult` interfaces as specified
- **Mulberry32** seeded PRNG for reproducibility
- **Box-Muller** transform for normal distribution sampling
- **Inverse CDF** for triangular distribution
- Chunked processing (500 iterations per `setTimeout` yield) to avoid UI blocking
- All stats computed via `QuantisMath` (mean, median, percentile, stdDev)
- 20-bucket histogram generation
- `estimateRuntime(iterations, paramCount)` — heuristic ms estimate
- `generateCorridorData(result, months)` — time-series corridor with p10/p25/median/p75/p90

### File 2: `src/services/scenario-engine.ts` (New)

Scenario presets and comparison runner.

- `ScenarioPreset` interface with `shocks: Record<string, { multiplier, absoluteChange? }>`
- `BUILT_IN_SCENARIOS` array: recession, rent_doubles, ad_surge, slow_launch, best_case, worst_case, competitor_entry, viral_moment — 8 presets with icons and descriptions
- `applyScenario(baseParams, preset)` — clones params, applies multipliers/offsets
- `runScenarioComparison(base, scenarios)` — runs each scenario through Monte Carlo (1000 iterations) and the financial engine, returns `ScenarioComparison[]` with revenue/profit at month 12, cash runway, breakeven month, survival probability

### File 3: `src/components/analysis/RangeModeToggle.tsx` (New)

UI toggle + range input component:

- Toggle switch between "Single value" and "Range mode"
- In range mode: renders 3 inline inputs (Min / Base / Max) with subtle gradient row background
- Tiny inline SVG distribution preview (bell curve for normal, triangle for triangular)
- Distribution type selector dropdown (uniform / normal / triangular)
- Outputs `MonteCarloParam` shape for each field
- Pure Tailwind styling, no external dependencies

### File 4: `src/components/analysis/MonteCarloResults.tsx` (New)

Results display component:

- Probability corridor chart (area chart with p10–p90 bands using recharts)
- Key stats card: mean, median, p10, p90, probability positive
- Histogram visualization (20-bucket bar chart)
- Scenario comparison table (if multiple scenarios run)

### Wiring

- **`src/components/analysis/AnalysisResults.tsx`** — Add a "Simulation" tab that renders `MonteCarloResults` when simulation data is available
- **`src/components/analysis/AdvancedFinancialInputs.tsx`** — Integrate `RangeModeToggle` into the input form so users can switch any financial field to range mode

### Files Summary

| File | Action |
|------|--------|
| `src/lib/monte-carlo.ts` | New — core simulation engine |
| `src/services/scenario-engine.ts` | New — presets + comparison |
| `src/components/analysis/RangeModeToggle.tsx` | New — range input UI |
| `src/components/analysis/MonteCarloResults.tsx` | New — simulation results display |
| `src/components/analysis/AnalysisResults.tsx` | Add Simulation tab |
| `src/components/analysis/AdvancedFinancialInputs.tsx` | Wire range mode toggle |

