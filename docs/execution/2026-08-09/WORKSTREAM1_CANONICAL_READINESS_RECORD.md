# Workstream 1 — Canonical Readiness Record (Corrected)

Date: 2026-08-09. Supersedes prior informal status language from the 2026-08-04
through 2026-08-08 rounds. Every claim below is labeled per the truth
hierarchy established in `EVIDENCE_LEDGER.md`: `PROD_VERIFIED`,
`CODE_VERIFIED`, `TEST_VERIFIED`, `CONFIG_VERIFIED`, `UNVERIFIED`, or
`CONFLICTING_EVIDENCE`. This document exists to replace six specific pieces
of prior imprecise language with corrected, evidence-anchored phrasing, per
explicit standing instruction.

## Overall verdict

**RED — LIVE BUT NOT PRODUCTION-CLEARED FOR GROWTH.** Unchanged from the
2026-08-08 council finding. Nothing in this session's evidence — PUB-1 fixed,
MON-1 resolved as a false signal, PR #27's dead-code trap caught and fixed —
upgrades this verdict. The controlling blocker (SEC-1/SEC-2, PR #26 unmerged)
remains open and is not something this session's work touched.

## Correction 1 — P0-25 (reconciliation engine)

**Old language:** ambiguous / implied still-open.
**Corrected status: RESOLVED, REFRAMED.** `CODE_VERIFIED` + `PROD_VERIFIED`.
The deployed `reconciliation-check.ts` (live in `analyze-business/index.ts`)
implements real arithmetic-identity checks (R-001 through R-005, Sum
Integrity / Sign Consistency) and a Scenario Coherence check (R-011, backed by
`checkScenarioMonotonicity()`). `CRITICAL_RECONCILIATION_RULES` = {R-001..R-005}
correctly escalates `report_integrity` to `BLOCK` on a genuine contradiction.
This was previously mischaracterized in at least one earlier round as
"formula_reconciliation: UNVERIFIED" — that characterization was itself wrong
and was corrected in an earlier round's self-review. Restated here as the
permanent record: **P0-25 is resolved at the engine level.** The remaining
gap was not the engine — it was that `report_integrity=BLOCK` had no
publication-side enforcement (see PUB-1, now fixed this session, Phase 4).

## Correction 2 — Destructive-behavior evidence tiers (function access findings)

**Old language:** flat, undifferentiated list of "findings."
**Corrected structure — three explicit tiers, none conflated:**

- **EMPIRICALLY PROVEN** (reproduced via real HTTP calls against production,
  anon key only): the original 10-table unauthenticated effective-access
  finding (`docs/security/2026-08-03-p0-access/02_EFFECTIVE_ACCESS_RESULTS.md`).
  This is the only category with direct reproduction evidence.
- **CONFIGURATION-PROVEN** (confirmed by reading live grants/policies/function
  source, not yet exploited via HTTP): `charge_free_analysis` SECURITY
  DEFINER bypass into `usage_counters` (both overloads) — root cause and
  closure both `CODE_VERIFIED` against the migration; PUBLIC-EXECUTE grants
  beyond stated intent on several other functions, catalogued in
  `07_FUNCTION_ACCESS_MATRIX.csv`.
- **UNTESTED / HYPOTHESIS, CONDITIONAL LANGUAGE REQUIRED:** `get_referral_stats`
  and `complete_referral_signup`. Root causes are `CODE_VERIFIED` (NULL-
  comparison three-valued-logic bypass in the former; migration
  signature-mismatch causing a REVOKE no-op in the latter) but **neither has
  been exploited via an actual HTTP call with synthetic data.** These must
  continue to be described as "a plausible code-level finding, not yet
  reproduced" — not as confirmed vulnerabilities — until Workstream 3/4
  (blocked on INFRA-1, the GitHub Actions billing lock) executes.

## Correction 3 — Activation / traffic language

**Old language:** "no traffic."
**Corrected: "effectively zero observed activation; acquisition traffic
unverified."** `PROD_VERIFIED` this session via direct query: 2 analyses in
the trailing 5 days as of 2026-08-09, last analysis at 2026-08-06T02:26:30Z
(3 days stale at capture time), 44 total registered users, 24 active/trialing
subscriptions. "No traffic" overstates certainty about the acquisition side
(we have not independently verified whether visitors are arriving and
failing to convert, vs. not arriving at all — GTM/analytics measurement is a
separate, `HISTORICAL`, not-re-verified-this-session finding and must not be
conflated with this direct database fact per prior explicit instruction).
What is `PROD_VERIFIED` is the activation number itself, not its cause.

## Correction 4 — QoC status language

**Old language:** "QoC module does not execute."
**Corrected: "expected QoC audit persistence is not occurring; root cause
unresolved, three candidate failure points identified, none yet isolated."**
`PROD_VERIFIED`: `qoc_audit_envelopes` has 0 rows, re-confirmed live this
session, 3+ days after the P0-14 fix (fire-and-forget → awaited call,
`b069e5f2`) was already live on `main`. That fix is therefore **confirmed
insufficient on its own** — it was necessary but not sufficient. `CODE_VERIFIED`
this session: `orchestrator.ts`'s `safePut()` wrapper calls the audit insert
on every single exit path of `orchestrate()` (preflight-fail, dedupe-hit,
dedupe-burst, engine-error, success) — meaning if `orchestrate()` ever ran
even once, a row would exist. It has never appeared. The break is therefore
upstream of `orchestrate()`, at the HTTP/auth boundary, with three candidate
causes identified but not yet isolated: (1) `sb.auth.getUser()` in
`qoc-orchestrate/index.ts` failing to resolve a user from whatever
`Authorization` header actually arrives; (2) the Supabase JS client's
`functions.invoke()` header-override not being honored as the code assumes —
this codebase has one documented precedent of exactly this class of bug
(the Pro-worker auth issue); (3) the edge function's platform-level
`verify_jwt: true` setting rejecting the request before the function's own
code runs. Definitively **not** the cause: low qualifying-traffic volume
alone — while real (only 2 authenticated analyses in the trailing window),
it cannot produce a *literal zero* if the pipe worked at all in that window,
and does not explain the earlier 2026-07-25 finding of 0 rows against
higher-volume traffic either.

## Correction 5 — Docker/staging language

**Old language:** "founder staging infrastructure decision."
**Corrected: "developer-machine Docker failure; alternate isolated CI
execution pending."** `PROD_VERIFIED`: local Docker/WSL2 backend failed to
start across two attempts (~40 minutes) on the development workstation —
a genuine infrastructure failure, not a scoping or product decision. The
designated alternative (a temporary GitHub-hosted CI workflow,
`security-p0-isolated-test.yml`, built and committed to this branch this
session) is itself now blocked by a second, independent infrastructure wall:
`PROD_VERIFIED` via screenshot evidence this session — the GitHub Actions
account (`AIWMCX`) has its billing locked ("Your account's billing is
currently locked. Please update your payment information"), confirmed
account-wide across three structurally different workflows and trigger
types, not specific to any one file. This requires founder action at
`github.com/settings/billing/payment_information` — it is not resolvable by
continued engineering effort on this branch.

## Correction 6 — MON-1 / SEO monitor status (new this session, not a
correction to prior language but included for completeness)

**Corrected: "SEO Live Monitor's failing status is fully explained by the
GitHub Actions billing lock; the live site itself has no SEO regression."**
`PROD_VERIFIED` this session: `scripts/verify-live-production.sh` (the exact
script the monitor calls) was run directly against `www.aiwmcquantis.com`.
Every assertion passed — canonicals, no duplicate bodies, pricing data intact
in the shipped bundle, sitemap/robots reachable, real 404s. Do not read the
monitor's red/absent status in GitHub Actions as evidence of a live-site
problem; it is not.

## Corrections landed as actual fixes this session (not just language)

- **PUB-1** (`report_integrity=BLOCK` had no publication-side enforcement):
  fixed. Server-side gate in `share-report/index.ts` (409 on blocked reports,
  closing the actual unauthenticated third-party exposure), client-side
  export/share gating + visible banner in `AnalysisResults.tsx`. Committed
  `f6fc471a`.
- **PR #27's confidence-semantics fix targeting dead code**: found and fixed.
  The React-component PDF family it patched was never reachable from any user
  action; deleted (explicit decision) along with an unused `pdf-generator`
  edge function, and the actual live PDF (`usePdfExport.ts`) and the
  Twitter/Reddit share card (`ViralCard.tsx`) fixed directly with a minimal,
  self-contained relabel that doesn't depend on PR #27's unmerged schema.
  Committed `1656d268`.

All commits above are branch-local on `security/p0-effective-access-control`.
**Not pushed. Not merged. No production mutation.**

## What remains open, unchanged by this session

- SEC-1 / SEC-2 (PR #26): blocked on INFRA-1 (GitHub Actions billing) for
  isolated test evidence before merge can even be requested.
- QOC-1's exact failure point among the three candidates: needs either a
  direct, credential-safe reproduction (a manual `qoc-orchestrate` HTTP call
  using a real login flow you run, or the isolated CI once INFRA-1 clears) —
  not resolvable by further code reading alone.
- BILL-1 (Stripe test-mode E2E lifecycle): still `UNVERIFIED`, unchanged.
- Workstream 2 (full function-level security boundary matrix with explicit
  NULL-safe-predicate verification per function): not yet started this
  session — next natural step.

## Gate verdict

**NO-GO.** Unchanged. Two real fixes landed and one significant false-alarm
(MON-1) retired this session, but the controlling blocker (P0 access control,
PR #26) has not moved, and it is the item the acceptance gate is actually
gated on.
