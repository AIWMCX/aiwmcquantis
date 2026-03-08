

## Loading State — AnalysisProgress.tsx Upgrade

### Overview
The existing `AnalysisProgress.tsx` already has 90% of the structure (full-screen overlay, 7-stage checklist, progress bar, rotating tips, timeout warning). This is a refinement pass to match the spec exactly — no new file needed, just updating the existing component in place.

### Changes to `src/components/analysis/AnalysisProgress.tsx`

1. **Title & subtitle**: "Running Dual-AI Analysis" → "Analyzing your business". Add subtitle showing business type + city from new optional props (`businessType?: string`, `location?: string`).

2. **Card dimensions**: max-width 440px → 480px, padding 24/32px → 40px.

3. **Animated icon**: Add CSS `@keyframes q-icon-rotate` (subtle 3s infinite rotation) to the Zap icon wrapper.

4. **Progress bar**: height from `h-2.5` (10px) → `h-1.5` (6px), border-radius 3px.

5. **Step labels updated**:
   - Step 1: "Loading industry benchmarks"
   - Step 2: "Applying {location} geo calibration" (dynamic from props, fallback "Applying geo calibration")
   - Steps 3–7: GPT-4o mini, Gemini, Consensus, Reconciliation, Stress Map (already match)

6. **Step status icons**:
   - Completed: keep green CheckCircle2 with `animate-scale-in`
   - Current: replace Loader2 spinner with a pulsing dot (`w-3 h-3 rounded-full bg-[var(--q-accent-primary)] animate-pulse`)
   - Pending: keep empty circle but use `text-[var(--q-text-tertiary)]`

7. **Time estimate**: format change to "~{remaining}s remaining", centered.

8. **Tip rotation**: change interval from 5s to 6s. Wrap tip text in a container with `bg-[var(--q-bg-overlay)] rounded-[var(--q-radius-md)] p-3`.

9. **Completion animation**: Add `isComplete` prop. When true: progress fills to 100% (200ms), all checkmarks go green with staggered 80ms delays, show "Complete!" for 500ms, then trigger `onComplete` callback. Parent handles the slide-up transition.

10. **Background**: Use `var(--q-gradient-accent)` (the dark blue-to-purple gradient, suitable for overlay) — already in place.

### Changes to `src/components/analysis/WizardForm.tsx`

- Pass `businessType` and `location` props from form state to `AnalysisProgress`.

### Files

| File | Change |
|------|--------|
| `src/components/analysis/AnalysisProgress.tsx` | All refinements listed above |
| `src/components/analysis/WizardForm.tsx` | Pass businessType + location props |

