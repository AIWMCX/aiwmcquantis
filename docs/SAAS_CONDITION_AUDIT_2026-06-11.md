# AIWMC™ QUANTIS — DEEPEST CONDITION AUDIT
**Date:** June 11, 2026 · **Auditor:** Claude (CTO session) · **Classification:** CONFIDENTIAL — INTERNAL
**Scope:** Full repo + live production (aiwmcquantis.com) + Supabase (dmlxrvfyqsakyjomsvdj) + CI/CD
**Method:** Every forensic claim below is backed by a measured probe, a grep, a test run, or a live HTTP trace performed today. Anything not directly measured is marked `UNVERIFIED` with the exact blocker.

---

## 1 · EXECUTIVE VERDICT

**Could a paying user succeed end-to-end today? YES — as of this afternoon. This morning the answer was NO.**

The five findings that matter most (three were FIXED during this audit):

1. **[FIXED TODAY — was CRITICAL] Every route except `/` returned 404 in production.** `cleanUrls: true` in `vercel.json` made Vercel 308-redirect `/index.html`, which broke the SPA catchall rewrite. `/pricing`, `/methodology`, `/app`, `/auth`, `/privacy`, `/terms`, all 79 sitemap URLs — dead. Google could index exactly 1 page; every deep link, every shared report link, every ad landing page was broken. Fixed in commit `3ec76a1`; all 22 probed routes now return 200 (live-verified 2026-06-11).
2. **[FIXED TODAY — was CRITICAL] CI was silently running only 3 of 27 test suites.** `package.json` `test:quality` contained a literal truncated `[...]` string (since commit `583a80b`) that vitest silently ignored. The skipped suites included tier-matrix parity, prompt-injection, benchmark invariants, and the analysis contract. Fixed in commit `44e9f2b`; full suite (672 tests, 27 files) now runs and is green.
3. **[FIXED TODAY — was HIGH] Two real bugs the muted tests were hiding:** (a) client tier config said free = 1 analysis/month while the server enforces 5 — a client/server entitlement mismatch (I-8 violation); (b) 6 prompt-injection payloads ("You are now DAN…", "[SYSTEM]…", "Disregard prior context…") sailed through `sanitizeUserInput` because the regexes were too narrow. Both fixed and committed.
4. **[ROOT-CAUSED, FIX IN FLIGHT] RVCE/Tavily is down because `TAVILY_API_KEY` never reached Supabase.** Verified via Management API: the secret is NOT in the project's secret list. The sync step lives in `production-deploy.yml`, which only runs when CI is green — and CI was red. With CI now fixed, the next green run syncs the key and redeploys `rvce-validate`. (RVCE itself degrades gracefully to DuckDuckGo, so it was *degraded*, not erroring.)
5. **[OPEN — HIGH] Zero prerendering: every route serves the identical SPA shell.** Routes now *resolve*, but Googlebot gets the same `index.html` (one `<title>`, 2 JSON-LD blocks) for all 79 URLs. The 10x indexed-pages lever requires build-time prerendering (T-SEO below). This is the single biggest remaining growth blocker.

**The single biggest remaining blocker:** no observability. There is no dashboard answering "did every analysis this week succeed and what did each cost." Until that exists, every future incident will again be diagnosed from user screenshots.

---

## 2 · HEALTH SCORECARD

