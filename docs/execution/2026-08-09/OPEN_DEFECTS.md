# Open Defects — 2026-08-09 Phase 0 Freeze

Ranked by release-blocking severity. Each entry states what is proven vs. still
hypothesis, per the directive's evidence-first rule.

## SEC-1 (P0, blocking) — 10 tables effectively open to unauthenticated access

- **Status:** Remediation written (PR #26), not merged, not applied to production.
- **Proven:** `HISTORICAL` reproduction with real anon-key HTTP calls (prior session).
- **Not proven this session:** re-reproduction against current production state (would
  be redundant — the migration hasn't changed production, so the prior finding stands
  unless production config changed independently, which is not expected).
- **Blocker to closing:** isolated test execution (local Docker down; GitHub Actions
  billing-locked). See INFRA-1.
- **Next action:** once INFRA-1 clears, run the full Phase 1 sequence (migration
  replay, pgTAP, cross-identity matrix, rollback rehearsal) via
  `security-p0-isolated-test.yml`, then request founder approval to merge/apply.

## SEC-2 (P0, blocking, conditional) — `get_referral_stats` / `complete_referral_signup` possible auth bypass

- **Status:** Root cause identified by source reading (NULL-comparison three-valued-logic
  bug; signature-mismatch REVOKE no-op). NOT reproduced via actual HTTP exploitation.
- **Language requirement:** must remain conditional/hedged ("plausible", "code-level
  finding") until reproduced with synthetic data — per explicit prior instruction.
- **Blocker to closing:** same as SEC-1 (INFRA-1).

## INFRA-1 (blocking multiple workstreams) — GitHub Actions account billing lock

- **Status:** `PROD_VERIFIED`. Screenshot evidence: "Your account's billing is
  currently locked. Please update your payment information." Confirmed account-wide,
  not workflow-specific.
- **Owner:** founder/account owner only. Requires action at
  `github.com/settings/billing/payment_information`. Not actionable by the agent —
  this is a financial-credentials action outside agent scope regardless of access
  level, and the agent has no access to the billing page in any case.
- **Downstream impact:** blocks Workstream/Phase 1 isolated CI verification, blocks
  any GitHub-Actions-based production monitor (Phase 2), blocks `db-security-invariant.yml`
  running on future PRs.
- **Next action:** waiting on founder. No workaround exists that preserves the
  "no production credentials in CI" constraint — running these tests locally would
  require the separately-blocked Docker/WSL2 fix instead.

## INFRA-3 (new this session, blocking further live-DB verification) — Supabase DB MCP permission loss

- **Status:** `PROD_VERIFIED` as a tooling fact this session. During Workstream 2
  work, the Supabase DB MCP (`execute_sql`, `get_advisors`) began failing every
  call, including a trivial `SELECT 1`, with `MCP error -32600: You do not have
  permission to perform this action`. This happened mid-session, after several
  successful queries earlier (live DB snapshot, qoc_audit_envelopes count) —
  something changed the tool's access mid-session, not a pre-existing condition.
- **Impact:** blocks live re-verification of current grant state (the Workstream 2
  function matrix's grant columns are carried forward from a 2026-08-04 snapshot,
  not re-confirmed live this session), and blocks any further direct production
  DB queries generally until resolved.
- **Not retried in a loop** per standing instruction against retrying failing
  commands — confirmed failing on 3 different call types (execute_sql twice,
  get_advisors once) before stopping.
- **Next action:** unclear owner — may self-resolve (a session/token expiry) or
  may need the founder to check the Supabase MCP connection's own permission
  scope. Flagging for awareness; not blocking on it further this session.

## INFRA-2 (blocking, independent of INFRA-1) — Local Docker/WSL2 failure

- **Status:** `HISTORICAL`, not re-attempted this session. Independent infrastructure
  wall from INFRA-1 — fixing one does not fix the other.
- **Next action:** none pending from this session; GitHub Actions was pursued as the
  designated alternative per prior explicit instruction. If INFRA-1 also stays blocked
  for an extended period, WSL2 repair becomes the only remaining path and should be
  escalated back to the founder as a decision point.

## QOC-1 (blocking Phase 6 decision, not release-blocking on its own) — Zero audit envelopes despite awaited call

- **Status:** `PROD_VERIFIED` zero rows, live re-confirmed this session, 3+ days after
  the isolate-teardown fix (P0-14) was already live. That fix is therefore **confirmed
  insufficient on its own** — the root cause is not fully explained by isolate lifetime.
- **Three candidate failure points identified, none yet isolated as the actual cause:**
  1. `sb.auth.getUser()` inside `qoc-orchestrate/index.ts` fails to resolve a user from
     whatever `Authorization` header actually arrives (returns 401 before `orchestrate()`
     is ever called — and `orchestrate()` is proven, by full source read, to call
     `safePut()`/insert on every single exit path, so if it ran even once, a row would exist).
  2. The Supabase JS client's `functions.invoke(..., { headers: { Authorization: authHeader } })`
     call in `analyze-business/index.ts` may not actually be sending the explicit header
     override — this exact codebase has one **documented precedent** of this exact class
     of bug (the Pro-worker auth issue, `analyze-business/index.ts` lines 2047-2067),
     so it is a live, evidence-supported hypothesis, not speculation.
  3. The edge function's platform-level `verify_jwt: true` setting (confirmed via
     `get_edge_function` this session) may reject the request before the function's own
     code runs at all, if the forwarded header isn't a JWT format Supabase's edge
     gateway recognizes as valid — independent of what the function's own code does.
- **Also relevant, not a defect but context:** authenticated qualifying traffic is
  extremely low (2 analyses in 5 days per live snapshot) — even a fully working pipe
  would produce very few rows in this window. This does NOT explain zero, but it does
  mean the eventual fix's proof will need a single controlled authenticated test call,
  not a wait-and-see on organic traffic.
- **Next action:** requires either (a) a live `get_logs` capture of an actual shadow-call
  attempt at the moment it happens (needs a real authenticated request to trigger, or
  a manual curl reproduction with a real user JWT against the deployed `qoc-orchestrate`
  endpoint directly, bypassing `analyze-business` entirely, to isolate candidate #1 from
  #2/#3), or (b) local/CI reproduction once INFRA-1/INFRA-2 clear. The manual curl
  reproduction is achievable without CI and should be the next concrete action.

## DATA-1 (new, UNVERIFIED, needs your check) — benchmark_master_geo may be unseeded in production

- **Status:** `CODE_VERIFIED` the seed migration is broken as written; `UNVERIFIED`
  whether production actually has rows in this table.
- **Finding:** `20260608000001_benchmark_master_seed.sql`'s INSERT for
  `benchmark_master_geo` (11 rows of pure geography cost/wage/rent multipliers)
  never included `sector_level1` in its column list. Confirmed against the
  real live schema (generated types, `src/integrations/supabase/types.ts`):
  `sector_level1` is `TEXT NOT NULL` with no default in production too, not
  just in the tracked migration file. **This exact statement would have
  failed against production the same way it failed in this isolated CI
  replay.**
- **Two possibilities, not yet distinguished:** (a) this table genuinely has
  zero rows in production — meaning geo-based benchmark multipliers
  (cost-of-living/wage/rent adjustments by region) have been silently
  unseeded this whole time — or (b) it was seeded successfully via a
  different, uncommitted path (manual SQL, different values for
  `sector_level1`) and the committed migration file just doesn't match what
  actually ran.
- **Fix applied to unblock CI replay:** added `'ALL'` as the `sector_level1`
  value for all 11 rows (the only sensible cross-sector convention, since
  every row here is intentionally sector-agnostic by design — no sector-
  specific columns exist in this table at all). This is a reasonable guess,
  not confirmed against whatever (if anything) production actually contains.
- **Next action:** once DB access is restored (INFRA-3), run
  `SELECT count(*) FROM benchmark_master_geo;` and `SELECT DISTINCT
  sector_level1 FROM benchmark_master_geo;` against production directly to
  resolve which scenario is true, and confirm `'ALL'` matches (or update it
  to whatever the real value is) before this migration is considered final.

## DATA-2 (new, UNVERIFIED, needs your check) — subscription_upsert_fix migration likely never fully applied to production

- **Status:** `CODE_VERIFIED` the migration has a fatal syntax error;
  `UNVERIFIED` what actually took effect on production.
- **Finding:** `20260608000002_subscription_upsert_fix.sql`'s final line was
  a bare top-level `RAISE NOTICE ...;` outside any PL/pgSQL block --
  `RAISE` is only valid inside `DO $$ ... $$` or a function body, so this is
  a genuine SQL syntax error (42601), not a replay-specific issue.
- **Why this matters beyond CI:** Postgres runs each migration file in one
  transaction by default. A syntax error anywhere in the file aborts the
  whole transaction -- meaning the migration's two real changes (adding a
  unique constraint on `subscriptions.user_id`, needed by `stripe-webhook`'s
  `upsert(onConflict:"user_id")` call, and creating the
  `admin_fix_subscription` RPC) **may never have actually taken effect on
  production**, not just failed in this CI replay.
- **Fix applied:** wrapped the trailing `RAISE NOTICE` in its own `DO $$
  BEGIN ... END $$;` block -- pure syntax fix, no logic change.
- **Next action:** once DB access is restored (INFRA-3), directly confirm on
  production: `SELECT conname FROM pg_constraint WHERE
  conrelid='public.subscriptions'::regclass AND contype='u';` (does the
  unique constraint exist?) and whether `admin_fix_subscription` exists as a
  function. If either is missing, `stripe-webhook`'s upsert call may be
  silently failing or behaving unexpectedly on every webhook delivery --
  worth checking against BILL-1 (Stripe E2E, already flagged as unverified).

## DATA-3 (new, connects directly to QOC-1) — three different tables all named/related to "qoc_audit", only one of which the deployed code actually uses

- **Status:** `CODE_VERIFIED`.
- **Finding:** the migration chain contains two *completely different* table
  designs both created as `public.qoc_audit`:
  - `20260624010000_qoc_audit_trail.sql` (earlier, wins on replay): per-stage
    tracing, `correlation_id`/`stage`/`ok`/`duration_ms`, one row per
    pipeline stage.
  - `20260624054320_...sql` (later, silently no-ops on `CREATE TABLE IF NOT
    EXISTS` since the table already exists from the file above): a
    per-request envelope design — `request_id`/`fingerprint`/
    `overall_verdict`/`traces`/`short_circuit` — that never actually took
    effect, confirmed because it broke this migration's own index creation
    (the column it depends on was never added).
  - **Neither of these is `qoc_audit_envelopes`** — the table
    `supabase/functions/qoc-orchestrate/adapters.ts`'s `putEnvelope()`
    actually writes to, confirmed by direct source read earlier this session
    during the QOC-1 investigation (Workstream 7). That table's own creation
    migration hasn't been located in this pass.
  - The later `qoc_audit` design's column shape
    (`request_id`/`fingerprint`/`overall_verdict`/`traces`/`short_circuit`)
    matches `qoc_audit_envelopes`'s real shape almost exactly — strongly
    suggesting a developer built `qoc_audit` first, then renamed/rebuilt it
    as `qoc_audit_envelopes` mid-development, and this abandoned migration
    was left in the chain never having actually applied.
- **Relevance to QOC-1** (this session's earlier finding that
  `qoc_audit_envelopes` has 0 rows despite the P0-14 awaited-call fix):
  this doesn't change that finding, but it does confirm the QOC audit-trail
  concept went through at least 3 distinct schema attempts
  (`qoc_audit` per-stage, `qoc_audit` per-request [abandoned],
  `qoc_audit_envelopes` per-request [live]) — worth knowing when tracing
  QOC-1 further, so as not to mistake evidence about the wrong table for
  evidence about the one the deployed code actually uses.
- **Fix applied:** guarded the later migration's index creation with a
  column-existence check rather than assuming which schema is "correct" —
  this is a real architectural decision (which qoc_audit design, if either,
  should still exist) that shouldn't be resolved by a CI-unblocking patch.
- **Next action:** worth a deliberate decision on whether the abandoned
  per-stage `qoc_audit` table (which DOES currently exist per this replay)
  is still wanted, or should be dropped in a follow-up migration once its
  production status is confirmed.

## DATA-4 (new, directly touches PR #26 core migration) — analysis_attempts, one of the 10 original P0 tables, never created by any tracked migration

- **Status:** `CODE_VERIFIED` the table is missing from tracked history;
  `PROD_VERIFIED` (via the original incident's own live evidence, not this
  session) that the table genuinely exists in production.
- **Finding:** `analysis_attempts` — one of the 10 tables in the original
  P0 unauthenticated-access incident, and directly referenced by this
  branch's own core security migration
  (`20260804000000_p0_access_control_hardening.sql`'s REVOKE/POLICY
  statements for it) — is never created by any migration in this repo's
  tracked history. Confirmed real and live via the original incident's own
  `pg_policies` query capture (`01_RAW_POLICY_EVIDENCE.sql`:
  `analysis_attempts | analysis_attempts_self | PERMISSIVE | {public} | ALL
  | true | true`), not just inferred.
- **Reconstruction basis, stronger than the other 4 table reconstructions
  this session:** not from `types.ts` (this table isn't in there at all —
  a separate, unexplained gap in the type generator's coverage) but from
  `20260719163441_fix_analysis_health_security_definer_exposure.sql`'s own
  header comment, which states its view definition was reconstructed from a
  **direct live query against production on 2026-07-21** — meaning the
  columns it selects (`created_at`, `tier`, `status`, `degraded`,
  `latency_ms`) are real, confirmed column names, not guessed.
- **Caveat:** the 2026-08-03 incident audit describes this as an
  "idempotency ledger" with additional undocumented purpose — this
  reconstruction covers exactly the columns provably needed for the view and
  the P0 migration's (column-agnostic) REVOKE/POLICY statements to succeed;
  it may not be the complete real schema.
- **Why this matters beyond CI:** this table sat in the P0 migration's own
  scope the whole time without anyone (this session included, until now)
  confirming it has zero tracked creation history — a real gap that only
  surfaced because this is the first time the full chain has ever replayed.
- **Next action:** once DB access is restored (INFRA-3), pull the real full
  column list via `information_schema.columns` and confirm this
  reconstruction is complete, or extend it.

## DATA-5 (CRITICAL, new) — the entire Phase D Scenario Workspace feature has no database tables in production

- **Status:** `PROD_VERIFIED` (via generated types, real live schema).
- **Finding:** `20260730084255_scenario_framework_foundation.sql` (the
  "Phase D" scenario-ledger migration -- `scenario_sets`, `scenarios`
  [new ledger design], `scenario_versions`, `scenario_runs`) creates a
  `scenarios` table with no `IF NOT EXISTS` guard. A table named
  `public.scenarios` already existed from an earlier, unrelated migration
  (`20260308082036_...sql`) -- a flat, single-row Monte-Carlo design
  (`params`/`output`/`monte_carlo_result`/`confidence_score`/`scenario_type`),
  completely different from the new ledger design. The `CREATE TABLE`
  collision aborted the statement.
- **Why this is critical, not just a replay issue:** confirmed against
  `src/integrations/supabase/types.ts` (generated from the real live
  database) that production's `scenarios` table **still has the OLD March
  shape today** -- and that `scenario_sets`, `scenario_versions`, and
  `scenario_runs` **do not exist in production at all**. Since a migration
  file runs as one transaction by default, the `scenarios` collision (the
  second `CREATE TABLE` in the file) rolled back the entire migration,
  including `scenario_sets` (the first, otherwise-uncontested statement).
- **Practical impact:** the entire Phase D Scenario Workspace feature --
  reported complete through "Phase D-14: Deploy + register in CI + live
  verify sensitivity/breakpoint" -- has never actually had its foundational
  tables created in production. Every dependent piece
  (`create-scenario-set`, `run-scenario`, `promote-scenario` edge functions,
  the `/app/scenarios` UI, sensitivity/breakpoint analysis) has had nothing
  real to write to or read from since it shipped. Whatever "live
  verification" happened for Phase D must not have caught this, or verified
  against a different environment.
- **Fix applied (to this branch, unblocking CI replay):** a non-destructive
  rename -- `ALTER TABLE public.scenarios RENAME TO
  scenarios_legacy_monte_carlo` when the old shape is detected (checked via
  a real column, `params`, that only the old design has), before creating
  the new ledger table. Data-preserving, not a drop.
- **This is a real candidate fix for production, not just a CI patch** --
  but renaming a live production table is a genuinely consequential action
  that needs your explicit review before this migration is ever applied
  there. Flagged prominently, not decided unilaterally.
- **Next action:** this deserves priority attention separate from the P0
  access-control work this branch primarily exists for. Once you've
  reviewed the rename approach (or specify a different resolution), this
  migration can be applied to production to actually stand up the Phase D
  feature's tables for the first time.

## DATA-6 (replay-safety only, likely NOT a production defect) — Docs Studio's 6 tables collide with earlier Feb-vintage definitions on replay

- **Status:** `CODE_VERIFIED` collision exists in tracked history;
  likely `NOT` a live production defect (distinct from DATA-5).
- **Finding:** `20260730085727_docs_studio_persistence_repair.sql` creates
  6 tables (`doc_templates`, `documents`, `document_versions`,
  `document_exports`, `doc_performance_signals`, `document_downloads`) with
  plain `CREATE TABLE` (no guard). All 6 have earlier, Feb-2026-vintage
  definitions still in tracked history, structurally similar but not
  identical (e.g. old `documents.user_id` referenced `public.profiles(id)`,
  this version references `auth.users(id)`).
- **Why this is likely fine in production, unlike DATA-5:** this migration's
  own header comment states it **confirmed live, via direct query**, that
  `doc_templates` did not exist in production when this was written --
  meaning the Feb tables were almost certainly dropped out-of-band before
  July, and this migration's original application to production most likely
  succeeded cleanly (no collision existed there). The collision only
  surfaces on a full-chain replay, which necessarily re-creates the Feb
  tables first (they were never removed from tracked history) before
  reaching this file.
- **Fix applied:** every `CREATE TABLE`/`CREATE INDEX` converted to
  `IF NOT EXISTS`, every `CREATE POLICY` given a matching
  `DROP POLICY IF EXISTS`, seed `INSERT` given `ON CONFLICT DO NOTHING` --
  purely idempotent, no destructive action, no attempt to reconcile the two
  schema generations' column/FK differences (real risk of masking a genuine
  difference without live verification).
- **Next action:** low priority relative to DATA-5 -- if you want full
  confidence, confirm directly once DB access allows it that production's
  live `documents.user_id` FK target matches this migration's intent
  (`auth.users`, not `public.profiles`).

## MON-1 (RESOLVED this session) — SEO Live Monitor failure

- **Status:** `PROD_VERIFIED` -- fully resolved by direct evidence, not inference.
- **Root cause confirmed:** `.github/workflows/seo-live-monitor.yml` runs on GitHub
  Actions (`schedule` + `workflow_dispatch`). Its "failing since Aug 6" status is
  therefore explained entirely by INFRA-1 (account-wide billing lock) -- there is
  nothing wrong with the workflow file itself (read in full: standard checkout +
  one script call, no defects).
- **More importantly, the underlying question the monitor exists to answer --
  "is live production actually broken?" -- was answered directly this session**,
  independent of CI: `scripts/verify-live-production.sh` (the exact script the
  workflow calls) was run directly against `https://www.aiwmcquantis.com` this
  session. Result: **PASS on every assertion** -- all 7 sampled routes have correct
  self-referencing canonicals, no duplicate bodies, the shipped JS bundle still
  contains the $49/Pro pricing data, sitemap.xml reachable with 88 URLs, robots.txt
  reachable, and unknown routes correctly 404.
- **Conclusion:** the live site has no SEO regression. The monitor's red/missing
  status was a false signal caused entirely by INFRA-1, not a real production
  problem. No further action needed on MON-1 beyond the standing INFRA-1 fix
  (founder updates GitHub billing) restoring the monitor's own scheduled runs.

## PUB-1 (P0-adjacent, blocking Phase 4 acceptance) — No fail-closed publication gate for `report_integrity=BLOCK`

- **Status:** `CODE_VERIFIED`, confirmed this session by direct source read.
- **Finding:** `report_integrity` is referenced in exactly two client files —
  `AccuracyTransparentResults.tsx` (line 651) and `AnalysisResults.tsx` (lines
  536-537, which only pass it down as a prop). The ONLY effect of `BLOCK` is a text
  swap in a small "Audit Trail" widget from "✓ Passed" to "⚠ Contradiction detected".
  There is no `READY | DEGRADED | BLOCKED` publication state anywhere. PDF generation,
  download, and sharing are not gated by this value at all — grep across the codebase
  found zero references to `report_integrity` in any PDF/export/share code path.
- **Concrete impact:** a report with a proven arithmetic contradiction (the exact
  condition the reconciliation engine was built to catch) is fully downloadable and
  shareable today, indistinguishable from a valid report except for one small text
  label most users will never notice.
- **Status update 2026-08-09: FIXED, not yet deployed.** Implemented on
  `security/p0-effective-access-control` branch (uncommitted as of this entry, pending
  the user's decision on where/when to commit and merge):
  - `src/components/analysis/AnalysisResults.tsx`: added `isReportBlocked` check;
    `handleExportPDF`, `handleExportSCORE`, `handleShare` now refuse to run and show
    a toast when `result.report_integrity === 'BLOCK'`; SCORE CSV button and
    `ResultsTopBar`'s PDF/Share buttons render `disabled`; added a visible red banner
    at the top of the results view explaining the report needs review (full report
    detail remains visible in-app — this is a customer-facing warning layer, not data
    removal, per the directive's "preserve debugging/evidence data internally").
  - `supabase/functions/share-report/index.ts` (the real security boundary — this is
    the unauthenticated, third-party-facing GET endpoint): now returns HTTP 409
    `report_needs_review` instead of report data when the underlying analysis has
    `report_integrity === 'BLOCK'`, closing the actual external-exposure risk that
    client-side gating alone cannot close.
  - `src/pages/SharedReport.tsx`: displays the server's `message` field so recipients
    of a blocked share link see a clear explanation rather than a generic error.
  - `npx tsc --noEmit` on the full project: 0 errors (exit 0).
  - **Not yet done:** PDF generation is fully client-side (`@react-pdf/renderer` via
    `usePdfExport.ts`), so there is no separate edge function to gate there — the
    `AnalysisResults.tsx` handler gate is the only enforcement point for PDF export,
    and it is bypassable by a technically sophisticated user calling `generatePdf()`
    directly from devtools. This is acceptable for now (matches "customer-facing
    behavior", not a security boundary — the PDF only ever contained the user's own
    data anyway) but is weaker than the share-report server-side fix. Not
    browser-verified live yet (no dev server run this pass). Not committed.

## BILL-1 (unverified this session) — Stripe/entitlement E2E lifecycle unproven

- **Status:** `UNVERIFIED`, carried from task #23 (pending). 24 active/trialing
  subscriptions exist in production (`PROD_VERIFIED` this session) — meaning real
  money is flowing through a path that has not had a supervised end-to-end test-mode
  verification. This is a real gap, not a hypothetical one.

## ACT-1 (context, not a defect to "fix") — Near-zero activation

- **Status:** `PROD_VERIFIED` this session: 2 analyses in 5 days, last analysis
  2026-08-06 (3 days stale as of capture). Reconfirms the 2026-08-08 finding.
  Per prior explicit instruction, this must not be described as caused by
  analytics/CSP/bot-detection failures (those are separate, `HISTORICAL` findings)
  and must not be scaled into with acquisition spend while the system is RED.
