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

### NEW FINDING — P0-25: three tested reconciliation engines exist, none wired into the live production path (Domain 6, Q54)

Ran the reconciliation test suites directly rather than trusting prior "TEST_VERIFIED" status at face value: `financial-reconciliation.test.ts` + `reconciliation-engine.test.ts`, **23/23 green**. Real, correct logic — `reconciliation-engine.ts`'s `reconcileFinancialOutput()` genuinely mutates `PLStatement`s in-place to enforce `cogs + grossProfit === netRevenue` and itemized-OpEx-sum identities (confirmed by reading the source, not just the tests), and `src/financial/reconcile.ts`'s `reconcileMonthlyRow()` recomputes the full revenue→...→ending-cash waterfall.

**But grepping for real callers found none.** `reconcileFinancialOutput`, `reconcileMonthlyRow`, and `r3Validate`/`defaultFinancialReconciler` (`src/lib/r3-validator.ts`) are each referenced **only by their own test file** — zero imports from any live component, page, hook, or the Deno edge functions (which can't import from `src/` at all — dual-port pattern, same constraint that governs every other shared module in this codebase). This is the exact "tested-but-unreachable" class of defect P0-23 (`calculate-financials`) already surfaced once this session, now found a second time in a much more sensitive place: the modules that are supposed to answer Domain 6's central question ("do the financial identities actually reconcile in production") don't run in production at all.

What **does** run live: `analyze-business/financial-calculator.ts` has its own narrower, ad-hoc reconciliation — a real fix from a real 2026-07-12 production audit (`reconciledMarketing`, ~line 362-383) that holds COGS and fixed costs constant and reconciles marketing to make the expense breakdown sum exactly to a user-provided total, with the reasoning documented inline. This is genuine and load-bearing, but it covers **one identity** (expense-breakdown-sums-to-total), not the full set Q54 asks about — grepped the same live file for any cash-roll-forward check (`endingCash`, `cumulativeCash`, etc.) and found **none**. Cash[t] = Cash[t-1] + FCF[t] is not verified anywhere in the live path.

**Conclusion**: Q54 was marked "CODE_VERIFIED (partial)" on the assumption that `reconcile.ts`'s existence + a green test suite meant the identity is enforced in production. It is not — for the comprehensive identity set, only for the one narrow case a real bug forced a live fix for. This is well-engineered dead weight: three correct, tested, unreachable modules, doing the exact thing MP7 calls "≥11 competing truths."

**Not fixed this session** — wiring any of the three existing modules (or consolidating them into one) into the live Deno path is a real architectural decision (which module becomes canonical, how it interacts with the already-shipped P0-01/02 no-silent-overwrite rule, whether it needs a Deno port) — not a safe same-session patch. **Severity: Medium-High** (the specific identities it would catch — COGS/GP/Revenue drift, cash roll-forward errors — are exactly the kind of error a fractional-CFO client would notice immediately). **Flagged for founder scoping**, similar treatment to P0-14/P0-24.

### Domain 6 re-audit summary (Financial Engine & Numeric Integrity, Q51-Q60) — this session

| Q | Prior status | Re-audit result |
|---|---|---|
| Q51 (one canonical monthly engine) | PASS | **Reconfirmed**, unchanged. |
| Q52 (12-60mo aggregate from same series) | PASS (test-verified) | **Reconfirmed**, unchanged. |
| Q53 (decimal-safe arithmetic) | PASS | **Reconfirmed**, unchanged. |
| Q54 (Revenue/Net-Income and cash-roll identities reconcile every month) | UNVERIFIED (partial) | **DOWNGRADED to WARN — see P0-25 above.** Tests pass, but the tested modules aren't live; only a single narrow identity is actually enforced in production. |
| Q55 (AI cannot originate/repair canonical numbers) | PASS | **Reconfirmed**, unchanged — consistent with this session's own numeric-firewall work. |
| Q56 (fallback fabrication) | WARN | **Unchanged** — `ai-narrator`'s fallback still correctly tags `source: 'benchmark_placeholder'`; frontend surfacing not re-checked this pass. |
| Q57 (typed unavailable-results vs. 999/-1/NaN) | WARN | **Reconfirmed, unchanged** — directly consistent with this session's own P0-09 investigation (999 sentinel is detection-only, migrating 20+ call sites is deliberately not attempted; documented via migration `20260725070205`). |
| Q58 (payback from cumulative FCF) | PASS | **Reconfirmed**, unchanged. |
| Q59 (CAC payback from contribution margin) | PASS | **Reconfirmed**, unchanged. |
| Q60 (property/golden/differential/mutation test coverage) | PASS | **Reconfirmed the tests exist and are green (23/23 on the reconciliation suites alone, 1222/1222 full suite this session) — but per P0-25, green tests on unreachable code shouldn't be read as evidence the *behavior* is covered in production.** Nuance added, status unchanged since the question is narrowly about test existence, not live wiring (that's Q54's job). |

**Net Domain 6 outcome:** 1 real downgrade with a significant new finding (Q54/P0-25), 8 items reconfirmed unchanged on direct re-verification (not just carried forward), 1 nuance added to Q60. No code changes shipped — P0-25 is a real architectural gap requiring a founder-scoped decision on which reconciliation module (if any) becomes canonical, not a same-session fix.

### Domain 7 (Data, Benchmarks & Evidence Lineage, Q61-Q70) — this session: hard quantitative proof, not inference

An untracked `benchmark_csv_import/` directory sits in the working tree (5 CSVs, 19,500 data rows each, matching the 5 live `benchmark_master_*` tables exactly row-for-row) — this is the real seed data the diagnostic asked to be located. Analyzed it directly rather than continuing to reason from schema/labels alone.

**Q61/Q62/Q63 — resolved with proof, not inference.** `benchmark_master_core.csv`'s 8 dimension columns (`sector_level1/2`, `business_model`, `geo_region`, `country`, `city_tier`, `company_stage`, `size_bucket`) produce **exactly 19,500 unique combinations with zero duplicates** — `sector_level2` (52) × `company_stage` (5) × `size_bucket` (5) × `city_tier` (3) × `business_model` (5) = 19,500 precisely, with `geo_region`/`country` distributed unevenly across that fixed grid rather than independently crossed. This is not "strongly suggests a generated dataset" (the diagnostic's original hedge) — **it is a mathematically exact, fully-enumerated combinatorial grid**, proving each row is a synthesized dimension-combination cell, not an independently sourced or measured real-world observation.