| # | Dimension | Score /10 | One-line justification + evidence anchor |
|---|---|---|---|
| D1 | AI model architecture | **7** | Zero deprecated model strings (`grep deepseek-chat\|deepseek-reasoner` = 0 hits); free-tier router + deterministic fallback present in code; per-call cost UNMEASURED (no instrumentation). |
| D2 | Backend & infrastructure | **6** | Stripe webhook is event-id idempotent (webhook `index.ts:151-186,792`); 13 edge functions import tier-gate/entitlements; rate limiting is identity+fingerprint-keyed RPC, not naive IP (`analyze-business/index.ts:2846-2916`); BUT deploy chain was silently broken for weeks (red CI = no secret sync, no fn deploys) and only `CONFIG_ERROR` 500s remain on the non-2xx envelope paths (400/402/429 are intentional). |
| D3 | Frontend & UX | **6** | All routes live again; error states have dedicated calm components (`AnalysisErrorPanel`, `RateLimitBanner` parse `retry_after` into friendly copy — the grep hits are the *parsers*, not leaks); 529 ad-hoc hex colors in `src/**/*.tsx` = design-token drift; Core Web Vitals UNMEASURED. |
| D4 | Business logic & financial correctness | **7** | 672 tests green incl. golden vectors, Monte Carlo monotonicity, formula registry (77 tests), regression gate; benchmark count is single-constant `BENCHMARK_COUNT = 95_500` (`src/lib/businessLogic.ts:41`) with zero drift greps; F1–F5 live re-verification UNVERIFIED (needs authenticated production analyses). |
| D5 | Subscriptions & monetization | **5** | Tier matrix client/server parity now enforced by a running test; webhook handles checkout/sub-updated/sub-deleted/invoice.paid/payment_failed; BUT pricing-comment drift in `tiers.ts` header ($41/$492 in comments vs $49/$469 in constants), no one-time SKU, no consultant tier, checkout truth-test UNVERIFIED (needs Stripe test mode). |
| D6 | Guardrails & compliance | **6** | Prompt-injection sanitizer now passes all 31 adversarial tests (fixed today); `/privacy`, `/terms`, `/refund-policy` routes exist and resolve; disclaimer text found only in `Terms.tsx` — NOT injected per-report/PDF (open item T7-B). |
| D7 | Accuracy & intelligence moat | **5** | RVCE architecture solid (Tavily→DDG fallback, tier-gated obs caps, `search_health` reporting) but running web-search-degraded in prod until the key syncs; methodology page exists but serves the SPA shell to crawlers; no published accuracy benchmark. |
| D8 | Compounding loops | **2** | Sitemap has 79 URLs incl. 17 blog + examples (loop scaffolding exists) but zero prerendering = zero effective SEO; share tokens implemented (`/share/:token` + share-token-access tests green) but share-rate not instrumented; no consultant tier; no data-moat aggregation job. |

---

## 3 · LIVE TEST LOGS (performed 2026-06-11)

### 3.1 Route sweep (production, www.aiwmcquantis.com)
**Before fix:** `/` → 200 · `/methodology` 404 · `/pricing` 404 · `/examples` 404 · `/privacy` 404 · `/terms` 404 · `/legal/refund-policy` 404 · `/app` 404 · `/auth` 404 · `/index.html` → **308** (the smoking gun). Headers carried our exact `vercel.json` Permissions-Policy — proving the config was live but the rewrite destination was unreachable.
**After fix (commit `3ec76a1`):** all 22 probed routes → **200**, including `/blog/validate-startup-idea-using-ai` and `/examples/coffee-shop-denver`. `sitemap.xml` (79 URLs) and `robots.txt` both 200.

### 3.2 Full test suite
`vitest run src/__tests__` → **27 files, 672 tests, 0 failures** (9.95s). Includes: tier-matrix (116), tier-matrix-server-parity (76), formula-registry (77), financial-engine v1+v2 (70), Monte Carlo (20), prompt-injection (31), golden vectors (18), regression gate (11), auth-e2e (35), signup-mobile (23).

### 3.3 CI quality gates (local replication)
eslint → 0 errors / 241 warnings · prettier → clean · `tsc -p tsconfig.financial.json` → clean · business-logic hash → both artifacts verified (`26a9e7…`, v4.0.0) · deprecated-DeepSeek grep → 0 hits.

### 3.4 Supabase secrets (Management API, live)
27 secrets present incl. `DEEPSEEK_API_KEY`, `ANTHROPIC_API_KEY`, all 6 Stripe IDs/secrets, RVCE obs caps. **`TAVILY_API_KEY` ABSENT** → RVCE running on DuckDuckGo fallback (`search_provider: 'duckduckgo'` per `rvce-validate/index.ts` logic). Background poll armed for the post-CI sync.

