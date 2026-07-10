# MP-ACCURACY-AUDIT-AND-TODO — Engine Accuracy, Example Integrity, and Tomorrow's Punch List

**Document:** ACCURACY-AUDIT v1.0 · July 10, 2026 · AIWMC LLC
**Type:** Mixed — Section 1-3 are [PLAN] (verified findings, no code shipped beyond one isolated fix). Section 4 is the prioritized [BUILD] to-do list for tomorrow, gate-labeled per standing MP0-MP5 discipline.
**Trigger:** An external CTO-style audit was pasted in chat tonight making several specific, checkable claims about live product accuracy and consistency. Per this account's evidence-hierarchy rule, none of that audit's claims were accepted at face value — every checkable one was independently verified against the live repo before being included here.
**Repo copy note (2026-07-10, later same day):** this file previously lived only on the local desktop outside the git repo. It is now checked into `docs/` so it travels with the code the scripts reference it from (see `scripts/verify-payback-integrity.mjs` comments). §6 below is the status addendum requested when the user asked to "apply that to yesterday todolist."

---

## 0. What actually happened tonight — the honest version

The external audit made ~6 concrete, checkable claims. Here's what's real, what's stale, and what's unverifiable from where I sit:

| Audit claim | Verdict | Evidence |
|---|---|---|
| Payback-period math bug in a public example | **CONFIRMED, fixed tonight** | `mobile-app-startup-san-francisco` displayed 11.8mo, matched `$180,000 ÷ $15,200 revenue` exactly, not `÷ $4,600 profit` (39.1mo). Root cause: someone computed the example's payback from revenue instead of profit when hand-authoring this static example. Fixed to `39.1 months` — typecheck/tests/build all green, not yet pushed (see §4). |
| "This is a live engine calculation bug" | **FALSE — the live engine is actually already correct** | `supabase/functions/analyze-business/index.ts:1366-1399` implements a ramp-aware cumulative cash-flow payback simulation (6-month revenue ramp 30%→100%, then 5%/mo growth), with a code comment saying it explicitly "fixes the '1 month payback' template artifact." **The real bug is that static example content wasn't regenerated from the engine after this fix landed** — confirmed by manually simulating `coffee-shop-denver`'s numbers through the real ramp formula: the engine would produce a payback well past the displayed 7.1 months. Two more examples (`coffee-shop-denver`, `consulting-firm-new-york`) don't reconcile against any simple formula — consistent with hand-typed, never-engine-generated content. |
| 95,500-benchmark claim doesn't match DB reality | **CONFIRMED — already flagged internally, unresolved** | `src/config/canonical-facts.ts`'s own comment block (dated 2026-06-20) says the master benchmark tables actually contain 97,500 rows (or 19,511 in one specific table), and calls this an "open audit item" that was never resolved. This is not new information — it's a known gap that's been sitting for ~3 weeks. |
| "90% of businesses fail in 5 years" is an exaggerated/wrong stat | **CONFIRMED, live, contradictory across the codebase** | `MobileHero.tsx:133` (rendered on the actual live homepage) still says "90% of businesses fail in 5 years." `HeroVariants.tsx`'s own code comment says this exact headline was supposed to be *replaced* already. `BlogArticle.tsx:190` repeats the same claim in body copy. Real US Census BDS data: ~48% 5-year failure, not 90%. |
| Legal entity name inconsistency (AIWMC LLC vs "AIWMC AI Agency LLC") on different domain surfaces | **UNVERIFIED, likely stale** | Zero hits for "AIWMC AI Agency LLC" anywhere in the current codebase. This may reflect an old cached crawl of the apex domain from before this session's earlier work confirmed apex→www redirect is in place (per memory: "Apex 308s to www"). Not re-verified live tonight — flagged as low-confidence, not acted on. |
| Privacy/Terms routes render homepage shell instead of their own content | **NOT re-verified tonight** | This exact class of bug (prerender body serving homepage boilerplate) was the subject of extensive verification earlier this session — 7 routes were curl-checked and passed. Privacy/Terms specifically weren't in tonight's sample. Flagging as a gap in tonight's coverage, not a confirmed bug. |

**What this means:** the external audit was *right on the two most damaging claims* (payback math, exaggerated failure stat) and *wrong or unverifiable on the rest*. Treat it as a lead generator, not a source of truth — exactly the same rule this account already applies to every other external document.

