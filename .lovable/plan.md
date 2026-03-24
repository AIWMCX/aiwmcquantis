

# Quantis "Decision Cockpit" Redesign — Implementation Plan

## Core Problem
The results UI has all the right data but presents it as equally-weighted cards on a flat dark background. The fix: compose data into a **narrative** with clear visual hierarchy — one focal answer per screen, supporting evidence underneath.

---

## Phase A: Results "Decision Scene" Overhaul (highest impact)

### A1. Cinematic Hero Verdict Strip
**Files:** `ResultsHeroStrip.tsx` (rewrite), `PersistentResultsHeader.tsx` (slim down)

Current: 4 equal KPI cards in a grid. New layout:

```text
┌──────────────────────────────────────────────────────────┐
│  [FAST-TRACK 91%]   Mo.12 Profit   Break-even   Runway  │
│   pill + tagline     −$6.1k         >24 mo       1 mo   │
│                    ───────────────────────────────────────│
│   "Not yet investable — fix margin & runway"    [badge]  │
└──────────────────────────────────────────────────────────┘
```

- Left: verdict pill 3× current size with one-sentence tagline
- Center: 2-3 KPIs in **huge** monospace type (3× current `text-lg` → `text-4xl`)
- Right: color-coded verdict badge
- Subtle gradient glow on the strip only; everything else stays flat
- Count-up animation on load (already exists, just needs bigger targets)
- Add pessimistic–optimistic range below each number: "−$6.1k (likely −8.3k to −4.2k)"

### A2. Narrative Step Sequence
**File:** `AccuracyTransparentResults.tsx` (restructure steps)

Rename and reorder the 3 wizard steps:
1. **"Verdict & Risk Intelligence"** → keep but add editorial copy: "This plan burns all your capital in 3 months" instead of "Runway: 3 months"
2. **"Levers Lab"** (renamed from "Financials & Assumptions") — inputs dominant, chart background, live impact diffs
3. **"Red Flags & Action Plan"** (renamed from "Risks & Action Plan") — risk ring → top flags → ordered checklist

Update `PersistentResultsHeader.tsx` step labels to match.

### A3. Forecast Bands on Revenue Chart
**File:** `RevenueChart.tsx`

- Add shaded pessimistic-to-optimistic band (p25–p75 from Monte Carlo) around baseline
- Ghost line showing previous scenario when switching (crossfade transition)
- This is the single biggest "beyond spreadsheet" visual signal

### A4. Interpretive Chips on Every KPI
**Files:** `SimpleMetricCard.tsx`, `PersistentResultsHeader.tsx`

Add a thin descriptor chip below each metric:
- "Good vs peers" / "Below median" / "Critical"
- Optional benchmark percentile: "P70 for Denver media businesses"
- Uses existing benchmark data from `benchmark-calibrator.ts`

---

## Phase B: Levers Lab (Step 2 Redesign)

### B1. Interactive Slider Controls
**File:** `InlineAssumptionEditor.tsx` (major rewrite)

- Replace text inputs with large, tactile sliders with glow on drag
- Each slider shows inline impact chip that animates: "CAC $50 → $35: Net profit +$1.2k/mo, Runway +2 months"
- Group into "Revenue Levers" and "Cost Levers" sections
- Auto-update Impact Snapshot panel on the right in real-time

### B2. Impact Snapshot Panel
**File:** New component `ImpactSnapshot.tsx`

- Sticky right panel showing before/after diff for each change
- Highlights in green/red what moved and by how much
- Replace current "Impact Preview" card with this richer version

---

## Phase C: Scenario Theatre

### C1. Enhanced Scenario Switcher
**File:** `ScenarioBar.tsx` (rewrite)

- Horizontal timeline with icons + short descriptions: "Recession (−15% demand)"
- On click: ambient accent color shifts (blue→amber for recession, blue→red for worst case)
- One-sentence story above chart: "Ad surge: demand +40%, CAC −15% for 3 months"
- Crossfade chart transition (300ms) instead of snap

---

## Phase D: Assumption Conflict Engine UI

### D1. Conflict Badge + Drawer
**Files:** New `AssumptionConflictBadge.tsx`, new `AssumptionConflictDrawer.tsx`

- Persistent badge in `PersistentResultsHeader.tsx`: "Assumptions: 3 conflicts" with gentle pulse
- Click opens a sheet/drawer listing each conflict:
  - "Your marketing budget cannot deliver 300 buyers at CAC $3"
  - "Churn rate 2% is below SaaS median for your stage"
- Each conflict has a "Fix" button that scrolls to the relevant lever in Step 2
- Data sourced from existing `coherence-check.ts` and `validation-layer.ts`

---

## Phase E: Visual & Typography Polish

