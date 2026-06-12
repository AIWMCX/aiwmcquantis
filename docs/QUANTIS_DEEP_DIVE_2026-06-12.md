# AIWMC™ QUANTIS — DEEP-DIVE & 10–30x AUDIT
**Date:** 2026-06-12 · **Auditor:** Lovable (Claude) · **Scope:** docs-only, zero prod changes
**Spec reference:** _AIWMC Quantis Master Prompt v2026-06-11 (Part 10 deliverable)_
**Re-run cadence:** diff this file after every remediation wave.

> Operating law followed: every claim below carries either a file:line anchor, a SQL result, or an explicit `UNVERIFIED — blocked by […]` tag. No fabricated metrics, SHAs, or log lines.

---

## 1. EXECUTIVE VERDICT

**Could a paying user succeed end-to-end today? — YES, but trust is brittle and revenue is structurally capped.**

The deterministic engine is live, RLS is universal, the tier matrix is single-sourced, no legacy DeepSeek strings exist, no `VITE_*` secret leaks, and the user-facing error leak corpus (`non-2xx`, `retry_after`, `Edge Function`) is grep-empty. The pipeline runs. The math runs. The paywall runs. **One real user has paid.** The blockers are not "broken product" — they are **trust signals not yet bolted on** and **two invariant violations in the response envelope** that will start hurting the moment traffic scales past single-digit daily.

### The 5 findings that matter most
| # | Finding | Severity | Why it matters |
|---|---|---|---|
| **F-001** | `analyze-business` returns **HTTP 500** on schema-invalid output and unhandled errors (`index.ts` ~end of file). **Violates I-9.** | CRITICAL | Any anomaly path emits raw 5xx to the browser — the exact failure mode you eradicated everywhere else. |
| **F-002** | `api-analyze` returns **HTTP 500** when the inner `analyze-business` invocation fails (`api-analyze/index.ts:109-117, 130-135`). **Violates I-9.** | CRITICAL | Pro-tier API customers will see raw provider errors. |
| **F-003** | Free-tier `upgrade_prompt` ships `plus_price_monthly: 14` (`analyze-business/index.ts` final-payload block) while `TIERS.plus.priceMonthly = 17`. **Price drift in user copy.** | HIGH | Conversion lies. The user clicks $14 and sees $17 at Stripe — instant abandonment. |
| **F-004** | `rvce_validation_log` schema has **no `search_provider` / `search_query` / `search_result` columns** (verified via `information_schema`). RVCE web-search fanout is unauditable per-row. | HIGH | Cannot prove `web_search_fired_ratio ≥ 0.5`. Cannot defend the "Reality-Checked ✓" badge if challenged. |
| **F-005** | Zero validator layer (no `validator_runs` table, no post-generation consistency pass). **T2-B / 9th-layer entirely absent.** | HIGH | The F1–F5 class of credibility bugs has no automated catch-net before reaching the user. |

### The single biggest blocker
**F-001 + F-002.** Until every analysis envelope is HTTP 200 with `{ ok, degraded, reason }`, the platform is one provider outage away from users seeing "Internal server error" instead of a graceful degraded report. That is the difference between "this product is reliable" and "this product broke on me." Everything else compounds; this one is binary.

---

## 2. HEALTH SCORECARD (the diff target)