---

## 1. Explaining "95,500" and how ingestion actually works — verified from the live pipeline, not assumed

You asked for a full breakdown of the ingestion process. Here's what's actually true, traced through the real code tonight, not inferred from marketing copy:

### 1.1 What "95,500" is claimed to be vs. what's actually stored
- **Public claim** (`canonical-facts.ts:24`): `BENCHMARK_COUNT = 95_500`, described as "Benchmark corpus size — number of rows across the master benchmark tables."
- **Actual DB reality per the same file's own comment**: the master benchmark tables contain either 97,500 rows (5 × 19,500) or 19,511 rows in `benchmarks_v2_core` alone, "depending on which table is canonical." Nobody has resolved which table IS canonical.
- **This is a genuine open decision, not a code bug**: either (a) raise the public claim to match the real corpus size, or (b) formally designate which table is the canonical source and correct the public number to match it. This document does not decide it — that's a data-governance call only you can make, but it needs to be made this week, not left open another month, because every consultant-facing page (including `/consultants`, shipped tonight) repeats this number as a trust signal.

### 1.2 How ingestion actually operates today
Based on tonight's grep of `supabase/functions/analyze-business/benchmark-engine-v2.ts` and `benchmark-records.ts`: the engine reads pre-loaded benchmark rows (CAC/LTV/churn/margin percentile bands — `cac_p25/p50/p75`, `ltv_p25/p50/p75`, `ltv_cac_ratio_*`, `cac_payback_*`, `churn_monthly_*`, `retention_12m`, `arpu_median`) keyed by sector/sub-sector, and blends them with user inputs and city-cost multipliers. This is a **static corpus lookup**, not a live-scraping ingestion pipeline — there is no evidence in the code checked tonight of a continuously-refreshing ingestion job. If a "how does ingestion operate" claim implies continuous refresh, that needs to be verified separately (check for a cron job or scheduled Supabase function that re-populates these tables) — not asserted here without evidence.

### 1.3 What RVCE (Layer 8) actually does versus the static corpus
RVCE is a *separate* mechanism from the benchmark corpus — it's a live web cross-check (Tavily HTTP transport, confirmed working per the handover's June 21 test) that validates the *engine's output* against current market data, not a substitute for or expansion of the 95,500 corpus. Conflating "RVCE validates live" with "the benchmark corpus updates live" is exactly the kind of blur that erodes the auditability positioning — they're two different things and public copy should never merge them.

---

## 2. Multi-horizon accuracy — what you asked for vs. what exists

You asked for 12/24/36/48/60-month analysis with correct formulas at every horizon. Verified against `src/config/tiers.ts` tonight:

| Tier | `projectionMonths` | Horizons available today |
|---|---|---|
| Free | `0` | **None** — Free tier has no multi-month projection at all |
| Plus | `36` | 36-month only |
| Pro | `60` | 60-month only |

**12, 24, and 48-month horizons do not exist anywhere in the product.** If the strategic goal is "predict 12/24/36/48/60 months with correct formulas," three of the five requested horizons are simply not built, regardless of formula correctness. This is the single largest gap between what you asked for tonight and what's live.

**Formula correctness at the horizons that DO exist:** the ramp-aware payback simulation (§0) already extends its internal loop to 60 months (`for (let m = 1; m <= 60; m++)`), so the *underlying simulation* already supports up to 60 months of monthly granularity — it's not that the engine can't compute further out, it's that the **tier-level `projectionMonths` gate only exposes 36 and 60 as full horizons**, and nothing exposes 12, 24, or 48 as a selectable, reportable horizon in its own right.

---

## 3. Contradictions found tonight, ranked by damage

1. **P0 — Exaggerated failure-rate stat, live and contradictory with itself.** `MobileHero.tsx` shows "90%," a sibling component's own comment says this was supposed to be retired, and the true stat is ~48%. This is on the actual rendered homepage right now.
2. **P0 — Example content not regenerated from the engine.** At least 3 of ~51 examples don't reconcile against the real (correct) engine formula. If a prospective consultant runs the math on a featured example — exactly the audience most likely to do so — the site's own "auditability" claim breaks on contact.
3. **P1 — 95,500 benchmark count vs. real DB row count, unresolved for 3+ weeks.** Not urgent-urgent, but it's a load-bearing number repeated on every trust-facing surface, including tonight's new `/consultants` page.
4. **P1 — Only 2 of 5 requested projection horizons exist.** Not a bug — a real product gap between ambition and build state.
5. **P3 — Legal entity name / Privacy-Terms-rendering claims, unverified.** Don't spend time on these until re-checked live; may be stale artifacts of an old crawl.

