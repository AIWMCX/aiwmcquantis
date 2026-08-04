# P0 Security Incident — Effective Unauthorized Row Access

**Date:** 2026-08-03
**Status:** RED / P0 — remediation prepared, NOT YET DEPLOYED
**Project:** `dmlxrvfyqsakyjomsvdj`
**Branch:** `security/p0-effective-access-control`

## Classification

- **SECURITY STATUS: RED**
- **INCIDENT SEVERITY: P0**
- **BROAD PAID OR PROMOTED TRAFFIC:** temporarily blocked (recommendation to founder — not enforced by this document alone)
- **CURRENT USERS:** allow only with monitoring
- **PRODUCTION MUTATIONS:** require the approved migration + rollback plan in this directory, and explicit founder sign-off

## What this is

**PERMISSIVE RLS POLICY + EXCESSIVE anon/authenticated TABLE GRANTS + PUBLIC-SCHEMA POSTGREST EXPOSURE = PROVEN UNAUTHORIZED ROW ACCESS.**

This is not a theoretical finding. It was proven with a live, synthetic canary row against the real production PostgREST API, using only the public anon key (the same credential embedded in every visitor's browser bundle — no bearer token, no login, no service-role key).

## Proof (see `02_EFFECTIVE_ACCESS_RESULTS.md` for full detail)

Using only `apikey: <anon>` against `https://dmlxrvfyqsakyjomsvdj.supabase.co/rest/v1/...`:

| Action | Table | Result |
|---|---|---|
| SELECT a specific row by ID | `usage_counters` | **SUCCEEDED** |
| UPDATE (`analyses_used` → 9999) | `usage_counters` | **SUCCEEDED** |
| DELETE the row | `usage_counters` | **SUCCEEDED** |
| SELECT (list, `id` only) | `invoices` | **SUCCEEDED** — 1 real row enumerated |
| SELECT (list, `id` only) | `leads` | **SUCCEEDED** — 2 real rows enumerated |

All test data was synthetic (a canary row inserted and deleted by this investigation, clearly named `__CANARY_SECURITY_TEST_2026-08-03__`). No real customer row was read, modified, or exposed in this evidence. `invoices`/`leads` enumeration tests requested only the `id` column, never row content, to avoid touching real PII while still proving the access boundary is broken.

## Root cause

10 tables have RLS policies with `USING (true) WITH CHECK (true)`, scoped to Postgres role `{public}` (which in RLS terms means "no role restriction" — it applies to `anon` and `authenticated` alike, not a narrow group), combined with full `SELECT/INSERT/UPDATE/DELETE/TRUNCATE` GRANTs to both `anon` and `authenticated`. The policy names (`*_svc`, `*_self`) show the intended scoping — service-role-only, or owner-only — but the policy *definitions* were never actually constrained with `TO service_role` or an `auth.uid()` predicate. This is an implementation gap between naming intent and actual SQL, not a missing feature.

## Business impact if left unfixed

- Direct free-tier-quota-bypass vector (any visitor can reset any `usage_counters` row).
- Full read access to `invoices` (billing/financial documents) and `leads` (prospect PII) for any unauthenticated visitor.
- Full read/write/delete access to `shared_reports`, `export_jobs`, `quote_gen_usage`, `referral_codes`, `analysis_cases`, `funnel_events`, `analysis_attempts` for any unauthenticated visitor.

## What is functionally at risk vs. what is dead weight

Investigation of real code call sites (not just schema) found:

- `usage_counters` and `analysis_attempts` have **zero references anywhere in the live application** (frontend or edge functions) — they are dead tables. The real free-tier quota enforcement lives in `supabase/functions/_shared/entitlements.ts` against `subscriptions`/`analyses`, not these tables. This lowers the *practical* exploitability of the quota-bypass angle specifically (there is currently nothing real to bypass through these two tables) but does not reduce the severity of the exposure itself — the tables are still live, still queryable, and a future feature could start relying on them without anyone re-auditing RLS.
- `invoices`, `leads`, `shared_reports`, `export_jobs`, `quote_gen_usage`, `referral_codes`, `analysis_cases`, `funnel_events` **are** actively used, via a mix of direct client `.from()` calls (owner-scoped in application code, but RLS provides zero real enforcement today) and `SECURITY DEFINER` RPCs (already correctly hardened — see `02_EFFECTIVE_ACCESS_RESULTS.md` §C). The RPC paths are unaffected by this fix; only the raw table-level exposure is being closed.

## What is being delivered in this branch

1. `01_RAW_POLICY_EVIDENCE.sql` — the exact policy/grant queries and their literal (masked) output.
2. `02_EFFECTIVE_ACCESS_RESULTS.md` — full canary-test transcript, column/ownership structure per table, and the RPC/caller inventory.
3. `03_TABLE_ACCESS_MATRIX.csv` — the per-table access contract used to write the migration.
4. `04_REMEDIATION_PLAN.md` — the migration plan, in plain language, table by table.
5. `05_ROLLBACK.sql` — exact reverse of the migration.
6. `06_POST_DEPLOY_VERIFICATION.md` — the checklist to re-run after approval and deployment (not yet executed).
7. `supabase/migrations/20260804_p0_access_control_hardening.sql` — the actual migration, **not applied to production**.
8. `src/__tests__/security-rls-effective-access.test.ts` — automated regression tests against the real REST API (read-only assertions; will need a service-role setup step to seed/clean canary data when run in CI).

## Corrected mutation record (2026-08-04 review, Blocker 7)

Replacing the prior, imprecise "no production mutation performed" with the exact record:

**No production schema, policy, privilege, deployment, or application-code mutation was performed.** Controlled temporary production test data was inserted, updated, and removed to reproduce effective access, as follows:

| Field | Value |
|---|---|
| Canary identifier | `__CANARY_SECURITY_TEST_2026-08-03__` (table `usage_counters`), row id `c28ee5b1-0af0-48ad-86b3-7cb43aed942f` |
| Insertion time | 2026-08-04 02:04:07 UTC (via service-role SQL) |
| Update time | 2026-08-04 02:04:07 UTC (anon PATCH, `analyses_used: 1 → 9999`) — same second, sub-second sequence per the request log |
| Deletion time | 2026-08-04 02:04:35 UTC (anon DELETE, confirmed via `api` service logs, request id `20347a55-b0c9-44e4-8535-5987e3041522`) |
| Funnel-event session identifier | **None.** The original incident-reproduction pass (`02_EFFECTIVE_ACCESS_RESULTS.md` §A) did not invoke `record_funnel_event` — only `usage_counters` CRUD and read-only `select=id` probes against `invoices`/`leads`. The newly-added test files (`security-rls-effective-access.test.ts`, `security-rls-production-smoke.test.ts`) do exercise the RPC, but both are gated behind explicit env vars (`RUN_RLS_INTEGRATION_TESTS`, `RUN_PRODUCTION_SECURITY_SMOKE`) that are unset — neither has executed, so no funnel event exists from this work as of this update. |
| Cleanup verification | Confirmed via a follow-up `SELECT count(*) FROM usage_counters WHERE identity_key = '__CANARY_SECURITY_TEST_2026-08-03__'` returning 0 rows, plus the DELETE call itself returning the deleted row body (200, row present in the response) as positive confirmation it existed and was removed in the same request. |
| Operator/tool | Claude Code (this session), via PowerShell `Invoke-RestMethod`/`Invoke-WebRequest` against the real PostgREST endpoint using only the public anon key, and the Supabase MCP `execute_sql` tool (service-role) for canary setup/verification. |

`invoices`/`leads` were touched only via `select=id` — no row content (names, emails, amounts) was ever retrieved, logged, or displayed anywhere in this incident record.

## What is explicitly NOT done yet

- The migration has **not** been applied to production or to any staging/preview environment.
- No branch has been merged.
- No PR has been merged (a draft PR is opened for review only).
- **Blockers 3/5/8 (real cross-identity user-A/user-B/admin testing, seeded canaries across all 10 tables, staging apply + rollback rehearsal) are blocked on infrastructure**, not skipped by choice: Supabase branching requires the Pro plan (confirmed via a real `create_branch` call, `PaymentRequiredException`), and creating a new disposable project failed because this organization is already at its 2-project free-tier limit (confirmed via a real `create_project` call, `BadRequestException`). Resolving this requires a founder decision — see the response accompanying this update for the options.
- The P1 report-integrity canary (§8 of an earlier instruction set) is deliberately deferred until after this P0 is resolved, per the established priority order.
- Sentry/observability (P2) is untouched.
- The CI database-security invariant (Blocker 10) is added as a standalone script, not yet wired into a scheduled/CI job requiring a live DB credential — see `07_CI_SECURITY_INVARIANT.md`.

**Awaiting your review of `04_REMEDIATION_PLAN.md` and the production action preview before any deployment.**
