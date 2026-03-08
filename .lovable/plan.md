
## Button System Implementation

### Overview
Update the button component to use Quantis design tokens with 5 distinct variants: Primary, Secondary, Ghost, Danger, and AI Action (with shimmer animation).

### Changes to `src/components/ui/button.tsx`

**Variant Updates:**

| Variant | Styles |
|---------|--------|
| `default` (Primary) | `bg-[var(--q-accent-primary)]`, white text, Sora 600 14px, hover: `translateY(-1px) brightness(1.1)`, active: `translateY(0) brightness(0.95)` |
| `secondary` | Transparent bg, `border-[var(--q-border-strong)]`, `text-[var(--q-text-primary)]`, hover: `bg-[var(--q-bg-elevated)]` |
| `ghost` | No bg/border, `text-[var(--q-accent-primary)]`, hover: `bg-[var(--q-accent-glow)]`, active: `scale(0.98)` |
| `destructive` → `danger` | `bg-[var(--q-status-red-bg)]`, `border-[var(--q-status-red-border)]`, `text-[var(--q-status-red)]` |
| `ai` (NEW) | Gradient from `--q-status-ai` to `--q-accent-primary`, shimmer animation on hover, glow shadow |

**Size Updates:**
- `default`: 48px height (`h-12`), `px-6`
- `sm`: 36px (`h-9`), `px-4`
- `lg`: 52px (`h-13`), `px-8`

**Props Addition:**
- `isLoading?: boolean` — shows spinner, maintains button width via `min-w-[width]`

### CSS Additions to `src/index.css`

Add shimmer keyframe for AI button:
```css
@keyframes q-shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
```

Add `.q-btn-ai` class with:
- Gradient background
- Shimmer animation on hover
- Glow shadow: `0 4px 16px rgba(129,140,248,0.3)`

### Files Modified
| File | Change |
|------|--------|
| `src/components/ui/button.tsx` | New variants (ai, danger), sizes, loading state, Quantis tokens |
| `src/index.css` | Add `@keyframes q-shimmer` and `.q-btn-ai` class |