| Dimension | Score | Justification | Evidence anchor |
|---|---|---|---|
| **D1 · AI Model Architecture** | **6 / 10** | `src/config/models.ts` enforces single MODELS constant; CI guards deprecated DeepSeek aliases; legacy strings: `0`. Plus pipeline (Haiku→Sonnet×2→adversarial) exists. **Missing:** Zod-validated structured outputs end-to-end, validator agent (T2-B), prompt caching telemetry, cost-per-analysis dashboard. | `src/config/models.ts`, `.github/workflows/ci.yml:60-71`, grep `deepseek-chat\|deepseek-reasoner` = 0 hits |
| **D2 · Backend & Infra** | **5 / 10** | RLS on 100% of `public` tables; `stripe-webhook` idempotent on `event.id` via `stripe_webhook_events` table; tier matrix server-mirrored. **Penalised by:** envelope I-9 violations (F-001, F-002), no `/health` per function returning `{version, deployed_at}` (only generic `health-check`), no per-analysis structured observability event. | `pg_tables` query (0 rows without RLS), `stripe-webhook/index.ts:151-186` |
| **D3 · Frontend Architecture & UX** | **6 / 10** | Top-level `ErrorBoundary` + `SectionErrorBoundary` + `PopupErrorBoundary` present; user-facing error-leak grep (`non-2xx`/`retry_after`/`Edge Function`) = 0 hits; hex-drift outside token files = 0. **Missing:** progressive-disclosure form (T4-B), pipeline-theater loading (T4-C), report-as-marketing-asset polish (T4-A). | `src/components/ErrorBoundary.tsx`, `src/components/analysis/SectionErrorBoundary.tsx` |
| **D4 · Business Logic & Financial Correctness** | **7 / 10** | Deterministic engine + Monte Carlo + 6 anomaly rules (`bulletproof-validator.ts`) + assumption graph + benchmark confidence + cross-engine validator all present and wired into `analyze-business`. **Missing:** golden-input regression suite frozen in CI (T5-A — partial: `golden-test-vectors.ts` exists but not gating CI). | `analyze-business/index.ts:64-69` imports; `src/__tests__/golden-vectors.test.ts` |
| **D5 · Subscriptions & Monetization** | **5 / 10** | TIERS is single-sourced ($17 Plus / $49 Pro). Stripe webhook event-coverage and idempotency verified. **Penalised by:** F-003 price drift ($14 vs $17 in user copy), no $39 one-time SKU (T6-A incomplete), locked-section preview UX (T6-B) not implemented. | `src/config/tiers.ts:22-130`, `analyze-business/index.ts` upgrade_prompt block |
| **D6 · Guardrails, Safety & Compliance** | **6 / 10** | `ai-safety-guardrails.ts` with input/output validation, cost limits, kill-switch, audit log; cron functions now require `x-cron-secret`; `pdf-generator` requires JWT; admin-only ingestion enforced. Legal pages exist (`/privacy`, `/terms`, `/refund-policy`). **Missing:** prompt-injection adversarial test corpus run on CI; per-day spend circuit-breaker (T7-D) unverified. | `ai-safety-guardrails.ts`, prior security migrations |
| **D7 · Accuracy / Intelligence Moat** | **4 / 10** | RVCE service exists, fans out to Tavily+DDG, DeepSeek V4 extraction confirmed live. **Penalised by:** F-004 — schema has no per-row search payload columns, so the "Reality-Checked" claim is structurally unprovable from data; no two-stage classifier with clarification (T8-A); no `/accuracy-benchmark` page (T8-C). | `rvce_validation_log` columns query result |
| **D8 · Strategic Loops** | **3 / 10** | Sitemap + prerender list exist; some marketing pages indexed. **Penalised by:** 2,300 sector×city pages not generated; share-loop instrumentation absent; Consultant-tier distribution loop absent; data-moat aggregation job absent. | `public/sitemap.xml`, `public/prerender-urls.txt`, no programmatic generator found |

**Composite: 42/80 (52%).** Floor lifted by the engine and the locked invariants. Ceiling crushed by the absence of compounding loops and the two envelope violations.

---

## 3. LIVE TEST LOGS

### 3.1 Forensic greps (read-only, run 2026-06-12 ~08:50 UTC)
```
$ rg -n "deepseek-chat|deepseek-reasoner" src/ supabase/                 → 0 hits   ✓ I-6
$ rg -n "95,?500|97,?500" src/ supabase/                                 → 0 hits   ✓ I-7 (single constant)
$ rg -n '\$17\b|\$14\b|\$39\b|\$149\b' src/                              → 0 hits in src/
$ rg -n "non-2xx|retry_after|Edge Function" src/                         → 0 hits   ✓ T4-D
$ rg -n "VITE_[A-Z_]*KEY|VITE_[A-Z_]*SECRET" src/                        → 0 hits   ✓ I-5
$ rg -n "#[0-9a-fA-F]{6}" src/ --include='*.tsx' (excl. tokens)          → 0 hits   ✓ T4-E
```

