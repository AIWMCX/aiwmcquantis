

## Analysis Flow: Loading State (4.2) + Results Page (4.3)

### Overview
Two major component overhauls: (1) Transform `AnalysisProgress` into a full-screen cinematic loading experience with Dual-AI stage tracking, and (2) Redesign `AnalysisResults` with a sticky top bar, hero summary strip with animated KPI cards, two-column layout (Stress Map + Executive Summary), and accordion detail sections — all with a choreographed entrance animation sequence.

---

### 4.2 — Loading State: `AnalysisProgress.tsx` Rewrite

**Current state**: Inline card with progress bar and stage list.
**New state**: Full-screen overlay with centered 400px loading card on hero gradient background.

**Structure:**
```text
┌─ FULL SCREEN (hero gradient + q-grid-pattern) ─────────┐
│                                                          │
│   ┌─ LOADING CARD (400px, centered) ────────────────┐   │
│   │ ⚡ Running Dual-AI Analysis                      │   │
│   │                                                  │   │
│   │ [████████████░░░░░░░░]  47%                      │   │
│   │                                                  │   │
│   │ ✓ Industry benchmarks loaded                     │   │
│   │ ✓ GPT-4o mini analysis complete                  │   │
│   │ → Gemini cross-validation in progress...         │   │
│   │ ○ Consensus scoring                              │   │
│   │ ○ Reconciliation check                           │   │
│   │ ○ Stress Map generation                          │   │
│   │ ○ Report compilation                             │   │
│   │                                                  │   │
│   │ Estimated: 24 seconds remaining                  │   │
│   │ ─────────────────────────────────────            │   │
│   │ 💡 While you wait:                               │   │
│   │ Fitness studios in Denver see avg 7% monthly...  │   │
│   └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

**Key changes:**
- Full-screen fixed overlay with `var(--q-gradient-accent)` background + `.q-grid-pattern`
- 7 stages matching Dual-AI pipeline: benchmarks → GPT analysis → Gemini cross-validation → Consensus → Reconciliation → Stress Map → Report
- Each stage: `✓` (green dot animation), `→` (pulsing, current), `○` (pending)
- Progress bar: smooth fill to 90%, holds, then 100% on completion
- Estimated time remaining countdown
- Rotating industry-specific tips every 5 seconds (existing logic preserved)
- Timeout warning after 60s with retry/cancel buttons

### 4.3 — Results Page: `AnalysisResults.tsx` Rewrite

**Current state**: Compact header card + 8-tab dashboard.
**New state**: Sticky top bar + hero summary strip + two-column layout + accordion sections with choreographed animations.

**New layout structure:**

**Sticky Top Bar** (56px):
- Left: Back button + business name + location badge
- Center: `⚡ VERIFIED 94%` confidence badge
- Right: Download, Share, New Analysis buttons

**Hero Summary Strip**:
- "Business validated in 47 seconds" headline
- "Dual-AI Consensus · GPT-4o mini + Gemini · 94% Agreement" subtitle
- 4 KPI cards in a row: Break-Even, Month 12 Revenue, Cash Runway, LTV:CAC
- Each card has an `OutputConfidenceBadge` (VERIFIED/CONFIDENT/ESTIMATED)
- Cards animate with count-up effect, staggered 80ms

**Two-Column Main Content** (60/40 split):
- Left: Stress Map (existing component) + 36-month revenue corridor chart (existing scenario chart)
- Right: Executive Summary (AI-authored paragraph) + Top Risks (color-coded flags from validation warnings)

**Accordion Detail Sections** (full-width, below columns):
- FINANCIAL MODEL (default open): P&L, cash flow, unit economics — wraps existing `FinancialSummary`
- SCENARIO COMPARISON: wraps existing `ScenarioLibrary`
- MARKET ANALYSIS: wraps existing `IndustryComparison` + `MarketAnalysisSection`
- GENERATE DOCUMENTS: link to Docs Studio with analysis prefill

**Animation Sequence** (CSS animation-delay cascade):
| Delay | Element |
|-------|---------|
| 0ms | Hero strip fade-in from top |
| 200ms | KPI cards count up (staggered 80ms each) |
| 400ms | Stress Map draws |
| 600ms | Executive summary types in |
| 800ms | Chart renders |
| 1000ms | Risk flags slide in from right |
| 1200ms | Accordion sections fade up |

**Preserved functionality**: All existing tabs (Scenarios, Risk Map, Simulation, Sensitivity, Benchmarks, Reliability, Validate) move into the accordion sections. PDF export, SCORE export, share, SWOT — all preserved.

---

### Files

| File | Change |
|------|--------|
| `src/components/analysis/AnalysisProgress.tsx` | Rewrite to full-screen Dual-AI loading overlay |
| `src/components/analysis/AnalysisResults.tsx` | Rewrite layout: sticky bar + hero + 2-col + accordions |
| `src/components/analysis/ResultsHeroStrip.tsx` | **New** — Hero summary with animated KPI cards |
| `src/components/analysis/ResultsTopBar.tsx` | **New** — Sticky top bar with actions |
| `src/components/analysis/ResultsAccordionSections.tsx` | **New** — Accordion wrappers for detail sections |
| `src/index.css` | Add animation keyframes for count-up, typewriter, stagger cascade |

