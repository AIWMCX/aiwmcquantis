

## Analysis Input Form — Final Polish Pass

### What's Already Done
The form already has the 2-column layout, hero header, progress bar, quick industry picks, field completion dots, analysis depth selector, and the AI submit button. This pass addresses the remaining spec details.

### Changes to `src/components/analysis/WizardForm.tsx`

1. **Layout tweaks**: Add `max-w-[900px] mx-auto pt-20` wrapper. Change breakpoint from `lg` (1024px) to `md` (768px, closest to 640px in Tailwind).

2. **Header copy**: Change headline to "Stress-test your business idea", subtitle to "Two AI engines. 1,000+ benchmarks. Your numbers in 90 seconds."

3. **Geolocation on Location field**: Add a "📍 Use my location" button that calls `navigator.geolocation` + reverse geocodes via a simple fetch to a free API. On success, shows "📍 Denver, CO detected · Use this? [Yes] [Change]" inline below the input.

4. **Benchmark hints on financial fields**: Add right-aligned hint text ("Typical: $45,000–$80,000") next to each financial input. Pull ranges from `benchmark-calibrator.ts` based on selected industry. When no industry selected, show generic hint.

5. **BenchmarkWarning integration**: Import `checkBenchmarkDeviation` from `benchmark-calibrator.ts` and show `<BenchmarkWarning>` below financial fields when user value deviates from benchmarks.

6. **Staggered field animation**: When `financialInputs.selected_industry` changes from empty to a value, the right column fields animate in with `q-metric-reveal` + staggered `--index` delays.

7. **Submit button text**: Change to "⚡ Run Stress-Test →" and loading text to "Analyzing your business..."

8. **Label check marks**: When field is complete, append a small `✓` in `text-[var(--q-status-green)]` next to the FieldCompletionDot (or replace the dot with a checkmark icon).

### Changes to `src/components/analysis/FieldCompletionDot.tsx`

- Switch from a green dot to a `Check` icon from lucide-react when complete, keeping the fade-in animation.

### Changes to `src/components/analysis/FormProgressBar.tsx`

- Change label text from "X of 7 fields complete" to "Step X of 7" to match spec.

### Files

| File | Change |
|------|--------|
| `src/components/analysis/WizardForm.tsx` | Layout max-width, breakpoint, header copy, geolocation, benchmark hints, BenchmarkWarning, stagger animation, submit text |
| `src/components/analysis/FieldCompletionDot.tsx` | Replace dot with ✓ check icon |
| `src/components/analysis/FormProgressBar.tsx` | "Step X of 7" label |

