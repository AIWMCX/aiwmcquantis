# AIWMC™ QUANTIS — IMPROVEMENTS MASTER
**Version:** 2.0 (consolidated) · **Date:** 2026-06-13 · **Owner:** Bogdan (CEO) / Lovable (CTO-agent)
**Format:** Single master Markdown · **Mode:** docs-only, zero prod side-effects
**Supersedes:** `QUANTIS_IMPROVEMENTS_DATASET.md` (v1.0) · `SAAS_CONDITION_AUDIT_2026-06-11.md` (audit-only) · `QUANTIS_DEEP_DIVE_2026-06-12.md` (forensic-only)
**Re-run cadence:** diff §2 scorecard + §6 ledger after every remediation wave.

> Operating law (from master prompt §0.4): every claim has a file:line anchor, a SQL result, or an explicit `UNVERIFIED — blocked by […]`. No fabricated metrics. Invariants I-1…I-10 are constitutional — any item that violates one is rejected regardless of upside.

---

## 0. ORIENTATION

**The product (live, aiwmcquantis.com):** AI business-idea validator. Deterministic financial engine + 95,500-row benchmark corpus (46 sectors, 50+ city multipliers) + Monte Carlo P10/P50/P90 + AI narrative layer (DeepSeek/Gemini free · Claude Plus) + RVCE live web cross-validation.
**Stack:** Vite/React/TS SPA on Vercel · Supabase (Postgres + Auth + Edge Functions) · Stripe · GitHub Actions CI.
**Tiers:** Free ($0, 5/mo) · Plus ($17/mo, $168/yr) · Pro ($49/mo, $492/yr) · *(spec)* $39 one-time · $149/mo Consultant.
**Baseline 2026-06-12:** $0 MRR · 1 paid sub · 13 profiles · 3 analyses · 30 RVCE runs · 17 leads · 0 entitlement_denials · 6–10 real visitors/day · 75% bounce · 1 page indexed (pre-prerender; 79 routes post-`da93c08`).

**Disposal rule:** the 11 prior `BI_SaaS_*` packages assumed a different product (warehouse connectors, NLQ-to-SQL). All BI-only items are **DROPPED**. Only durable mechanics — funnel, pricing psychology, instrumentation, SEO, lifecycle — are kept and remapped.

---

## 1. EXECUTIVE VERDICT

**Could a paying user succeed end-to-end today? — YES, but trust is brittle and revenue is structurally capped.**

The deterministic engine is live. RLS is universal (113/113 public tables). Tier matrix is single-sourced. No legacy DeepSeek strings. No `VITE_*` secret leaks. User-facing error-leak corpus (`non-2xx`, `retry_after`, `Edge Function`) is grep-empty. The pipeline runs. The paywall runs. **One real user has paid.** The blockers are (a) two **I-9 envelope violations** that will hurt the instant traffic scales, and (b) absence of the **compounding loops** that turn a working product into a moat.

### Top-5 findings that matter most

| # | Finding | Sev | Why it matters |
|---|---|---|---|
| **F-001** | `analyze-business` returns **HTTP 500** on schema-invalid output and unhandled errors. **Violates I-9.** | CRITICAL | Any anomaly path emits raw 5xx — the failure mode you eradicated everywhere else. |
| **F-002** | `api-analyze` returns **HTTP 500** when inner invocation fails (`api-analyze/index.ts:109-117, 130-135`). **Violates I-9.** | CRITICAL | Pro/API customers see raw provider errors. |
| **F-003** | Free-tier `upgrade_prompt` ships `plus_price_monthly: 14` while `TIERS.plus.priceMonthly = 17`. **Price drift in user copy.** | HIGH | Conversion lies. User clicks $14, Stripe shows $17 → instant abandonment. |
| **F-004** | `rvce_validation_log` has no `search_provider`/`search_query`/`search_result` columns. **`web_search_fired_ratio ≥ 0.5` is structurally unprovable per-row.** | HIGH | Cannot defend the "Reality-Checked ✓" badge if challenged. |
| **F-005** | Zero validator layer (no `validator_runs` table, no post-generation consistency pass). **T2-B / 9th layer absent.** | HIGH | F1–F5-class credibility bugs have no automated catch-net. |

