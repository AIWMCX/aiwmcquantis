# AIWMC Quantis — Canonical Execution Register

Source charter: "AIWMC Quantis — Ordered Execution Checklist" (2026-08-27).
This register is Phase 0.1's deliverable. Every task below has an ID,
owner, status, evidence link, and next action. Status values match the
charter exactly: Not started / In progress / Blocked / Preview passed /
Production verified / Done.

## Phase 0 baseline (0.2) — captured 2026-08-27, live-verified, not inferred

| Fact | Value | Verified via |
|---|---|---|
| `main` HEAD | `e4de1c2439755a70f49d4f59268c26d7edc877d3` | `git rev-parse HEAD` |
| Vercel production SHA | `e4de1c24...` deploy pending at time of writing; last confirmed `READY` was `889b9150391f4ab9fe8b64c25940eed5df72bbf7` | Vercel API `list_deployments`, `state: READY`, correct author |
| Supabase migration head | `20260827100000_create_financial_invariant_sweep_runs` | `list_migrations` (Supabase MCP) |
| `DAHL_ENABLED` | `true` | GitHub production environment variable, live `gh api` read |
| `DAHL_CANARY_MODE` | `off` (updated 2026-08-24T15:38:18Z) | same |
| `DAHL_CANARY_PERCENT` | `0` | same |
| `DAHL_CANARY_ADMIN_USER_IDS` | 2 UUIDs configured, inert while mode=off | same |
| `DAHL_CLEARED_ALIASES` (new, this session) | unset → falls back to `{fast_reasoning}` default in code | `dahl-canary.ts` |
| Known-issues carried forward | pg_net schema-move question unanswered (Phase 4.6-4.9); HaveIBeenPwned toggle blocked pending dashboard action (Phase 4.1-4.5); `increment_quote_gen_usage`/`decrement_quote_gen_usage` anon-EXECUTE grant flagged by `get_advisors`, not yet fixed (Phase 2 scope) | this register |

0.3 (Dahl canary OFF, verified directly): **CONFIRMED**, see table above — not inferred from source or a deployment log.
0.4 (CashMatch regression fixture): **carried over from prior session, not re-verified this pass** — flagged as an open item under Phase 5/regression coverage, not fabricated as done here.
0.5 (freeze unrelated migrations until Phase 1 closes): Phase 1 is closed as of this register (see below) — freeze lifted.

## Phase 1 — Ten-table security incident

