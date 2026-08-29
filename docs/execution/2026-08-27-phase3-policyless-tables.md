# Phase 3 — the 8 policy-less RLS tables

Tables: `golden_test_vectors`, `metric_formula_registry`,
`self_learning_runs`, `pending_plan_grants`, `rvce_observations`,
`calibration_metrics`, `accuracy_runs`, `dataset_releases`.

All 8 were created by `supabase/migrations/20260802054648_
accuracy_control_schema_v1.sql`, except `pending_plan_grants`
(`20260719225626_pending_plan_grants.sql`). Both migrations state the
intended design explicitly in their own comments: RLS enabled, zero
policies, service-role/`SECURITY DEFINER`-only access by design — this
section verifies that stated intent against the live database and real
call sites, rather than re-stating the comment as if it were proof.

## 3.1-3.2 — Call sites and expected caller, per table

| Table | Expected caller | Mechanism | Verified how |
|---|---|---|---|
| `golden_test_vectors` | `supabase/functions/run-accuracy-harness/index.ts` | service-role client (`SUPABASE_SERVICE_ROLE_KEY`) | `grep` for the table name across `src/`, `supabase/functions/`, `supabase/migrations/`, `.github/workflows/`, `scripts/`; confirmed the one hit uses `createClient(url, serviceKey)` |
| `accuracy_runs` | `supabase/functions/run-accuracy-harness/index.ts` | service-role client | same |
| `rvce_observations` | `supabase/functions/rvce-validate/index.ts` | service-role `adminClient` **only** | this function also creates a separate anon-keyed `userClient` for an unrelated purpose — explicitly grepped the file to confirm `rvce_observations` is written only via `adminClient.from('rvce_observations').insert(...)`, never `userClient` |
| `self_learning_runs` | `supabase/functions/self-learning-update/index.ts` | service-role client | same grep pattern |
| `pending_plan_grants` | `public.apply_pending_plan_grant()` — a `SECURITY DEFINER` trigger function firing `AFTER INSERT ON auth.users` | database trigger, **no application code path at all** | read the full migration that creates the table, function, and trigger — this is the complete, only mechanism: a founder manually inserts a row (email + plan) ahead of a comped/beta user's signup, and the trigger applies it automatically when that email registers |
| `metric_formula_registry` | **none currently** | — | broad repo-wide grep (`.ts`, `.tsx`, `.sql`, `.yml`, excluding `node_modules`) found only the creating migration, the generated `types.ts`, and the original design-proposal doc — zero application or script reference |
| `dataset_releases` | **none currently** | — | same |
| `calibration_metrics` | **none currently** | — | same |

The three dormant tables were **not** silently forgotten: the migration's
own header comment explains they were added as part of "Accuracy Package
v2.0" alongside `golden_test_vectors`/`accuracy_runs`/`rvce_observations`
— schema shipped ahead of the formula-registry-versioning, dataset-
release-tracking, and model-calibration-reporting features that will
eventually populate and read them. `accuracy_runs.formula_registry_version`
and `.dataset_version` are text columns clearly meant to eventually join
against `metric_formula_registry`/`dataset_releases` once that wiring is
built. **Recommendation, not a security action**: flag to the founder as
either (a) intentionally reserved for near-term roadmap work, or (b)
candidates to drop if that roadmap item is no longer planned — a decision
for the business, not the audit.

## 3.3 — No legitimate direct client-access requirement

None of these 8 tables are referenced anywhere in `src/` (the browser
client bundle) — confirmed by the same repo-wide grep above, which
covers `.ts`/`.tsx` under `src/` and found zero hits for any of the 8
table names. There is no client-facing feature (browser code) that would
need direct table access; every real use is server-side.

## 3.4 — Live black-box test: anon and authenticated denied, on all 8

Ran a role-switched (`SET LOCAL ROLE`) test against **production** for
all 8 tables, both `SELECT` and a representative `INSERT` sample —
matching the rigor established for the Phase 1 ten-table incident, not
just re-reading policy definitions:

| Table | Real row count (service_role) | `anon` sees (SELECT) | `authenticated` sees (SELECT) |
|---|---|---|---|
| `golden_test_vectors` | 0 | 0 | 0 |
| `metric_formula_registry` | 0 | 0 | 0 |
| `self_learning_runs` | 0 | 0 | 0 |
| `pending_plan_grants` | 0 | 0 | 0 |
| `rvce_observations` | **697** | **0** | **0** |
| `calibration_metrics` | 0 | 0 | 0 |
| `accuracy_runs` | 0 | 0 | 0 |
| `dataset_releases` | 0 | 0 | 0 |

`rvce_observations` is the meaningful proof here: it holds 697 real
rows, `service_role` sees all 697, and both `anon` and `authenticated`
see exactly zero — a genuine denial, not a trivial empty-table result.
The other 7 currently hold zero rows (the accuracy harness and self-
learning job haven't produced output yet in production, and no plan
grant is currently pending), so their SELECT test is structurally
correct but not yet proven against real data; the RLS configuration
that produces the `rvce_observations` result applies identically to all
8, so this is a structural guarantee, not a per-table coincidence.

`INSERT` denial, tested directly (not inferred) on a representative
sample spanning three different intended-caller patterns — service-role
edge function (`golden_test_vectors`), service-role edge function with a
sibling anon-client in the same file (`rvce_observations`), and trigger-
only (`pending_plan_grants`):

- `anon` INSERT into `golden_test_vectors` → **`42501`, denied**.
- `authenticated` INSERT into `rvce_observations` → **`42501`, denied**.
- `authenticated` INSERT into `pending_plan_grants` → **`42501`, denied**.

All three ran inside a transaction that was rolled back — zero
permanent state change.

## 3.5 — Server jobs still work after a clean deployment

`SET LOCAL ROLE service_role; SELECT count(*) FROM rvce_observations`
returned **697** (the full, real row count — RLS correctly bypassed for
`service_role`). This directly confirms the server-side path
(`rvce-validate`'s `adminClient`) retains full access; the same grant
pattern (`GRANT ALL ... TO service_role` in the creating migrations)
applies identically to the other 7 tables.

## 3.6 — Documented classification

All 8 tables are **server-only / trigger-only by design**, confirmed
against real call sites and live black-box tests, not assumed from the
migration comment alone. No table in this set has a legitimate
authenticated-user use case that would justify opening a scoped policy —
none are user-owned data; they are either accuracy-harness internals,
observation/calibration pipelines, or a signup-time provisioning trigger.
**No policy change is recommended for any of the 8.**

## 3.7 — Regression coverage

See `supabase/tests/database/p3_policyless_tables_regression.test.sql`
(new). Live-verified passing (pgtap installed in a rolled-back
transaction against production, same method used for the Phase 1 suite)
before being committed — the SQL environment to run pgTAP as `supabase
test db` doesn't exist in this session, matching the same infra gap
already noted in Phase 1's regression test.
