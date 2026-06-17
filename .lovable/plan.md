# Quantis — Audit Execution Plan (Prompts 1–4)

Scope: Execute the 4 missing pieces from the 16-Jun-2026 consolidated audit. Stabilization gate (rows 1–9) is already green from prior turns. This plan adds rows 10–12 (load/concurrency), fixes SPA SEO, hardens the conversion layer, and stops the autonomous task from regenerating wrong-product files.

**Execution order is non-negotiable** (matches §5 runbook). Each step ends in an acceptance test before the next starts.

---

## Step 1 — Prompt 1: Fix the autonomous task (5 min, no code)

Not a code change. Deliver the PRODUCT BRIEF preamble as a committed file so the scheduled `aiwmc-quantis-improvements` task and any future autonomous run grounds on truth instead of the BI-SaaS hallucination.

- Create `docs/AUTONOMOUS_TASK_PREAMBLE.md` with the verbatim Prompt 1 brief (product = financial pre-mortem, pricing Free/$17/$49, competitors = LivePlan/Bizplan/Enloop/ChatGPT/consultants, banned vocab, voice registers, stack, AIWMC LLC / no aiwmc.space).
- Add one line to `README.md` pointing autonomous runs at this file as their standing context.
- No app code touched.

Acceptance: file exists, README links it, user pastes it into the scheduled task config.

---

## Step 2 — Prompt 2: Load & concurrency harness (gate rows 10–12)

New committed `k6/` suite + manual CI workflow. Targets **staging + Stripe test only**; aborts loudly otherwise.

Files to create:

```text
k6/
  lib/env.ts              # env loader, safety abort, HARD vs BACKPRESSURE error classes
  thresholds.js           # central thresholds, imported by every script
  01_health.js            # L1  1000 VU/1m,    p99<300ms, hard==0
  02_engine_only.js       # L2  ramp 1→100/3m, p95<800ms p99<1.5s, complete-verdict assert
  03_full_pipeline.js     # L3  1/10/100,      ≥99.5% at 1&10; at 100 hard==0, backpressure-only
  04_entitlement_guard.js # L4  1000 VU burst, 100% feature_locked, 0 paid compute
  05_usage_cap.js         # L5  50 VU same id, exactly 5 succeed, DB counter never >5
  06_webhook_idempotency  # L6  same evt.id ×50 concurrent → 1 provision, 49 no-ops
  07_webhook_race.js      # L7  20 interleaved checkout+sub.updated pairs, final row stable
  08_ratelimit.js         # L8  exceed Upstash 2×, clean 429 envelope, no crash
  09_cold_start.js        # L9  20 VU cold, first-response p95<6s
  10_rls_concurrency.js   # L10 50 distinct users, 0 cross-tenant rows
.github/workflows/loadtest.yml  # workflow_dispatch only (cost), uploads k6 summary, fails on threshold
LOADTEST.md                     # local run, pass/fail reading, L1–L10 → gate rows 10–12 mapping
```

Safety rules baked into `lib/env.ts`:
- Requires `K6_BASE_URL`, `K6_SUPABASE_ANON_KEY`, `K6_STRIPE_MODE=test`; aborts before first request otherwise.
- HARD = 5xx/timeout/unhandled/wrong-or-partial. BACKPRESSURE = structured 429 / `high_demand` / `quota_exhausted` / `feature_locked`. Only HARD counts against error-rate thresholds.

Update `docs/QUANTIS_DEEP_DIVE_2026-06-12.md` (or stabilization scoreboard) to extend the 9-row Final Gate to 12 rows.

Acceptance: `loadtest.yml` runs green against staging, artifact attached; L4 = 0 paid leakage; L6 = exactly 1 provision under 50× replay.

---

## Step 3 — Prompt 4: SPA pre-render / SEO (parallel-safe)

Approach A (default, lowest risk): build-time pre-render of known marketing/static routes via a Vite prerender step that writes one HTML file per route into `dist/`. App routes (dashboard, analysis, settings) stay client-rendered.

Approach B (data-driven): for the 51 example pages and 9 blog posts, iterate the source data at build time and emit one HTML per slug.

