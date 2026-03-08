

## Homepage Supporting Sections (6.2)

### Overview
Rebuild `HowItWorksSection.tsx` to contain all 5 new sections (How It Works, Example Gallery, Trust Stats, Feature Highlights) as a single cohesive landing page block. This replaces the current simple 3-step + comparison table layout.

### Files

| File | Change |
|------|--------|
| `src/components/landing/HowItWorksSection.tsx` | Full rewrite with all 5 sections |
| `src/pages/Landing.tsx` | Minor — no structural changes needed, HowItWorksSection already rendered |

### Section 2 — How It Works (3 steps with dashed connectors)

- 3 cards in a `md:grid-cols-3` grid
- Each card: step number ("01"/"02"/"03") in `var(--q-accent-primary)`, icon (Pencil, Hexagon/dual-badge, Shield), title (`q-h3`), body (`q-body-sm`, `text-secondary`)
- Step 2 shows GPT-4o mini + Gemini pill badges below the description
- Step 3 shows a mini inline stress map graphic (4 small colored blocks)
- Dashed SVG connector lines between cards on desktop (absolute positioned, hidden on mobile)

### Section 3 — Example Results Gallery

- 3-column grid showing first 5 items from `EXAMPLE_LIST` (imported from `exampleData.ts`)
- Each card: `var(--q-bg-elevated)`, hover lift, industry icon, city+industry label, profit figure in `text-metric-lg text-green`, 3 mini metric pills (Break-even, LTV:CAC, Confidence), "View Analysis" accent link
- "View all examples" link below grid pointing to `/examples`

### Section 4 — Trust Indicators (count-up stats)

- Full-width `var(--q-bg-elevated)` background
- 4 stats in a row: "1,000+" benchmarks, "15" business types, "2" AI models, "< 90s" analysis time
- Numbers use `text-metric-xl`, labels use `q-label text-secondary`
- `IntersectionObserver` triggers count-up animation on scroll into view using `useState` + `requestAnimationFrame`

### Section 5 — Feature Highlights (alternating layout)

3 features in alternating left-right layout:

1. **Stress Map**: Left = mockup (4-block grid with colored progress bars), Right = headline + 3 bullets
2. **Dual AI Consensus**: Right = mockup (GPT vs Gemini comparison visual), Left = headline + 3 bullets
3. **Document Generation**: Left = mockup (3-card doc grid), Right = headline + 3 bullets

Each row: `md:grid-cols-2 gap-12`, even rows reverse order with `md:flex-row-reverse`. Mockups are styled divs (not images) using design tokens.

### Technical Notes

- All sections wrapped in a single exported `HowItWorksSection` component
- Count-up uses a custom `useCountUp` hook with IntersectionObserver
- No new dependencies needed
- Example data imported from existing `exampleData.ts`

