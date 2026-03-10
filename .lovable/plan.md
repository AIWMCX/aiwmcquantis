

# Extract Institutional Design Patterns into Existing Results

## Overview

Add 4 new components that bring institutional-grade analysis patterns (Beat/Miss Engine, Quality of Earnings, Competitive Matrix, Key Metric Spotlight) into the existing results view, using the current Quantis design system tokens.

## New Files

### 1. `src/components/analysis/BeatMissEngine.tsx`
- Accepts `result: BusinessAnalysisResult` prop
- Looks up the detected industry in `BENCHMARK_DATABASE` from `benchmark-calibrator.ts`
- Compares 6 metrics: ARPU (price), CAC, Churn, Gross Margin, LTV:CAC, Break-even
- Each row: label, user value, p50, p75, **BEAT / IN-LINE / MISS** badge with delta %
- Logic: `(user - p50) / p50 * 100` — if >8% favorable = BEAT, <-8% = MISS, else IN-LINE
- Badge colors: `--q-status-green` / `--q-status-yellow` / `--q-status-red`
- All numeric values use `font-family: var(--q-font-mono)`
- Source footer: "Proprietary Industry Benchmark Database · {lastUpdated}"

### 2. `src/components/analysis/QualityOfEarnings.tsx`
- Accepts `result: BusinessAnalysisResult` prop
- Scoring: counts structural wins (LTV:CAC >10×, GM > p50, BE < p50, ARPU > p50)
- 3+ wins + 0 critical flags → **STRUCTURAL**; 2+ → **CONDITIONAL**; else **COSMETIC**
- Renders: verdict badge (green/yellow/red), evidence flag list (✅ structural, ⚠ concern), explanatory paragraph
- Uses `q-card` container with colored left border matching verdict

### 3. `src/components/analysis/CompetitiveMatrix.tsx`
- Accepts `result: BusinessAnalysisResult` prop
- 3-row table: "Your Business" (highlighted), "Industry Median (p50)", "Top Tier (p75)"
- 7 columns: ARPU, Churn, CAC, Gross Margin, Break-even, LTV:CAC, Mo.12 Net
- Each cell shows beat/miss badge for the user row
- User row gets `border-l-[3px] border-l-[var(--q-accent-primary)]`
- Source attribution footer

### 4. `src/components/analysis/KeyMetricSpotlight.tsx`
- Accepts `result: BusinessAnalysisResult` prop
- Identifies highest-sensitivity variable by perturbing each input ±10% and measuring break-even + Mo.12 profit delta
- Shows 4-row scenario table: improvement (−1pp), current, mild degradation (+1pp), severe (+3pp)
- Columns: Scenario, Mo.24 Profit Δ, Break-even Δ
- Actionable recommendation paragraph at bottom
- Target icon (🎯) header with "Watch This Weekly" label

## Modified Files

### `src/components/analysis/ResultsAccordionSections.tsx`
- Add `forensicContent?: React.ReactNode` prop
- Add new accordion section "Forensic Analysis" with `Search` icon, placed after "Market Analysis" and before "Unit Economics"

### `src/components/analysis/AnalysisResults.tsx`
- Import `BeatMissEngine`, `QualityOfEarnings`, `CompetitiveMatrix`, `KeyMetricSpotlight`
- Wire `forensicContent` prop: `<BeatMissEngine>` + `<QualityOfEarnings>` inside a `space-y-4` wrapper
- Add `<CompetitiveMatrix>` after `<IndustryComparison>` inside `marketContent`
- Add `<KeyMetricSpotlight>` in the right column, after the "Top Risk Flags" card (before SCORE export buttons)

## Design Rules
- All components use existing CSS custom properties (`--q-bg-surface`, `--q-status-green`, etc.)
- `q-card` class for containers, `animate-fade-in` with staggered delays
- `var(--q-font-mono)` for all financial values
- No inline color constants — only design tokens

| File | Change |
|------|--------|
| `src/components/analysis/BeatMissEngine.tsx` | New |
| `src/components/analysis/QualityOfEarnings.tsx` | New |
| `src/components/analysis/CompetitiveMatrix.tsx` | New |
| `src/components/analysis/KeyMetricSpotlight.tsx` | New |
| `src/components/analysis/ResultsAccordionSections.tsx` | Add forensicContent prop + accordion section |
| `src/components/analysis/AnalysisResults.tsx` | Wire 4 new components into layout |