Went further and checked the metric values themselves for a fixed sector/model/geo/tier slice across the 5 `company_stage` × 5 `size_bucket` combinations (25 rows): `gm_margin_p50` and `ebitda_margin_p50` increase in **exact, perfectly smooth fixed increments** per stage/size step (e.g. `idea`→`early_0_1y`→`scaling_1_3y`→`mature_3y_plus` each adds the same ~0.02-0.03 regardless of which size bucket), and `rent_pct_rev_p50` is **bit-for-bit identical (0.074) across all 25 rows** — a real-world rent-to-revenue ratio would never be constant across five different company stages and five different revenue sizes for the same sector. This is direct, decisive evidence the metric values are **rule/formula-generated** (a base value plus fixed per-dimension-level offsets), not statistically computed from real observations, licensed data, or survey responses.

**This upgrades P0-24's severity assessment** (previously: "unverifiable whether the claim is true") **to a confirmed finding: the 97,500-row benchmark corpus is demonstrably a synthetic, rule-based grid, not 97,500 real sourced data points**, consistent with `data_provenance`'s own "Proprietary derived" label (found during P0-24) but now backed by direct arithmetic proof rather than a self-reported tag. This does not necessarily make the benchmarks *useless* — well-constructed synthetic benchmarks calibrated by domain experts can be genuinely useful — but it does mean the "97,500 benchmark data points" framing (even the now-softened "informed by SEC filings, World Bank..." language from P0-24) should not be read by a user as "97,500 individually observed real businesses." **No further copy change made this pass** — P0-24's softening already shipped this session; this finding sharpens the evidence behind that decision rather than demanding a new one, and a further rewrite (e.g., explicitly stating "modeled, not observed, benchmarks") is a founder-scoped positioning call.

