

# Analysis Completion: Scroll Indicator + Notification

## Problem
When the stress test completes, the `AnalysisProgress` overlay closes and results render below the form — but users have no visual cue that results are ready or that they need to scroll down to see them.

## Changes

### 1. `src/pages/AppDashboard.tsx` — Auto-scroll + toast on completion
- When `result` becomes non-null after `isLoading` was true, auto-scroll the results section into view with smooth behavior
- Add a `resultsRef` to the results container
- The existing `toast.success('Analysis complete!')` in `useAnalysis.ts` already fires — enhance it with an action button "View Results ↓" that triggers scroll

### 2. `src/pages/AppDashboard.tsx` — Animated scroll-down arrow banner
- Between the form and results section, when `result` exists and has just appeared, render a pulsing "scroll down" indicator:
  - Animated bouncing `ChevronDown` arrow
  - Text: "Your analysis is ready — scroll down to view full results"
  - Green accent border, auto-fades after 8 seconds
  - Clicking it scrolls to results
- This banner is visible in the viewport gap between the form bottom and results top

### 3. `src/hooks/useAnalysis.ts` — Enhance completion toast
- Update the `onSuccess` toast to use `sonner`'s action API: add a "View Results ↓" action button
- Pass a callback prop or return a signal so the dashboard can react

## Technical Details

| File | Change |
|------|--------|
| `src/pages/AppDashboard.tsx` | Add `resultsRef`, scroll-down banner component, auto-scroll effect on result arrival |
| `src/hooks/useAnalysis.ts` | No change needed — toast already fires, dashboard handles scroll |

The scroll-down banner uses `ChevronDown` from lucide-react with Tailwind `animate-bounce`, wrapped in a clickable div with green border styling matching the existing design system. It auto-removes after 8s via a timeout.

