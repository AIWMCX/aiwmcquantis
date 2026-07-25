# AIWMC Quantis — Accuracy Program State Ledger
Maintained per MP7-ACCURACY v3.1 §0 rule 5 and §22. **Read this first at the start of every accuracy session.**

---

## Session: 2026-07-25 — ACTIVATE: P0_STABILIZATION (continued)

**Environment:** PRODUCTION (deploys executed, founder-authorized). Deployed commit `fd863042`, verified live via `analyze-business?health=1` → `commit_sha: fd8630424167564736de8fd453f59e26ad2e6b5c`.

### Shipped to production this session

| Item | Evidence |
|---|---|
| **Finding 16-1** (Stripe billing audit) — webhook handlers no longer default unknown Stripe statuses to `"active"` | Commit `fd863042`. `stripe-webhook` v1976 → **v1988**. CI ✅ qoc-gate ✅ Production Deploy ✅ Deploy Smoke Test ✅ |
| **Migration** `20260725041725_expand_subscription_status_allowed_values` — `subscriptions.valid_status` CHECK widened 4 → 8 Stripe statuses | Verified live via `pg_constraint`. Applied to prod BEFORE code shipped (ordering deliberate: reversed, every new-status write would throw a constraint violation). Filename matches stamped version — no `schema_migrations` drift. |
| **P0-11** — "95,500 Monte Carlo scenarios" removed from Deno edge functions | Commits `857e5777` + `f28ee008`, previously unpushed on local main, now on `origin/main` |

### P0 register — reconciled against LIVE CODE this session (supersedes §6 status column)

**Critical correction to MP7 §5 baseline observation #9:** it attributes the undiscounted-NPV and silent-clamping defects to `calculate-financials`. That function is **dead code** — zero references in `src/`, only pinged by `warm-functions` (keep-alive) and `admin-health-sweep` (health check). The **live** calculator is `supabase/functions/analyze-business/financial-calculator.ts` (`calculateStrictFinancials`, called from `analyze-business/index.ts:1735`). Verify against the live file, not the microservice.

| P0 | Verified status | Evidence |
|---|---|---|
| **P0-01** | **CONFIRMED OPEN — live** | `financial-calculator.ts:194-206` silently rewrites B2B/enterprise CAC below $2,000 to `Math.max(benchmarks.cac_typical, 2000)`. Also `:586` floors MRR for break-even. |
| **P0-02** | **CONFIRMED OPEN — live** | `financial-calculator.ts:419-439` — if margin > `benchmark_max + 5%`, **`totalExpenses` is rewritten** to `mrr × (1 − ceiling)`, a fabricated number the user never supplied. Disclosure exists (`corrections[]`, `was_auto_corrected`, −15 reliability per correction) but surfaces only in `ValidationSection.tsx`, a secondary panel — the primary report/PDF show the rewritten figures as plain fact. |
| **P0-04** | **RESOLVED in live path** | `financial-calculator.ts:566-583` implements true DCF: `−I₀ + Σ(m=1..36) profit/(1+r)^m`, 10% annual WACC → monthly rate. Matches MP7 §10's NPV law. ⚠️ Uses flat monthly profit, not a dated/ramped series — a simplification, not the named defect. Dead twin `calculate-financials/index.ts:586` still has `netProfit * 36 - startupInvestment` (undiscounted) but is unreachable. |
| **P0-09** | **CONFIRMED OPEN — live** | `financial-calculator.ts:494,518` still set `paybackMonths = 999`. Typed `MonthsMetricResult` (`paybackResult`) exists and cross-checks, but is **explicitly detection-only** — in-code comment: *"20+ call sites downstream depend on its existing integer/999 contract."* Making it load-bearing is the real work. |
| **P0-11** | **RESOLVED** | Commit `857e5777`, pushed + deployed this session. |
| **P0-14** | **CONFIRMED OPEN** | `qoc_audit_envelopes` = 0 rows (live query). QoC deployed but not load-bearing. |

### NEW FINDING — P0-23: unauthenticated duplicate financial engine deployed in production

`calculate-financials` is **ACTIVE, deployed, and `verify_jwt: false`** (no auth required) while containing two known-defective implementations the live engine has already fixed:
- undiscounted NPV (`netProfit * 36 - startupInvestment`, line 586)
- the same margin-ceiling clamp that rewrites `totalExpenses` (lines 462-478)

Nothing in `src/` calls it. It is MP7's "≥11 competing truths" made concrete: a second, worse financial engine sitting publicly reachable on the internet, serving math the primary path has already corrected. Per MP7 §11 ("deprecate duplicate calculation paths **only after differential tests prove the migration**") — here no migration is needed because there is no consumer to migrate.

