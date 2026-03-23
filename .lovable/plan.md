# Design Audit Implementation — Phase 1 & 2

## Overview

The design audit contains 147 improvements across 6 phases. This plan covers **Phase 1 (Critical Fixes)** and **Phase 2 (Design Token Alignment)** — the highest-impact, lowest-effort work that establishes the visual foundation.

The project already has a well-structured design token system (`--q-*` variables in `index.css`). The audit's recommended tokens map closely to what exists. The main gaps are: inconsistent usage across components, contrast failures, emoji icons, and CTA text inconsistency.

---

## Phase 1: Critical Fixes (7 items)

### 1. Fix WCAG Contrast Failures (8 elements)

**File:** `src/index.css` + individual components


| Element                 | Current | Fix                      |
| ----------------------- | ------- | ------------------------ |
| Hero subtitle (landing) | ~3.8:1  | Darken to `#4B5563`      |
| Sidebar section headers | ~2.5:1  | Use `#94A3B8` on dark bg |
| Input placeholder text  | ~3.2:1  | Use `#6B7280` minimum    |
| "UNCERTAIN" red text    | ~3.9:1  | Use `#F87171`            |
| "+20%" quality badges   | ~3.0:1  | Add background pill      |
| "Save 17%" green        | ~3.5:1  | Use `#059669`            |
| Tab inactive text       | ~3.1:1  | Use `#94A3B8`            |
| "Back to Home" (auth)   | ~3.8:1  | Darken link color        |


**Files:** `MobileHero.tsx`, `AppSidebar.tsx`, `CompactAnalysisForm.tsx`, `AccuracyTransparentResults.tsx`, `PricingSection.tsx`, `Auth.tsx`, `index.css`

### 2. Replace Emoji Icons with Lucide SVGs

**File:** `src/components/analysis/IndustrySelector.tsx` (or wherever industry buttons render)

Replace: ☕💻🍽️💪🏪🛒💼🏥  
With: `Coffee`, `Monitor`, `Utensils`, `Dumbbell`, `Store`, `ShoppingCart`, `Briefcase`, `HeartPulse` from lucide-react

### 3. Standardize CTA Text

Audit all pages and unify to two variants:

- Primary: **"Start Free Analysis →"**
- Secondary: **"See Example Report →"**

**Files:** `MobileHero.tsx`, `HeroVariants.tsx`, `Header.tsx`, `HowItWorks.tsx`, `UseCases.tsx`, `RiskGallery.tsx`, `Landing.tsx`

### 4. Fix Step Indicator Colors

**File:** `CompactAnalysisForm.tsx` or `WizardProgress.tsx`

- Change orange dot → blue numbered circle
- Active: filled blue circle. Completed: green checkmark. Upcoming: gray circle

### 5. Add `:focus-visible` Styles Globally

**File:** `src/index.css`

```css
*:focus-visible {
  outline: 2px solid var(--q-accent-primary);
  outline-offset: 2px;
}
```

### 6. Make "Run Stress-Test" Always Visible

**File:** `CompactAnalysisForm.tsx` or the right panel component

- Make the right panel sticky (`position: sticky; top: 1rem`) so CTA is always in view

### 7. Fix Card Height Inconsistencies

**Files:** `AnalysisTemplatesGrid.tsx`, `ExamplesIndex.tsx`, `RiskGallery.tsx`

- Add `items-stretch` to grid containers
- Pin CTA buttons to card bottom with `mt-auto`

---

## Phase 2: Design Token Alignment (7 items)

### 1. Add Audit-Recommended Token Aliases

**File:** `src/index.css`

- Add the audit's recommended tokens as aliases mapping to existing `--q-*` tokens:
  - `--bg-primary` → `--q-bg-base`
  - `--bg-surface` → `--q-bg-surface`
  - `--bg-surface-raised` → `--q-bg-elevated`
  - `--bg-surface-sunken` → `--q-bg-input`
  - `--border-default` → `--q-border-default`
  - `--shadow-glow` → `0 0 0 3px rgba(59,130,246,0.3)`
- Adjust `--q-radius-md` from `10px` to `8px` per audit

### 2. Standardize Button Component

**File:** `src/components/ui/button.tsx`

- Ensure all variants have: 48px height, 15px font, 500 weight, 24px horizontal padding, 200ms transition, min-width 120px, focus ring

### 3. Standardize Input Fields

**File:** `src/components/ui/input.tsx`

- 48px height, 16px h-padding, 15px text, sunken bg, 1px border, focus glow
- Consistent prefix/suffix styling ($ and % addons)

### 4. Standardize Card Components

**Files:** Various card components

- Apply consistent: `--q-bg-surface` bg, 1px border, `--q-radius-lg`, 20px padding, 200ms hover transition

### 5. Standardize Badge/Chip Variants

**File:** `src/components/ui/badge.tsx`

- 6 variants: Primary (blue), Success (green), Warning (orange), Danger (red), Neutral (gray), Plus (gold)
- All: `--q-radius-sm`, 6px 12px padding, 12px text, 500 weight

### 6. Sidebar Navigation Polish

**File:** `src/components/layout/AppSidebar.tsx`

- Section headers: 12px, all-caps, letter-spacing 0.06em, muted color
- Active item: accent text + raised bg + 3px left border
- Hover: raised bg on mouseover
- Lock icon on auth-required items for unauthenticated users

### 7. Add `prefers-reduced-motion` Support

**File:** `src/index.css`

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Files Modified (estimated 15-20 files)


| Category      | Files                                                                               |
| ------------- | ----------------------------------------------------------------------------------- |
| Global CSS    | `src/index.css`                                                                     |
| UI Components | `button.tsx`, `input.tsx`, `badge.tsx`                                              |
| Layout        | `AppSidebar.tsx`                                                                    |
| Landing       | `MobileHero.tsx`, `HeroVariants.tsx`, `Header.tsx`                                  |
| Analysis      | `CompactAnalysisForm.tsx`, `IndustrySelector.tsx`, `AccuracyTransparentResults.tsx` |
| Pages         | `Auth.tsx`, `HowItWorks.tsx`, `Landing.tsx`, `RiskGallery.tsx`, `Pricing.tsx`       |
| Examples      | `ExamplesIndex.tsx`, `AnalysisTemplatesGrid.tsx`                                    |


## What's must be here 100% completely, every line of code with elements and double check  in This Plan (Phases 3-6)

- Phase 3: Industry selector redesign, skeleton states, hover animations
- Phase 4: Mobile responsive fixes (hamburger menu, stacking)
- Phase 5: Auth page split layout, unified example/risk cards, brand name cleanup
- Phase 6: Dark/light toggle, keyboard shortcuts, ARIA roles, Storybook

These will be planned in subsequent rounds after Phase 1-6 are shipped.