---

## 4. TOMORROW'S TO-DO LIST — gate-labeled, priority-ordered

### [BUILD] — safe to ship immediately, no gate dependency
1. **Push tonight's `mobile-app-startup-san-francisco` fix** (already typechecked/tested/built green, sitting uncommitted). Single-line data correction, zero regression risk. — ✅ **DONE** (commit `29ab0632`, verified live).
2. **Audit all ~51 examples against the real ramp-aware engine formula.** Not a one-line fix — needs either (a) a script that re-runs each example's stored inputs through the actual `analyze-business` function and diffs the output against the displayed static content, or (b) manual re-verification of each example's payback/ROI/profit figures. Given tonight found 3 discrepancies out of a partial scan, budget for finding more. — ⚠️ **PARTIALLY DONE.** `scripts/verify-payback-integrity.mjs` now runs the divisor-signature check permanently on every build/pre-commit (0 confirmed bugs across 51 examples as of tonight). It explicitly cannot replicate the full ramp simulation from static fields, so option (a) — actually re-running the real engine per example — remains open. 2 examples (`coffee-shop-denver`, `consulting-firm-new-york`) still flagged WARN, unresolved.
3. **Retire the "90% fail in 5 years" claim from `MobileHero.tsx` and `BlogArticle.tsx`.** `HeroVariants.tsx`'s own comment shows the intended direction already existed — finish that migration. Suggested replacement, pending your sign-off on exact wording (this is a positioning decision, not purely a code fix): something anchored to the real ~48% five-year figure, framed as "roughly half of new businesses don't reach year five — Quantis tests which side of that your model falls on." — ✅ **DONE** (commit `29ab0632`): fixed in `MobileHero.tsx`, `BlogArticle.tsx` (both instances), plus 8 more files found during the full sweep (`autoposterContentPlan.ts`, `WizardForm.tsx`, `QuantisHeroDemo.tsx`, `AccuracyTransparentResults.tsx`, `CaseGridDisplay.tsx`, `analysis-case-grid.ts`, `canonical-data-sources.ts`, `usePdfExport.ts`, `CaseBrowser.tsx`) — the "95,500 datapoints"/"90%" sprawl was wider than this document originally scoped.

### [PLAN] — decision needed from you before anything ships
4. **Resolve the 95,500-vs-DB-row-count discrepancy.** Either designate the canonical table and correct the public number, or formally decide 95,500 is the right claim and document why. This has been open for 3+ weeks — it needs a decision this week, not more analysis. — 🔲 **STILL OPEN.** Not resolvable from this environment (no DB/service-role credentials available). `src/lib/canonical-data-sources.ts` separately claims "690,074 underlying records" behind the 95,500 aggregate — an unverified lead, not a confirmed answer. Needs either credentials in-session or you running the SQL query documented in `docs/FINANCIAL_MODEL_SPECIFICATION.md` yourself.
5. **Decide whether 12/24/48-month horizons are worth building**, given the engine's simulation loop already runs to 60 months internally — the gap is tier-gating, not raw computation capability. If yes, this is a real [BUILD] item for Month 2-3 per the existing roadmap (retention-triad window), not urgent tonight. — 🔲 **STILL OPEN**, no decision made, correctly not started (MP3/pre-MP4 stabilization work took priority per freeze).

### [MP4-gated, do not start] — flagging so it doesn't quietly creep in
6. Any "improve the deterministic engine's underlying accuracy/calibration" work (new benchmark sourcing, model backtesting, calibration curves) is MP4 territory per the standing rule: **hard-gated on first paying user.** Zero MRR right now means this section stays a queued artifact, not a sprint item, no matter how directly it relates to tonight's "accuracy problem" framing. The engine's *existing* formula (ramp-aware payback) is already sound — tonight's findings are about **stale content and unresolved documentation drift**, not a broken calculation engine. Don't let "we have accuracy problems" become license to start MP4 work early; the actual accuracy problems found tonight are fixable without touching the engine at all. — ✅ **Held correctly.** Not started. Still 0 MRR, 0 paying users as of this addendum.

