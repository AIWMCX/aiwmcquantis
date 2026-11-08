# AIWMC Quantis — Financial Pre-Mortem for Business Ideas

> **Stress-test a business idea against real benchmark data.** A deterministic financial engine checks 12 variables against 97,500 industry benchmarks, then surfaces a proceed / pivot / kill verdict you can actually audit.

🌐 **Live production:** [www.aiwmcquantis.com](https://www.aiwmcquantis.com)
📊 **Status:** generated on every build — see the live [release manifest](https://www.aiwmcquantis.com/release.json) (deployed commit, engine version, edge functions, migrations, test files). Numbers are not maintained by hand here.

---

## What it does

You give Quantis a business idea, a location, and (optionally) some financial inputs. It returns:

- **Viability verdict** — `PROCEED`, `PIVOT`, or `KILL` with a confidence score
- **Financial projections** — MRR/ARR, base/optimistic/pessimistic scenarios, 36-month P&L
- **Unit economics** — CAC, LTV, LTV:CAC ratio, payback period, breakeven
- **Industry-calibrated benchmarks** — pulled from a 97,500-row dataset (BLS, Census, IBISWorld, SBA, OECD)
- **Location intelligence** — cost-of-living adjustments for 50+ global cities (rent, salary, utilities)
- **Risk map** — 5–9 ranked risks specific to the idea, with mitigations
- **Action plan** — 5 prioritized launch steps with timing and budget
- **Cited sources** — every benchmark referenced, so you can audit any number

What makes it different: **the verdict is auditable**. Every figure traces back to a deterministic calculation against real benchmark data — the AI layer narrates and explains, but never originates a number.

---

## The 8-layer analysis pipeline

```
┌────────────────────────────────────────────────────────────────────┐
│  L1  Input validation + prompt-injection guard + sector classify   │
│  L2  Database-driven industry detection (46 sectors)                │
│  L3  Sub-industry detection (B2B/B2C, enterprise/SMB modifiers)     │
│  L4  V2 benchmark overlay (97,500 rows by industry × geography)     │
│  L5  Deterministic financial engine (Monte Carlo runs first)        │
│  L6  AI narrator (DeepSeek primary, Anthropic fallback)             │
│  L7  Bulletproof validator (numerical coherence rules)              │
│  L8  RVCE — Rapid Validation & Competitive Evidence (Tavily search) │
└────────────────────────────────────────────────────────────────────┘
```

**Invariant I-1** (hard architectural constraint): the deterministic engine runs **first** and **always returns**. The AI layer never originates a financial figure. If every AI provider is down, the response is still HTTP 200 with `degraded: true` and complete numeric results — verified by the GOLDEN checkpoint pattern in `analyze-business/index.ts:2706–2752`.

---

## QOC — Quantis Orchestration Core

The next-generation stage-based decomposition of the analysis pipeline lives in `supabase/functions/qoc-orchestrate/`:

```
preflight → dedupe → engine → narrate → verify
   (D5)      (D4)              (D1/D2)   (D3)
```

Every stage emits a `StageTrace` audit envelope (`qoc_audit_envelopes` table). Short-circuit rules prevent cost leakage: prompt injection or missing idea hard-blocks at preflight; duplicate fingerprint short-circuits at dedupe; both at $0. Tier-routed narration (`deepseek` → `haiku` → `sonnet` → `opus`) is server-bound from DB-resolved plan, never client-claimed (hardening F-1).

Full QOC unit-test coverage: 25 acceptance tests in `tests/qoc.test.ts` + 9 hardening tests in `tests/qoc.hardening.test.ts`.

---

## Pricing & tiers

Single source of truth: `src/config/tiers.ts` (mirrored to `supabase/functions/_shared/entitlements.ts` — drift-tested in CI).

| Tier | Price | Trial | Monthly analyses | Key features |
|---|---|---|---|---|
| **Free** | $0 | — | 5 | Quick depth, viability score, top-3 risks, basic projections |
| **Plus** | $17/mo (annual: $14/mo eq.) | 14 days | Unlimited | Full depth, Monte Carlo, 36-month P&L, Pre-Mortem, Doc Studio, action plan, watermark-free PDF, custom branding, unlimited history |
| **Pro** | $49/mo (annual: $41/mo eq.) | 14 days | Unlimited | Pro depth (deepest), TAM/SAM/SOM, pitch deck data, strategic roadmap, 5-year model, white-label, API access |

Server-side entitlement enforcement via `_shared/entitlements.ts:requireFeature()` — client claims are cosmetic; every gated edge function resolves tier from the `subscriptions` table.

---

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | Vite + React 18 + TypeScript + Tailwind + shadcn/ui (SPA, Lovable-edited) |
| **Hosting** | Vercel — prebuilt deploy from GitHub Actions after CI (Vercel git auto-deploy is disabled in `vercel.json`) |
| **Backend** | Supabase — Postgres + Auth + 65 Deno Edge Functions |
| **Database** | 167 migrations; RLS on every user table; SECURITY DEFINER RPCs for cross-table writes |
| **AI providers** | DeepSeek (`deepseek-v4-flash`) primary; Anthropic Claude (`claude-haiku-4-5`) safety fallback; Gemini/GPT-5-mini for consensus verification |
| **External validation** | Tavily web search (RVCE / Layer 8); DuckDuckGo as zero-cost fallback |
| **Payments** | Stripe (subscriptions, webhooks, customer portal) |
| **Email** | Resend (transactional, lifecycle, double opt-in) |
| **Analytics** | GA4 (`G-08096HWB3B`), Microsoft Clarity, Sentry, internal `funnel_events` table |
| **Rate limiting** | Upstash + Supabase RPC for anonymous device-id + IP + browser-fingerprint multi-layer |
| **CI/CD** | GitHub Actions: CI gates → `production-deploy.yml` (migrations, ledger check, edge functions, Vercel deploy) |

---

## Production architecture

```
┌───────────────────────────────────────────────────────────────────┐
│  Browser → www.aiwmcquantis.com  (apex 308 → www, HSTS, CSP)      │
└────────────────────────────┬──────────────────────────────────────┘
                             │
              Vercel CDN — static SPA + prerendered route HTMLs
                             │
            React Router  →  per-route SEO via prerender-seo.ts
                             │
┌────────────────────────────┴──────────────────────────────────────┐
│  Supabase Edge (Deno)                                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  analyze-business  (the live monolith — GOLDEN checkpoint)   │  │
│  │  qoc-orchestrate   (stage-based, dormant — for migration)    │  │
│  │  ai-narrator       (tier-routed: deepseek/haiku/sonnet/opus) │  │
│  │  ai-consensus      (dual-model agreement scoring)            │  │
│  │  rvce-validate     (Tavily + DuckDuckGo web validation)      │  │
│  │  stripe-webhook · stripe-portal · create-checkout-session    │  │
│  │  send-lifecycle-email · process-doc-job · 55+ others…        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬──────────────────────────────────────┘
                             │
┌────────────────────────────┴──────────────────────────────────────┐
│  Postgres (Supabase project: dmlxrvfyqsakyjomsvdj)                 │
│  Core tables: analyses, subscriptions, plan_entitlements,          │
│  usage_tracking, qoc_audit_envelopes, ai_calls, funnel_events,     │
│  user_notifications, doc_generation_jobs, lead_captures, …         │
│                                                                    │
│  Security: RLS on every user table · RESTRICTIVE anon deny ·       │
│  Vault-encrypted PII · SECURITY DEFINER RPCs · audit log triggers  │
└───────────────────────────────────────────────────────────────────┘
```

---

## Project layout

```
src/
├── components/        # UI: analysis, auth, landing, docs/forms, layout, seo
├── pages/             # 83 public routes + admin/* + examples/* + blog/* + vs/*
├── hooks/             # useAnalysis, useAuth, useSubscription, useEntitlements, …
├── services/          # analysisApi, analysisDb, leadCapture, …
├── lib/               # canonical-facts, analytics, logger, sentry, quantis-math, …
├── config/            # tiers.ts (canonical pricing SSOT), models.ts
├── i18n/              # locales/en/* (i18next)
├── __tests__/         # Vitest suites (count: /release.json → test_files)
└── integrations/      # Supabase client (auto-generated by Supabase CLI)

supabase/
├── functions/         # Deno edge functions (count: /release.json → edge_functions)
│   ├── analyze-business/         # The live monolith — 4,800 lines, GOLDEN
│   ├── qoc-orchestrate/          # Stage-based decomposition (idle)
│   ├── ai-narrator/              # Tier-routed narration
│   ├── ai-consensus/             # Dual-model verification
│   ├── rvce-validate/            # Layer 8 — web validation
│   ├── _shared/                  # entitlements, llm-call, schemas, logger, …
│   └── …
├── migrations/        # 167 SQL migrations (Postgres schema + RLS + seed data)
└── config.toml

tests/                 # 1 Deno test suite — 25 QOC AT-* + 9 hardening (Deno test)
scripts/               # CI gates: verify-*, prerender-seo, generate-sitemap, …
baseline/              # Golden snapshot manifest for regression detection
.github/workflows/     # 8 workflows (see CI section below)
docs/                  # QOC_CLAUDE, QUANTIS_BUSINESS_LOGIC, MEGA_MASTER_PROMPT, …
public/                # Static assets, robots.txt, og-image.png
vercel.json            # Vercel build config + CSP/HSTS headers + SPA rewrite
```

---

## CI/CD — two parallel deploy paths

**Deploy** to `aiwmcquantis.com` is done by **GitHub Actions** after CI succeeds on `main`: `production-deploy.yml` applies migrations, verifies the migration ledger, deploys the edge functions in its `FUNCTIONS=()` list, and ships a prebuilt Vercel build. Vercel's git auto-deploy is disabled (`vercel.json` → `deploymentEnabled: false`). Verify what is live with `/release.json` and each function's `?health=1` `commit_sha`.

**GitHub Actions** runs in parallel as quality gates and observability. The 8 workflows:

| Workflow | Trigger | Purpose |
|---|---|---|
| **CI** (`ci.yml`) | push to `main`, PR | Lint, format, typecheck, R3 enforcement, AI cost logging, deploy coverage, business-logic hash, 1,114-test suite, determinism (25 fixtures), build + prerender, visibility gate, baseline diff, internal-link gate, dependency audit |
| **Production Deploy** (`production-deploy.yml`) | After CI succeeds | Migrations + ledger check, edge functions, prebuilt Vercel production deploy. |
| **Deploy Smoke Test** (`deploy-smoke-test.yml`) | After Production Deploy succeeds | Critical-endpoint R3 contract check post-deploy |
| **QOC Gate** (`qoc-gate.yml`) | push to `main`, PR | Deno test suite for QOC orchestrator (25 AT-* tests + 9 hardening) |
| **SEO Deploy** (`seo-deploy.yml`) | Manual (`workflow_dispatch`) | Full Puppeteer prerender + visibility gate + Vercel CLI deploy (for cornerstone SEO refreshes) |
| **Vercel Production Deploy** (`vercel-production-deploy.yml`) | Manual | One-click manual redeploy |
| **Staging Deploy** (`staging-deploy.yml`) | push to staging branches | Preview environment |
| **Load & Concurrency Test** (`loadtest.yml`) | Manual | k6-based load testing |

The CI gates encoding the production-readiness invariants:

- **`verify-determinism.ts`** — runs the 25-fixture engine suite twice and byte-compares output (catches non-determinism creeping into financial math)
- **`verify-r3-enforcement.ts`** — every LLM-calling edge function must wire `r3-validator` / `boundary-schemas`
- **`verify-ai-cost-logging.ts`** — every paid AI call must be piped through `ai-logger.ts`
- **`verify-deploy-coverage.ts`** — every edge function must be in the deploy workflow OR explicitly ignored
- **`verify-business-logic-hash.ts`** — `docs/QUANTIS_BUSINESS_LOGIC.md` content hash must match a registered constant
- **`verify-visibility.mjs`** — every public route serves a unique, crawlable body (no homepage-shell regression), no `7-Layer` staleness, no duplicate-body collisions
- **`verify-internal-links.mjs`** — zero orphans, zero broken internal links
- **`verify-unique-meta.ts`** — every route ships a unique `<title>` and `meta description`
- **`diff-against-baseline.sh`** — current build's route bodies + test count diffed against `baseline/MANIFEST.json`; unexpected drift fails CI
- **`seo-jsonld.test.ts`** — JSON-LD truthfulness: no fabricated `aggregateRating`, `reviewCount`, or `Review` schema

---

## Security posture

- ✅ **Zero anonymous data access** — RESTRICTIVE `anon` deny on every user table
- ✅ **PII encrypted at rest** — Vault `pgp_sym_encrypt` for email and phone columns
- ✅ **Server-side entitlement enforcement** — `_shared/entitlements.ts` resolves tier from DB; client claims are cosmetic
- ✅ **Stripe webhook signature verification** — every payload validated before mutation; PII redacted on persisted events
- ✅ **Multi-layer rate limiting** — anonymous (1/h), free (5/h), plus (20/h), pro (60/h) + per-IP (5/min, 20/h) + browser-fingerprint
- ✅ **AI safety guardrails** — prompt-injection patterns hard-block pre-engine, $0 cost on injection
- ✅ **Cost ceilings** — `DAILY_BUDGET_USD: 100`, `KILL_SWITCH_ERROR_RATE: 0.5`, `KILL_SWITCH_WINDOW_MINUTES: 5`
- ✅ **CSP + HSTS + nosniff** — set in `vercel.json:headers`; `Strict-Transport-Security: max-age=63072000`
- ✅ **Admin lockdown** — DB trigger restricts the `admin` role to a single authorized account
- ✅ **No `VITE_`-prefixed secrets** — every secret lives in Vercel/Supabase environment vault

---

## Reliability mechanisms

- **GOLDEN checkpoint** (`analyze-business/index.ts:2706`) — deterministic engine output captured before AI runs; available as fallback if any later layer fails
- **Outermost catch** (`analyze-business/index.ts:4744`) — wraps the whole request; can't return 5xx on the analysis path
- **Realtime channel isolation** — every Supabase realtime channel name appends `${Date.now()}-${Math.random()}` to prevent `postgres_changes after subscribe()` race conditions
- **Tier coercion** — free users requesting `pro`/`full` depth are silently coerced to `quick`; denial logged for observability
- **Deterministic engine fallback** — if every AI provider 429s, the deterministic engine + industry priors produce a complete response with `_degraded: true`
- **Idempotency keys** — `analyses.idempotency_key` unique index prevents duplicate saves on React Query retries or StrictMode double-invokes

---

## SEO infrastructure

83 public routes; per-route head injection via `prerender-seo.ts` so crawlers see real per-page `<title>`, `<description>`, `<canonical>`, OG, Twitter card, and JSON-LD before JS executes. The cornerstone-content pattern lives at `/examples/coffee-shop-denver` (deep-dive market analysis with `FAQPage` JSON-LD for Google People Also Ask placement) — replicate this for the next priority example pages.

- `robots.txt` lives in `public/robots.txt` (Vite copies to `dist/`); allows public surfaces, disallows `/admin`, `/auth`, `/checkout/`, `/dashboard/`
- `sitemap.xml` generated at build from `scripts/seo.routes.mjs` registry — single source of truth for routes
- Canonical host: **`www.aiwmcquantis.com`** (apex 308s to www)
- Per-route canonicals are self-referencing absolute URLs (no canonical-collapse to homepage)

---

## Local development

```sh
git clone https://github.com/AIWMCX/aiwmcquantis.git
cd aiwmcquantis-main

# Bun is the canonical package manager — npm/yarn may produce different
# resolutions for tiptap/recharts peers. CI uses bun.
bun install

# Run the dev server (uses local Vite + remote production Supabase by default)
bun run dev
```

**Required environment variables** (auto-configured in Vercel; for local dev, copy from your Vercel project settings):

```sh
VITE_SUPABASE_URL=https://dmlxrvfyqsakyjomsvdj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<from Vercel>
VITE_SUPABASE_PROJECT_ID=dmlxrvfyqsakyjomsvdj
```

**Common scripts:**

```sh
bun run dev                   # Vite dev server
bun run build                 # Production build: typecheck + verify + vite build + prerender-seo
bun run lint                  # ESLint
bun run format:check          # Prettier
bun run test:quality          # Vitest
bun run test:coverage         # With coverage report
deno test tests/qoc.test.ts   # Deno: 25 QOC AT-* + 9 hardening tests
npx tsx scripts/verify-determinism.ts    # 25-fixture engine determinism check
node scripts/verify-visibility.mjs       # Prerender visibility gate
```

---

## Brand canon (non-negotiable)

These invariants are enforced in tests and source guards. Violating any of them is a CI failure.

- ✅ Canonical pricing: **$0 / $17 / $49** monthly (annual equivalents $0 / $14 / $41). No other prices. No ghost tiers.
- ✅ **8-layer** pipeline (RVCE = Layer 8). Never `7-Layer` (historical staleness signal — CI rejects builds containing this string).
- ✅ **97,500 benchmarks** is the public claim (corrected 2026-07-21 from a stale `95,500`; see `canonical-facts.ts`'s own history note). Number lives in `canonical-facts.ts` only.
- ❌ **No processing-time claim** ("under 90 seconds," "in seconds," etc.) anywhere in public copy. `PROCESSING_TIME_CLAIM` and `VERDICT_SECONDS` in `canonical-facts.ts` are explicitly marked `SUPERSEDED 2026-08-30, per explicit instruction — do not reintroduce`. This README previously asserted the opposite as "non-negotiable brand canon," which was itself stale and wrong — corrected here to match the actual SSOT.
- ✅ **No** AIWMC Research Foundation branding on any Quantis surface. Quantis is `Created by AIWMC Quantis`. Foundation lives at a separate AIWMC entity.
- ✅ **No** acid green `#8FFF2A` anywhere in Quantis CSS or assets (Foundation brand color).
- ✅ Banned marketing vocabulary: *hustle, grind, 10x, level up, unlock, game-changer, disrupt, breakthrough* — caught by content guards.
- ✅ Doc Studio templates (10) carry only "Created by AIWMC Quantis" as the institutional header; Georgia serif typography preserved (appropriate for legal/business documents).

Canonical constants source: `src/config/canonical-facts.ts` (the single SSOT for every public-facing number).

---

## Memory & observability

- **Funnel analytics** — `/admin/funnel` reads 8 canonical events from `funnel_events`: `page_view`, `analysis_start`, `analysis_complete`, `signup`, `email_capture`, `paid_checkout_start`, `paid_checkout_complete`, `pro_upgrade`
- **Email funnel** — `/admin/email-funnel` tracks email capture → signup → activation conversion
- **QOC audit** — `/admin/qoc-monitor` visualizes per-stage `StageTrace` envelopes (when QOC is on the hot path)
- **AI cost telemetry** — every paid LLM call recorded in `ai_calls` (task, model, tokens, cost, latency)
- **RVCE telemetry** — `rvce_events` table tracks search firings, observation counts, validation outcomes
- **Sentry** — front-end errors + edge-function errors; project URL in `src/lib/sentry.ts`
- **Microsoft Clarity** — session recordings, rage-clicks, heat maps (consent-gated; off until `VITE_CLARITY_PROJECT_ID` is set)
- **GA4** — `G-08096HWB3B`, page views + custom funnel events

---

## Documentation

In-repo references for deeper understanding:

- [`docs/QOC_CLAUDE.md`](docs/QOC_CLAUDE.md) — QOC architecture spec, invariants, stage contracts
- [`docs/QUANTIS_BUSINESS_LOGIC.md`](docs/QUANTIS_BUSINESS_LOGIC.md) — Financial engine reference (hash-locked in CI)
- [`docs/AUTONOMOUS_TASK_PREAMBLE.md`](docs/AUTONOMOUS_TASK_PREAMBLE.md) — Standing context for autonomous runs (prevents BI-SaaS drift)
- [`AIWMC_QUANTIS_MEGA_MASTER_PROMPT.md`](AIWMC_QUANTIS_MEGA_MASTER_PROMPT.md) — Master invariants for any Claude session
- [`baseline/MANIFEST.json`](baseline/MANIFEST.json) — Golden production baseline (route hashes + test count)

---

## License

Proprietary — © 2024-2026 AIWMC Quantis LLC. All rights reserved.

## Contact

- 🌐 [www.aiwmcquantis.com](https://www.aiwmcquantis.com)
- 📧 [hello@aiwmcquantis.com](mailto:hello@aiwmcquantis.com)
- 🐙 [github.com/AIWMCX/aiwmcquantis](https://github.com/AIWMCX/aiwmcquantis)
