

## Analysis Input Form Redesign — "Stress-Test Your Idea"

### Overview
Transform the existing 3-step vertical wizard into a premium 2-column form with a dark hero header, field completion indicators, progress bar, benchmark hints, and an AI-action submit button. The `WizardForm.tsx` component gets a major overhaul while preserving all existing logic (draft recovery, prefill, auto-advance, file upload).

### Layout Structure

```text
┌──────────────────────────────────────────────────────────┐
│  DARK HERO HEADER (160px)                                │
│  "Stress-test your idea"  — Sora 700, 40px               │
│  "Enter your details..." — DM Sans 400, 16px             │
│  CSS grid pattern background (subtle)                     │
├────────────────────────────┬─────────────────────────────┤
│  LEFT: Business Details    │  RIGHT: Financial Params    │
│  1. Industry selector      │  4. Starting capital        │
│     + popular quick-picks  │  5. Target price/customer   │
│  2. Location (search)      │  6. Expected customers      │
│  3. One-line description   │  7. Analysis depth toggle   │
├────────────────────────────┴─────────────────────────────┤
│  PROGRESS BAR: "3 of 7 fields" with fill animation       │
├──────────────────────────────────────────────────────────┤
│  [⚡ Run Stress-Test Analysis →]  (56px, ai variant)      │
└──────────────────────────────────────────────────────────┘
```

Mobile: stacks to single column, all fields sequential.

### Changes

**`src/components/analysis/WizardForm.tsx`** — Major rewrite
- Replace 3-step accordion with 2-column grid layout
- Add dark hero header with CSS grid-pattern animation
- Add inline field completion dots (green circle appears left of label when filled)
- Add top progress bar showing "X of 7 fields complete"
- Industry selector gets popular quick-pick chips (Coffee Shop, SaaS, Ecommerce)
- Location field gets auto-detect hint placeholder
- Add "analysis depth" radio group (Quick 30s / Full 90s / Deep 3min)
- Submit button: 56px height, `ai` variant, full width
- Keep all draft recovery, prefill, file upload logic intact

**`src/components/analysis/QuickIndustryPicks.tsx`** — New
- Row of 3-4 clickable chips for popular industries
- Each chip: icon + label, onClick sets industry + auto-suggests description

**`src/components/analysis/FieldCompletionDot.tsx`** — New
- Tiny animated green dot component that fades in when field is valid

**`src/components/analysis/FormProgressBar.tsx`** — New
- Horizontal bar at top of form showing "X of 7 fields"
- Uses `var(--q-accent-primary)` fill with smooth transition

**`src/index.css`** — Add CSS grid pattern animation
- `.q-grid-pattern`: subtle repeating grid lines using CSS gradients on the header

### Key Design Decisions
- Flatten the wizard: no more accordion steps — all fields visible at once in 2 columns. This reduces clicks and feels faster.
- Keep `AdvancedFinancialInputs` collapsible but auto-open it (the right column IS the financial section).
- Inline the most important financial fields (investment, price, customers) directly; churn/CAC stay in the collapsible advanced section.
- The "analysis depth" selector is new UI only — maps to an `analysis_depth` field that the backend can use to adjust processing time.
- Benchmark hints from `benchmark-calibrator.ts` slide in as subtle captions below financial fields.

### Files
| File | Change |
|------|--------|
| `src/components/analysis/WizardForm.tsx` | Rewrite to 2-column layout with hero header |
| `src/components/analysis/QuickIndustryPicks.tsx` | **New** — popular industry chips |
| `src/components/analysis/FieldCompletionDot.tsx` | **New** — animated completion indicator |
| `src/components/analysis/FormProgressBar.tsx` | **New** — "X of 7" progress bar |
| `src/index.css` | Add `.q-grid-pattern` background utility |