---

## 5. The one-sentence verdict

The engine's core formula is already better than the external audit assumed — the real problem is that trust-facing content (examples, headline stats, an internal-audit-flagged number) drifted away from what the engine actually produces, and nobody closed the loop. Fix the content, resolve the two open documentation decisions, and the "accuracy problem" driving 0 MRR is substantially a **presentation-integrity problem**, not a math problem — which is good news, because it's fixable this week without touching MP4-gated engine work.

---

## 6. STATUS ADDENDUM — same day, later session (2026-07-10)

A near-identical external "CTO decision" document was pasted twice more after this audit was written, disputing several of the fixes above. Every checkable claim in it was independently re-verified against live production (cache-busted requests, raw header inspection, bundle-SHA checks) rather than accepted at face value — this is the standing rule for every external document in this project, applied consistently. Result: most of that document's P0 claims (apex/www pricing divergence, Privacy/Terms/Methodology falling back to the homepage shell, "the payback bug is still live") did **not** hold up under re-verification — they described states that were already fixed or were never true. One genuinely new bug **was** found as a byproduct of the re-verification (see below) and fixed.

### 6.1 What shipped since §4 was written (this session, same day)
- **Payback-integrity gate made permanent.** `scripts/verify-payback-integrity.mjs` (new) is now wired into `build`, `pre-commit`, and `build:prod` in `package.json`. It hard-fails only on the exact proven bug signature (displayed payback reconciling against revenue instead of profit); ambiguous cases are a non-fatal WARN. Currently: 51 examples scanned, 0 confirmed bugs, 2 WARN (`coffee-shop-denver`, `consulting-firm-new-york`, unchanged from earlier tonight — still needs the real engine re-run, item 4.2 above).
- **New accessibility bug found and fixed, not previously known:** `index.html`'s shared pre-hydration LCP placeholder (used to build all 88 public routes) was a real `<h1>` containing the homepage's headline, visually hidden via `clip:rect(0,0,0,0)` but still exposed to the accessibility tree — meaning a screen reader on `/pricing`, `/privacy`, etc. would announce the *homepage's* H1 as that page's heading. Fixed: converted to a non-semantic `<div aria-hidden="true">` with generic loading text. This is new information, not something either audit document flagged.
- **Consultant-cost anchor reverted per your explicit call:** `$1,500-$25,000` / `$350/hr` restored in `canonical-facts.ts` after you confirmed via AskUserQuestion that an earlier session's "fix" had moved it the wrong direction.
- **`/consultants` landing page shipped** (MP3-CONSULTANT-BUILD Phase 1 only, per your explicit choice) — uses only canonical-facts-sourced numbers, zero hardcoded prices/quotas.
- **`docs/STABILIZATION_FREEZE.md` and `docs/FINANCIAL_MODEL_SPECIFICATION.md` created** — the freeze declaration and the formula-by-formula ✅ LIVE / 🔲 PROPOSED breakdown that §8 of the latter directly led to this payback-integrity script.
- **This file itself checked into `docs/`** so the script comments that reference it resolve to a real path in the repo, not just a local desktop file.

### 6.2 What is still genuinely open (unchanged from §4, confirmed still true)
- 95,500-vs-DB-row-count reconciliation — blocked on credentials, not on effort.
- The 2 WARN examples — need the real engine re-run per example, not just divisor math, to resolve.
- 12/24/48-month horizon decision — no decision made, correctly not started.
- MP4 engine program (source registry, calibration, correlation-aware Monte Carlo, formula lineage, actual-outcome ingestion) — correctly held at the gate, 0 MRR, 0 paying users.

### 6.3 Net effect
Every concrete, checkable claim raised across both audit documents pasted tonight has now been either fixed, disproven with live evidence, or explicitly logged here as still-open with a stated blocker. Nothing was left silently unaddressed.

---
*END — ACCURACY-AUDIT v1.0 (+ 2026-07-10 status addendum) · AIWMC LLC · Confidential*
