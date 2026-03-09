
# Phase 3 Sessions S1-S3 Implementation Plan

## Current State Analysis
The codebase already has:
- `AccuracyTransparentResults.tsx` — a 3-step wizard with basic tabs
- `ResultsTopBar.tsx` — a simple top bar with confidence badge
- `ResultsHeroStrip.tsx` — 4 KPI cards with count-up animations
- No QSL safety level system exists yet

This plan upgrades these components to match the authoritative spec.

---

## Session P3-S1: QSL Safety Levels + Traffic Light Badge

**1. Create `src/lib/quantis-safety-levels.ts`**
- `QSL` enum: EXPLORATORY=1, PLANNING=2, INVESTOR=3, LOAN=4
- `QSL_CONFIG` object with badge, label, sub, disclaimer, colors (color, bg, border), and minConfidence/maxConfidence thresholds
- `getQSLFromConfidence(score)` function mapping 0-69→QSL-1, 70-84→QSL-2, 85-94→QSL-3, 95-100→QSL-4

**2. Create `src/components/ui/TrafficLightBadge.tsx`**
- Props: `confidenceScore`, `size` (sm/md/lg), `showTooltip`
- Sizes: sm (7px dot + score%), md (dot + QSL label + score%), lg (2-line with sublabel)
- QSL-3/4: pulsing glow animation via CSS keyframes
- Tooltip on hover: 240px panel with disclaimer text; QSL-1/2 adds improvement hint
- Entrance animation: scale(0.8) → scale(1) with opacity, 300ms spring

---

## Session P3-S2: Persistent Results Header

**3. Create `src/components/analysis/PersistentResultsHeader.tsx`**
- Sticky container: `position: sticky`, `top: 0`, `z-index: 100`, blur backdrop
- Inner row (60px height):
  - LEFT: Back button, divider, business name + location
  - CENTER: 4 KPI chips (Mo.12 Profit, Break-Even, Runway, Confidence) with count-up animations and color coding
  - RIGHT: Metadata pill, Download button, New Analysis button
- Wizard tabs row (44px): 3 equal tabs with active/completed/inactive states
- Integrate `TrafficLightBadge` size="sm" in Confidence chip

**4. Update `AccuracyTransparentResults.tsx`**
- Replace the current header section with `<PersistentResultsHeader>`
- Pass `currentStep`, `onStepChange`, and analysis data

---

## Session P3-S3: Enhanced Wizard Steps

**5. Refactor `AccuracyTransparentResults.tsx` step content**
- Move step rendering to follow the spec's 2-column layouts
- Step 1: Executive Summary (58%) + StressMap + Metric Grid (42% sticky) + Audit Trail
- Step 2: 36-Month Chart with 3 scenario tabs + P&L table + "Why These Numbers?" section + InlineAssumptionEditor + Impact Preview
- Step 3: Risk Flags (expandable mitigation) + Action Plan + DocGeneratorPanel + RealismFeedbackWidget
- Step transitions: opacity + translateX animation
- Navigation footer: Previous/Next buttons + LastAuditedBadge

---

## Files to Create
1. `src/lib/quantis-safety-levels.ts`
2. `src/components/ui/TrafficLightBadge.tsx`
3. `src/components/analysis/PersistentResultsHeader.tsx`

## Files to Update
1. `src/components/analysis/AccuracyTransparentResults.tsx` — integrate new header, enhanced step layouts, and TrafficLightBadge