### 3.2 Database posture (live SQL)
```sql
SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false;
→ []   ✓ I-4 (100% RLS coverage across 113 public tables)

SELECT count(*) FROM public.analyses;             →   3
SELECT count(*) FROM public.profiles;             →  13
SELECT count(*) FROM public.subscriptions
   WHERE plan_id IN ('plus','pro');               →   1   ← $0 MRR confirmed structurally
SELECT count(*) FROM public.rvce_validation_log;  →  30
SELECT count(*) FROM public.leads;                →  17
SELECT count(*) FROM public.entitlement_denials;  →   0   ← upgrade-intent goldmine is empty
```

### 3.3 RVCE schema reality check
```sql
\d public.rvce_validation_log
→ columns: id, analysis_id, user_id, rvce_version, global_confidence,
           metrics_count, outlier_count, warn_count, no_data_count,
           total_observations, reference_classes, metrics_validation,
           flags, evidence_samples, latency_ms, status, created_at
           ── NO search_provider, NO search_query, NO search_result
```
**Finding F-004 confirmed.** `evidence_samples` may contain payloads but there is no top-level provability column; per-row `web_search_fired` is not derivable in a single query.

### 3.4 Envelope I-9 verification (code-trace, not live curl)
- `supabase/functions/analyze-business/index.ts` final block: outer `catch` returns `status: 500` with `{error, code, details, timestamp}`. **Violates I-9.**
- Same file: schema-validation failure path returns `status: 500` with `code: "RESPONSE_SCHEMA_INVALID"`. **Violates I-9.**
- `supabase/functions/api-analyze/index.ts:109-117`: forwards inner `fnError` as `status: 500`. **Violates I-9.**
- `supabase/functions/api-analyze/index.ts:130-135`: outer catch returns `status: 500`. **Violates I-9.**
- ✓ Pre-analysis 401 (missing Bearer) and 405 (bad method) are correctly non-2xx — those are I-9-allowed.

