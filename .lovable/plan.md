

## Design System Application Plan — 3 Pages

### 1. Examples Gallery (`src/pages/examples/ExamplesIndex.tsx`)

**Changes:**
- Page background: `bg-[var(--q-bg-base)]` with `text-[var(--q-text-primary)]`
- Header: `bg-[var(--q-bg-surface)]/80` with `border-[var(--q-border-subtle)]`
- Badge "Sample Reports": styled with `bg-[var(--q-status-ai-bg)] text-[var(--q-status-ai)] border-[var(--q-status-ai-border)]`
- Each example card: `q-card` class (gets gradient background, hover lift+glow, border transitions)
- Stagger animation on card grid: each card gets `q-stagger` with `--index` CSS variable for sequential reveal
- Profit metric: `font-mono text-metric-sm` (JetBrains Mono) + green status color
- ROI metric: `font-mono text-metric-sm` + accent blue
- Industry/location badges: styled with `q-border-subtle` backgrounds
- CTA section: gradient accent background using `var(--q-gradient-accent)`
- Add score display to EXAMPLE_LIST — extend data with `score` field and show as `text-metric-xs` badge

**Data change** in `exampleData.ts`: Add `score` to EXAMPLE_LIST mapping (derive from ROI: >200%→9, >100%→8, >80%→7, else 6)

### 2. Analysis Results (`src/components/analysis/AnalysisResults.tsx`)

**Changes:**
- Header card: `q-card` class with dynamic left border color based on ideaScore (green/amber/red)
- Idea score badge: Use `q-score-excellent`/`q-score-good`/`q-score-caution`/`q-score-poor` classes
- Score number: `text-metric-lg font-mono` (JetBrains Mono, 32px)
- 4 MetricCards in grid: apply `q-metric-reveal` + `q-stagger` with `--index` for sequential animation
- MetricCard (inline component, line 574): 
  - Background `bg-[var(--q-bg-elevated)]`, border `border-[var(--q-border-default)]`
  - Value in `font-mono text-metric-sm` with semantic color (green for positive, red for negative)
  - Label in `text-label` style (uppercase, tracked)
- Tab container: `bg-[var(--q-bg-surface)]` with `border-[var(--q-border-subtle)]`
- SwotQuadrant: Use q-status color variables instead of Tailwind color classes
- Add left accent bar (3px) on header card colored by score tier

### 3. Landing Hero (`src/components/landing/MobileHero.tsx` + `src/components/landing/HeroVariants.tsx`)

**MobileHero changes:**
- Section background: replace gradient blobs with `var(--q-gradient-hero)` background
- Keep subtle animated glow orbs but use `var(--q-accent-glow)` color
- Headline: `text-display` class (Sora, 700, -0.03em tracking)
- "Before You Spend a Dollar" span: `text-[var(--q-accent-primary)]`
- Form card: `q-card` class with `var(--q-shadow-glow-blue)` shadow
- Input fields: `bg-[var(--q-bg-input)]` with `border-[var(--q-border-default)]`
- CTA button: gradient accent background `var(--q-gradient-accent)` 
- Value badges: use `bg-[var(--q-accent-glow)]` + `border-[var(--q-accent-primary)]/20`
- Friction reducers: green checkmarks use `var(--q-status-green)`
- Add animated metric preview counter above the form showing "$14,200/mo" counting up with `q-metric-reveal`

**HeroVariantDisplay changes:**
- H1: `text-display` class (Sora font)
- Subtitle: `text-body` + `text-[var(--q-text-secondary)]`

### 4. New Component: Confidence Badge (`src/components/analysis/QConfidenceBadge.tsx`)

Implement the 5-tier badge system from the spec:
- **VERIFIED** (95-100%): green pill with shield icon, glow
- **CONFIRMED** (80-94%): blue pill with checkmark
- **ESTIMATED** (65-79%): yellow pill with info icon
- **UNCERTAIN** (50-64%): orange pill with warning triangle
- **BLOCKED** (<50%): grayed overlay with "INSUFFICIENT DATA"

Each badge uses the corresponding `var(--q-status-*)` variables.

### Files Modified
| File | Change |
|------|--------|
| `src/pages/examples/ExamplesIndex.tsx` | q-card, stagger, metric fonts, themed colors |
| `src/pages/examples/exampleData.ts` | Add score to EXAMPLE_LIST |
| `src/components/analysis/AnalysisResults.tsx` | q-card header, metric-reveal stagger, score classes, font-mono values |
| `src/components/landing/MobileHero.tsx` | q-gradient-hero, text-display, q-card form, animated counter |
| `src/components/landing/HeroVariants.tsx` | text-display class on headline |
| `src/components/analysis/QConfidenceBadge.tsx` | **New** — 5-tier confidence badge component |

