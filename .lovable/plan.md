

# AIWMC Quantis — Stabilization & Hardening Plan

## Context

The user pasted a thorough product/UX/architecture audit rating Quantis at ~6.5–7/10. Many items are **already implemented** (design tokens, skeleton states, error boundaries, lazy loading, structured logging, etc.). This plan focuses only on the **net-new work** that remains unaddressed.

---

## Already Done (No Work Needed)

These audit recommendations are already shipped:
- Design tokens and semantic color system (`--q-*` variables)
- Component standardization (buttons 48px, inputs, badges, toasts)
- Skeleton loading states (`AnalysisResultsSkeleton`, `DashboardSkeleton`)
- Lazy loading for all routes except Landing
- ErrorBoundary at root
- Web Vitals tracking
- `prefers-reduced-motion` support
- Sample data prefill ("Try with sample data" on EmptyState)
- Clone button on history cards
- Shared report CTA ("Want to analyze your own business idea?")
- Rate limit banners + anonymous usage tracking
- QuickStartWizard + FirstAnalysisCelebration onboarding
- LockedFeaturePreview for free users
- LiveCounter component
- ARIA roles on StressMap, keyboard shortcuts hook
- Toast 4-variant system
- Canonical intake flow with stepper + progress

---

## Phase 1: Navigation & IA Stabilization

### 1.1 Force One Canonical CTA Path
**File:** `MobileHero.tsx`, `HeroVariants.tsx`, `Header.tsx`, landing section CTAs

All CTAs ("Try free", "Start now", "Verify your business", "Start Free Analysis") currently route to `/app`. Audit all landing components and unify to exactly two CTA labels:
- Primary: `"Start Free Analysis →"` → `/app`
- Secondary: `"See Example Report →"` → `/examples/coffee-shop-denver`

Scan for any stray CTA text and normalize.

### 1.2 App Shell Navigation Cleanup
**File:** `AppSidebar.tsx`

- Remove duplicate/confusing nav entries
- Ensure collapsed mode uses icon-only + tooltip (no text labels)
- Add "Do this next" context: if no analyses exist, highlight "New Analysis" with a subtle pulse

---

## Phase 2: Post-Results "Next Steps" Bar

### 2.1 Create NextStepsBar Component
**File:** New `src/components/analysis/NextStepsBar.tsx`

After `FirstAnalysisCelebration` dismisses, show a sticky bar at the bottom of results:
- "Share with your co-founder" → triggers share flow
- "Export as PDF" → triggers PDF export (or upgrade prompt if free)
- "Run another idea" → resets form

### 2.2 Wire into AppDashboard
**File:** `AppDashboard.tsx`

Add state `showNextSteps` that activates after celebration closes. Render `NextStepsBar` below `AccuracyTransparentResults`.

---

## Phase 3: Per-Section Error Boundaries

### 3.1 Add Granular Error Boundaries
**Files:** `AppDashboard.tsx`, `AccuracyTransparentResults.tsx`

Wrap `CompactAnalysisForm` and `AccuracyTransparentResults` each in their own `ErrorBoundary` with:
- Plain-language error message: "Something went wrong loading your results"
- "Retry" button that resets the boundary
- "Back to form" fallback link

Currently only root-level ErrorBoundary exists.

---

## Phase 4: CompactAnalysisForm Extraction

### 4.1 Split into Sub-Step Components
**File:** `CompactAnalysisForm.tsx` (640 lines) → 3 new files

Extract:
- `src/components/analysis/steps/IndustryStep.tsx` — industry card selector + idea/location fields
- `src/components/analysis/steps/FinancialsStep.tsx` — core financial inputs (revenue, costs, CAC, price, customers, investment)
- `src/components/analysis/steps/AdvancedStep.tsx` — churn, depth selector, file upload, advanced toggles

Parent `CompactAnalysisForm.tsx` becomes an orchestrator (~150 lines) managing step state and passing props down.

---

## Phase 5: Universal Retry Pattern for Analysis Failures

### 5.1 Improve Analysis Error State
**File:** `AppDashboard.tsx` (lines 347-361 area)

Current loading/error state is minimal ("Your analysis is being generated..."). Add:
- If analysis fails: show structured error card with human reason + one-tap retry button
- If timeout: "We couldn't complete this in time. Here's what we tried — tap to retry."
- Show partial results if available (e.g., financials computed but AI narrative failed)

---

## Phase 6: Examples as Loadable Templates

### 6.1 "Use as Starting Point" on Example Cards
**Files:** `ExamplesIndex.tsx`, `ExampleAnalysis.tsx`

Add a "Load this in Quantis" button on each example that:
- Navigates to `/app`
- Sets `localStorage` prefill with the example's structured data (idea, location, financial inputs)
- `AppDashboard` already reads `quantis_prefill` from localStorage (line 149)

This turns examples from static marketing into actionable templates.

---

## Phase 7: Route Prefetching on Hover

### 7.1 Add Preload on Navigation Links
**Files:** `AppSidebar.tsx`, `Header.tsx` (landing nav)

For top-level nav links, add `onMouseEnter` handlers that trigger dynamic imports:
```tsx
onMouseEnter={() => import('../pages/Pricing')}
```

This eliminates perceived latency when users click nav items. Target: `/pricing`, `/examples`, `/how-it-works`, `/blog`.

---

## Phase 8: CLS Guards for Landing Sections

### 8.1 Add min-height Placeholders
**File:** `Landing.tsx`

Each lazy-loaded landing section (`Suspense` boundary) should have a min-height placeholder matching the expected rendered height to prevent layout shift:
- Hero: `min-h-[600px]`
- How It Works: `min-h-[500px]`
- Pricing: `min-h-[400px]`
- FAQ: `min-h-[300px]`

---

## Files Summary

| Category | Files | Type |
|----------|-------|------|
| New | `NextStepsBar.tsx`, `IndustryStep.tsx`, `FinancialsStep.tsx`, `AdvancedStep.tsx` | Create |
| Modified | `AppDashboard.tsx` | Next steps bar, error boundaries, retry pattern |
| Modified | `CompactAnalysisForm.tsx` | Slim down to orchestrator |
| Modified | `AccuracyTransparentResults.tsx` | Error boundary wrapper |
| Modified | `ExamplesIndex.tsx`, `ExampleAnalysis.tsx` | "Load in Quantis" button |
| Modified | `AppSidebar.tsx`, `Header.tsx` | Route prefetching |
| Modified | `Landing.tsx` | CLS min-height guards |
| Modified | `MobileHero.tsx`, `HeroVariants.tsx` | CTA text normalization |

## Implementation Order
1. **Phase 1** (CTA normalization) — quick wins, no risk
2. **Phase 2** (NextStepsBar) — activation improvement
3. **Phase 3** (Error boundaries) — resilience
4. **Phase 4** (Form extraction) — code health, largest effort
5. **Phase 5** (Retry pattern) — UX polish
6. **Phase 6** (Examples as templates) — conversion loop
7. **Phase 7-8** (Prefetching, CLS) — performance polish

