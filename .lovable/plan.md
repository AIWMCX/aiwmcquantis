

# Mobile Optimization — /app Analysis Dashboard

## Problem

The analysis form uses a hardcoded 3-column CSS grid (`gridTemplateColumns: '1fr 1.6fr 260px'`) that doesn't collapse on mobile. The sidebar overlaps content. Results grids (`lg:grid-cols-[58%_42%]`) don't stack properly. The "You'll receive" strip overflows.

## Changes

### 1. `src/components/analysis/CompactAnalysisForm.tsx`
**The biggest fix.** Convert the hardcoded 3-column grid to responsive:
- Line 316: Replace `style={{ gridTemplateColumns: '1fr 1.6fr 260px' }}` with Tailwind classes: `grid-cols-1 lg:grid-cols-[1fr_1.6fr_260px]`
- On mobile, all 3 columns stack vertically: Business Identity → Financial Inputs → Confidence/Submit
- Industry buttons grid: keep `grid-cols-2` (works fine on mobile already)
- Financial fields 2×2 grid: change to `grid-cols-1 sm:grid-cols-2` so fields stack on very small screens
- Optional fields: same `grid-cols-1 sm:grid-cols-2`
- Depth selector: keep `grid-cols-3` (small buttons, works fine)
- "You'll receive" strip: change `flex-wrap` behavior, hide less important items on mobile
- Header h1: reduce to `text-[22px] sm:text-[26px]`
- Confidence Ring: reduce size on mobile (72px vs 88px)
- Submit button: ensure full-width, adequate touch target (already 52px, good)

### 2. `src/components/analysis/AccuracyTransparentResults.tsx`
- Step 1 grid (line 164): `grid-cols-1 lg:grid-cols-[58%_42%]` — already uses `lg:` prefix, should work. Verify sticky sidebar doesn't cause issues on mobile — remove `lg:sticky` behavior for mobile.
- Step 2 grid (line 282): same pattern, already `lg:grid-cols-[55%_45%]` — good.
- Step 3 grid (line 367): already `lg:grid-cols-2` — good.
- Step 1 Strengths/Risks grid (line 180): change from `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`
- Navigation footer: ensure buttons don't overflow — make them smaller on mobile, hide `LastAuditedBadge` label on xs screens

### 3. `src/components/analysis/PersistentResultsHeader.tsx`
- KPI chips row: ensure horizontal scroll on mobile instead of wrapping/overflowing
- Step tabs: make touch-friendly with adequate size
- Action buttons (PDF, New Analysis): stack or use icon-only on mobile

### 4. `src/components/layout/AppSidebar.tsx`
- The sidebar uses shadcn's `Sidebar` with `collapsible="icon"` — on mobile it should use sheet/overlay mode. Change to `collapsible="offcanvas"` to make it a slide-over drawer on mobile instead of pushing content.

### 5. `src/pages/AppDashboard.tsx`
- Container padding: already `px-4 sm:px-6`, good
- Subscription bar: already `flex-wrap`, good
- Skeleton: change `lg:grid-cols-3` mock to also stack on mobile — already does with `grid-cols-1`

### 6. `src/components/analysis/AnalysisTopBar.tsx`
- Truncate idea text more aggressively on mobile: `max-w-[180px] sm:max-w-[300px] lg:max-w-[500px]`
- Hide gain pill text on mobile, show only icon

## Files Modified

| File | Change |
|------|--------|
| `CompactAnalysisForm.tsx` | Responsive grid, mobile font sizes, stacked layout |
| `AccuracyTransparentResults.tsx` | Fix strengths/risks grid, mobile nav footer |
| `PersistentResultsHeader.tsx` | Scrollable KPIs, mobile-friendly actions |
| `AppSidebar.tsx` | Switch to offcanvas on mobile |
| `AnalysisTopBar.tsx` | Tighter mobile truncation |

