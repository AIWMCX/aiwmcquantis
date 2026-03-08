

# Phase 9 — Reality Check Module + Admin Health Monitor

## What Exists

- **StressMap** — Has `calculateStressScores()` returning `overallRiskIndex` (0–100). The Reality Check adjusts this score.
- **AnalysisResults.tsx** — 618 lines, 8-tab layout (Overview, Scenarios, Risk Map, Simulation, Sensitivity, Benchmarks, Reliability, Validate). Risk Map tab renders `StressMap`.
- **AdminDashboard.tsx** — Existing admin page at `/admin` with tabs for Metrics, System, Engagement, AB Testing. Protected by `requireAdmin`.
- **App.tsx** — Routes include `/admin` and `/admin/benchmarks`, both gated by `ProtectedRoute requireAdmin`.
- **QMath** — `src/lib/quantis-math.ts` has `runSelfTest()` method.
- **No** `RealityCheck.tsx` or `QuantisHealth.tsx` exist.

## Implementation

### File 1: `src/components/analysis/RealityCheck.tsx` (New)

Accordion-style component, collapsed by default with "Run Reality Check" CTA.

- 6 hardcoded questions + 2 dynamic placeholders (based on `industryType` prop — e.g., for SaaS: "Have you tested onboarding flow?" / for retail: "Have you secured supplier terms?")
- Each question renders as a radio group with 3–4 options
- Each option maps to a score modifier (+5 best to -10 worst)
- After all answered: sum modifiers, show delta badge ("reduced risk by X" or "increased by Y"), show 1–2 improvement actions
- Exports `adjustedRiskIndex` via `onComplete(delta: number)` callback

### File 2: `src/components/analysis/AnalysisResults.tsx` (Edit)

- Import `RealityCheck` and render it inside the Risk Map tab, below `StressMap`
- Track `realityCheckDelta` in state, pass adjusted score back to StressMap display if needed

### File 3: `src/pages/admin/QuantisHealth.tsx` (New)

Admin-only health monitor page:

- 4 KPI cards: avg confidence (24h), avg consensus score, error rate (blocked outputs / total), analysis volume
- Fetches from `analyses` table: last 24h and 7d aggregates using `.select()` with date filters
- 7-day line chart (Recharts) of daily confidence trend
- Error breakdown table: groups by QE error codes from analysis results
- "Run System Self-Test" button → calls `QMath.runSelfTest()`, displays pass/fail results in a card
- Protected: uses `useAdmin()` hook, redirects if not admin

### File 4: `src/App.tsx` (Edit)

- Add lazy import for `QuantisHealth`
- Add route `/admin/health` inside `ProtectedRoute requireAdmin`

### File 5: `src/pages/AdminDashboard.tsx` (Edit)

- Add navigation link to `/admin/health` ("Quantis Health" button)

### Files Summary

| File | Action |
|------|--------|
| `src/components/analysis/RealityCheck.tsx` | New — founder reality check questionnaire |
| `src/pages/admin/QuantisHealth.tsx` | New — health monitor dashboard |
| `src/components/analysis/AnalysisResults.tsx` | Edit — add RealityCheck to Risk Map tab |
| `src/App.tsx` | Edit — add `/admin/health` route |
| `src/pages/AdminDashboard.tsx` | Edit — add nav link to health page |

