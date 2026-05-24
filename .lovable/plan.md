# Analysis Logging Framework — Implementation Plan

## Goal
Centralized, durable log of every Quantis analysis run (Free/Plus/Pro/Deep), with one canonical schema, automatic capture going forward, and a one-shot backfill of all analyses since **2026-01-18**.

## Architecture

```text
edge fn (analyze-business / analyze-plus / analyze-pro-worker / analyze-preview)
        │
        │ after saveAnalysis(...)
        ▼
_shared/log-analysis.ts
  ├─ buildAnalysisLogCore(raw, ctx)   → AnalysisLogCore
  └─ logAnalysisResult(payload)       → INSERT public.analysis_logs

backfill-analysis-logs (edge fn, admin-only)
  └─ paginated SELECT public.analyses WHERE created_at >= '2026-01-18'
       → buildAnalysisLogCore(a, inferContext(a))
       → upsert by analysis_id (idempotent)
```

We already have `analysis_logs` (used by `_shared/analysis-event-logger.ts`) for **events** (`event_type`, `payload`). To avoid collision and keep concerns clean, the new canonical table is **`public.analysis_run_logs`**.

## 1. Migration — `analysis_run_logs`

```sql
CREATE TABLE public.analysis_run_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id   text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  user_id       uuid NULL,
  tier          text NOT NULL,            -- FREE | PLUS | PRO
  source        text NOT NULL,            -- web-app | landing-demo | api | internal
  sector        text,
  geo           text,
  model_type    text,
  status        text,                     -- ready | partial | failed
  engine_version text,
  rvce_version  text,
  financial_core jsonb NOT NULL DEFAULT '{}'::jsonb,
  pl36          jsonb NOT NULL DEFAULT '{}'::jsonb,
  monte_carlo   jsonb NOT NULL DEFAULT '{}'::jsonb,
  rvce          jsonb NOT NULL DEFAULT '{}'::jsonb,
  benchmarks    jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_summary  jsonb NOT NULL DEFAULT '{}'::jsonb,
  input         jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  inserted_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_id)
);

CREATE INDEX ON public.analysis_run_logs (created_at DESC);
CREATE INDEX ON public.analysis_run_logs (user_id);
CREATE INDEX ON public.analysis_run_logs (tier);
CREATE INDEX ON public.analysis_run_logs (sector);

ALTER TABLE public.analysis_run_logs ENABLE ROW LEVEL SECURITY;

-- Service-role only writes; owners read their rows; admin reads all.
CREATE POLICY "Owners read own run logs"
  ON public.analysis_run_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin reads all run logs"
  ON public.analysis_run_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```
No INSERT/UPDATE policies → only `service_role` writes (edge functions).

## 2. Shared helper — `supabase/functions/_shared/log-analysis.ts`

Exports:
- `type Tier = 'FREE' | 'PLUS' | 'PRO'`
- `interface AnalysisLogCore` (matches user spec)
- `buildAnalysisLogCore(raw, ctx): AnalysisLogCore` — defensive `mapFinancialCore`, `mapPl36`, `mapMonteCarlo`, `mapRvce`, `mapBenchmarks`, `mapRiskSummary` reading the same JSON paths the frontend already uses (`result.financial_analysis.*`, `result.monte_carlo.*`, `result.rvce.*`, etc.).
- `logAnalysisResult(payload)` — service-role client, `upsert` on `analysis_id`, never throws (warn on failure — observability must not break analysis).

## 3. Wire into engines

Add a single call after the existing `saveAnalysis(...)` write in each:
- `supabase/functions/analyze-business/index.ts`
- `supabase/functions/analyze-plus/index.ts`
- `supabase/functions/analyze-pro-worker/index.ts`
- `supabase/functions/analyze-preview/index.ts`

```ts
try {
  await logAnalysisResult(buildAnalysisLogCore(saved, {
    userId, tier, source: 'web-app',
    requestId, clientVersion, env: 'prod',
    errorCodes: [], latencyMs: Date.now() - startedAt,
  }));
} catch (e) { console.warn('[log-analysis] skipped:', e); }
```

## 4. Backfill — `supabase/functions/backfill-analysis-run-logs`

Admin-only (verify `has_role(auth.uid(), 'admin')`). Paginated:
```ts
const PAGE = 200;
let from = 0;
while (true) {
  const { data } = await admin.from('analyses')
    .select('*')
    .gte('created_at', '2026-01-18')
    .order('created_at', { ascending: true })
    .range(from, from + PAGE - 1);
  if (!data?.length) break;
  for (const a of data) {
    const payload = buildAnalysisLogCore(a, inferContext(a));
    await logAnalysisResult(payload);  // upsert → idempotent
  }
  from += PAGE;
}
```
`inferContext(a)` derives `tier` from `a.tier`/subscription snapshot, `userId` from `a.user_id`, `source` from `a.source ?? 'web-app'`.

Returns `{ scanned, written, skipped, errors }`. Safe to re-run.

## 5. Verification

- `supabase--read_query` → confirm `analysis_run_logs` row count matches `analyses` count for `created_at >= '2026-01-18'`.
- Trigger one new analysis end-to-end → confirm a fresh row appears.
- Add a tiny vitest for `buildAnalysisLogCore` shape (no network).

## Deliverables
1. Migration creating `analysis_run_logs` + RLS + indexes.
2. `_shared/log-analysis.ts` (types + builders + logger).
3. Hook into 4 analyze edge functions.
4. `backfill-analysis-run-logs` edge function (admin-gated, idempotent).
5. One unit test for the builder.

## Notes / Decisions
- Table named `analysis_run_logs` (NOT `analysis_logs`) to avoid collision with the existing event-log table that powers `aggregate-quality-metrics`.
- Upsert on `analysis_id` makes both runtime logging and backfill idempotent.
- Logger never throws — analyses must not fail because of telemetry.
- Reads gated by RLS (owner or admin); writes service-role only.

Approve and I'll execute the migration first, then ship the code in parallel.
