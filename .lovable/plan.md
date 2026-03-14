

# Pre-Mortem Repositioning + Risk-First Results

## Problem

The landing page sells "validate your idea in 90 seconds" — generic and undifferentiated. The results lead with Executive Summary (consulting slides) instead of the 2-3 things most likely to kill the business. The output says "VIABLE" instead of actionable decision framing. The BeforeAfterComparison sells against consultants, not against the real enemy: uninformed commitment.

## Changes

### 1. Landing Page Hero — `MobileHero.tsx`
- Headline: "Find out what will kill your business — before it costs you everything."
- Subheadline: "Quantis runs a financial pre-mortem on your business model. See fatal assumptions, stress-test scenarios, and get a clear proceed/pivot/kill verdict. In 90 seconds."
- Primary CTA: "Run Free Pre-Mortem →"
- Secondary CTA: "See a Sample Pre-Mortem"
- Update eyebrow pill: "Pre-Mortem Engine · Dual-AI Verified"

### 2. Hero A/B Variants — `HeroVariants.tsx`
- Update all 3 variants to use pre-mortem language
- Control: "Find out what will kill your business..."
- Numbers first: "3 fatal assumptions. 36-month stress-test. One clear verdict."
- Action focused: "Should you commit $50k to this idea? Find out in 90 seconds."

### 3. BeforeAfterComparison — `BeforeAfterComparison.tsx`
- "Without" items: "Commit $30k+ based on gut feeling", "Discover fatal flaw 6 months in", "No way to stress-test assumptions", "Optimism bias goes unchecked"
- "With" items: "Know your 3 fatal assumptions before spending $1", "Stress-test against 1,000+ industry benchmarks", "Get a clear proceed/pivot/kill verdict", "See exactly which number will break your model"

### 4. Results Step 1 Restructure — `AccuracyTransparentResults.tsx`
- **Lead with risk, not summary.** Swap the order:
  - First card: "Risk Intelligence" — show the 2-3 most dangerous flags from `actionable_insights` (danger/warning status) as "Fatal Assumptions" with red styling
  - Second card: Executive Summary (demoted, shorter)
  - Keep Stress Map and metric grid as-is
- Add a **Decision Verdict Banner** at the top of Step 1 (above the grid):
  - Maps confidence score + risk count to one of 3 verdicts:
    - `confidence >= 80 && criticalRisks === 0` → "FAST-TRACK: Capital efficient, low downside. Proceed."
    - `confidence >= 60 && criticalRisks <= 2` → "PROCEED WITH CAUTION: Address [X] and [Y] first."
    - `confidence < 60 || criticalRisks > 2` → "DO NOT PROCEED until you resolve these assumptions."
  - Styled as a colored banner: green/yellow/red

### 5. Bottom CTA — `Landing.tsx`
- Update bottom CTA section: "Stress-Test Your Business Model — Free" → "Run a Pre-Mortem on Your Business Model — Free"
- Update sub-copy to match pre-mortem positioning

### 6. WhoItsFor section copy alignment
- Check and update if it references "validate" language → shift to "pre-mortem" / "stress-test" / "protect your investment"

## Files Modified

| File | Change |
|------|--------|
| `src/components/landing/MobileHero.tsx` | New hero copy, CTAs, eyebrow |
| `src/components/landing/HeroVariants.tsx` | Update all 3 A/B variants |
| `src/components/landing/BeforeAfterComparison.tsx` | New before/after items |
| `src/components/analysis/AccuracyTransparentResults.tsx` | Risk-first Step 1, Decision Verdict banner |
| `src/pages/Landing.tsx` | Bottom CTA copy |

