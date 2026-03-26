

# Dashboard Accessibility & UX Overhaul — Executive Summary Fix, Try Sample Priority, Hints Everywhere

## Current State Assessment (1-10 Ratings)

| Dimension | Score | Issue |
|-----------|-------|-------|
| Accessibility | 5/10 | Tooltips require hover (invisible on mobile), font sizes inconsistent, no keyboard hints |
| User Satisfaction | 4/10 | Executive Summary truncated with `line-clamp-4` and no expand — user sees "o..." and can't read more. StressMap cards say "Click for details" but expanded state only shows score/100 and a generic sentence. No "Try Sample" visible once form is loaded |
| Understanding | 5/10 | Metric labels like "LTV:CAC" and "M12" are jargon. DEFAULT_HINTS exist but are tiny (10px) and easy to miss. Methodology link buried in Audit Trail card |

## Problems to Fix

1. **Executive Summary truncated** (line 227): `line-clamp-4` cuts text at ~4 lines with no "Read more" button. Users see "...o" and cannot expand. This is the screenshot the user sent.

2. **"Try Sample" only appears in EmptyState** (line 394-412 of AppDashboard): Once the user types anything or has results, the sample button vanishes. It should be a persistent, visible panel — especially for new users who don't know what to analyze.

3. **StressMap blocks say "Click for details" but expanded content is generic**: The expanded section (lines 430-451) shows "What this means: This area is performing well..." — the same 3 generic sentences for all scores. Not useful.

4. **Metric card hints at 10px are too small**: The `DEFAULT_HINTS` in SimpleMetricCard are rendered at `text-[10px]` — nearly invisible.

5. **No "Generate Idea" in the main dashboard**: The AI idea generator exists as an edge function but is only in the landing hero demo, not in the actual analysis form.

---

## Plan

### 1. Fix Executive Summary — Expandable with Full Text

**File: `src/components/analysis/AccuracyTransparentResults.tsx` (lines 224-230)**

Replace `line-clamp-4` with a collapsible pattern:
- Show first 4 lines by default with a visible **"Read full summary ↓"** button
- On click, expand to show the entire executive summary text
- Add a **"Collapse ↑"** button when expanded
- Use `useState` for `expandedSummary` boolean

### 2. Make "Try Sample" a Priority Panel — Always Visible

**File: `src/pages/AppDashboard.tsx`**

- Add a new **"Try Sample Analysis"** card directly above the form (between AnalysisTopBar and CompactAnalysisForm) that is always visible when there are no results showing
- Card design: bordered panel with a lightbulb/sparkle icon, text "No idea yet? Try a sample analysis to see what Quantis delivers", and two buttons:
  - **"Try Coffee Shop Sample"** — prefills existing sample data
  - **"Generate Random Idea"** — calls the `generate-idea` edge function and prefills form
- This panel hides when `result` exists or `isLoading` is true
- Remove the "Try a sample" button from EmptyState since it's now promoted to a primary position

**File: `src/components/analysis/CompactAnalysisForm.tsx`**

- Add a small inline **"✦ Generate idea for me"** link-button next to the idea textarea label that calls the edge function and populates the idea + financials

### 3. Enrich StressMap Expanded Content with Real Data

**File: `src/components/analysis/StressMap.tsx` (lines 430-451)**

Replace the generic "What this means" text with specific, data-driven content:
- **Market expanded**: Show actual LTV:CAC value, what the industry benchmark is, and specific action
- **Margin expanded**: Show actual gross margin %, industry median, the gap in points
- **Capital expanded**: Show actual runway months, break-even month, whether there's a gap
- **Operations expanded**: Show payroll ratio %, opex ratio, specific operational insight

Pass these as structured data from `calculateStressScores` (the explanations and recommendations are already computed but underused in the expanded view).

Also add the methodology link as a more prominent styled button instead of a tiny text link.

### 4. Increase Hint Visibility in SimpleMetricCard

**File: `src/components/analysis/SimpleMetricCard.tsx`**

- Increase hint text from `text-[10px]` to `text-[11px]`
- Change color from `var(--q-text-tertiary)` to `var(--q-text-secondary)` for better contrast
- Add a subtle left-border accent to the hint text to make it visually distinct
- Make the Info icon always visible (remove `opacity-50 group-hover:opacity-100`) — users need to SEE the hint exists

### 5. Add Methodology Link as a Persistent Footer in Results

**File: `src/components/analysis/AccuracyTransparentResults.tsx`**

- Add a small persistent banner at the bottom of each step: "How does Quantis calculate these numbers? → Read our methodology" linking to `https://www.aiwmcquantis.com/methodology`
- Style: subtle, not intrusive, but visible — uses `var(--q-accent-primary)` color

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/components/analysis/AccuracyTransparentResults.tsx` | Expandable executive summary; methodology footer on each step |
| `src/pages/AppDashboard.tsx` | "Try Sample" priority panel above form; "Generate Idea" integration |
| `src/components/analysis/StressMap.tsx` | Rich expanded content with real data instead of generic text |
| `src/components/analysis/SimpleMetricCard.tsx` | Larger hints, always-visible info icon |
| `src/components/analysis/CompactAnalysisForm.tsx` | Inline "Generate idea" button next to idea field |

## Implementation Order
1. Fix Executive Summary expand/collapse
2. Add Try Sample priority panel to AppDashboard
3. Enrich StressMap expanded content
4. Increase hint visibility in SimpleMetricCard
5. Add methodology footer to results steps
6. Add inline "Generate idea" to CompactAnalysisForm

