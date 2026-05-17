## Quantis Accuracy Engine — Remaining F2/F3/F4/F5 Wire-Up

Foundational primitives (F1 metadata, canonical CAC/LTV math, two banner components) already shipped last turn. This plan completes the remaining 5 surgical batches so every fix is live end-to-end in preview today.

### Execution order (each batch = one focused turn)

**Batch 1 — Dashboard wire-up (visible proof F1 works)**
- Mount `<FallbackModeBanner reason={meta.fallback_reason} onRetry={...} />` at the top of `src/pages/AppDashboard.tsx` results view, gated on `meta.fallback_mode === true`.
- Mount `<MetricDisambiguationBanner />` directly above the metrics grid.
- Split the single payback `MetricCard` into two: **CAC Payback (months)** and **Project Payback (years)**, reading `cacPaybackMonths` and `projectPaybackYears` from the analysis result (use existing `formatPaybackDisplay` for the years card).
- Pass `meta.ai_calls_attempted/succeeded` into an existing health chip so QA can see it.

**Batch 2 — F3/F4 callsite migration (kill the contradiction at source)**
- Grep `cac.*payback|payback.*cac|ltv\s*=\s*` across `src/lib/financial-engine.ts`, `src/lib/monte-carlo.ts`, `supabase/functions/analyze-business/*.ts`, `supabase/functions/_shared/business-logic.ts`.
- Replace every inline CAC-payback / LTV formula with calls to `cacPaybackMonths()`, `ltvFromPrimitives()`, `projectPaybackYears()` from `quantis-math.ts` (client) and `quantis-math-server.ts` (edge).
- Discard user-supplied LTV on ingest; always recompute. Keep raw input only in `meta.userProvidedLtv` for audit.
- Update `src/types/analysis.ts` so `cacPaybackMonths` and `projectPaybackYears` are distinct required fields, not aliases.

**Batch 3 — F2 live benchmark lookup with citations**
- In `supabase/functions/analyze-business/benchmark-engine-v2.ts` (server) and `src/services/benchmark-lookup.ts` (client), call the existing `benchmark_lookup` RPC first with `(sector, stage, geo)`.
- Compute real p25/p50/p75 from returned rows; only fall back to `embedded-benchmarks.ts` priors when `matched === false` OR `sample_size < 10`.
- Stamp every returned metric with a `citation` string via existing `buildCitation()` / `formatCitationCompact()` in `src/lib/benchmark-citations.ts`: `"Based on N benchmarks from [source] · [date]"`.
- Render citations in `BenchmarkPanel.tsx` (replace any "Estimated · No direct benchmark" placeholder).

**Batch 4 — F5 quality gates unconditional**
- In `supabase/functions/_shared/hybrid-validator.ts` / `bulletproof-validator.ts`, hoist the 12 gates out of the AI-success branch into a single post-compute step that runs regardless of `fallback_mode`.
- Critical gate failures still return 200 with `riskFlags[].severity = 'CRITICAL'` so banners render; never throw.
- Add a `meta.gates_run` count and `meta.gates_failed[]` array for QA.

**Batch 5 — Regression test pinning**
- Extend `src/__tests__/quantis-math.test.ts` with golden vectors for the 3 new primitives (incl. boundary: `gm=0`, `churn=0`, `profit<=0` → 999).
- Add a fallback-mode integration test that blanks `ANTHROPIC_API_KEY` and asserts: 200 response, `fallback_mode=true`, all 12 gates ran, banners renderable, payback fields distinct.
- Pin one SaaS-B2B fixture end-to-end to lock the canonical CAC payback number against future drift.

### Verification gates between batches
After each batch: read changed files back, run `vitest run` on the touched test files, hit `analyze-business` via `supabase--curl_edge_functions` with a known fixture, and visually confirm banners/metrics in preview before moving on.

### Non-goals (explicitly out of scope this round)
- No new parallel engine, no rewrite of `financial-engine.ts` architecture.
- No changes to `quantis-math.ts` math (already shipped & frozen).
- No schema migrations — `benchmark_lookup` RPC and `benchmarks` table already exist.
- No edits to `src/integrations/supabase/client.ts` or `types.ts`.

Reply **go** to execute Batch 1 (dashboard wire-up — fastest visible win), or name a different batch to start.