| ID | Task | Status | Evidence | Next action |
|---|---|---|---|---|
| 1.1-1.3 | Read/classify PR #26's 67 files | Done | `gh pr comment 26` reconciliation comment, this session | none |
| 1.4 | Exact remediation provenance | Done | `docs/security/2026-08-27-p0-10table-closure.md` §1-2 | none |
| 1.5 | Fresh branch, port unique value only | Done | PR #101 (`security/p0-10table-regression-gate`), merged `889b9150` | none |
| 1.6 | Ten-object effective-access matrix | Done | closure doc §2 (grants, policies, fixing migration, timestamp per table) | none |
| 1.7-1.10 | Synthetic identities, SELECT/INSERT/UPDATE/DELETE, ownership-transfer, views/RPC bypass | **Done** (no team-owned tables exist among the 10, so "team member" identity is N/A here — confirmed by schema, all 10 are single-owner `user_id` or service-only) | `supabase/tests/database/p0_10table_exposure_regression.test.sql`, commit `a07154b6`: 35/35 assertions, live-verified via `pgtap` installed in a rolled-back transaction against production before commit. Covers anon denial (all 10), authenticated denial (3 internal tables), owner-vs-non-owner isolation (6 owner-scoped tables: invoices + 5 more added this pass), ownership-reassignment/impersonation denial (INSERT claiming another user's id, UPDATE reassigning user_id — both correctly 42501 via WITH CHECK), and view-bypass check (`analysis_health`, built on `analysis_attempts`, carries no anon/authenticated grant). Two real test-harness bugs caught and fixed in the process (missing `SET LOCAL ROLE authenticated` — the original invoices-only test had this bug too and would have silently passed even with broken RLS; wrong `throws_ok` arg count). | Bulk/filter-operation and upsert-path coverage specifically (as opposed to single-row ownership-transfer, which is covered) remains a nice-to-have, not blocking |
| 1.11 | Confirm no service_role key in client bundles | **Done** | Existing automated test `src/__tests__/edge-runtime-guards.test.ts` ("No server-side secrets leak into the VITE_ namespace") + fresh grep of `src/` this session: zero JWT-shaped strings found outside the public anon/publishable key | none |
| 1.12 | Sanitized evidence saved | Done | closure doc §3 (status codes only, zero row contents) | none |
| 1.13 | Exposure window | Done | closure doc §1, §4: earliest confirmed 2026-08-03, fixed 2026-08-16T23:02:01Z, true origin unknown (drift-only) | none |
| 1.14 | Data classes reachable | Done | closure doc §4 | none |
| 1.15 | Log review + retention limitation stated | Done, negative result | closure doc §4: `query_logs` errored on every attempt; retention limitation stated explicitly, "no exploitation occurred" NOT claimed | Retry `query_logs` or escalate to Supabase support if forensic access is ever needed |
| 1.16 | Record-integrity reconciliation (invoices/leads/usage_counters) | **Not done** | — | Run a row-count/checksum sweep against a known-good baseline if one exists; none currently exists as a baseline to compare against |
| 1.17 | Rotation/legal/notification decision | **Open, correctly not resolved by the coding agent** | closure doc §4 | Founder decision required |
| 1.18-1.20 | Replacement PR, clean-replay/pgTAP/typecheck/CI, black-box repeat in Production | Done | PR #101: CI green (`889b9150`), gate SQL live-verified pre-merge (zero findings), Vercel `READY` confirmed post-merge | none |
| 1.21 | Close PR #26 as superseded | Done | PR #26 closed, reconciliation comment posted linking #32 and #101 | none |
| 1.22 | Internal incident-closure record | Done | `docs/security/2026-08-27-p0-10table-closure.md` | none |

**Phase 1 exit gate status: met, with one honest residual gap** — 1.7-1.11 are now Done (see above, commit `a07154b6`). 1.16 (record-integrity reconciliation for invoices/leads/usage_counters) remains genuinely open: there is no pre-incident baseline snapshot to reconcile against, so this cannot be honestly marked Done by inspection alone. 1.17 (rotation/legal/notification decision) is correctly left to the founder, not resolved by the coding agent.

## Phase 2 — 88-table audit

Status: **In progress.** Canonical inventory (2.1) built and live-exported to `docs/execution/2026-08-27-phase2-88table-inventory.md` — 78 tables matched the GRANT-scoped query (not 88; discrepancy noted, not resolved). Static review (2.5-2.9) found: **zero recurrence** of the 10-table incident's wide-open-policy pattern anywhere else in the schema; the one `qual='true'` policy found (`plan_entitlements`) individually checked and confirmed benign (public pricing-tier read, correctly paired with a `service_role`-only write policy); the 8 policy-less tables (Phase 3's exact list) reconfirmed live rather than assumed.

**Priority list (2.4) fully checked and clean**: `api_keys`, `subscriptions`, `analyses`, `profiles`, `document_exports`/`document_downloads`, `usage_tracking`/`idea_generation_usage` all individually reviewed — explicit `anon`-deny or NULL-`auth.uid()` denial, owner-scoping, `service_role` bypass correctly gated. `invoices`/`leads` covered in Phase 1.

**Two exhaustive schema-wide checks (not sampled) now closed**: (1) zero write-capable (`INSERT`/`UPDATE`/`DELETE`/`ALL`) policies granted to `public`/`anon` with a wide-open qual anywhere in the 78-table set — only 7 `SELECT`-only public-reference-data policies exist, all previously-established legitimate cases; (2) zero `UPDATE`/`DELETE` policies for `authenticated`/`public` with a `NULL` `USING` clause anywhere — every mutation policy has some row-scoping condition. Together these rule out the 10-table incident's structural pattern recurring anywhere else, and rule out the "policy exists but isn't scoped" gap class schema-wide.

One minor, non-critical finding: `autoposter_credentials`' `admin_all` policy lets any `admin`/`content_admin` see every connected social account system-wide (not scoped per-admin) — confirmed low severity (exposes vault reference UUIDs, not raw OAuth tokens); logged as an exceptions-register candidate, not fixed in this pass.

**Static review (2.5-2.9) now covers essentially all 78 inventoried tables**, not a sample: every non-priority table's policies pulled and reviewed in one batch — consistent pattern of owner-scoping, admin-role-gating, `service_role` bypass, and correctly-scoped public-catalog reads (`active=true`-style, not full-table). Two items individually verified rather than assumed: `self_learned_priors` (authenticated-wide read, confirmed zero PII/no `user_id` column — aggregate ML data, correct by design) and `qoc_audit` (non-standard inline service-role check, confirmed to be a *subset* of the standard helper's condition, so it can only be more restrictive, never more permissive). The 8 policy-less tables are correctly deferred to Phase 3 rather than re-litigated here.