**Single biggest blocker:** F-001 + F-002. Until every analysis envelope is HTTP 200 `{ ok, degraded, reason }`, the platform is one provider blip away from "Internal server error" instead of a degraded report. Binary.

---

## 2. HEALTH SCORECARD — the diff target

| Dimension | Score | Justification | Evidence |
|---|---|---|---|
| **D1 · AI Model Architecture** | **6 / 10** | `src/config/models.ts` single source; CI guards legacy DeepSeek; Plus pipeline (Haiku→Sonnet×2→adversarial) wired. Missing: Zod end-to-end (T2-A), Validator Agent (T2-B), cost-dashboard (T2-D telemetry). | grep `deepseek-chat\|reasoner` = 0; `.github/workflows/ci.yml:60-71` |
| **D2 · Backend & Infra** | **5 / 10** | RLS 100%; `stripe-webhook` idempotent on `event.id`. Penalised by F-001, F-002; no per-fn `/health` returning `{version, deployed_at}`; no structured `analysis_complete` event. | `pg_tables rowsecurity=false` → [] |
| **D3 · Frontend & UX** | **6 / 10** | Top-level + section + popup ErrorBoundaries; user-facing error-leak grep = 0; off-token hex grep = 0. Missing: progressive form (T4-B), pipeline-theater loading (T4-C), report-as-marketing (T4-A). | `src/components/ErrorBoundary.tsx` |
| **D4 · Business Logic & Financial Correctness** | **7 / 10** | Deterministic engine + Monte Carlo + 6 anomaly rules + assumption graph + cross-engine validator all wired. Golden vectors exist but not gating CI (T5-A partial). | `analyze-business/index.ts:64-69`; `src/__tests__/golden-vectors.test.ts` |
| **D5 · Subscriptions & Monetization** | **5 / 10** | TIERS single-sourced; webhook coverage verified. Penalised by F-003; no $39 one-time SKU (T6-A); no visible-locked Plus sections (T6-B). | `src/config/tiers.ts:22-130` |
| **D6 · Guardrails, Safety & Compliance** | **6 / 10** | `ai-safety-guardrails.ts` with input/output validation + cost limits + kill-switch + audit log. Cron fns require `x-cron-secret`. Legal pages live. Missing: per-day spend circuit-breaker proof (T7-D); injection corpus in CI (T7-A). | `_shared/ai-safety-guardrails.ts` |
| **D7 · Accuracy / Intelligence Moat** | **4 / 10** | RVCE fans to Tavily+DDG; DeepSeek V4 extraction confirmed. Penalised by F-004 (per-row unprovable); no two-stage classifier (T8-A); no `/accuracy-benchmark` (T8-C). | RVCE schema query |
| **D8 · Strategic Loops** | **3 / 10** | Sitemap + prerender list live (commit `da93c08`+`c495e53`). Missing: 2,300 sector×city pages (L1); share-loop instrumentation (L2); Consultant distribution (L3); data-moat aggregation (L4). | `public/sitemap.xml`, `public/prerender-urls.txt` |

**Composite: 42 / 80 (52%).** Floor lifted by the engine and locked invariants. Ceiling crushed by absence of compounding loops and the two envelope violations.

---

## 3. LIVE TEST LOGS (run 2026-06-12 ~08:50 UTC, read-only)

### 3.1 Forensic greps
```
rg -n "deepseek-chat|deepseek-reasoner" src/ supabase/      → 0   ✓ I-6
rg -n "95,?500|97,?500" src/ supabase/                       → 0   ✓ I-7 single constant
rg -n '\$17\b|\$14\b|\$39\b|\$149\b' src/                    → 0
rg -n "non-2xx|retry_after|Edge Function" src/               → 0   ✓ T4-D
rg -n "VITE_[A-Z_]*KEY|VITE_[A-Z_]*SECRET" src/              → 0   ✓ I-5
rg -n "#[0-9a-fA-F]{6}" src/ --include='*.tsx' (excl token)  → 0   ✓ T4-E
```

### 3.2 Database posture
```
public tables without RLS:                     0   ✓ I-4 (113/113)
public.analyses:                               3
public.profiles:                              13
public.subscriptions WHERE plan_id IN (..):    1   ← $0 MRR
public.rvce_validation_log:                   30
public.leads:                                 17
public.entitlement_denials:                    0   ← upgrade-intent goldmine empty
```

