

## Stress Map "Mission Control" Redesign

### Current State
The existing `StressMap.tsx` has the core structure (SVG gauge + 2×2 grid) but uses legacy Tailwind colors instead of the Quantis design tokens. It lacks the "NASA Mission Control" aesthetic, staggered animations, and proper typography.

### Changes Required

**1. Visual Overhaul**
- Replace all Tailwind color classes (`text-emerald-500`, `bg-amber-500`) with `var(--q-status-*)` tokens
- Container: `bg-[var(--q-bg-surface)]` with `border-[var(--q-border-default)]`
- Block cards: `bg-[var(--q-bg-elevated)]` + block-specific status borders
- Header text: `.text-h2` (Sora)
- Score numbers: `.text-metric-lg font-mono` (JetBrains Mono)

**2. Score Color Function** (new 5-tier mapping from spec)
```
0–30:   --q-status-red / red-bg
31–50:  --q-status-orange / orange-bg
51–70:  --q-status-yellow / yellow-bg
71–85:  light green (#6EE7B7) / rgba(16,185,129,0.06)
86–100: --q-status-green / green-bg
```

**3. Ring Gauge Upgrade**
- Increase radius to 90 (circumference ≈ 565)
- Stroke width: 12px
- Background ring: `var(--q-bg-overlay)`
- Use CSS variable `--target-offset` for animation
- Add `q-ring-draw` keyframe (already defined in CSS)

**4. Staggered Animation System**
- On mount: all bars start at 0%
- 300ms initial delay
- Each block animates over 600ms with 200ms stagger between them
- Score numbers count up from 0 using CSS `counter` or useState
- Apply `.q-metric-reveal` + `.q-stagger` with `--index`

**5. Block Card Enhancements**
- Left accent bar (3px) colored by score tier
- Icon + title row with score number right-aligned
- Progress bar with animated fill
- Explanation text + italic recommendation

**6. New Animated Counter Hook**
- Create `useCountUp(target, duration)` for animating numbers from 0

### File Changes
| File | Change |
|------|--------|
| `src/components/analysis/StressMap.tsx` | Full redesign with q- tokens, ring specs, stagger animations |