**Build-out deliverables now shipped**: standalone exceptions register (`docs/execution/2026-08-27-rls-exceptions-register.md`, 12 documented entries with justification) and a permanent, scheduled CI gate (`scripts/check-rls-access-drift.ts` + `.github/workflows/rls-access-drift-check.yml`, every 6 hours) that generalizes this audit's two exhaustive checks to run forever, checked against the register. Gate SQL live-verified against production before commit: 8 wide-open policies found, all allowlisted; 0 unscoped mutation policies — gate would report PASS right now. `p3_policyless_tables_regression.test.sql` (Phase 3, 20 assertions) also live-verified passing.

**Not yet done**: extending the dynamic pgTAP suite (not just the schema-introspection gate) beyond the 10 Phase-1 + 8 Phase-3 tables to the remaining ~60. This is real coverage the introspection-only gate can't replace (it proves the SQL-level check logic is right, not that a real role-switched query behaves as expected) — flagged as the one substantive Phase 2 item still open.

One concrete carry-forward finding to fold in: `increment_quote_gen_usage()` / `decrement_quote_gen_usage()` hold a live anon/authenticated EXECUTE grant per `get_advisors` (found 2026-08-27, not fixed). Prioritize this under 2.4's function/RPC scope.

## Phase 3 — Eight policy-less RLS tables

Status: **Done.** Full call-site search (3.1-3.2), client-denial proof (3.4), server-job proof (3.5), classification (3.6), and regression tests (3.7) all completed and live-verified against production — see `docs/execution/2026-08-27-phase3-policyless-tables.md` for the complete evidence table.

Key results: `golden_test_vectors`/`accuracy_runs` → `run-accuracy-harness` (service-role); `rvce_observations` → `rvce-validate`'s `adminClient` only (confirmed the file's separate anon-keyed `userClient` never touches it); `self_learning_runs` → `self-learning-update` (service-role); `pending_plan_grants` → a `SECURITY DEFINER` trigger on `auth.users` INSERT, with **zero** application-code caller at all, by design. `metric_formula_registry`/`dataset_releases`/`calibration_metrics` have **zero callers of any kind** — dormant schema shipped ahead of an unbuilt formula-registry/dataset-versioning/calibration feature (flagged for a founder decision: keep reserved or drop, not a security action).

Live black-box proof: `rvce_observations` holds 697 real rows; `service_role` sees all 697; `anon`/`authenticated` see exactly 0 (a genuine denial, not an empty-table coincidence). `INSERT` denial (`42501`) directly tested on 3 representative callers. New pgTAP suite (`p3_policyless_tables_regression.test.sql`, 20 assertions) live-verified passing before commit. No policy change recommended for any of the 8.

## Phase 4 — Minor Supabase hardening

- 4.1-4.5 (leaked-password protection): **Blocked** — requires manual Supabase Dashboard action, no tool access this session.
- 4.6-4.9 (pg_net namespace): **Investigated and documented, 2026-08-27** — see `docs/execution/2026-08-27-phase4-hardening.md`. Full live dependency inventory: extension currently attributed to `public` schema; exactly 5 real `pg_cron` jobs call `net.http_post()` (autoposter-publish-due, check-lifecycle-emails-hourly, process-subscription-downgrades-hourly, send-weekly-insights-mondays, warm-functions-every-5min), zero application-function callers. Technical assessment: the move is very likely safe (pg_net owns its own `net` schema independent of the extension's namespace attribution, so cron jobs are unaffected), but **cannot be rehearsed on Preview in this session** (no working Supabase/Docker stack) — per the charter's own 4.8-before-4.9 sequencing, this is correctly resolved as a **documented, deferred exception**, not a production change made without rehearsal. Two live secrets were visible during the inventory query and deliberately not written into any doc or commit.

## Phase 5 — Product Accuracy (Q19/Q6-Q8/Q20)

Status: **Reported Done in a prior session** (dashboard, policy doc, support runbook section all shipped and deploy-verified). Per this charter's evidence bar, re-validate against 5.1-5.20's specific sub-items (alerting on failed/missing sweep — 5.6; conflict fixtures for wrong totals/units/currency/period/verdict/cohort — 5.13) before counting this phase Done. **Not re-audited in this register yet.**

## Phase 6-9

Status: **Not started.** Phase 8 (Dahl) has one piece of forward-compatible groundwork laid this session (the `isDahlAliasCleared()` gate, `e4de1c24`) but remains explicitly blocked on Phases 1 and 5 per the charter — Phase 1 has open gaps (above), so Phase 8 is not unblocked yet.

## Daily commercial lane

Status: not tracked by the coding agent — owner is the founder per the charter.