**Q64 — confirmed FAIL.** The raw CSV/DB schema has zero `source`, `quality_grade`, or `period` columns — only the 8 dimension columns plus the raw metric values themselves. No per-row metadata of any kind exists to answer "where did this specific percentile come from."

**Q65 — de-prioritized given the above.** The p25/p50/p75 percentile columns are used consistently (no evidence of a mean mislabeled as a median, etc.), but since the entire distribution is formula-generated rather than computed from a real underlying sample, the "are percentile types mixed correctly" question is secondary to the more fundamental Q61-63 finding. Left UNVERIFIED as a formality — the real answer is "not applicable in the way the question assumes."

**Q66/Q67 — reconfirmed live with fresh evidence.** `analysis_snapshots` now holds 18 rows, most recent 2026-07-23, spread across 07-19 (initial fix) through 07-23 — confirms the write path found and fixed in a prior session is genuinely live and accumulating, not just a one-time backfill. Status unchanged (WARN: works going forward, no historical backfill for pre-07-19 analyses) but now backed by a fresh row-count check rather than an assumption the fix "should" still be working.

**Q68/Q70 — left UNVERIFIED, correctly.** No new evidence gathered this pass; both are lower-priority (P2) and not worth manufacturing false certainty on.

**Q69 — unchanged**, no new evidence this pass.

**Net Domain 7 outcome:** the domain's central, previously-UNVERIFIED-for-weeks question (Q61-63: what is a benchmark, and is it real) is now answered with hard, reproducible, arithmetic proof rather than a plausibility argument — the strongest evidence produced in this entire audit series. No code shipped; this is a data-provenance/positioning finding that reinforces P0-24, for founder awareness rather than an engineering fix.

### NEW FINDING — P0-26: "Adjust Your Levers" what-if widget recalculates with an arbitrary linear heuristic, not the canonical engine (Domain 8, Q77)

Found `InlineAssumptionEditor.tsx` (CAC / ticket-size / rent sliders) genuinely wired into the live report (`AccuracyTransparentResults.tsx:772-777`) — real interactivity answering Q77's "can a user change one assumption and see the effect without rebuilding the whole analysis," which the diagnostic had marked UNVERIFIED/P0. But the recalculation itself (`scenarioMetrics`, `:186-198`) is explicitly commented **"Apply local overrides linearly for demo purposes"** and uses ad-hoc, seemingly-arbitrary arithmetic with no connection to the canonical `calculateStrictFinancials` engine:
- CAC override: `baseProfit -= (overrides.cac - originalCac) × (totalMonthlyExpenses / 100)` — an arbitrary linear scaling, not the real CAC-payback/LTV formula.
- Rent override: `baseProfit -= (overrides.rent - fixedCosts × 0.3)` — bakes in an unexplained "30% of fixed costs" assumption with no visible basis.
- Ticket-size override: `baseRevenue *= ratio; baseProfit += baseRevenue × 0.5` — applies a flat, universal 50% margin regardless of the business's actual margin structure.

The UI (`"Adjust levers above to see projected changes"`) carries **no disclaimer that this is an approximation**, not a real re-run of the deterministic engine. A user drags the rent slider and sees "Mo.12 Profit: $Xk" presented with the same visual authority as the canonical report figures — but for the same overridden inputs, the real engine (with its actual CVP/margin/DCF formulas) would very plausibly produce a materially different number. This directly threatens Q73/Q74 (locked-payload / no-contradictory-values guarantees) the moment a user interacts with this widget, even though the *static* report those questions were originally verified against is sound.

