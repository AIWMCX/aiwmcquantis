

# Fix QuantisHeroDemo — Readable, Stable, Professional

## Core Problems

1. **Text is illegible**: Font sizes range 7-10px — unreadable at hero scale. Users see a dark blur, not a dashboard.
2. **Screen shakes on hover**: The metric tooltip (`{metric && ...}`) inserts/removes a DOM element in normal flow, pushing all content below it up and down. Every mouse movement over the 4 cards causes visible layout jumping.
3. **Too much content crammed into ~520px**: Chart, risk bars, insights, Monte Carlo, depth selector, idea generator — all squeezed into a narrow column with microscopic text. It looks like a thumbnail, not a demo.
4. **Industry tabs wrap to 2 lines** on narrower viewports, breaking the nav bar layout.

## Solution

### A. Fix the shaking — Absolute-positioned tooltip overlay
Replace the flow-inserted metric tooltip div with an absolutely-positioned overlay that appears ON TOP of the metric cards area (or below them as a fixed-height region). This eliminates layout shift entirely.

**Approach**: Reserve a fixed 48px height area below the metric cards. The tooltip content fades in/out within that reserved space using opacity transitions — never inserting/removing from DOM flow.

### B. Increase all font sizes for readability
| Current | New | Element |
|---------|-----|---------|
| 7-8px | 10px | Labels, axis ticks, tags |
| 9px | 11px | Risk factor names, insight text |
| 10px | 12px | Verdict text, tooltip content |
| text-lg (18px) | text-xl (20px) | Metric values |
| 8px | 10px | Sub-labels on metric cards |

### C. Simplify the default view
- Default to **Full** depth (already done) but make the demo **non-scrolling** at hero scale
- Remove the Analysis Depth Selector from the hero demo — it's internal app UX, not a hero showcase element. The depth switching still works via data but the selector cards are removed to save vertical space
- Collapse the Generate Idea section into a single compact button row instead of the current two-column layout with descriptive text

### D. Widen the demo container
In `MobileHero.tsx`, change `max-w-[520px]` to `max-w-[600px]` and adjust the grid to give the demo more breathing room on large screens.

### E. Smooth all transitions
- Add `transition-all duration-200` to metric cards (already exists)
- Add `transition-opacity duration-150` to the tooltip area
- Ensure industry tab switching doesn't cause height jumps by setting `min-height` on the content area

## Files to Change

| File | Changes |
|------|---------|
| `src/components/landing/QuantisHeroDemo.tsx` | Increase all font sizes; replace flow tooltip with fixed-height fade region; remove depth selector section; compact the idea generator; add min-height to content panels; smooth transitions |
| `src/components/landing/MobileHero.tsx` | Widen demo container from 520px to 600px |

## Implementation Order
1. Fix the tooltip shaking (structural DOM change)
2. Bump all font sizes
3. Remove depth selector, compact idea section
4. Widen container in MobileHero
5. Add min-heights and smooth transitions

