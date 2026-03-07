

# Fix: Numbers Not Visible + Data Display Accuracy Audit

## Issues Found

### 1. `text-success` / `bg-success` — Invisible Color Classes
The CSS defines `--success` custom property but **Tailwind does not know about it**. The `tailwind.config.ts` never registers `success` as a color. This means:
- `IndustryComparison.tsx` uses `text-success`, `bg-success` → **invisible** (no color applied)
- `ConfidenceIndicator.tsx` uses `text-success`, `bg-success/10`, `border-success/30` → **invisible**

The comparison bars and confidence colors **literally don't render** because Tailwind purges unknown classes.

**Fix:** Add `success` and `warning` to `tailwind.config.ts` colors.

### 2. Sensitivity Tornado — Stacked Bar Math Error
The chart uses `stackId="range"` with `low` and `high` as separate bars. But stacked bars in Recharts **add values**, so if `low = $14,000` and `high = $26,000`, the second bar starts at $14k and extends to $40k. This is wrong for a tornado chart — bars should show the range from base value.

The correct approach: compute `negativeDelta` (base - low) and `positiveDelta` (high - base), and render two bars going left/right from the base line, not stacked.

**Fix:** Rewrite the chart data transformation to use delta-from-base values, rendered as a proper tornado (negative values go left, positive go right).

### 3. IndustryComparison — Bar Width Always 50%
The industry avg marker is hardcoded at `left: ${Math.min(50, 100)}%` which is always 50%. The user's value bar uses `width: ${Math.min(percentage / 2, 100)}%` — dividing by 2 makes no intuitive sense. For negative margins (-60%), `ratio` could be negative, making the bar width 0.

**Fix:** Normalize the bar so the industry average is always at the 50% mark, and the user's value is proportional to that. Handle negative values (like negative margins) gracefully.

### 4. ConfidenceIndicator — Breakdown Percentages Not Showing Values
In the screenshot (image-99), the breakdown shows `% (40%)` instead of actual values like `85% (40%)`. This happens when `breakdown.input_completeness` etc. are `undefined` or `0`. The values display as just `%` with no number.

**Fix:** Add fallback `?? 0` and ensure the edge function actually populates these fields. Also verify the `ConfidenceBreakdown` type alignment.

### 5. Missing Tailwind `tabular-nums` utility
Used throughout but need to verify it works — it's a standard Tailwind utility via `font-variant-numeric`, should be fine.

---

## Plan

### File 1: `tailwind.config.ts`
Add `success` and `warning` color definitions to the colors object so all `text-success`, `bg-success`, etc. classes work:
```ts
success: {
  DEFAULT: 'hsl(var(--success))',
  foreground: 'hsl(var(--success-foreground))',
},
warning: {
  DEFAULT: 'hsl(var(--warning))',
  foreground: 'hsl(var(--warning-foreground))',
},
```

### File 2: `src/components/analysis/SensitivityTornado.tsx`
Rewrite the chart to be a proper tornado:
- Compute `baseProfit` as the midpoint or the base scenario profit
- For each variable, compute `negativeDelta = profitAtMinus20 - baseProfit` (negative number) and `positiveDelta = profitAtPlus20 - baseProfit` (positive number)
- Render two `Bar` components: one for negative delta (red, goes left) and one for positive delta (blue, goes right), both anchored at 0
- Add a `ReferenceLine` at x=0 (the base profit)
- Fix the tooltip to show actual dollar values with labels like "-20%: $14,200" and "+20%: $26,500"

### File 3: `src/components/analysis/IndustryComparison.tsx`
Fix the `ComparisonBar`:
- Normalize the bar so industry average is at the 50% mark
- User value proportional: `(value / benchmark) * 50%`, capped at 100%
- Handle negative values (e.g., -60% margin): show a red bar going from 0, with the benchmark marker clearly positioned
- Fix the industry avg marker position to actually be at the 50% mark consistently
- Show the actual percentage difference with proper sign

### File 4: `src/components/analysis/ConfidenceIndicator.tsx`
- Ensure breakdown values display with proper fallbacks (`item.value ?? 0`)
- Already has fallbacks but verify the data flow

### File 5: `src/components/analysis/AnalysisResults.tsx`
- The `MetricCard` uses `text-[10px]` for labels — this is too small. Increase to `text-xs`.
- Verify payback period formatting uses `formatPaybackDisplay` for the 999-sentinel handling

---

## Files Summary

| File | Change |
|------|--------|
| `tailwind.config.ts` | Add `success` and `warning` colors |
| `src/components/analysis/SensitivityTornado.tsx` | Rewrite to proper tornado chart with deltas |
| `src/components/analysis/IndustryComparison.tsx` | Fix bar normalization + negative value handling |
| `src/components/analysis/ConfidenceIndicator.tsx` | Fix value display fallbacks |
| `src/components/analysis/AnalysisResults.tsx` | Fix label sizing, payback sentinel |

