

# Master Fix: 7 Critical Issues + Audit Prompt Integration

## Summary

Seven distinct problems identified across the dashboard, history, benchmarks, scenarios, progress, and overall UI polish. The uploaded AIWMC Quantis Master Audit Prompt v1.0 is a reference document for AI audit sessions — it should be stored in the project for future use, not integrated into the app code.

---

## Issue 1 — Landing Page Icons: Sharper, Conversion-Focused

**Problem**: Generic Lucide icons don't convey value or drive conversions.

**Fix**: Replace generic icons in the landing page hero/feature sections with sharper, more specific icons that communicate financial value. Use `TrendingUp`, `ShieldCheck`, `Gauge`, `Target`, `Wallet`, `Sparkles` instead of generic ones. Add subtle gradient backgrounds to icon containers. Make CTA buttons more prominent with animated hover states.

**Files**: `src/components/landing/*.tsx` (hero, features, social proof sections)

---

## Issue 2 — Duplicate/Same Icons in Sidebar & UI

**Problem**: Multiple sections use identical icons (e.g., same icon repeated 3 times).

**Fix**: Audit all icon usage in `AppSidebar.tsx` and dashboard components. Replace duplicates with distinct, semantically correct icons:
- Dashboard → `LayoutDashboard` (keep)
- History → `Clock` (change from `History` to differentiate)
- Scenarios → `GitBranch` (change from `Layers`)
- Progress → `TrendingUp` (change from `Trophy`)
- Remove any decorative icon that adds no value

**Files**: `src/components/layout/AppSidebar.tsx`

---

## Issue 3 — History Sidebar Link Shows Dashboard (Critical Bug)

**Problem**: Clicking "History" in sidebar navigates to `/app?tab=history`, but `AppDashboard.tsx` never reads the `tab` URL parameter — it uses local `useState('analyze')`. So history never activates.

**Also**: History is hardcoded to `limit(50)` in `analysisDb.ts` and `.slice(0, 50)` in `useAnalysisHistory.ts`. User wants unlimited history.

**Fix**:
1. In `AppDashboard.tsx`, read `searchParams.get('tab')` and sync it to `activeTab` state on mount and on URL changes
2. Remove the `.limit(50)` from `getAnalyses()` in `analysisDb.ts` (use `.limit(1000)` or remove limit entirely)
3. Remove `.slice(0, 50)` cap in `useAnalysisHistory.ts` `addEntry`
4. Add pagination to `AnalysisHistory.tsx` if list grows large (load more button)

**Files**: `src/pages/AppDashboard.tsx`, `src/services/analysisDb.ts`, `src/hooks/useAnalysisHistory.ts`, `src/components/analysis/AnalysisHistory.tsx`

---

## Issue 4 — Benchmark Verification

**Problem**: User wants confirmation that the new 97K benchmark dataset is properly connected and being used in analyses.

**What's already done**: The benchmark engine v2 (`supabase/functions/analyze-business/benchmark-engine-v2.ts`) already queries the `benchmark_sectors`, `benchmark_metrics`, and `benchmark_geo_modifiers` tables. The `analyze-business/index.ts` calls `getBenchmarkSummary()` and feeds it into the DFE and PRE. The old embedded benchmarks in `benchmark-calibrator.ts` serve as fallback.

**Fix**: Add a visible "Benchmark Source" indicator in analysis results showing which dataset powered the analysis (V2 DB with row count vs. embedded fallback). Add a small badge in the analysis output like "Powered by 95,500 benchmark datapoints" when V2 data is used. This gives the user confidence the new data is active.

**Files**: `src/components/analysis/AccuracyTransparentResults.tsx` (add benchmark source badge), `supabase/functions/analyze-business/index.ts` (pass benchmark metadata to response)

---

## Issue 5 — Scenarios Page (Placeholder)

**Problem**: Clicking "Scenarios" goes to `/app?tab=scenarios` but no such tab exists — user sees the dashboard.

**Fix (Phase 1 — Placeholder)**: Add a `scenarios` tab to the dashboard Tabs component with a professional "Coming Soon" state that explains what scenarios will do (best/worst/stress-test projections, what-if modeling). Include a visual mockup card showing scenario comparison. This prevents the broken navigation while communicating the roadmap.

**Files**: `src/pages/AppDashboard.tsx` (add TabsTrigger + TabsContent for scenarios)

---

## Issue 6 — Progress/Leaderboard Not Updating

**Problem**: Leaderboard page shows 158 analyses in March but content appears static/stale. Weekly progress board isn't auto-updating.

**Root cause**: `Leaderboard.tsx` falls back to `SAMPLE_ENTRIES` (5 hardcoded items) when the DB query returns empty. The DB function likely doesn't have fresh data or the RPC isn't configured.

**Fix**:
1. Verify the leaderboard RPC/view exists and is returning real data
2. Add a "Last updated" timestamp and auto-refresh interval (5 min)
3. Show the user's own analyses in the progress view with weekly grouping
4. Add a "This Week" / "This Month" / "All Time" filter
5. Show total analysis count prominently with trend arrow

**Files**: `src/pages/Leaderboard.tsx`

---

## Issue 7 — Dashboard Visual Polish & Professional Typography

**Problem**: UI needs more visual depth, professional typography, and value-communicating design.

**Fix**:
- **Typography**: Use `font-sora` for headings, `font-dm-sans` for body consistently. Increase heading weights. Use tabular numbers (`font-variant-numeric: tabular-nums`) for all financial figures
- **Number formatting**: All currency values use consistent `Intl.NumberFormat` with compact notation
- **Visual depth**: Add subtle box-shadows (`shadow-sm` → `shadow-md`), gradient borders on key cards, glassmorphism on status badges
- **Spacing**: Increase vertical rhythm between sections (consistent `gap-6` / `gap-8`)
- **KPI panels**: Add micro-sparkline indicators next to key numbers, use color-coded backgrounds (green for profit, amber for breakeven, red for loss)
- **Subscription bar**: Redesign with gradient background and better hierarchy

**Files**: `src/pages/AppDashboard.tsx`, `src/components/analysis/AccuracyTransparentResults.tsx`, `src/components/analysis/AnalysisTopBar.tsx`, global CSS variables

---

## Audit Prompt Document

The uploaded AIWMC Quantis Master Audit Prompt v1.0 is a reference document for conducting AI-powered audits of the platform. It will be stored in the project's `public/docs/` directory as a downloadable asset, not integrated into application logic.

---

## Implementation Order

1. **Issue 3** — History bug fix (critical UX breakage)
2. **Issue 2** — Duplicate icons fix
3. **Issue 5** — Scenarios placeholder tab
4. **Issue 6** — Progress page data + refresh
5. **Issue 4** — Benchmark verification badge
6. **Issue 1** — Landing page icon sharpening
7. **Issue 7** — Global visual polish pass

## Files Changed

| File | Changes |
|------|---------|
| `src/pages/AppDashboard.tsx` | Read `tab` from URL, add scenarios tab, visual polish |
| `src/services/analysisDb.ts` | Remove 50-row limit |
| `src/hooks/useAnalysisHistory.ts` | Remove 50-entry slice cap |
| `src/components/layout/AppSidebar.tsx` | Fix duplicate icons |
| `src/components/analysis/AnalysisHistory.tsx` | Add load-more pagination |
| `src/components/analysis/AccuracyTransparentResults.tsx` | Add benchmark source badge |
| `src/pages/Leaderboard.tsx` | Real data, time filters, auto-refresh |
| `src/components/landing/*.tsx` | Sharper conversion icons |
| Global styles / component polish | Typography, spacing, depth |

