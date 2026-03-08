

## Apply Quantis Design Tokens Across Three Pages

### Overview
The design system tokens (q-card, text-metric-*, q-score-*, q-metric-reveal, q-stagger, q-gradient-card, etc.) are already fully defined in `index.css` and `tailwind.config.ts`. This task applies them consistently to three surfaces that still use ad-hoc styling.

---

### 1. Examples Gallery (`src/pages/examples/ExamplesIndex.tsx`)

Already partially migrated — uses `q-card`, `q-stagger`, `text-metric-xs`, `text-metric-sm`. Remaining changes:
- Add `q-gradient-card` background to example cards (currently using bare `q-card`)
- Apply `text-metric-sm` consistently to score badges (already done for profit/ROI, needs score badge)
- Add `q-score-excellent`/`q-score-good`/`q-score-caution` left border to cards based on score value
- Wrap the card grid in a parent with `q-stagger` class and `--index` CSS vars (already done)

**Minimal changes needed** — this page is 80% there already.

### 2. Analysis Results (`src/components/analysis/AnalysisResults.tsx` + `ResultsHeroStrip.tsx`)

Current state: Uses inline `var(--q-*)` styles but misses the utility classes.

Changes in **ResultsHeroStrip.tsx**:
- KPI values: swap `text-lg sm:text-xl font-bold tabular-nums` → `text-metric-md` class
- KPI labels: use `text-label-sm` class
- Confidence badges: apply `q-badge-success`/`q-badge-warning` classes
- KPI card containers: add `q-score-excellent`/`q-score-good`/`q-score-caution` left border based on confidence tier

Changes in **AnalysisResults.tsx**:
- Wrap section cards with `q-card` class instead of inline `rounded-xl border border-[var(--q-border-default)] bg-[var(--q-bg-surface)]`
- `MetricMini` sub-component: use `text-metric-xs` for values, `text-label-sm` for labels
- Risk flags: use `q-badge-danger`/`q-badge-warning` instead of inline color specs

Changes in **ResultsTopBar.tsx**:
- Confidence badge: use `q-badge-ai` or `q-badge-success` based on score

### 3. Landing Page Hero (`src/components/landing/MobileHero.tsx` + `src/components/landing/HeroVariants.tsx`)

**MobileHero.tsx** — already well-migrated to q-tokens. Remaining:
- The metric preview badge already uses `text-metric-md` — confirmed good
- Form card already uses `q-card` — confirmed good
- Add `q-metric-reveal` to the KPI cards/value badges row (partially done)
- Value badges at bottom: wrap in `q-stagger` for entrance animation

**HeroVariants.tsx** — already uses `text-display`, `text-body`, `var(--q-text-primary)` — no changes needed.

---

### Files

| File | Change |
|------|--------|
| `src/pages/examples/ExamplesIndex.tsx` | Add gradient-card bg, score-based left borders |
| `src/components/analysis/ResultsHeroStrip.tsx` | Swap to text-metric-md, text-label-sm, q-score-* borders |
| `src/components/analysis/ResultsTopBar.tsx` | Use q-badge classes for confidence |
| `src/components/analysis/AnalysisResults.tsx` | Replace inline border/bg with q-card, text-metric-xs on MetricMini |
| `src/components/landing/MobileHero.tsx` | Add q-stagger to value badges |

