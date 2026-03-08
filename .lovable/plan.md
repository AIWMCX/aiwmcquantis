

# Phase 6C+6D — Enhanced Tornado Chart & Dual-Engine Badge

## What Exists

- **`src/components/analysis/SensitivityTornado.tsx`** — Already a functional tornado chart with horizontal bars, delta-from-base calculation, tooltips, and top-3 variable cards. Missing: the exported `calculateSensitivities()` utility function using QMath, and some polish (legend, paramLow/paramHigh in tooltips).
- **`src/components/analysis/DualEngineBadge.tsx`** — Existing but basic: only takes `crossValidation` object, shows verified/not-verified. Missing: `ConfidenceTier`-based rendering (5 tiers), size variants (sm/md/lg), showDetails expansion, per-model confidence breakdown, processing time, animated entrance.
- **`src/services/confidence-scorer.ts`** — Has `ConfidenceTier` type and `CONFIDENCE_BADGE_CONFIG` with tier→color/icon mappings.

## Implementation

### File 1: `src/components/analysis/SensitivityTornado.tsx` (Rewrite)

Upgrade existing component to match the specified `TornadoChartProps` interface:

- Accept new props: `baseValue`, `title`, `unit`, `sensitivities[]` with `paramName`, `lowValue`, `highValue`, `paramLow`, `paramHigh`, `impact`, and `maxBars` (default 8)
- Sort by impact descending, slice to maxBars
- Horizontal BarChart with red/orange negative bars (left) and green/teal positive bars (right)
- Center reference line at 0 (delta from base)
- Enhanced tooltip showing param name, tested param values, and output delta
- Legend: "← Downside scenario | Upside scenario →"
- Export `calculateSensitivities(params, outputFn, paramKeys, shockPct)` using QMath for ±shock arithmetic
- Keep backward compatibility: accept either old `tornado` prop or new `sensitivities` prop

### File 2: `src/components/analysis/DualEngineBadge.tsx` (Rewrite)

Complete rewrite with the specified `DualEngineBadgeProps`:

- Props: `consensusScore`, `gptConfidence`, `geminiConfidence`, `overallConfidence`, `tier`, `processingMs`, `size`, `showDetails`
- 5 tier-based renders: verified (green shield + glow), confident (blue check), estimated (yellow info), uncertain (orange warning), blocked (red X)
- 3 size variants: sm (inline badge), md (card badge), lg (panel badge with more detail)
- `showDetails` expands to show per-model scores, consensus %, processing time
- Animated entrance: 300ms scale-in + fade-in using existing Tailwind animation utilities
- Also keep backward-compatible wrapper that converts old `crossValidation` prop format

### Files Summary

| File | Action |
|------|--------|
| `src/components/analysis/SensitivityTornado.tsx` | Rewrite — enhanced tornado with `calculateSensitivities` export |
| `src/components/analysis/DualEngineBadge.tsx` | Rewrite — tier-based badge with sizes, details, animations |