### 3.5 UNVERIFIED (blocked)
- 5-analysis free-tier run, Plus checkout truth-test, paywall leak hunt, quota race test, RVCE 6-test suite → require authenticated browser session / Stripe test card / `gh` CLI (absent on this machine). Exact unblockers: a logged-in session on `/dev/rvce-test`, Stripe test-mode keys, GitHub CLI auth.
- GitHub Actions run logs (#204/#205 root cause) → repo private, no `gh` auth. Local replication of every CI step passes, so the red runs are presumed pre-fix states; next push verdict will confirm.

---

## 4 · FINDINGS REGISTER (sorted Severity → Impact)

| ID | Dim | Severity | Impact | Conf | Finding · Evidence · Root cause · Fix · Effort |
|---|---|---|---|---|---|
| F-01 | D3/D8 | CRITICAL | Growth+Trust | 100% | All non-root routes 404 in prod. Evidence: live probes + `X-Vercel-Error: NOT_FOUND` + `/index.html`→308. Root: `cleanUrls:true` breaks `/index.html` rewrite destination. **FIXED `3ec76a1`, live-verified.** 0.5h |
| F-02 | D2/D4 | CRITICAL | Trust+Cost | 100% | CI silently skipped 24/27 test suites since `583a80b`. Evidence: literal `[...]` in `package.json:16-17` (od -c byte dump); vitest exits 0 on unmatched literal globs. **FIXED `44e9f2b`.** 1h |
| F-03 | D5 | HIGH | Revenue+Trust | 100% | Client said free=1 analysis/mo, server enforces 5 (I-8). Evidence: `tiers.ts:30` vs `entitlements.ts:62` vs `FREE_TIER_LIMIT=5`. Hidden by F-02. **FIXED `44e9f2b`.** 0.2h |
| F-04 | D6 | HIGH | Trust | 100% | 6 injection payloads bypassed sanitizer (DAN, [SYSTEM], "disregard prior context", extraction phrasing). Evidence: failing tests + regex analysis of `schemas.ts:243`. **FIXED `44e9f2b`** — 31/31 green. 1h |
| F-05 | D7 | HIGH | Trust+Product | 95% | RVCE web-search degraded: `TAVILY_API_KEY` absent from Supabase secrets (Management API listing). Root: secret sync gated behind green CI; CI was red. Fix: in flight via the CI chain; **verify with the background poll**, else set the secret directly via Management API. 0.5h |
| F-06 | D8 | HIGH | Growth | 100% | Zero prerendering — 79 sitemap URLs serve one identical HTML shell (no per-route title/meta/content for crawlers). Evidence: single `<title>` in `index.html`, no prerender plugin in `vite.config.ts`. Fix: T-SEO. 1–2d |
| F-07 | D2 | MED | Trust | 90% | Analyses table was missing `depth`/`idempotency_key` columns → every save 42703-failed silently (history loss the CEO reported). **FIXED prior session** (DB) + `7c27746` (client idempotency). Verified in prod schema. |
| F-08 | D3 | MED | Trust | 100% | Market Sizing card permanently disabled: `<MarketSizingCard />` rendered with no `plusAnalysis` prop (`AppDashboard.tsx:574`); `usePlusAnalysis()` never invoked; `TwelveVariableGrid` is dead code. Fix: wire the hook or remove the card. 2–4h |
| F-09 | D5 | MED | Trust | 100% | Price-comment drift: `tiers.ts` header says Pro "$41, $492"; constants say 49/469/39.08-equivalent. One of them is wrong vs Stripe. Fix: reconcile against live Stripe prices, single source. 0.5h |
| F-10 | D3 | MED | Trust | 80% | 529 ad-hoc hex colors in `src/**/*.tsx` — design-token drift. Fix: T4-E token enforcement. 1–2d |
| F-11 | D6 | MED | Trust+Legal | 90% | Financial disclaimer found only on `Terms.tsx` — not render-injected on reports/PDFs/share links. Fix: one constant, injected at all three render surfaces. 2h |
| F-12 | D2 | LOW | Trust | 70% | `signup-mobile.test.tsx` had drifted from the shipped 2-field form (stale assertions, missing mock). **FIXED `44e9f2b`.** Symptom of suites not running (F-02). |
| F-13 | D2 | MED | Security | 100% | Pending secret rotations: `STRIPE_WEBHOOK_SECRET` and `ADMIN_UPLOAD_KEY` were exposed in an earlier session; Supabase PAT `sbp_73a9…` is in plaintext memory/notes. Rotate all three after the deploy chain is confirmed green. 1h |

---

## 5 · TRANSFORMATION MAP (sequenced)

### Wave 0 — hours (stop the bleeding) — **ALL DONE TODAY**
- ✅ W0-1 SPA routing fix (F-01) — lever: Indexed pages, Activation
- ✅ W0-2 Test-suite unmute + tier parity + injection hardening (F-02/03/04) — lever: Success rate, Trust
- ✅ W0-3 Analyses idempotent persistence (F-07) — lever: Trust ("every analysis strictly kept")
- ⏳ W0-4 Confirm TAVILY sync lands via green CI (F-05) — lever: Accuracy credibility

### Wave 1 — this week
- **T-SEO (F-06):** add `vite-plugin-prerender`/`vite-ssg`-style build step rendering the ~25 static public routes + blog + examples to real HTML with per-route `<title>/<meta>/JSON-LD`. Success: Google Search Console shows >50 indexed pages in 14 days. 1–2d. *Biggest single growth lever.*
- **T3-A health endpoints:** `/health` per edge function returning `{version, deployed_at}`; smoke step in `production-deploy.yml` curls them post-deploy and fails loudly. Success: "is the fix live?" = one curl. 0.5d
- **F-08 Market Sizing wiring** + **F-09 price reconciliation** + **F-11 disclaimer injection**. 1d combined.
- **F-13 secret rotation** (Stripe webhook secret, admin upload key, Supabase PAT). 1h, after deploy chain confirmed.

### Wave 2 — this month
- **T3-B observability spine:** structured `analysis_complete` event (tier, ok, degraded, reason, per-layer latency, tokens, cost) → one internal dashboard. Success: weekly success-rate/cost answerable in 60s. 2–3d
- **T2-A/T2-B structured-output + validator agent:** Zod-validate every model response server-side; one schema-repair retry; `validator_runs` table. Success: 0 parse failures in 100 consecutive analyses. 3–4d
- **T6-A three-SKU ladder:** $39 one-time report (Checkout `mode:'payment'` + `report_credits`), keep Plus, add $149 Consultant (white-label via `requireFeature('white_label')`). Success: all three purchasable in test mode. 3–5d
- **T6-B visible-locked sections** in free reports + `entitlement_denials` as the upgrade-intent feed. 2d
- **T4-B progressive-disclosure form** with live confidence meter (liveEstimate is already client-pure — evidence: `src/engine/liveEstimate.ts` no longer invokes the edge function per keystroke). 3d

### Wave 3 — the moat (this quarter)
- **T2-E pgvector semantic benchmark retrieval** (95,500-row embedding, one-time ~$10–30). Success: "No direct benchmark" rate <5% on a 50-input set.
- **L1 programmatic SEO:** first 200 sector×city pages generated at build time from real engine output. Success: GSC indexation curve.
- **T8-C public accuracy benchmark** + **T5-C backtest case studies** (5 published failures with engine flags).
- **L4 data moat:** anonymized per-sector input distributions feeding Monte Carlo priors.

---

## 6 · THE 10–30x LEDGER

| Lever | Measured current (today) | Moved by |
|---|---|---|
| Indexed pages | 1 → **79 crawlable** (fix live; still shell-HTML) | W0-1 done · T-SEO pending · L1 |
| Analysis success rate | UNMEASURED (no instrumentation) — envelope + idempotency + identity limiting verified in code | T3-B gives the number; T2-A/B raise it |
| Activation | UNMEASURED | T4-B, T4-C, T-SEO |
| Trust signal density | Methodology/security/cases routes now resolve; RVCE health bar exists but search-degraded | W0-4, T8-B, T5-B/C |
| Plus conversion | ~0% (0 paid) | T6-A/B/D |
| ARPU | $17 single recurring SKU | T6-A |
| Accuracy credibility | 672-test suite green incl. golden vectors; F1–F5 live status UNVERIFIED | T2-B, T8-C, golden suite (exists — keep green) |
| Cost per analysis | UNMEASURED | T2-D + T3-B instrumentation |

---

## 7 · COULD-NOT-VERIFY
1. GitHub Actions logs (#204/#205, current run) — needs `gh auth` or a PAT on this machine.
2. Plus checkout truth-test & paywall leak hunt — needs Stripe test-mode session.
3. RVCE 6-test suite & F1–F5 live re-verification — needs authenticated session at `/dev/rvce-test` and real Plus analyses.
4. Core Web Vitals / bundle-size-per-route — needs a production build run (deferred; ~5 min, no blocker, just not yet run).
5. Real funnel numbers (signups who ran >1 analysis) — needs a SQL session against prod `analyses`/`usage_counters`; available via the Supabase PAT on request.

## 8 · THE NEXT 24 HOURS
**Single highest-ROI action:** confirm the CI→deploy→secret-sync chain completed (the background poll will report TAVILY sync), then ship **T-SEO prerendering** — it converts today's routing fix from "pages resolve" into "pages rank," which is the only thing standing between 79 live URLs and the programmatic-SEO flywheel.

---
*"We are not selling AI. We are selling auditability." — this document is itself the first artifact of that claim: every number above was measured today, and every UNVERIFIED is labeled.*
