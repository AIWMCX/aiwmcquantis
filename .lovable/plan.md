
# Quantis Accuracy Engine — Integration Plan (F1–F5)

## Why not paste the 8 files raw

Your project already has a mature engine that conflicts with the spec's file layout:

- `supabase/functions/analyze-business/` — 24 modules including `financial-engine.ts`, `quantis-math-server.ts`, `benchmark-engine-v2.ts`, `narrator-prompt.ts`, `bulletproof-validator.ts`, `assumption-graph.ts`. This is the production orchestrator.
- `src/lib/financial-engine.ts`, `src/lib/quantis-math.ts`, `src/lib/monte-carlo.ts` — client-side mirrors locked to **decimal.js / QMath** (memory rule: "NEVER use raw JS math for financials").
- `services/benchmark-lookup.ts` + `benchmark_lookup` SQL RPC — already wired to the 95,500 rows.
- Memory rules: "Source Attribution Standard", "Accuracy Guardrails", "Anti-BS Sanity Checks", "PDF Export Canonical = @react-pdf/renderer".

Pasting `/src/engine/*.ts` and a new `quantis-analyze` edge function would create a parallel engine that drifts from the deterministic twin, break QMath precision, duplicate the benchmark store, and orphan the existing dashboard. So I'm doing **surgical fixes against the 5 root causes** the spec correctly identifies — same intent, integrated into your stack.

## What ships (file by file)

### F1 — AI narrator silent failure → loud, gated, banner-driven

**Edit `supabase/functions/analyze-business/index.ts`**
- Wrap each Claude call in `try / AbortSignal.timeout(45_000) / catch`.
- On any LLM failure: still return 200 with `meta.fallbackMode = true` and `meta.fallbackReason: "<provider> <status> <message>"`. Never throw upstream.
- Return shape gains `meta.aiCallsAttempted` and `meta.aiCallsSucceeded`.

**Edit `src/components/dashboard/AnalysisResults.tsx`** (or the actual top-level results component — confirm via grep)
- Add `<FallbackModeBanner>` at the very top, red surface, when `meta.fallbackMode === true`. Copy: "AI narrative unavailable — deterministic engine output only. Do not use for investor decisions. Click to retry."

### F2 — Benchmarks decorative → live-queried with citations

**Edit `supabase/functions/analyze-business/benchmark-engine-v2.ts`**
- In every metric resolver, call the existing `benchmark_lookup` RPC **first** (sector + business_model + country + city_tier + stage). Use the returned `match_level`, `sample_size`, `source`, `data_version`, `data_date`.
- Only fall through to `embedded-benchmarks.ts` priors when RPC returns `matched: false` OR sample_size < 10.
- Every numeric result gets a `citation` string: `"Based on N comparable benchmarks from <source> (<data_date>)"` per the **Source Attribution Standard** memory.
- `match_type` enum: `direct_benchmark | similar_benchmark | estimated_no_direct` propagated to UI as the QSL pill.

**Edit `src/components/dashboard/BenchmarkPanel.tsx`** (or equivalent)
- Render the citation under each metric. Replace any hardcoded "Estimated · No direct benchmark" text with the live citation.

### F3 — CAC payback contradiction → one canonical formula

**Edit `src/lib/quantis-math.ts` and `supabase/functions/analyze-business/quantis-math-server.ts` (twin)**
- Add ONE function: `cacPaybackMonths(cac, avgTicket, grossMargin)` returning `clamp(cac / (avgTicket × grossMargin), 1, 120)` via Decimal.
- Delete every other CAC-payback computation site (grep `cac.*payback|payback.*cac` and route them through this function).
- Discard any user-supplied LTV; recompute from primitives: `ltv = avgTicket × grossMargin × (1 / churnMonthly)` clamped to `[1, 240]` months lifetime.
- Update `business-logic-parity.test.ts` and add a regression test pinning ONE value per scenario.

### F4 — Project payback vs CAC payback → separated types and UI

**Edit `src/types/analysis.ts`**
- Split into two fields with non-interchangeable units:
  - `cacPaybackMonths: number` (the unit-economics one)
  - `projectPaybackYears: number` (the recover-initial-investment one) = `initialInvestment / max(annualNetProfit, 1)`

**Edit dashboard**
- Two separate `MetricCard`s with explicit subtitles.
- Add a 1-line disambiguation banner under the metrics grid (per spec §UI lines 2085–2092).

### F5 — Quality gates skipped in fallback → always run

**Edit `supabase/functions/analyze-business/bulletproof-validator.ts`**
- Move the 12 gates out of the LLM-success branch into the unconditional post-`FinancialEngine.compute()` step.
- Return `qualityGateResults[]` in every response, fallback or not.
- A CRITICAL gate failure (e.g. cash runway < 1mo, LTV:CAC > 20, GM > 95% outside software) still ships a result but with `riskFlags[].severity = 'CRITICAL'` and a top-of-page red banner.

## Files I will edit (no new parallel engine)

```text
supabase/functions/analyze-business/index.ts                 [F1, F5]
supabase/functions/analyze-business/benchmark-engine-v2.ts   [F2]
supabase/functions/analyze-business/bulletproof-validator.ts [F5]
supabase/functions/analyze-business/quantis-math-server.ts   [F3, F4]
src/lib/quantis-math.ts                                      [F3, F4]
src/lib/financial-engine.ts                                  [F3, F4]
src/types/analysis.ts                                        [F4]
src/components/dashboard/<results>.tsx                       [F1, F4 banners]
src/components/dashboard/<benchmarks>.tsx                    [F2 citations]
src/__tests__/quantis-math.test.ts                           [regression pins]
```

(Exact dashboard component paths confirmed by grep before editing.)

## What I am NOT doing

- Not creating `/src/engine/*` — duplicates existing `src/lib/*`.
- Not creating a new `quantis-analyze` edge function — `analyze-business` is the production orchestrator.
- Not introducing the spec's inline-style React (`<div style={{...}}>`) — your design system uses semantic tokens + Tailwind. Banners and cards will use existing shadcn primitives.
- Not changing the 95,500-row schema — `benchmark_lookup` RPC already returns p25/p50/p75/source.
- Not touching PDF export (canonical `@react-pdf/renderer` rule).

## Verification before I declare done

1. `bun test src/__tests__/quantis-math.test.ts` — CAC payback regression pinned.
2. `bun test src/__tests__/business-logic-parity.test.ts` — client/server twin still matches.
3. `supabase--curl_edge_functions` `analyze-business` with a SaaS B2B fixture — assert `meta.fallbackMode === false`, `benchmarks[].citation` non-empty, `qualityGateResults.length === 12`, `cacPaybackMonths` and `projectPaybackYears` both present and never equal.
4. Re-run with `ANTHROPIC_API_KEY` deliberately blanked — assert 200, `fallbackMode === true`, 12 gates still returned, red banner renders in preview.

## Scope confirm

Reply **go** to ship the 5 fixes as scoped above. If you instead want me to literally paste the 8-file spec verbatim alongside the existing engine (parallel system, dual maintenance, breaks decimal.js parity), say **paste raw** and I'll do that — but flag that it violates 4 memory rules and the deterministic twin contract.
