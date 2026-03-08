

## CTO Test Report — Prioritized Fix Plan

### Current State Assessment

Based on codebase inspection, here's what's **already done** vs **still broken**:

**Already Fixed (from prior sessions):**
- Title tag: says "90 Seconds" (fixed in index.html)
- View Mitigation Plan: IS clickable — `RiskFlagCard` has a proper `<button>` with expand/collapse (lines 507-518 of AnalysisResults.tsx)
- QMath library: fully built with decimal.js, 15+ methods, self-test
- Reconciliation engine: 406 lines, all 10 rules coded including the critical negative-margin check (line 268)
- AnalysisProgress: 7-stage checklist screen with geo/GPT/Gemini/consensus steps
- JetBrains Mono: loaded via Google Fonts, used in MetricMini and financial fields
- Confidence badges: OutputConfidenceBadge, ModelConfidenceBadge, BenchmarkConfidenceIndicator all rendered in results

**Still Broken — Needs Fixing:**

| # | Issue | Root Cause | Severity |
|---|-------|-----------|----------|
| 1 | "under 3 minutes" appears in 9 files | Copy inconsistency with title's "90 seconds" | P0 |
| 2 | R-006 not enforced server-side | `analyzeRisks()` in edge function doesn't check net margin vs risk level | P0 |
| 3 | `reconcileFinancialOutput()` never called | Client-side reconciliation engine exists but is never invoked | P1 |
| 4 | Server-side `analyzeRisks()` can output `low` with negative profit | Only checks `risks.length >= 3` / `highCount`, not margin directly | P0 |
| 5 | StressMap uses raw `Math.max`/`Math.min`/`Math.round` | Lines 32-34, 114-121 in StressMap.tsx | P1 |

### Implementation Plan

**Step 1 — Fix "3 minutes" copy across 9 files**
Replace all "under 3 minutes" / "in 3 minutes" / "3 Minutes" with "under 90 seconds" / "in 90 seconds" across:
- `src/pages/Landing.tsx`
- `src/pages/Blog.tsx`
- `src/pages/BlogArticle.tsx` (3 instances)
- `src/pages/RiskGallery.tsx`
- `src/pages/examples/ExampleAnalysis.tsx`
- `src/pages/examples/ExamplesIndex.tsx`
- `src/components/landing/HeroVariants.tsx`
- `src/components/landing/ChatGPTComparison.tsx`

**Step 2 — Enforce R-006 in server-side `analyzeRisks()`**
In `supabase/functions/analyze-business/financial-engine.ts`, add net margin check before the final `overallLevel` assignment (after line 725):
```typescript
// R-006: Negative margin MUST force minimum "medium" risk
if (metrics.netProfit < 0 && metrics.mrr > 0) {
  const netMarginPct = (metrics.netProfit / metrics.mrr) * 100;
  if (netMarginPct < -10 && overallLevel === 'low') {
    overallLevel = 'medium';
  }
}
```

**Step 3 — Wire up reconciliation engine on client side**
In `AnalysisResults.tsx`, after `calculateStressScores(result)` call, invoke `reconcileFinancialOutput` when the bottom-up P&L data is available, and surface the reconciliation status in the Reliability section. This connects the existing 406-line engine to the UI.

**Step 4 — Replace raw Math in StressMap.tsx**
Replace `Math.max`/`Math.min`/`Math.round` calls on financial scoring values with QMath equivalents for consistency with the zero-raw-Math standard.

**Estimated effort:** ~45 minutes across 12 files + 1 edge function redeployment.

