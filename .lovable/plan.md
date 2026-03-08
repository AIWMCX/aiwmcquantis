

## UI-6 & UI-7: Stress Map Polish, Scenario Bar, Doc Generator & Library Styling

### Overview
All four components already exist and are functional. This is a polish and integration pass — creating one new component (ScenarioBar) and applying design token consistency to the existing three.

---

### 1. New: `src/components/analysis/ScenarioBar.tsx`

A horizontal pill bar that appears below the 36-month chart. Unlike the existing `ScenarioLibrary` (a Plus CRUD feature), this is a lightweight inline scenario switcher.

- 8 pills: Base, 📉 Recession, 🏠 Rent ×2, 📣 Ad Surge, 🐌 Slow Launch, ✨ Best Case, 😱 Worst Case, ⚔ Competitor
- Each pill: 36px height, `var(--q-radius-pill)`, default `var(--q-bg-elevated)` + `var(--q-border-default)`, active `var(--q-accent-primary)` + white text
- Hover: `var(--q-border-strong)`, `translateY(-1px)`
- Active: spring scale animation (0.95 → 1.0)
- Horizontal overflow scroll with hidden scrollbar
- Props: `activeScenario`, `onScenarioChange`, `baseMetrics` (for computing deltas)
- When non-base selected: shows "Scenario: {name}" label + "Reset to Base" ghost button
- Exports scenario multiplier configs so parent can derive chart data + KPI changes

### 2. `src/components/analysis/RevenueChart.tsx` — Expand scenarios

- Replace the 4-tab inline buttons with the new `ScenarioBar` (or accept `activeScenario` as a prop from parent)
- Add 4 more scenario configs: ad_surge, slow_launch, worst_case, competitor
- Accept `activeScenario` prop instead of managing own tab state (lifted to parent)

### 3. `src/components/analysis/AnalysisResults.tsx` — Integration

- Lift scenario state: single `activeScenario` state that drives RevenueChart, KPI strip, and StressMap simultaneously
- Place `ScenarioBar` below the RevenueChart section
- When scenario changes: KPI strip values update with count-up, changed metrics show "vs Base: +$X" delta badge
- Pass scenario multiplier to StressMap scores (recalculate with adjusted inputs)

### 4. `src/components/analysis/StressMap.tsx` — Minor polish

Already well-built. Small additions:
- Add `gap-2` (currently `gap-4`, spec says `8px gap` = `gap-2`)
- Ensure block cards use `var(--q-radius-lg)` and `overflow-hidden`
- Score numbers: confirm `text-metric-lg` on ring gauge value (currently `text-metric-xl` — adjust to `lg`)

### 5. `src/components/docs/DocGeneratorPanel.tsx` — Design token pass

- Header: use `q-h3` class for title, `q-body-sm` + `text-[var(--q-text-secondary)]` for subtitle
- Update copy: "📄 Generate Documents" / "Turn your analysis into professional documents instantly"
- Category tabs: switch from shadcn `TabsList` to underline-style tabs (active = accent-primary underline, no bg)
- Grid: already 3-col, confirmed good
- Loading skeletons: add `q-skeleton` shimmer class

### 6. `src/components/docs/DocTemplateCard.tsx` — Design token pass

- Card: add `q-card` + `q-card-hover`, `var(--q-radius-lg)`, padding 20px
- Top row: category icon in accent color + tier pill (Free = subtle, Plus = gradient)
- States: generating = shimmer loading bar, complete = green download button, locked = 40% opacity overlay with blur + "🔒 Plus Plan" badge
- Generation time estimate: `q-caption` class

### 7. `src/components/docs/DocumentLibrary.tsx` — Design token pass

- Filter tabs: add ⭐ Starred filter option
- Loading: use 3 skeleton rows with `q-skeleton` class
- Empty state: use centered illustration, `q-h3` + `q-body` classes, "Go to Latest Analysis" CTA button
- Document rows: use `q-card` hover pattern
- Sort dropdown: "Most Recent ▾"

---

### Files

| File | Change |
|------|--------|
| `src/components/analysis/ScenarioBar.tsx` | **New** — horizontal pill scenario switcher |
| `src/components/analysis/RevenueChart.tsx` | Accept scenario prop, expand to 8 configs |
| `src/components/analysis/AnalysisResults.tsx` | Lift scenario state, integrate ScenarioBar, delta badges on KPIs |
| `src/components/analysis/StressMap.tsx` | Grid gap, radius, metric class tweaks |
| `src/components/docs/DocGeneratorPanel.tsx` | Design tokens, underline tabs, updated copy |
| `src/components/docs/DocTemplateCard.tsx` | q-card styling, state visuals, locked overlay |
| `src/components/docs/DocumentLibrary.tsx` | Design tokens, starred filter, empty state, skeletons |