**Recommended:** remove from the deploy set / delete. **Blocked on founder approval** (§148: production change).
**Severity: High** (duplicate-truth surface + unauthenticated). **Not yet exploited** — no evidence of external calls.

### UPDATE (same session, continued) — all 4 founder-approved items shipped

Founder approved all four outstanding items. Executed in dependency order, each verified before moving to the next:

| # | Item | Commit | Live verification |
|---|---|---|---|
| 1 | **P0-01/02 fix** — stop silently rewriting avg-check/CAC/LTV/net-margin | `b35de416` | Full suite 1222/1222 green. Golden-case expected values regenerated by running the actual post-fix engine (not hand-derived, to avoid errors in cascading ramp/DCF math). `ValidationSection.tsx` copy corrected ("Auto-Corrections" → "Flagged for Review"; dropped the strikethrough/arrow treatment that implied values were replaced). |
| 2 | **P0-23** — decommission `calculate-financials` | `a5c89f1b` + `f4bd050f` | Redeployed as inert 410-Gone stub, `verify_jwt: true` (closed the unauthenticated gap immediately). No delete-edge-function API exists via the MCP deploy tool — full object deletion needs one manual Supabase Dashboard step. Registered in `.deploy-ignore` after CI's `verify-deploy-coverage` guard correctly caught the initial omission. |
| 3 | **Stale `sub_1TotZjLKMhSmZURCEpzsCh7M` row** | — | No Stripe API exists for webhook redelivery (confirmed via `stripe_api_search`); paying the invoice via API would be an actual financial transaction, which is out of scope regardless of approval. Stripe's own `next_payment_attempt` is already scheduled — the fix will self-verify when it fires. Recommended founder alternative: click "Resend" in the Stripe Dashboard for immediate proof. |
| 4 | **RVCE unit-safety branch merge** | `4a90a8a2` | Merged `fix/rvce-unit-safety-normalization` into main (4 commits behind), full suite 1222/1222 green, deployed with the P0-01/02 fix. |

**CI caught a real gap on first push** (`b35de416`): `verify-deploy-coverage` failed because `calculate-financials` was removed from the deploy list without being registered in `.deploy-ignore` — exactly the drift class that guard exists to prevent. Fixed in `f4bd050f`, verified locally (lint/typecheck/sentinel-scan/business-logic-hash/payback-integrity/format-check/full suite, all green) before re-pushing. Deploy fidelity confirmed via live health endpoint: `commit_sha: f4bd050f...` matches exactly.

**All changes now live in production**, verified by commit SHA, not assumed.

### NEW FINDING — P0-24: homepage's named-source attribution unverifiable at the data layer (Domain 2 re-audit)

Live homepage (`get_page_text` against `https://www.aiwmcquantis.com/`, 2026-07-25) claims: *"Quantis stress-tests your idea against 97,500 benchmark data points derived from SEC filings, World Bank enterprise surveys, and proprietary industry modeling"*, with source badges `SEC XBRL / WORLD BANK / JPMORGAN CHASE INSTITUTE / PROPRIETARY MODELING`. This traces cleanly to `canonical-facts.ts`'s `BENCHMARK_SOURCES_LIST`/`_DISPLAY` (no stray hardcoding — the canonical-module discipline is intact), and `src/lib/canonical-data-sources.ts` gives a specific, footnoted breakdown: SEC XBRL 500,000 records, World Bank 180,000, JPMorgan Chase Institute SME Cash Flow 10,000, ProjectionHub 50, Kaggle Coffee Shop 24 — feeding a derived "AIWMC Quantis Benchmark Library" of 97,500 rows (`license: 'Proprietary derived'`), i.e. the claim's own structure is "97,500 benchmarks *computed from* 690,074 raw source records," not "97,500 rows *are* SEC/World Bank data" — a defensible framing IF the derivation actually happened against real source data.

**It is not verifiable that it did.** Checked both ingestion paths:
- `ingest-benchmark-data/index.ts` and `ingest-benchmark-v2/index.ts` are both generic admin-only bulk-upsert pipes — they insert whatever `rows`/`benchmarks` array is POSTed to them. Neither fetches, parses, or computes anything from SEC/World Bank/JPMorgan data itself; the actual percentile-derivation, if it happened, occurred entirely outside this repo (no ingestion script, ETL job, or migration touches raw external data).
- Direct SQL confirms none of the 5 `benchmark_master_*` tables (core/geo/invoice/risk/unit_econ) has any provenance/source_id column — there is no schema mechanism to join a specific benchmark row back to a named source.
- `public.data_provenance` (the table `canonical-data-sources.ts` claims to mirror) holds exactly 6 rows, all inserted in one batch at `2026-07-21 18:26:23` — static reference metadata seeded once, not accumulated from real per-source ingestion events.

