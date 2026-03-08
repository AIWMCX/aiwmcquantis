

# Production Audit — Actionable Fixes

## Analysis

After reviewing the live codebase against your audit document, here is the current state:

**Phases 1–14 are built.** QMath, Reconciliation Engine, Confidence Scoring, Monte Carlo, Stress Map, ExplainPanel, Tornado Chart, Scenario Library, API v2, Quality Logging — all exist in the codebase. The engine accuracy gap you described at 58/100 has already been addressed by the 15-session build. The remaining issues are **landing page copy/messaging** and **surface-level UX polish**.

## What needs fixing now

### 1. Title/Copy Inconsistency (P0 — Trust)

The phrase "3 minutes" is used consistently across:
- `index.html` title tag (line 52): "Under 3 Minutes"
- `HeroVariants.tsx` control variant: "in Under 3 Minutes"
- `MobileHero.tsx` line 76: "in under 3 minutes"
- `MobileHero.tsx` line 130: "Results in under 3 min"
- `UrgencyBanner.tsx` line 12: "in 3 min"
- Bottom CTA (Landing.tsx line 203): "in under 3 minutes"
- `noscript` fallback (index.html line 104): "in under 60 seconds" — **this is the only inconsistency**

The noscript block says "60 seconds" while everything else says "3 minutes." Fix: change noscript to "3 minutes" for consistency.

### 2. Landing Page Headline Upgrade (P1 — Conversion)

Update the hero H1 and subtitle to the audit's recommended positioning:
- **H1**: "Find Out Exactly Where Your Business Model Breaks — Before You Spend a Dollar"
- **Subtitle**: Stress-test framing with dual-engine + benchmark proof points
- **CTA**: Keep "Run Free Validation" (already strong)
- Update A/B test variants accordingly

### 3. Feature Callouts on Homepage (P1 — Differentiation)

Add a compact feature grid below the hero form highlighting the v2 capabilities that are now built but invisible to users:
- Dual AI Verified (GPT + Gemini)
- Stress Map risk visualization
- Scenario Library (Recession, Cost Surge, etc.)
- Explainable Numbers (click any metric)
- Investor Snapshot PDF

### 4. Bottom CTA Copy Polish (P2)

Update the bottom CTA section headline from "Your Idea Deserves Real Numbers" to the stress-test framing for consistency.

### 5. UrgencyBanner Messaging (P2)

Update from generic "AI business validation" to stress-test positioning.

## Files to modify

| File | Change |
|------|--------|
| `index.html` | Fix noscript "60 seconds" → "3 minutes" |
| `src/components/landing/MobileHero.tsx` | New H1, subtitle, add feature callouts grid |
| `src/components/landing/HeroVariants.tsx` | Update A/B variants to stress-test positioning |
| `src/components/landing/UrgencyBanner.tsx` | Update copy to stress-test framing |
| `src/pages/Landing.tsx` | Update bottom CTA copy |

No database changes. No new files. Pure copy/UI updates.