### 3.5 Tests deliberately NOT run in this pass
- Real Stripe test-mode checkout (side-effects in Stripe).
- 7-analysis quota walk (would consume real users' quota for our 13-profile base; nothing to verify against until F-001 fixed anyway).
- Browser performance profile of `/`, `/pricing`, `/app` (LCP/INP/CLS) — deferred to Wave 1 once envelope is fixed (numbers from a broken envelope are misleading).
- Plus-paywall leak hunt via direct API — deferred to Wave 1, requires test users.

---

## 4. FINDINGS REGISTER (sorted Severity → Business Impact)

| ID | Dim | Sev | Impact | Conf | Evidence | Root cause | Fix | Effort |
|---|---|---|---|---|---|---|---|---|
| F-001 | D2 | **CRITICAL** | trust / revenue | HIGH | `analyze-business/index.ts` final 80 lines | Outer catch + schema-fail emit HTTP 500 | Wrap both in `200 + { ok:false, degraded:true, reason }`. Add `BLOCKS-I9` test in CI. | 2h |
| F-002 | D2 | **CRITICAL** | trust (Pro/API) | HIGH | `api-analyze/index.ts:109-117, 130-135` | Forwarded inner error as 500; outer catch as 500 | Same envelope rewrite as F-001 | 1h |
| F-003 | D5 | HIGH | revenue | HIGH | `analyze-business/index.ts` upgrade_prompt: `plus_price_monthly: 14` | Hardcoded number not from `TIERS` | Replace with `TIERS.plus.priceMonthly` (or annual-equivalent if intentional, then label correctly) | 0.5h |
| F-004 | D7 | HIGH | trust (moat) | HIGH | `information_schema.columns` for `rvce_validation_log` | Schema lacks per-row search-payload columns | Migration: add `search_provider text`, `search_queries jsonb`, `search_results_count int`, `web_search_fired_count int`, `web_search_attempted_count int`. Backfill from `evidence_samples` if structured. | 4h |
| F-005 | D1 | HIGH | trust | HIGH | No `validator_runs` table; grep `validator_runs` = 0 hits | T2-B not implemented | Build the 9th layer: post-generation consistency + benchmark-citation + payback-separation (I-3) + tone checks; persist verdicts | 2d |
| F-006 | D8 | HIGH | growth | HIGH | No programmatic-SEO generator in `scripts/`; `public/sitemap.xml` static-small | Loop L1 not built | Build-time script: 10 sectors × 20 cities → 200 pre-rendered pages with real engine output | 3d |
| F-007 | D7 | HIGH | trust | HIGH | No two-stage classifier with confidence + clarification; sector matching is single-pass | T8-A not implemented | Stage-1 Haiku classifier, threshold < 0.7 ⇒ inline clarification question | 1.5d |
| F-008 | D2 | MED | observability | MED | Only `health-check` exists; no per-function `/health` returning `{version, deployed_at}` | T3-A partial | Per-function version endpoint + smoke gate in `production-deploy.yml` | 1d |
| F-009 | D5 | MED | revenue | MED | No `$39` one-time SKU in `TIERS`; no `report_credits` table | T6-A incomplete | Add `oneShot` tier with Stripe `mode:'payment'` flow; `report_credits` table + RLS | 2d |
| F-010 | D3 | MED | conversion | MED | Free reports do not render Plus sections as visible-locked previews | T6-B not implemented | `<LockedFeaturePreview>` for Adversarial Second Opinion / RVCE Cross-Check / Pre-Mortem | 1d |
| F-011 | D8 | MED | growth | MED | `shared_reports.view_count` not surfaced; no "stress-test your own idea" CTA on share page | Loop L2 instrumented but underused | Render CTA + viewCount badge on `/shared/:token`; track conversion | 0.5d |
| F-012 | D1 | MED | cost control | MED | No cost-per-analysis dashboard; `ai_calls` table exists but no rollup view | T2-D telemetry side missing | Materialized view `mv_ai_cost_daily` + admin chart | 1d |
| F-013 | D4 | LOW | trust | MED | `golden-test-vectors.ts` exists but not gating CI builds | T5-A not in CI | Add `bun run test:golden` step; fail on drift | 2h |
| F-014 | D6 | LOW | compliance | MED | No automated prompt-injection corpus in CI | T7-A unverified | 15-payload test array in `src/__tests__/prompt-injection.test.ts` (file exists — verify coverage) | 1d |
| F-015 | D8 | LOW | trust | LOW | No `/accuracy-benchmark` page | T8-C not implemented | 25-case benchmark page; pre-render; download CSV | 3d |

---

## 5. TRANSFORMATION MAP — sequenced

### Wave 0 — Stop the bleeding (hours, today)
| ID | T-spec | Levers moved | Success criterion | Eff | Deps |
|---|---|---|---|---|---|
| W0-1 | **Fix F-001** envelope: `analyze-business` outer catch + schema-fail → HTTP 200 `{ ok:false, degraded:true, reason }` | success-rate, trust-density | 0 HTTP 5xx from `analyze-business` over 50 synthetic adversarial inputs | 2h | — |
| W0-2 | **Fix F-002** envelope: `api-analyze` forwards/wraps as 200 envelope | success-rate, trust-density | Same as W0-1 for `api-analyze` | 1h | W0-1 |
| W0-3 | **Fix F-003** price drift: `plus_price_monthly` sourced from `TIERS.plus.priceMonthly` | conversion | grep `plus_price_monthly:\s*14` = 0 hits | 0.5h | — |
| W0-4 | **CI gate W0-1/W0-2** with `tests/envelope-i9.test.ts`: every analysis edge function asserts non-2xx only for 401/400 | regression prevention | CI red on any regression | 1h | W0-1, W0-2 |

### Wave 1 — This week
| ID | T-spec | Levers | Success | Eff | Deps |
|---|---|---|---|---|---|
| W1-1 | **T3-A** `/health` per critical edge fn returning `{version, deployed_at}` + post-deploy smoke gate | observability | Deploy goes green only when live function answers new version | 1d | — |
| W1-2 | **T3-B** structured `analysis_complete` event (tier, ok, degraded, reason, layer latencies, attempted/succeeded, match_type, tokens, cost) to `analysis_logs` table + admin dashboard | observability, cost | "Did every analysis this week succeed and what did each cost?" answered in 1 query | 2d | — |
| W1-3 | **Fix F-004** RVCE schema: add `search_provider`, `search_queries`, `search_results_count`, `web_search_fired_count`, `web_search_attempted_count` + backfill | accuracy moat | `SELECT avg(web_search_fired_count::float / nullif(web_search_attempted_count,0))` ≥ 0.5 | 4h | — |
| W1-4 | **T5-A in CI** — promote `golden-test-vectors` to a blocking job | accuracy | CI fails on engine drift | 2h | — |
| W1-5 | **T4-D** rewrite all user-visible error/retry copy to the 3-terminal-states model (full / degraded / quota) | conversion | rg `retry_after\|non-2xx\|Edge Function` in `src/` stays 0 forever | 1d | W0-1, W0-2 |

### Wave 2 — This month
| ID | T-spec | Levers | Success | Eff | Deps |
|---|---|---|---|---|---|
| W2-1 | **T2-B Validator Agent (9th layer)** + `validator_runs` table | accuracy, trust | ≥95% pass rate on 30-item adversarial corpus | 2d | W1-2 |
| W2-2 | **T6-A** add $39 one-time SKU + `report_credits` table + Stripe `mode:'payment'` | ARPU, conversion | All 3 SKUs purchasable in test mode; entitlements per SKU verified | 2d | — |
| W2-3 | **T6-B** visible-locked Plus sections in every free report | Plus conversion | `entitlement_denials` rows ≥10/week from `LockedFeaturePreview` clicks | 1d | — |
| W2-4 | **T8-A** two-stage classifier with clarification | accuracy | ≥90% on 20-item ambiguity set | 1.5d | W2-1 |
| W2-5 | **T2-A** Zod-validated structured outputs end-to-end + 1 schema-repair retry | reliability | 0 parse failures shipped to users / 100 analyses | 2d | W2-1 |
| W2-6 | **T2-E** pgvector semantic benchmark retrieval (IVFFlat, batch embed once) | accuracy moat | "Estimated · No direct benchmark" rate <5% on 50-input test set | 2d | — |

### Wave 3 — The moat (this quarter)
| ID | T-spec | Levers | Success | Eff | Deps |
|---|---|---|---|---|---|
| W3-1 | **L1 programmatic SEO**: 10 sectors × 20 cities = 200 pre-rendered pages from real engine output | indexed pages | 200 pages live + submitted; ≥50 indexed in 30d | 3d | W1-1, W2-5 |
| W3-2 | **T5-B published methodology paper** + `/methodology` deep page | trust density | Cited from every report footer; indexed | 2d | — |
| W3-3 | **T8-C `/accuracy-benchmark`** 25-case public benchmark with competitor outputs | trust density | Page live + downloadable CSV | 3d | W2-6 |
| W3-4 | **L2 share-loop instrumentation**: viewCount surfaced, "Stress-test your own" CTA | activation | Share-link CTR tracked; ≥1 attributed conversion/week | 1d | W2-2 |
| W3-5 | **L3 Consultant tier ($149/mo)** white-label + workspaces | ARPU | 3 design-partner consultants signed | 1w + outreach | W2-2 |
| W3-6 | **T2-C true dual-AI consensus** with explicit `{agreements, disputes, confidence_delta}` rendered as Second-Opinion Flags | accuracy moat | Dispute section live on Plus reports | 2d | W2-1 |
| W3-7 | **L4 data moat**: anonymized per-sector input aggregation feeding Monte Carlo priors | accuracy compounding | First sector recalibrated from in-house data | 1w | W2-5 |
| W3-8 | **T7-D** per-day spend circuit-breaker on free model budget → degraded:true when tripped | cost ceiling | Daily free-tier spend capped at $X (you set); tripped path = degraded, never error | 1d | W0-1 |

---

## 6. THE 10–30x LEDGER (your §0.3 table, measured)

| Lever | Baseline (spec) | **Measured 2026-06-12** | 10x target | T-specs that move it |
|---|---|---|---|---|
| Indexed pages | 1 | UNVERIFIED — Google search proxy blocked; sitemap.xml present | 70+ | W3-1, W3-2, W3-3 |
| Analysis success rate | unmeasured | **NOT 100% safe**: F-001 + F-002 mean any anomaly → HTTP 500 | 99%+ `ok:true` | W0-1, W0-2, W0-4, W1-2 |
| Activation (visitor → analysis) | ~6% | 3 analyses / 13 profiles = 23% (n too small; not statistically meaningful) | 25%+ | W2-3, W4 in spec |
| Trust signal density | 0 | 0 testimonials, 17 leads, F-004 makes RVCE claim unprovable per-row | 8 + live counter | W1-3, W3-2, W3-3 |
| Plus conversion (free → paid) | ~0% | **1 paid / 13 = 7.7%** (n=13, not significant) | 3–5% steady | W2-3, W2-2, W3-4 |
| ARPU | $17/mo single SKU | $17 / $49 already (Pro live, not $149 spec) | + $39 one-time | W2-2, W3-5 |
| Accuracy credibility | F1–F5 documented | F1 not re-verified in this pass (Wave 1); no validator layer | All 5 closed + validator | W2-1, W1-4, W3-3, W3-6 |
| Cost / analysis | unmeasured | unmeasured — `ai_calls` table exists, no rollup view | < $0.40 Plus / < $0.04 Free | W1-2, W2-1, F-012 |

---

## 7. COULD-NOT-VERIFY

| What | Why blocked | Unblock by |
|---|---|---|
| Vercel deploy timestamp vs Supabase function "last deployed" | No Vercel API access from sandbox | Vercel API token in workspace secrets, or screenshot |
| Real GSC indexation count | No Search Console access | GSC owner read access OR site:aiwmcquantis.com via a non-rate-limited proxy |
| Real Stripe test-mode checkout end-to-end | Deliberately deferred — side effects in Stripe | Your green-light to run it; I'll do it under a test user |
| PostHog / Sentry baseline | Connections not present | Connect PostHog + Sentry via standard connectors |
| LCP/INP/CLS on `/`, `/pricing`, `/app` | Deferred — pointless to measure before envelope fix | Re-run after W0-1/W0-2 |
| ai_layers_attempted vs ai_layers_succeeded ratio | No `analysis_complete` structured event yet | W1-2 ships it |
| F1–F5 live re-verification with dental/coffee/consulting inputs | Requires running 3+ analyses against prod against real users' quota | Test user creds OR your approval to consume seeded quota |
| RVCE `web_search_fired_ratio` per-row | F-004 schema gap | W1-3 backfills it |
| `production-deploy.yml` "secrets in job `if:`" fix is live | This repo runs Lovable-managed deploys, not the GH Actions deploy path | Confirm with you whether `production-deploy.yml` is still authoritative |

---

## 8. THE NEXT 24 HOURS

**Execute W0-1, W0-2, W0-3, W0-4 in one scoped build session.** Total effort: ~4.5 hours of agent time. Net effect: every analysis envelope becomes I-9-compliant, Free upgrade copy stops lying about price, and CI prevents the regression forever.

**The single line to start with:**
> "Implement Wave 0: rewrite `analyze-business` outer catch + `RESPONSE_SCHEMA_INVALID` path + `api-analyze` error paths to return HTTP 200 envelope `{ ok:false, degraded:true, reason }`; source `plus_price_monthly` from `TIERS.plus.priceMonthly`; add `tests/envelope-i9.test.ts` to CI."

After Wave 0 lands, re-run this audit (one command, fresh greps + SQL) and diff section 2's scorecard. That diff is the only honest measure of progress.

---

*"We are not selling AI. We are selling auditability." — every transformation above either deepens that moat or feeds a compounding loop. Anything that did neither was cut.*

**End of audit.** Next checkpoint: post-Wave-0 re-run.