Work:
- Extend `scripts/prerender-seo.ts` (already exists) to cover **every** public route in `public/prerender-urls.txt`; ensure it consumes the live title patterns from `QUANTIS_BUSINESS_LOGIC_v4.md` and never invents new ones.
- Per-route head via `react-helmet-async`: unique `<title>`, meta description, canonical, OG/Twitter, JSON-LD (Product/FAQ/Article where relevant). Theme color `#070D1A`. No `aiwmc.space` references anywhere.
- Regenerate `public/sitemap.xml` from the same route list (extend `scripts/generate-sitemap.ts`).
- Add CI guard `scripts/verify-unique-meta.ts` + wire into `.github/workflows/ci.yml`: fails if any two public routes ship byte-identical `<title>` or meta description.
- Above-the-fold content lands in the initial HTML; LCP target <2.5s.

Acceptance: `curl <url>/<slug>` returns route-specific title for ≥10 sampled routes; sitemap lists all public routes; duplicate-meta CI guard passes.

---

## Step 4 — Prompt 3: Conversion layer (run LAST, after gate 12/12 + SEO)

Operationalize PLG mechanics against the real product. **Read all pricing/features from `src/config/tiers.ts` only.** No new tiers, no BI features.

### 4.1 Above-the-fold input (homepage)
- Edit `src/pages/Landing.tsx` (+ `src/components/landing/MobileHero.tsx`): first viewport = one headline + one outcome subhead + the idea INPUT + single primary CTA "Run my free validation". 90-second promise + "95,500 benchmarks" as proof line directly under CTA.
- Remove the engineer-facing essay from above-the-fold; move secondary links (How it works, Examples) below.
- Voice = Tier 1 register; enforce banned vocab via `scripts/verify-banned-vocab.ts` (new, CI). Palette: navy `#1A2E4A`, electric blue `#007BFF`, off-white `#F5F6F8`. Reject `#8FFF2A` on Quantis surfaces.

### 4.2 Activation event instrumentation (PostHog)
Define once in `src/lib/analytics.ts`, reuse everywhere:
- `idea_submitted` → `analysis_started` → `analysis_completed` (north-star) → `verdict_viewed` → `upgrade_cta_seen {surface}` → `subscription_started`
- One funnel chart in PostHog; segment by ICP when captured.

### 4.3 Email capture (post-analysis, opt-in, never gating)
- New `src/components/result/PostAnalysisEmailCapture.tsx`: appears only after `analysis_completed`, offers full report / PDF summary by email. Stores via existing Supabase auth/profile.
- Wire to existing IONOS sending domain (separate from `aiwmcquantis.com` for any cold outreach).

### 4.4 Behavioral upgrade triggers
- Reuse existing `UpgradePrompt.tsx` / `ContextualUpgradeBanner.tsx`. Fire at value moments only: PDF export, location comparison, document studio, Free 5-cap hit.
- Copy anchors against consultant cost ("$1,500–$25,000 → Plus $17/mo"); reads price + next tier from `TIERS`; links `/refund-policy`.
- Grep guard (new CI step in `verify-banned-vocab.ts`): hardcoded `$17`/`$49`/`$149` outside `src/config/tiers.ts` fails the build.

### 4.5 Social proof (real only)
- Proof strip below the fold: one defensible hard number (real analyses count from DB; if unavailable mark `[UNVERIFIED]` and leave slot empty — never fabricate). Role-matched quotes only when real.

Acceptance: first screen = input + single CTA, no scroll; 6 funnel events fire; email capture only after completed verdict; `grep` for hardcoded prices outside `tiers.ts` returns nothing; banned-vocab CI guard green; no `aiwmc.space` references.

---

## Non-goals (explicitly NOT doing)

Per §0 do-not-implement list:
- No $149/$499 tiers, no per-builder/per-viewer pricing
- No NL→SQL, no warehouse connectors, no semantic layer, no embedded SDK
- No Tableau/Power BI/Looker comparison content or SEO
- No Kubernetes/ClickHouse/CDC infra
- No engine/business-logic changes (June Handbook is a separate, later step gated on 12/12 green)

---

## Sequencing summary

```text
Step 1 (today, 5 min)  → Stops wrong-product regeneration at source
Step 2 (this week)     → Gate rows 10–12 green, proves load behavior
Step 3 (parallel)      → Makes 60+ pages indexable
Step 4 (last)          → Conversion mechanics on a now-trustworthy product
```

June Handbook (60 vars + RVCE 2.0) remains gated behind 12/12 green and is **not** part of this plan.
