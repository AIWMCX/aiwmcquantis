# Self-Learning Validation & Improvement Framework

Built on top of `analysis_run_logs` (already shipped).

## Architecture

```text
┌─────────────────┐     ┌──────────────────────────────┐     ┌──────────────────┐
│ analyses INSERT │ ──► │ tg_log_analysis_run (live)   │ ──► │ analysis_run_logs│
└─────────────────┘     └──────────────────────────────┘     └────────┬─────────┘
                                                                       │ AFTER INSERT
                                                                       ▼
                                                          ┌────────────────────────────┐
                                                          │ tg_validate_run (NEW)      │
                                                          │  numeric consistency       │
                                                          │  benchmark alignment       │
                                                          │  MC ↔ PL36 coherence       │
                                                          │  RVCE agreement (read-only)│
                                                          └────────┬───────────────────┘
                                                                   ▼
                                                       ┌────────────────────────────┐
                                                       │ analysis_self_learning     │
                                                       │  scores + issues + status  │
                                                       └────────────────────────────┘

Nightly: pg_cron → self-learning-update edge fn
   reads last 30d of analysis_self_learning
   recomputes priors per (sector, geo, business_model)
   writes new row into quantis_learning_config (versioned)
   never edits the previous version (rollback-safe)

Engine reads:  GET quantis_learning_config WHERE active=true ORDER BY version DESC LIMIT 1
```

## 1. Tables (one migration)

**`public.analysis_self_learning`** — one row per analysis_id (UNIQUE), validation snapshot:
- scores: `numeric_consistency`, `benchmark_alignment`, `rvce_agreement`, `mc_stability`, `pl36_coherence` (each NUMERIC 0–1)
- `global_status` text: `ok | partial | suspect`
- `issues` jsonb (array of `{code, severity, field, expected, actual, message}`)
- `adjustments` jsonb (implied ranges)
- `learning_config_version` int (which prior was used at runtime)
- RLS: owner-read + admin-read; service-role write only.

**`public.quantis_learning_config`** — versioned priors:
- `version` bigint PK, `created_at`, `is_active` bool, `created_by` text
- `priors` jsonb keyed by `${sector}|${geo}|${model}`:
  ```json
  { "saas|us|b2b": {
      "gross_margin": {"p25": 0.62, "p50": 0.74, "p75": 0.83, "n": 41},
      "ltv_cac":      {"p25": 1.8,  "p50": 3.1,  "p75": 5.4,  "n": 41},
      "cac_payback_months": {...}, "net_margin": {...}
  }}
  ```
- `prompt_hints` jsonb (text strings appended to engine prompt for that segment)
- `quality_metrics` jsonb (rolling means of validation scores per segment)
- Admin-only read; service-role write. UNIQUE partial index ensures only one `is_active=true`.

## 2. Validation function `public.validate_analysis_run(p_run_id uuid)`

`SECURITY DEFINER`, idempotent. Reads from `analysis_run_logs`, writes to `analysis_self_learning`.

Logic:
- **Numeric consistency** (deterministic, no LLM):
  - `monthlyProfit ≈ monthlyRevenue × netMargin` (tol 5%)
  - `ltvToCac ≈ ltv / cac` (tol 5%)
  - `cacPaybackMonths > 0` and `< 60`
  - `confidenceScore ∈ [0,100]`
- **Benchmark alignment**:
  - For each variable with a benchmark (gross_margin, ltv_cac, cac_payback) call `public.benchmark_lookup(...)` (already exists)
  - Score = fraction of variables falling in `[p10, p90]` (linearly penalized outside)
- **MC ↔ PL36 coherence**:
  - `monte_carlo.mo12ProfitP50` within ±25% of `pl36.profit[11]` (or financial_core.monthlyProfit × 12)
- **RVCE agreement**:
  - `rvce.agreementScore` if present, else `null` → not penalized
- **Global status**: `ok` if all present scores ≥ 0.8 and no `severity='critical'`; `suspect` if any < 0.5 or critical issue; else `partial`.

Trigger `analyses_validate_ai` on `analysis_run_logs` AFTER INSERT calls `validate_analysis_run(NEW.id)` inside `BEGIN/EXCEPTION` — never blocks ingestion.

## 3. Nightly aggregation — edge fn `self-learning-update`

`supabase/functions/self-learning-update/index.ts`. Service-role; admin-callable; also wired to `pg_cron` (03:00 UTC).

Steps:
1. Read last 30 days from `analysis_self_learning` joined to `analysis_run_logs`.
2. Group by `(sector, geo, model_type)`. For each group with n ≥ 10:
   - Compute p25/p50/p75 for `gross_margin`, `net_margin`, `ltv_cac`, `cac_payback_months`.
   - Aggregate top issue codes → produce `prompt_hints` (e.g. "In segment SaaS|US|B2B, LTV:CAC > 8 is rare without strong narrative — flag as outlier").
3. Read previous active config; compute delta. If quality (mean global score) **regresses by > 5%**, mark new version `is_active=false` (rollback-safe).
4. Insert new row into `quantis_learning_config` with `is_active = true`; set previous to `false` in same transaction.

Returns `{version, segments_updated, hints_count, qualityDelta}`.

## 4. Engine integration (light touch)

`supabase/functions/_shared/learning-config.ts`:
- `getActiveLearningConfig()` — cached 5min, reads single active row.
- `getPriorsFor(sector, geo, model)` — segment match with sector-only fallback.
- `getPromptHints(segment)` — string array.

In `analyze-business`/`analyze-plus`:
- Before the LLM call, append `getPromptHints(segment)` to the system prompt.
- Persist `learning_config_version` into `result.learning_config_version` so the validator knows which prior was active.

This is **purely additive**: if `quantis_learning_config` is empty or unreachable, engine behaves exactly as today.

## 5. Cron wiring (separate insert tool call after migration)

```sql
SELECT cron.schedule('self-learning-update-nightly','0 3 * * *',
  $$ SELECT net.http_post(
       url:='https://gafxacjhkqsdzwwzhbor.supabase.co/functions/v1/self-learning-update',
       headers:='{"apikey":"<anon>","Content-Type":"application/json"}'::jsonb,
       body:='{}'::jsonb) $$);
```

## 6. Verification

- Backfill: call `validate_analysis_run(id)` for every existing `analysis_run_logs` row → confirm `analysis_self_learning` count = 44.
- Score distribution sanity: `SELECT global_status, COUNT(*) FROM analysis_self_learning GROUP BY 1`.
- Manually invoke `self-learning-update` once → confirm version row appears.

## Deliverables

1. **Migration**: tables + RLS + `validate_analysis_run` + trigger on `analysis_run_logs` + backfill.
2. **Edge fn** `self-learning-update` (admin-callable + cron).
3. **Shared helper** `_shared/learning-config.ts`.
4. **Cron schedule** via insert tool.
5. **Brief admin readout query** in the response so the user can monitor.

## Decisions / Notes

- All validation runs in **Postgres**, not edge code → sub-100ms, can't fail the analysis, no extra HTTP hops.
- RVCE web-search re-validation is NOT re-run here (cost + latency). We reuse the score the engine already computed in `analysis_run_logs.rvce`.
- `quantis_learning_config` is **append-only versioned**. Rollback = flip `is_active`.
- Engine integration is non-blocking and cache-fronted — zero impact on hot path if config is empty.
- Built strictly on top of existing infra (`analysis_run_logs`, `benchmark_lookup`, `has_role`) — no schema sprawl.

Approve and I'll ship in this order: migration → edge fn → shared helper → cron → verify.
