

# UX/UI Redesign: Precision Instrument Analysis Screen

## Problem Statement

The current `/app` dashboard is a vertically stacked layout with a hero section, left-side form, and right-side results that requires extensive scrolling. Users don't see the impact of their inputs at a glance, and the results are a long vertical report rather than an interactive mini-dashboard.

## What Changes

### 1. Remove the Hero Section
Delete the centered "Complete Analysis in Seconds" hero block (lines 332-346 in AppDashboard.tsx). It wastes vertical space. The layout should start immediately with the analysis workspace.

### 2. Persistent Top Context Bar (New Component)
**New file:** `src/components/analysis/AnalysisTopBar.tsx`

A slim, always-visible bar below the header showing:
- **Left:** Business idea (inline-editable, truncated) + Location pill
- **Right:** Analysis Reliability % as a large radial/ring indicator + a small "+X% if you add more data" pill linking to the unfilled wizard step

This bar only appears when an analysis has been run (or the form has content). It uses the existing `InputQualityIndicator` logic to compute the reliability score.

### 3. Three-Step Wizard (Refactor WizardForm)
**Modified file:** `src/components/analysis/WizardForm.tsx`

Replace the current single-form layout with a 3-step vertical stepper that fits on screen without scrolling:

- **Step 1 — Idea & Market:** Business idea textarea, location, industry selector, business model toggle (B2B/B2C). Current fields reorganized.
- **Step 2 — Core Numbers:** Investment, monthly revenue, average price, monthly customers, operating costs, CAC. Pulled from current `AdvancedFinancialInputs`. Show "+X% confidence" badge when completed.
- **Step 3 — Advanced Details:** Expense breakdown (rent, salaries, marketing), churn %, document upload. Show "+Y% reliability if completed" + "Optional but strongly recommended" note.

Each step is a compact card with a vertical stepper indicator on the left. Completed steps collapse to a single-line summary. Current step expands. Smooth CSS transitions between steps (no page reload).

The `WizardProgress` component already exists and will be reused as the stepper rail.

### 4. Tabbed Results Mini-Dashboard (Refactor AnalysisResults)
**Modified file:** `src/components/analysis/AnalysisResults.tsx`

Replace the current 636-line vertical scroll with a **4-tab segmented control**:

**Tab: Overview (default)**
- Idea Score badge (existing)
- 4 key metrics in a 2x2 grid: Monthly Revenue, Net Margin, LTV:CAC, Payback Period
- Scenario selector (existing, compact)
- 2-line AI summary text

**Tab: Sensitivity**
- SensitivityTornado component (existing)
- AssumptionGraph critical path (existing)
- Caption text with most/least sensitive variable

**Tab: Benchmarks**
- IndustryComparison component (existing)
- BenchmarkConfidenceIndicator (existing)
- DualEngineBadge (existing)

**Tab: Reliability**
- ModelConfidenceBadge (existing) — expanded view
- ConfidenceIndicator breakdown (existing)
- Sanity flags (existing)
- "How to Improve Accuracy" suggestions
- Data sources + limitations

The detailed sections (Business Plan, Marketing, Market Analysis, SWOT) move to a secondary expandable area below the tabs, or into the existing Financial/Business/Marketing/Market sub-tabs within the Overview tab.

### 5. Layout Restructure (AppDashboard.tsx)
**Modified file:** `src/pages/AppDashboard.tsx`

```text
+----------------------------------------------------------+
| Header (existing)                                         |
+----------------------------------------------------------+
| [Top Context Bar: Idea | Location | Reliability %]       |
+----------------------------------------------------------+
| Subscription status (existing, slimmed)                   |
+-------------------+--------------------------------------+
| 3-Step Wizard     | Tabbed Results Mini-Dashboard        |
| (sticky left)     | [Overview | Sensitivity |            |
|                   |  Benchmarks | Reliability]           |
| Step 1: Idea      |                                      |
| Step 2: Numbers   | [Active tab content]                 |
| Step 3: Advanced  |                                      |
|                   |                                      |
| [Analyze Button]  |                                      |
+-------------------+--------------------------------------+
```

- Remove the hero section entirely
- Remove the `AnalysisTemplatesGrid` from the main results area (move quick-start templates into the wizard Step 1 as they currently are)
- Keep the existing grid ratio (1/3 left, 2/3 right)
- The EmptyState in the results area stays but is simplified to just "Run your first analysis" with the 4 tab placeholders visible but grayed out

### 6. Micro-interactions
- When user completes Step 2, the Reliability % in the top bar animates upward (e.g., 45% → 68%)
- Tab content transitions use `animate-fade-in` (existing utility)
- Wizard step transitions use slide/fade (existing `accordion-down` pattern)
- Key metric numbers animate on scenario change (CSS `transition` on the text)

### 7. Style Updates
- Remove the `section-card` wrapper from individual result sections — the tab container is the card
- Ensure dark theme contrast: primary blue for active tab, muted for inactive
- Numbers use `tabular-nums` font feature for alignment
- No emojis in sanity flags (currently uses 💡 on line 467 — replace with Lightbulb icon)

## Files Summary

| File | Action |
|------|--------|
| `src/components/analysis/AnalysisTopBar.tsx` | New — persistent context bar |
| `src/components/analysis/WizardForm.tsx` | Refactor — 3-step stepper |
| `src/components/analysis/AnalysisResults.tsx` | Refactor — 4-tab mini-dashboard |
| `src/pages/AppDashboard.tsx` | Remove hero, wire top bar, clean layout |

## What This Does NOT Change
- No backend/edge function changes
- No new data requirements — all data already exists in the response payload
- Mobile layout stays form-first (existing order-1/order-2 pattern), but tabs replace the scroll