### E1. Type System Upgrade
**File:** `index.css`, `tailwind.config.ts`

- Primary KPIs: `text-4xl font-bold font-mono` (currently `text-lg`)
- Section headings: `text-2xl font-semibold` with more whitespace above
- Add `--q-font-display` token for verdict/headline numbers (Sora bold or existing)
- Increase vertical rhythm: 48px between major sections (currently ~20-24px)

### E2. Semantic Status Tokens
**File:** `index.css`

Define and enforce 4 status tokens everywhere:
- `--q-verdict-good` (green) / `--q-verdict-watch` (amber) / `--q-verdict-bad` (red) / `--q-verdict-neutral` (gray)
- Apply to: risk ring segments, flag badges, action priorities, metric cards, verdict strip

### E3. Focal Glow System
**File:** `index.css`

- Hero verdict strip and main chart get subtle `box-shadow` glow + inner gradient
- All other cards stay flat — creates natural visual hierarchy
- `.q-focal-glow` utility class for reuse

### E4. Risk Language Standardization
**Files:** `StressMap.tsx`, `AccuracyTransparentResults.tsx`

- "Elevated 66" → "Risk 66/100: Elevated — margin & runway"
- Interpretation inline with number, not in a separate module
- Stress ring segments clickable → scrolls to corresponding card

---

## Phase F: Sidebar & Copy Cleanup

### F1. Navigation Simplification
**File:** `AppSidebar.tsx`

- Merge "Dashboard" and "New Analysis" into one: Dashboard with "Start New Analysis" CTA
- "Benchmarks, Scenarios, Progress" already grouped under "INTELLIGENCE" ✓
- Remove text labels in collapsed mode; use hover tooltips only
- Lock icon on auth-gated items for anonymous users

### F2. Editorial Copy Pass
**Files:** Multiple components

Rename throughout the app:
- "Financial Analysis (Universal Framework)" → "Unit Economics Reality Check"
- "Risk Flags" → "Red Flags Blocking Investment"
- "Analysis Quality 0/100 – Uncertain" → "Confidence 0/100 – Need more input"
- "Assumption Overrides" → "Adjust Your Levers"
- Section headers become questions: "What kills this plan?" instead of "Risk Assessment"

---

## Phase G: Motion & Micro-interactions

### G1. Results Load Sequence
**File:** `AccuracyTransparentResults.tsx`, `index.css`

- 600ms staggered entry: verdict strip fades in (0ms) → KPI numbers count up (200ms) → stress ring arcs animate (400ms) → cards fade in (600ms)
- Uses existing `animate-fade-in` + new `q-metric-reveal` keyframes

### G2. Rich Tooltips
**Files:** Various metric components

- On hover over any KPI: tooltip explains "why" in plain English
- Example: "Runway 1 month because monthly loss is $6,070 vs cash $10,000"
- Uses existing Radix Tooltip infrastructure

---

## Files Summary

| New Files | Purpose |
|-----------|---------|
| `ImpactSnapshot.tsx` | Before/after diff panel for Levers Lab |
| `AssumptionConflictBadge.tsx` | Persistent conflict count badge |
| `AssumptionConflictDrawer.tsx` | Conflict detail sheet |

| Modified Files | Changes |
|----------------|---------|
| `ResultsHeroStrip.tsx` | Cinematic verdict strip with huge KPIs and ranges |
| `PersistentResultsHeader.tsx` | Slim down, add conflict badge, rename step labels |
| `AccuracyTransparentResults.tsx` | Narrative reorder, editorial copy, load sequence |
| `SimpleMetricCard.tsx` | Add interpretive chips + benchmark percentiles |
| `InlineAssumptionEditor.tsx` | Tactile sliders with live impact chips |
| `ScenarioBar.tsx` | Timeline layout, ambient color shifts, crossfade |
| `RevenueChart.tsx` | Forecast bands + ghost lines |
| `StressMap.tsx` | Clickable segments, inline risk interpretation |
| `AppSidebar.tsx` | Merge nav items, lock icons |
| `index.css` | Type tokens, glow system, status tokens, load animations |
| `tailwind.config.ts` | Display font token, animation keyframes |

## Implementation Order
1. **Phase A** (Results hero + narrative) — biggest visual impact
2. **Phase E** (Typography + status tokens) — underpins everything
3. **Phase B** (Levers Lab) — key interaction upgrade
4. **Phase C** (Scenario Theatre) — differentiator
5. **Phase D** (Conflict engine UI) — unique vs competitors
6. **Phase F** (Sidebar + copy) — polish
7. **Phase G** (Motion) — final layer

Phases A+E can ship together as one batch. Each subsequent phase builds on but doesn't block the previous.