### 3.3 RVCE schema reality
`\d public.rvce_validation_log` → 17 columns: `id, analysis_id, user_id, rvce_version, global_confidence, metrics_count, outlier_count, warn_count, no_data_count, total_observations, reference_classes, metrics_validation, flags, evidence_samples, latency_ms, status, created_at`. **No `search_provider`, no `search_query`, no `search_result`.** F-004 confirmed.

### 3.4 Envelope I-9 trace (code, not curl)
- `analyze-business/index.ts` outer catch → HTTP 500 — violates I-9.
- Same file: `RESPONSE_SCHEMA_INVALID` path → HTTP 500 — violates I-9.
- `api-analyze/index.ts:109-117` → forwarded inner `fnError` as 500 — violates I-9.
- `api-analyze/index.ts:130-135` → outer catch as 500 — violates I-9.
- ✓ Pre-analysis 401 (no Bearer) and 405 (bad method) correctly non-2xx — I-9-allowed.

### 3.5 Not run this pass
- Real Stripe test-mode checkout (Stripe side-effects).
- 7-analysis quota walk (would burn real users' quota; pointless until F-001 fixed).
- LCP/INP/CLS on `/`, `/pricing`, `/app` (numbers from broken envelope = misleading).
- Plus paywall leak hunt via direct API (needs test users; Wave 1).

---

## 4. FINDINGS REGISTER (Severity → Impact)

| ID | Dim | Sev | Impact | Conf | Evidence | Root cause | Fix | Effort |
|---|---|---|---|---|---|---|---|---|
| F-001 | D2 | **CRITICAL** | trust / revenue | HIGH | `analyze-business/index.ts` final 80 lines | Outer catch + schema-fail emit 500 | Wrap both in `200 + { ok:false, degraded:true, reason }`; add CI test | 2h |
| F-002 | D2 | **CRITICAL** | trust (Pro/API) | HIGH | `api-analyze/index.ts:109-117,130-135` | Forwarded inner error as 500 | Same envelope rewrite | 1h |
| F-003 | D5 | HIGH | revenue | HIGH | `analyze-business/index.ts` upgrade_prompt | Hardcoded `14` not from `TIERS` | Source from `TIERS.plus.priceMonthly` | 0.5h |
| F-004 | D7 | HIGH | trust (moat) | HIGH | `information_schema.columns rvce_validation_log` | Schema lacks per-row search payload | Migration: `search_provider, search_queries jsonb, search_results_count, web_search_fired_count, web_search_attempted_count`; backfill from `evidence_samples` | 4h |
| F-005 | D1 | HIGH | trust | HIGH | grep `validator_runs` = 0 | T2-B not implemented | Build 9th layer + table | 2d |
| F-006 | D8 | HIGH | growth | HIGH | No generator script; sitemap static-small | L1 not built | Build-time 10 sectors × 20 cities = 200 pages from engine output | 3d |
| F-007 | D7 | HIGH | trust | HIGH | Single-pass sector match | T8-A not implemented | Stage-1 Haiku classifier with <0.7 → inline clarification | 1.5d |
| F-008 | D2 | MED | observability | MED | Only generic `health-check` | T3-A partial | Per-fn `/health` returning `{version, deployed_at}` + smoke gate | 1d |
| F-009 | D5 | MED | revenue | MED | No `$39` SKU; no `report_credits` table | T6-A incomplete | `oneShot` Stripe `mode:'payment'` + `report_credits` RLS | 2d |
| F-010 | D3 | MED | conversion | MED | Free reports lack visible-locked sections | T6-B not implemented | `<LockedFeaturePreview>` for Adversarial / RVCE / Pre-Mortem | 1d |
| F-011 | D8 | MED | growth | MED | `shared_reports.view_count` not surfaced | L2 instrumented but underused | Render CTA + view-count badge on `/shared/:token` | 0.5d |
| F-012 | D1 | MED | cost | MED | No cost rollup view; `ai_calls` raw only | T2-D telemetry missing | `mv_ai_cost_daily` + admin chart | 1d |
| F-013 | D4 | LOW | trust | MED | Golden vectors not in CI gate | T5-A partial | Add `bun run test:golden` blocking step | 2h |
| F-014 | D6 | LOW | compliance | MED | Injection corpus exists but coverage unverified | T7-A | Audit `src/__tests__/prompt-injection.test.ts`, expand to 15 payloads | 1d |
| F-015 | D8 | LOW | trust | LOW | No `/accuracy-benchmark` | T8-C | 25-case page + downloadable CSV | 3d |
| F-DD-01 | D6 | HIGH | revenue/cost | HIGH | `rvce-validate/index.ts:644` default `tier='plus'` | Unauth callers default to paid tier | Default `'free'`; require Bearer for Plus | 1h |
| F-DD-02 | D2 | HIGH | feature | HIGH | `parse-document/index.ts:128` uses `getClaims` | Plus doc-intelligence 500s | Switch to `getUser`; preserve envelope | 1h |
| F-DD-03 | D7 | MED | accuracy | MED | Dental-SaaS → "Dental Clinic" | Classifier silent guess | Same fix as F-007 (T8-A) | (rolled into F-007) |
| F-DD-06 | D1 | MED | governance | MED | Edge fns don't import `models.ts` | Drift risk | Import or CI guard on hardcoded model strings | 2h |

---

## 5. TRANSFORMATION MAP — sequenced (every item respects I-1…I-10)

### Wave 0 — Stop the bleeding (hours, today, ~4.5h)
| ID | T-spec | Levers | Success | Eff |
|---|---|---|---|---|
| W0-1 | Fix F-001 envelope: `analyze-business` outer catch + schema-fail → 200 `{ok:false,degraded:true,reason}` | success-rate, trust | 0 HTTP 5xx over 50 adversarial inputs | 2h |
| W0-2 | Fix F-002 envelope: `api-analyze` wraps as 200 | success-rate, trust | Same | 1h |
| W0-3 | Fix F-003 price drift: source from `TIERS.plus.priceMonthly` | conversion | grep `plus_price_monthly:\s*14` = 0 | 0.5h |
| W0-4 | CI gate: `tests/envelope-i9.test.ts` asserts every analysis fn non-2xx only for 401/400 | regression | CI red on any regression | 1h |
| W0-5 | Fix F-DD-01: `rvce-validate` default tier `'free'` | cost/revenue | Unauth callers no longer trigger Plus | 1h |
| W0-6 | Fix F-DD-02: `parse-document` `getClaims`→`getUser` | feature | Plus doc-intel returns 200 | 1h |

### Wave 1 — This week
| ID | T-spec | Levers | Success | Eff |
|---|---|---|---|---|
| W1-1 | T3-A per-fn `/health {version,deployed_at}` + post-deploy smoke gate | observability | Deploy green only when live fn answers new version | 1d |
| W1-2 | T3-B structured `analysis_complete` event (tier, ok, degraded, reason, layer latencies, tokens, cost) → `analysis_logs` + admin dashboard | observability, cost | Funnel + cost answerable in 1 query | 2d |
| W1-3 | Fix F-004 RVCE schema + backfill | accuracy moat | `avg(web_search_fired/attempted) ≥ 0.5` | 4h |
| W1-4 | T5-A promote golden vectors to blocking CI job | accuracy | CI fails on engine drift | 2h |
| W1-5 | T4-D rewrite all user-visible error/retry copy to 3-terminal-states (full/degraded/quota) | conversion | error-leak grep stays 0 forever | 1d |

### Wave 2 — This month
| ID | T-spec | Levers | Success | Eff |
|---|---|---|---|---|
| W2-1 | T2-B Validator Agent + `validator_runs` table | accuracy, trust | ≥95% pass on 30-item adversarial corpus | 2d |
| W2-2 | T6-A $39 one-time SKU + `report_credits` + Stripe `mode:'payment'` | ARPU, conversion | All 3 SKUs purchasable in test; entitlements verified | 2d |
| W2-3 | T6-B visible-locked Plus sections in every free report | Plus conversion | `entitlement_denials` ≥10/wk from `LockedFeaturePreview` | 1d |
| W2-4 | T8-A two-stage classifier with clarification | accuracy | ≥90% on 20-item ambiguity set | 1.5d |
| W2-5 | T2-A Zod end-to-end + one schema-repair retry | reliability | 0 parse failures shipped / 100 analyses | 2d |
| W2-6 | T2-E pgvector semantic benchmark retrieval (IVFFlat, batch-embed once) | accuracy moat | "Estimated · No direct benchmark" <5% on 50-input set | 2d |

### Wave 3 — The moat (this quarter)
| ID | T-spec | Levers | Success | Eff |
|---|---|---|---|---|
| W3-1 | L1 programmatic SEO: 200 pre-rendered sector×city pages from real engine output | indexed pages | ≥50 indexed in 30d | 3d |
| W3-2 | T5-B published methodology paper + `/methodology` deep page | trust | Cited from every report footer; indexed | 2d |
| W3-3 | T8-C `/accuracy-benchmark` 25-case public benchmark vs competitors | trust | Live + downloadable CSV | 3d |
| W3-4 | L2 share-loop instrumentation: viewCount + "Stress-test your own" CTA | activation | ≥1 attributed conversion/wk | 1d |
| W3-5 | L3 Consultant tier ($149/mo) white-label + workspaces | ARPU | 3 design-partner consultants signed | 1wk + outreach |
| W3-6 | T2-C true dual-AI consensus with `{agreements, disputes, confidence_delta}` rendered as Second-Opinion Flags | accuracy moat | Dispute section live on Plus reports | 2d |
| W3-7 | L4 data moat: anonymized per-sector input aggregation feeding Monte Carlo priors | accuracy compounding | First sector recalibrated from in-house data | 1wk |
| W3-8 | T7-D per-day spend circuit-breaker → degraded:true when tripped | cost ceiling | Daily free model spend capped at $X; trip = degraded never error | 1d |

---

## 6. THE 10–30x LEDGER (master prompt §0.3, measured)

| Lever | Spec baseline | **Measured 2026-06-12** | 10x target | T-specs that move it |
|---|---|---|---|---|
| Indexed pages | 1 | UNVERIFIED — proxy blocked; 79-route prerender shipped `da93c08` | 70+ | W3-1, W3-2, W3-3 |
| Analysis success rate | unmeasured | **NOT safe** — F-001+F-002: any anomaly → 5xx | 99%+ `ok:true` | W0-1, W0-2, W0-4, W1-2 |
| Activation (visitor→analysis) | ~6% | 3/13 = 23% (n too small) | 25%+ | A-1, A-2, A-3 (§7) |
| Trust signal density | 0 | 0 testimonials; F-004 unprovable per-row | 8 + live counter | W1-3, W3-2, W3-3 |
| Plus conversion (free→paid) | ~0% | 1/13 = 7.7% (n not significant) | 3–5% steady | W2-3, W2-2, W3-4 |
| ARPU | $17/mo | $17 / $49 (Pro live, $149 not yet) | + $39 one-time, + $149 Consultant | W2-2, W3-5 |
| Accuracy credibility | F1–F5 documented | F1 not re-verified this pass; no validator | All 5 closed + validator | W2-1, W1-4, W3-3, W3-6 |
| Cost / analysis | unmeasured | unmeasured — `ai_calls` raw only | <$0.40 Plus / <$0.04 Free | W1-2, W2-1, F-012 |

---

## 7. STRATEGY TRACKS (the durable 20% from the 11 prior docs, remapped)

The funnel is: `Visitor → analysis_started → ANALYSIS_COMPLETED (activation) → signup → return → paid`. The "users convert only after seeing THEIR OWN data" insight maps directly: **Quantis converts only after a founder sees THEIR OWN idea analyzed.** Activation = `analysis_completed` on the visitor's real idea, never a demo/template.

**Canonical event taxonomy:** `landing_viewed` · `analysis_started{tier,anonymous}` · `analysis_completed{ok,degraded,depth}` · `free_signup_start` · `signup_completed` · `result_shared{token}` · `second_session` · `limit_reached{quota|rate}` · `upgrade_cta_clicked{surface}` · `locked_section_clicked{feature}` *(top PQL signal)* · `subscription_started{tier,cycle}` · `pdf_exported`.

| Track | ID | Item | Status | Eff | Metric | Maps to |
|---|---|---|---|---|---|---|
| **A · Activation** | A-1 | Instant anonymous analysis above the fold (hero CTA, signup on "save your result") | ⬜ HIGH | 2–3d | visitor→analysis ≥20% | T4-A homepage |
|  | A-2 | Kill blank form: stage 1 idea+location → instant local preview via `engine/liveEstimate.ts`; stage 2 economics; stage 3 depth w/ confidence meter | ⬜ HIGH | 3d | form completion ≥60% | T4-B |
|  | A-3 | Honest pipeline-theater loading driven by real envelope events | ⬜ MED | 1–2d | mid-analysis abandon <5% | T4-C |
|  | A-4 | Day-2 lifecycle digest email "3 things to check next" + deep link | ⬜ MED | 2d | 7-day return ≥40% | Resend + `_shared/email-guard.ts` |
| **B · Conversion** | B-1 | Visible-locked Plus sections in every free report | ⬜ HIGH | 2d | `locked_section_clicked` top PQL | T6-B / W2-3 |
|  | B-2 | Behavioral PQL prompts (≥2 analyses + ≥2 sessions + ≥1 locked click + (PDF or quota hit)) at quota/locked/PDF moments | ⬜ HIGH | 3d | PQL→paid ≥25% | client scoring on existing events |
|  | B-3 | Three-SKU ladder: $39 one-time + $17/$168 Plus + $149/mo Consultant | ⬜ MED | 3–5d | All 3 in test mode; first one-time sale | T6-A / W2-2 + W3-5 |
|  | B-4 | Paywall copy rebuild + annual default + visible guarantee linking `/refund-policy` | ⬜ LOW | 1d | pricing→checkout CTR +10–20% | T6-D |
| **C · Acquisition / SEO** | C-1 | Prerendering — 79 routes get unique HTML | ✅ shipped `da93c08`+`c495e53` | — | GSC indexed >50 in 14d | — |
|  | C-2 | Programmatic sector×city pages (10×20=200) from real engine output | ⬜ HIGH | 3–5d after C-1 | long-tail impressions + analyses originated | L1 / W3-1 |
|  | C-3 | Comparison pages (vs LivePlan, BizPlanAI, ChatGPT-for-validation) | ⬜ MED | 1–2d | organic signups attributed | static + prerendered |
|  | C-4 | Share-loop CTA + viewCount on `/shared/:token` and `/r/:id` | ⬜ MED | 1d | share-link creation + attributed signups | L2 / W3-4 |
| **D · Trust & Depth** | D-1 | RVCE as headline feature (SearchHealthBar + per-metric hover badge) | ⬜ HIGH | 2d (after F-004) | RVCE visible 100% Plus; `web_search_fired_ratio ≥0.5` | T8-B + W1-3 |
|  | D-2 | Report page → Stripe-Dashboard standard (KPI cards w/ benchmark-delta badges, MC fan chart, severity-sorted risk queue) | ⬜ MED | 1wk | screenshot = marketing asset; share rate up | T4-A |
|  | D-3 | Methodology page + 5 backtest case studies + 25-case accuracy benchmark | ⬜ MED | 3d | methodology indexed; cited every footer | T5-B + T5-C + T8-C |
|  | D-4 | Observability spine: one `analysis_complete` event → admin dashboard | ⬜ HIGH | 2–3d | "did every analysis this week succeed and what did each cost?" in 60s | W1-2 |

### Dropped (wrong-product; do not resurrect without a pivot)
Warehouse connectors · NLQ-to-SQL · embedded BI SDK · BI semantic layer · BI market sizing · BI competitor tiers · Dagster/Airbyte/Fivetran · "Weekly Active Dashboards" north star.
**Replacement north star:** **Weekly Completed Analyses (WCA).**

### Icebox (right idea, premature at <10 visitors/day)
G2/Capterra review campaigns · SDR layer · retargeting ads · SOC 2 Type II · reverse-IP personalization · session-recording · agency reseller (activate after B-3 Consultant traction).

---

## 8. PROD-SAFE ROLLOUT ORDER

| Order | Items | Window | Gate to proceed |
|---|---|---|---|
| 1 | W0-1…W0-6 (envelope + tier + cron leaks) | this week | All envelopes 200; CI green on `envelope-i9.test.ts` |
| 2 | D-4 / W1-2 observability + funnel events | this week | Baseline funnel readable |
| 3 | W1-1 health + W1-3 RVCE schema + W1-4 golden CI + W1-5 error copy | this week | observability dashboards healthy |
| 4 | A-1 hero + A-3 loading theater | week 2 | activation measured ≥ baseline before full rollout |
| 5 | B-1 visible-locked + B-2 PQL prompts | week 2–3 | upgrade-intent events flowing |
| 6 | A-2 staged form + B-4 paywall copy | week 3–4 | form completion ≥60% on variant |
| 7 | W2-2 / B-3 three-SKU ladder (test → live) | week 4–5 | all SKUs verified in Stripe test |
| 8 | W3-1 / C-2 programmatic + C-3 comparisons + D-1 RVCE badge | month 2 | indexation curve in GSC |
| 9 | D-2 report redesign + D-3 methodology/cases + A-4/C-4 loops | month 2–3 | share + return metrics |

**Standing rule:** after every step, re-run §2 + §6 and diff. Measure progress, not activity.

---

## 9. COULD-NOT-VERIFY (honest blockers)

| What | Why blocked | Unblock by |
|---|---|---|
| Vercel deploy ts vs Supabase fn `last_deployed` | No Vercel API in sandbox | Vercel token or screenshot |
| Real GSC indexation count | No Search Console access | GSC read access or non-rate-limited proxy |
| Real Stripe test-mode checkout E2E | Deliberately deferred — side effects | Your green-light; will run as test user |
| PostHog / Sentry baseline | Connections absent | Connect via standard connectors |
| LCP/INP/CLS on `/`, `/pricing`, `/app` | Pointless before envelope fix | Re-run after W0-1/W0-2 |
| `ai_layers_attempted` vs `succeeded` ratio | No `analysis_complete` event yet | W1-2 ships it |
| F1–F5 live re-verification | Needs running 3+ analyses on real quota | Test creds or seeded-quota approval |
| RVCE `web_search_fired_ratio` per-row | F-004 schema gap | W1-3 backfills |
| `production-deploy.yml` "secrets in job `if:`" fix live | Repo runs Lovable-managed deploys | Confirm whether GH Actions deploy still authoritative |
| TAVILY_API_KEY presence | Absent in both GH and Supabase secrets (CI #214 confirmed) | CEO supplies value; set both places |

---

## 10. THE NEXT 24 HOURS

**Execute Wave 0 (W0-1…W0-6) in one scoped build session — ~6.5h agent time.** Net effect: every analysis envelope becomes I-9-compliant, Free upgrade copy stops lying about price, `rvce-validate` stops defaulting to Plus tier, `parse-document` returns 200, and CI prevents the regression forever.

**Trigger phrase:**
> "Implement Wave 0: rewrite `analyze-business` outer catch + `RESPONSE_SCHEMA_INVALID` + `api-analyze` error paths to 200 `{ok:false,degraded:true,reason}`; source `plus_price_monthly` from `TIERS.plus.priceMonthly`; fix `rvce-validate` default tier to `'free'`; switch `parse-document` to `getUser`; add `tests/envelope-i9.test.ts` to CI."

After Wave 0 lands, re-run this doc (greps + SQL) and diff §2 and §6. That diff is the only honest measure of progress.

---

## 11. MAINTENANCE

- Flip Status when an item ships; add commit SHA as evidence.
- New ideas enter as new IDs in §4 or §7 — never as standalone documents (that is how the 11-file sprawl happened).
- Re-version (2.0 → 2.1) on any structural change.
- This file is the single strategy source of truth. `QUANTIS_DEEP_DIVE_2026-06-12.md` remains the forensic snapshot; `QUANTIS_IMPROVEMENTS_DATASET.md` v1.0 is now superseded.

---

*AIWMC™ LLC · CONFIDENTIAL · aiwmcquantis.com · 2026-06-13*
*"We are not selling AI. We are selling auditability." — every item above either deepens that moat or feeds a compounding loop. Anything that did neither was cut.*