**Conclusion**: the specific institutional attribution on the live homepage (SEC XBRL, World Bank, JPMorgan Chase Institute) is internally consistent (correctly sourced from the canonical module) but **factually unsubstantiated at the data layer** — there is no evidence in the codebase or database proving the 97,500 benchmark values were actually statistically derived from those three named datasets, as opposed to being independently modeled/estimated and labeled with those sources afterward for credibility. This sits directly under the tagline "SOURCES CITED ON EVERY NUMBER," which raises the stakes: a fractional-CFO client (the Aug 15 ICP) who checks this claim against the actual data would find no traceable link.

**Not fixed yet — this is a founder-scoped decision, not a safe unilateral edit**, because the three real remediation paths have very different cost/honesty tradeoffs:
1. Soften the claim (e.g. "modeled using patterns informed by SEC filings, World Bank surveys, and proprietary industry data" — drops the implied 1:1 traceability) — cheap, immediate, but is a public-copy change.
2. Do the real per-row linkage (schema + re-ingestion tying each benchmark row to its actual source basis) — the "real" fix, but a significant lift, not a same-session task.
3. Leave as-is if the founder has independent evidence (outside this repo) that the derivation genuinely happened — possible; I have no way to see work done outside the codebase.

**Severity: High** (public trust/marketing-accuracy claim, directly adjacent to the platform's core "sources cited on every number" promise). **Blocked on founder decision** (§148).

**UPDATE — SHIPPED same session.** Founder approved softening the claim (option 1) while option 2 (real per-row lineage) remains open for later. Changed the verb "derived from" → "informed by" everywhere `BENCHMARK_SOURCES_DISPLAY` is consumed (`HeroVariants.tsx`, `Landing.tsx` FAQ, `ReportFirstHero.tsx`, `FAQSection.tsx`, `AppDashboard.tsx` meta description) — commit `97ca804b`. Also dropped `FAQSection.tsx`'s separate unverifiable claim "every value is labeled by source (sourced/derived/modeled)" (no such per-value labeling exists in the UI). While re-auditing Domain 2 Q16 (outcome-guarantee language), found a **second, worse instance of the same defect class**: `HowItWorks.tsx`'s FAQ hardcoded a *third*, different, stale institution list ("BLS, Census Bureau ACS, SBA Office of Advocacy, CoStar, and public filings") plus a false "No synthetic or made-up data" claim — bypassing the canonical-facts.ts rule the file otherwise follows for its other constants. Fixed to import and use `BENCHMARK_SOURCES_DISPLAY` — commit `6d43320c`. Both commits: full suite 1222/1222 green, `tsc --noEmit` clean, pushed with `git fetch` confirming up-to-date first. **Live-verified** via direct browser read of `https://www.aiwmcquantis.com/` post-deploy: hero now reads "...97,500 benchmark data points informed by SEC filings, World Bank enterprise surveys, and proprietary industry modeling...". Vercel auto-deploy confirmed propagated (~3 min).

### Domain 2 re-audit summary (this session, against live code + live browser evidence)

| Q | Prior status | Re-audit result |
|---|---|---|
| Q11 (category description) | UNVERIFIED | **RESOLVED/PASS** — live title tag + hero eyebrow consistently say "Audit-grade business validation" / "Deterministic Business Validation." |
| Q12/Q13 (5-second test) | UNVERIFIED | Still UNVERIFIED — genuinely requires real user testing, not derivable from code. |
| Q14 (pain-first vs. feature-first hero) | WARN | **RESOLVED/PASS** — live headline is "Before you invest $50K, spend 90 seconds finding out if you'll get it back," a cost/risk-first framing, not feature-count language. |
| Q15/Q17 (sourced claims) | FAIL | **PARTIALLY RESOLVED** — the specific unsubstantiated "derived from" claim is fixed (P0-24 above). A formal claim-registry (source + generation method + review date per public number) still does not exist — that infrastructure gap stays open. |
| Q16 (outcome-guarantee language) | UNVERIFIED | **RESOLVED/PASS** — full-text grep for guarantee/predict-success language found zero outcome guarantees; all "guarantee" hits are the 14-day money-back guarantee (billing) or explicit disclaimers ("Projections are estimates, not guarantees" — `HowItWorks.tsx`). |
| Q18 (assumptions inspectable) | UNVERIFIED | Still UNVERIFIED — not inspected this pass, deprioritized in favor of the two real defects found. |
| Q19 (examples reproduce from real runs) | UNVERIFIED | Still UNVERIFIED, P2, deprioritized. |
| Q20 (differentiation vs. Excel/ChatGPT) | UNVERIFIED | Still a founder-decision question; `Landing.tsx` FAQ does already answer "How is Quantis different from ChatGPT or a spreadsheet?" with a real comparison — partially addressed in copy, not formally re-graded. |

### Domain 3 re-audit (ICP & Workflow Fit, Q21-Q30) — this session

| Q | Prior status | Re-audit result |
|---|---|---|
| Q21 (which persona gets the most value) | UNVERIFIED | **CONFIRMED via fresh SQL** (see Q30 below) — still no evidence the fractional-CFO/consultant hypothesis audience is who actually shows up; every arm's-length signup either never runs the tool or runs it once. Founder-decision question, but the "not who you think" signal is now stronger, not weaker. |
| Q22-Q26, Q28 | UNVERIFIED | **Unchanged — correctly stays UNVERIFIED.** These are customer-research/founder-only questions (trigger, workflow being replaced, time saved, spend-today). No code or DB query can answer them; re-confirmed there's still no interview/session-replay data in any connected system. Not re-attempted, to avoid wasted effort manufacturing false certainty. |
| Q27 (which parts does Quantis actually automate) | WARN | **UPGRADED — real improvement found.** The diagnostic's own basis for WARN ("business archetype/model classification doesn't exist") is now false: `supabase/functions/_shared/business-archetypes.ts` + `detectArchetype()` is wired live into `analyze-business/index.ts` (`:2775`), drives a real `modelApplicabilityWarning` banner surfaced to the frontend on revenue-shape mismatches, and persists `detected_archetype` on every analysis row (`:3367`) — not decorative logging, load-bearing. Benchmark research is still static pre-loaded tables (unchanged, and now also flagged as P0-24's "informed by" caveat) rather than live per-business research — that half of the original WARN stands. |
| Q29 (reusable client-work artifact) | WARN | **CONFIRMED, unchanged.** `customBranding: true` for Plus/Pro, `whiteLabel: true` only Pro (`config/tiers.ts:92-93,129-130`) — real, but still no multi-client workspace/report-management structure. No new evidence either way this pass. |
| Q30 (subscription frequency fit) | FAIL (stale, 3-week-old sample) | **RE-CONFIRMED with current data, same conclusion, larger sample.** Fresh SQL (2026-07-25): 43 total users, 93 total analyses — but 40 of 43 users have **zero** analyses ever, and every one of the 93 rows belongs to just 3 accounts (founder + 2 founder-adjacent test-pattern emails). Of 24 paid subscriptions, 21 are synthetic `@quantis-e2e.test` trialing fixtures; the one genuine arm's-length paying customer (David, Plus, active since Jul 12) has run **0** analyses in two weeks. **There is currently zero evidence from any real, independent customer that usage is recurring** — the honest read is "insufficient data, and what little exists points toward one-and-done," which still directly questions the subscription model's fit per the framework's own Q99 alternative (credits/project pricing). |

**Net Domain 3 outcome:** 2 items upgraded/confirmed via real evidence (Q27 improved, Q30 reconfirmed on fresh data), 5 correctly remain founder/customer-research-only (no fabricated certainty added), Q29 unchanged. No code changes shipped from this domain — Q27's finding is informational (records real progress since the original diagnostic pass); Q30 is a pricing-model question for the founder, not something to unilaterally alter.

### Domain 4 re-audit (Input & Onboarding Architecture, Q31-Q40) — this session

Read the real form components directly: `FinancialField.tsx` (the shared input primitive), `FinancialsStep.tsx` (the 6-field structured intake step), `CompactAnalysisForm.tsx` (decision-framing line).

| Q | Prior status | Re-audit result |
|---|---|---|
| Q31 (minimum info for a useful analysis) | UNVERIFIED (partial) | **CONFIRMED** — the primary conversion path (`ReportFirstHero.tsx`) needs only a free-text idea ≥10 chars. The deeper structured path (`FinancialsStep.tsx`) has 4 "core" fields (starting capital, price, customers at launch, monthly costs) gating an `allFilled` checkmark, plus 2 optional fields (CAC, churn) for a stated "+40% confidence boost" — a real, honest, incentive-based (not forced) upsell to more precision. |
| Q32 (required fields with no material effect) | UNVERIFIED | Still UNVERIFIED — needs an actual field-by-field sensitivity run against the engine, not done this pass (P2, lower priority than the real defects found). |
| Q33 (missing/hidden/mis-inferred variables) | UNVERIFIED | Still UNVERIFIED — no evidence of a full field audit against the engine's actual variable list this pass. |
| Q34 (explicit units per field) | UNVERIFIED | **MOSTLY PASS, one real gap.** 5 of 6 fields are unambiguous ($ prefix + descriptive label, or % suffix). One genuine gap: "Price per Customer" carries the hint "Per transaction / month / unit" — three different possible units left to the user's judgment, with no forced disambiguation (no toggle/dropdown). Not a defect worth a unilateral fix (a real UX decision — forcing a unit selector changes form flow), flagging as a founder-scoped product call, not shipping a change. |
| Q35 (uncertainty affordance / ranges vs. false precision) | WARN | **UPGRADED to PASS.** Confirmed via direct code read: all 6 fields in `FinancialsStep.tsx` pass `benchmarkMin`/`benchmarkMax`, and `FinancialField.tsx` renders "Not sure? Leave it blank — we'll use [range] (typical for your industry)" whenever a field is empty and has a benchmark range — universal coverage, not partial. |
| Q36 (defaults visually distinguished from user-entered facts, in the OUTPUT) | UNVERIFIED | **CONFIRMED FAIL.** Grepped `analyze-business` for any field-level provenance flag (`was_defaulted`, `field_source`, etc.) — none exists. The form is honest about defaulting *before* submission (Q37 below), but once a benchmark default silently fills a blank field, nothing downstream (report, PDF, `ValidationSection.tsx`) marks that value as "engine-supplied" vs. "you told us this." Same root-cause family as P0-01/02 (silent benchmark substitution), scoped to blank-field defaults rather than out-of-range overwrites — a real, if lower-severity, sibling gap. |
| Q37 (are benchmark defaults explained BEFORE they affect calculations) | UNVERIFIED | **CONFIRMED PASS** — distinct from Q36. `FinancialField.tsx`'s "Not sure? Leave it blank" hint and the visible benchmark range bar both explain the default *before* the user submits, satisfying this question even though Q36 (post-hoc labeling) still fails. |
| Q38 (conflicting doc/form/benchmark values entering silently) | UNVERIFIED | Left UNVERIFIED — requires tracing Doc Studio ingestion against form/benchmark precedence rules, not done this pass to stay within scope/time budget rather than guess. |
| Q39 (jargon-free completion) | UNVERIFIED | **Leaning PASS, not formally graded** — field labels are plain English ("Starting Capital," "Price per Customer," "Monthly Op. Costs"); the one abbreviation ("Cust. Acquisition Cost") carries an explanatory hint ("Cost to acquire 1 customer"). Genuine comprehension needs real user testing, not code reading, so left UNVERIFIED rather than upgraded on inference alone. |
| Q40 (decision/capital-at-risk/success-condition intake) | FAIL | **CONFIRMED, unchanged.** `CompactAnalysisForm.tsx:242-249` — a framing line exists ("this is the real math behind the decision, not a preview") with an explicit comment admitting it's a deliberate, honest choice not to invent a structured field the team hasn't decided on. No structured intake field captures the decision/capital/success-condition. Correctly still FAIL — the gap is real, and the team's own comment shows it was a conscious scope decision, not an oversight. |

**Net Domain 4 outcome:** 1 upgrade to PASS on strong evidence (Q35), 1 new distinct PASS finding (Q37, previously conflated with Q36), 1 confirmed FAIL with root-cause link to P0-01/02 (Q36), 1 real but founder-scoped gap surfaced (Q34's ambiguous per-customer pricing unit). No code shipped this domain — every finding here is either already correct, or is a product/UX decision that shouldn't be made unilaterally.

### Founder decisions outstanding (§148)

All four resolved this session (see UPDATE above). Remaining open items are the earlier-listed P0-04 dead-twin cleanup (low priority, unreachable code), P0-09 (999 sentinel, large lift — 20+ call sites depend on the contract), P0-14 (QoC not load-bearing), and the stale subscription row (self-resolves on Stripe's next retry, or founder can force it via Dashboard "Resend").

### Rollback
- Finding 16-1 code: `git revert fd863042`. Migration is additive (widened CHECK) — safe to leave; reverting it requires no rows hold the new statuses.
- P0-11: `git revert 857e5777 f28ee008`.

### Next activation command
**`ACTIVATE: P0_STABILIZATION`**, scoped to P0-01/02 once decision #1 lands — it is the single most trust-destroying defect for the Aug 15 first-paid client (a fractional CFO seeing their own reported expenses silently inflated). P0-09 (`999`) is the next-largest lift and should follow, not precede, it.