**Severity: Medium** (not a silent data-integrity violation on the primary report — it's an opt-in interactive preview, correctly out of the PDF/export path per this file's structure — but it's a real instance of "polished, confident-looking numbers that aren't the real engine," the exact pattern flagged elsewhere this session, e.g. Q48/Domain 5). **Not fixed this session** — the right fix (wire this widget to actually re-run `calculateStrictFinancials` client-side, or clearly label it "rough estimate, not a full recalculation") is a real product/engineering decision, not a safe same-session patch. Flagged for founder scoping alongside P0-14/P0-24/P0-25.

### Domain 8 re-audit summary (Report, Verdict & User Value, Q71-Q80) — this session

| Q | Prior status | Re-audit result |
|---|---|---|
| Q71 (report answers the decision on first screen) | UNVERIFIED | **CONFIRMED PASS** — the live homepage's sample-report preview (captured via direct browser read this session for P0-24) shows Initial Investment, Payback Period, Monthly Profit Y2, and Confidence score immediately, front and center — exactly the "will I get my money back" decision, not buried. |
| Q72 (risk/bottleneck/assumption clearly identified) | WARN | **Unchanged** — the previously-restored "Ways to Improve Accuracy" section (confirmed still present in `ValidationSection.tsx` per this session's Domain 4/P0-01 work) covers this; not re-verified further this pass. |
| Q73 (one locked payload feeds every surface) | PASS | **Reaffirmed for the static report — new caveat found for the interactive layer, see P0-26.** |
| Q74 (can two sections show different values) | WARN | **Reinforced with new evidence** — P0-26 is a second, concrete instance beyond the already-known Q57 dual-payback-contract issue. |
| Q75 (narrative numbers linked to canonical metric ID) | UNVERIFIED | Left UNVERIFIED — no new evidence gathered this pass, correctly not guessed at. |
| Q76 (can user distinguish value provenance types) | UNVERIFIED | **CONFIRMED FAIL by cross-reference** — same root cause as Domain 4's Q36 (no field-level provenance tag anywhere downstream) and Domain 7's findings (benchmark values are a synthetic grid with no per-row source metadata). No mechanism anywhere in the pipeline tags a displayed number as user-entered vs. benchmark-derived vs. modeled. |
| Q77 (change one assumption, see effect without rebuilding) | UNVERIFIED | **CONFIRMED the capability exists and is live — see P0-26 for the fidelity caveat.** Real progress (a working interactive widget didn't exist before), but not a clean PASS given the arbitrary-heuristic finding. |
| Q78 (clear next experiment/decision) | UNVERIFIED | **Leaning PASS** — the lever editor's explicit purpose is proposing "what if you changed X" experiments; tempered by P0-26 since the experiment's output isn't fully trustworthy math yet. |
| Q79 (consultant brand/export/reuse) | WARN | **Unchanged**, consistent with Domain 3's Q29 finding (customBranding real, no client-workspace structure). |
| Q80 (obvious reason to return for a 2nd analysis) | FAIL | **Reconfirmed via Domain 3's fresh usage-frequency data this session** (40/43 users, zero analyses). |

**Net Domain 8 outcome:** 1 real new finding (P0-26) with direct evidence from reading the actual recalculation code, not just confirming the widget exists; 2 items upgraded from UNVERIFIED to confirmed (Q71 PASS, Q76 FAIL) using evidence already gathered honestly rather than re-deriving; 3 reconfirmed via cross-reference to other domains' fresh evidence rather than re-investigated from scratch, in the interest of efficiency. No code shipped — P0-26 needs a founder-scoped product decision (real recalculation vs. clear "rough estimate" labeling), not a unilateral fix.

### Domain 9 re-audit (Analytics, Activation & Engagement, Q81-Q90) — this session

| Q | Prior status | Re-audit result |
|---|---|---|
| Q81 (funnel events tied to person/session/analysis/source) | WARN | **Unchanged** — no new evidence gathered on build-SHA/environment capture; not worth re-deriving without a code change to verify against. |
| Q82 (founder/QA/E2E/bot exclusion from commercial metrics) | WARN | **UPGRADED to PASS.** `supabase/migrations/20260721051509_commercial_clean_views.sql` confirms `external_commercial_users`/`commercial_subscriptions` views were built exactly as the diagnostic's own fix recommended — matches this project's completed task list. The `clean_users` view this was meant to replace is superseded. |
| Q83 (funnel events fire under intended conditions; `paid_checkout_start` orphaned) | BLOCK | **UPGRADED to PASS.** `trackCheckoutStart` now has a real call site at `useSubscription.ts:289`, with the code's own comment documenting this exact fix ("Domain 9/16 audit: paid_checkout_start had zero call sites..."). The orphaned-tracker defect this question was blocked on is resolved. |
| Q84 (retries/duplication overcounting) | WARN | **Partial mitigation found, not fully resolved.** `AppDashboard.tsx:261-262` fires `paid_checkout_complete` on a URL success param then immediately clears it (`setSearchParams({})`) — a real anti-duplication measure, but URL-param-clearing races are a known source of double-fires under fast re-renders/StrictMode; not conclusively verified either way this pass. Left WARN rather than upgrading on partial evidence. |
| Q85 (`analysis_completed` requires valid non-degraded output) | UNVERIFIED | **Unchanged** — no new evidence gathered on the degraded-output check itself this pass. |
| Q86 (activation = value consumption, not just signup) | FAIL | **Real incremental progress, status unchanged.** `analytics.ts:212-217` shows two new staged events (`scenario_compared`, `assumption_changed`) were added specifically to close "the gap between `verdict_viewed` and `paid_checkout_start` had no staged events at all" — and are genuinely fired live (confirmed in Domain 8's P0-26 investigation, `AccuracyTransparentResults.tsx`). But grepped `admin/Funnel.tsx` for any use of these two event names — **zero matches**: the events fire and are stored, but nothing aggregates or reports on them yet. Still FAIL for "is activation instrumented as a ladder," but the raw material to build one now exists where it didn't before. |
| Q87 (event/session/analysis/user-level conversion distinguishable) | FAIL | **Unchanged** — the two new events don't by themselves compute conversion rates at any granularity; that requires the reporting layer Q86 found still missing. |
| Q88 (% of clean users reaching each activation level) | UNVERIFIED | **Unchanged, correctly** — still blocked on Q86's ladder having no reporting layer. Not answerable yet, and not worth guessing. |
| Q89 (1/7/30-day return rate) | FAIL | **Reconfirmed with a materially stronger sample this session** — Domain 3's fresh SQL (this session) found 40 of 43 total users have run zero analyses ever, a larger and more current dataset than the "directional, small sample" caveat the diagnostic originally carried. The FAIL conclusion holds, now on firmer footing. |
| Q90 (behavior predicting checkout/repeat use) | UNVERIFIED | **Unchanged, correctly** — sample size still too small for any statistically meaningful signal; not fabricated. |

**Net Domain 9 outcome:** 2 real upgrades to PASS on direct evidence (Q82, Q83 — both confirm fixes already shipped in a prior session actually landed correctly), 1 partial-mitigation finding (Q84), 1 nuanced non-upgrade with real incremental progress documented (Q86, new events exist but unreported), 1 reconfirmation on a stronger sample (Q89), 4 correctly left unchanged rather than guessed at (Q81, Q85, Q87, Q88, Q90). No code changes shipped — every finding here is either already fixed (confirmed, not re-fixed) or requires a reporting-layer build that's a scoped follow-up task, not a same-session patch.

### Founder decisions outstanding (§148)

All four resolved this session (see UPDATE above). Remaining open items are the earlier-listed P0-04 dead-twin cleanup (low priority, unreachable code), P0-09 (999 sentinel, large lift — 20+ call sites depend on the contract), P0-14 (QoC not load-bearing), and the stale subscription row (self-resolves on Stripe's next retry, or founder can force it via Dashboard "Resend").

### Rollback
- Finding 16-1 code: `git revert fd863042`. Migration is additive (widened CHECK) — safe to leave; reverting it requires no rows hold the new statuses.
- P0-11: `git revert 857e5777 f28ee008`.

### Next activation command
**`ACTIVATE: P0_STABILIZATION`**, scoped to P0-01/02 once decision #1 lands — it is the single most trust-destroying defect for the Aug 15 first-paid client (a fractional CFO seeing their own reported expenses silently inflated). P0-09 (`999`) is the next-largest lift and should follow, not precede, it.
