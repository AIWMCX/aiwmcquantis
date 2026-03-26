

# Polish Dashboard & Reviews — Real Data, No Generic Content

## Current State Assessment

| Dimension | Score | Issue |
|-----------|-------|-------|
| Data authenticity | 6/10 | StressMap expanded view repeats explanation/recommendation text — no additional data on expand. Step 3 mitigation plans are generic ("Monitor this metric weekly", "Set up alerts at ±15%") instead of using actual computed insights |
| Testimonials | 3/10 | Current reviews use fake names (Sarah K., Marcus D., Priya R., James L.) — user wants real names: Oleg, Vlad, Aleksandr, Andrew, Mike |
| Action Plan (Step 3) | 4/10 | `quick_wins` items are short strings like "Review expenses" — the expanded mitigation shows 3 hardcoded generic steps instead of using the rich `ActionableInsight.action_plan.tactics` data that the engine already computes |
| Executive Summary | 7/10 | Expand/collapse works now, but chip labels still show generic "Good vs peers" / "Below median" instead of computed context |

## Problems to Fix

1. **Testimonials use fake names** — Replace with Oleg, Vlad, Aleksandr, Andrew, Mike with relevant professional roles
2. **StressMap expanded content is duplicated** — The expanded section (lines 430-464) shows the same `explanation` and `recommendation` text that's already visible above. No additional value on click. Need to show unique expanded data: actual metric values, benchmark comparisons, specific numbers
3. **Step 3 mitigation plans are hardcoded generic** — Lines 463-469 show "Monitor this metric weekly / Set up alerts at ±15% / Prepare contingency budget" for ALL risks. The engine computes rich `ActionableInsight.action_plan.tactics` with specific actions, costs, and timeframes — these should be used
4. **Step 3 action items show `quick_wins` strings** — These are just short labels. The full `insights` array has detailed `action_plan` with `strategy`, `tactics`, `expected_outcome` — none of this is surfaced
5. **SimpleMetricCard chip labels are generic** — "Good vs peers" / "Below median" / "Critical" — should reflect actual computed status

## Plan

### 1. Replace Testimonials with Real Names

**File: `src/components/landing/Testimonials.tsx`**

Replace the 4 testimonials with 5 using the requested names:
- **Oleg** — SaaS Founder — "Quantis showed my LTV:CAC was 1.2x — I was scaling a money-losing machine. Restructured pricing before burning another $30K."
- **Vlad** — Restaurant Owner — "The stress map flagged my payroll ratio at 48% of revenue. Cut it to 32% and hit profitability in month 4."
- **Aleksandr** — Real Estate Investor — "Break-even at 22 months? The tool told me to renegotiate my lease first. Dropped it to 14 months."
- **Andrew** — E-commerce Founder — "I ran 3 scenarios before launch. The conservative projection was dead accurate at month 6."
- **Mike** — Business Consultant — "I use Quantis to pre-mortem every client pitch. The risk index catches what spreadsheets miss."

These reference actual engine outputs (LTV:CAC, stress map, break-even, scenarios, risk index) — not generic praise.

### 2. Enrich StressMap Expanded Content with Unique Data

**File: `src/components/analysis/StressMap.tsx` (BlockCard, lines 430-464)**

Currently the expanded section just re-displays `explanation` and `recommendation` (already visible). Replace with:
- **Actual metric value** (e.g., "LTV:CAC: 2.3x" for Market, "Gross Margin: 42%" for Margin)
- **Benchmark comparison** (e.g., "Industry median: 60% — you're 18 pts below")
- **Score breakdown** showing which sub-factors contributed to the score
- Pass additional structured data through new props: `metricValue`, `benchmarkValue`, `benchmarkLabel`

Update `StressMapProps` to include `metricDetails` per block, and compute these in `calculateStressScores()`.

### 3. Replace Generic Mitigation Plans with Engine-Computed Tactics

**File: `src/components/analysis/AccuracyTransparentResults.tsx` (Step 3, lines 425-537)**

Currently risks expand to show 3 hardcoded steps. Replace with:
- Pass `insights` (ActionableInsight[]) to Step 3
- For each risk, find matching insight by keyword matching or display the full `action_plan.tactics` array
- Show: action, expected_impact, effort badge, timeframe, cost_estimate
- Replace the generic "Execute within timeline" text with the computed `action_plan.expected_outcome`

For the "What To Fix First" section (lines 481-513): Replace `quick_wins` string display with full insight cards showing `action_plan.strategy` and first 2 tactics with their impact/effort/timeframe.

### 4. Make SimpleMetricCard Chips Data-Driven

**File: `src/components/analysis/SimpleMetricCard.tsx`**

Replace generic chip logic (lines 45-50) — instead of "Good vs peers" use computed context passed as `chip` prop. Update the calling code in AccuracyTransparentResults to pass specific chips like:
- "Profitable at Mo.12" / "Losing $2.1k/mo"
- "3.2x — healthy" / "1.8x — below 3x target"
- "Mo.8 — fast recovery" / "Mo.22 — slow"

### 5. Update Landing ClientTestimonials Component

**File: `src/components/landing/ClientTestimonials.tsx`**

This component is currently NOT imported anywhere. It was replaced by `Testimonials.tsx`. No changes needed here — all changes go to `Testimonials.tsx`.

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/components/landing/Testimonials.tsx` | Replace fake names with Oleg, Vlad, Aleksandr, Andrew, Mike; quotes reference actual engine metrics |
| `src/components/analysis/StressMap.tsx` | Add `metricDetails` to props; show unique metric values + benchmarks in expanded view instead of duplicating explanation |
| `src/components/analysis/AccuracyTransparentResults.tsx` | Step 3: replace generic mitigation with engine-computed `action_plan.tactics`; replace quick_wins strings with full insight cards |
| `src/components/analysis/SimpleMetricCard.tsx` | No structural change — chip content driven by caller |

## Implementation Order
1. Fix Testimonials with real names + engine-referencing quotes
2. Enrich StressMap expanded blocks with unique metric data
3. Replace Step 3 generic content with computed action plans
4. Pass data-driven chips to SimpleMetricCard from AccuracyTransparentResults

