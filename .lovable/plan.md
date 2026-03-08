

## Analysis Form Redesign — Zero-Scroll 3-Column Layout

### What Changes

Replace the current vertical 2-column `WizardForm.tsx` with a compact 3-column layout that fits the entire form in one viewport (~560px height) on desktop.

### Architecture

**New file**: `src/components/analysis/CompactAnalysisForm.tsx` — the main 3-column form component  
**Modified file**: `src/pages/AppDashboard.tsx` — swap `WizardForm` for `CompactAnalysisForm`  
**Modified file**: `src/components/analysis/QuickIndustryPicks.tsx` — add 2 more industries (Retail, Real Estate), switch to 2-column grid pills  
**Keep**: All existing hooks (`useAnalysis`), types (`OptionalFinancialInputs`), submission logic, routing, Supabase integration — untouched

### Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ Header: AI badge + headline + 3 step pills (right)          │
├──────────────┬─────────────────────────┬────────────────────┤
│ COL 1 (30%)  │ COL 2 (42%)             │ COL 3 (260px)      │
│              │                         │                    │
│ Industry     │ 2×2 core fields:        │ Confidence Ring    │
│ (2×4 pills)  │ Capital | Price         │ (SVG 88×88)        │
│              │ Customers | OpCosts     │ Score + tier badge │
│ Location     │ ─────────────────       │ 8 checklist items  │
│ (input)      │ Optional +40%           │                    │
│              │ CAC | Churn             │ Live Estimate      │
│ › Description│ ─────────────────       │ (4 metric rows)    │
│ (collapsed)  │ Depth: Quick/Full/Deep  │                    │
│              │                         │ [⚡ Run Stress-Test]│
├──────────────┴─────────────────────────┴────────────────────┤
│ "You'll receive:" strip with 6 deliverable pills            │
└─────────────────────────────────────────────────────────────┘
```

Grid: `grid-template-columns: 1fr 1.6fr 260px` with 16px gap.

### Key Components Inside CompactAnalysisForm

1. **FinancialField** — reusable input with prefix/suffix, benchmark bar, hint text, 48px height, JetBrains Mono
2. **ConfidenceRing** — SVG circular gauge (r=36) with animated stroke-dashoffset, count-up score, tier badge
3. **LiveEstimate** — 4 computed rows (revenue, profit, margin, depth) updating in real-time
4. **Industry pills** — 2×4 grid with emoji + label, selected state with blue border
5. **Benchmark bar** — 3px track with green zone (p25-p75), animated dot for user value position

### Benchmark Data

Embedded `INDUSTRY_BENCHMARKS` object with ranges for 8 industries × 6 parameters (capital, price, customers, opex, cac, churn). When industry is selected, all 6 field benchmark bars update instantly.

### Confidence Score Calculation

- Required fields (6): industry, location, capital, price, customers, opcosts → max 55 points
- Industry bonus: +15, City: +10, CAC: +10, Churn: +7
- Capped at 97
- Tiers: 80-100 green, 60-79 blue, 40-59 yellow, 0-39 orange

### Mobile Responsive

- `<760px`: Single column, Column 1 → 2 → 3 stacked
- `<480px`: Financial fields go single-column, industry pills single-column
- Submit button sticky bottom on mobile

### What's NOT Changing

- `useAnalysis` hook, submission handler, Supabase integration
- Analysis engine logic (server-side)
- Authentication, routing to results page
- `AnalysisProgress` overlay (still shown on loading)
- File upload (accessible via description toggle area)
- All existing types and interfaces

### Files

| File | Action |
|------|--------|
| `src/components/analysis/CompactAnalysisForm.tsx` | **CREATE** — new 3-column form (~600 lines) |
| `src/components/analysis/QuickIndustryPicks.tsx` | **MODIFY** — add Retail + Real Estate, 2-col grid layout |
| `src/pages/AppDashboard.tsx` | **MODIFY** — import and render CompactAnalysisForm instead of WizardForm |

