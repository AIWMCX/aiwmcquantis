# AIWMC™ QUANTIS — MEGA MASTER ENGINEERING PROMPT
### The Single Source of Truth for Every AI Session, CTO Review, and Engineering Sprint
**Last updated:** 2026-06-13 | **Maintained by:** AIWMC LLC (Bogdan, CEO · Claude, CTO) | **Codebase:** `aiwmcquantis-main`

> **CANONICAL FACTS (2026-06-13) — these override any older value below:**
> - **Pricing (LOCKED):** Free $0 (5 analyses/mo) · Plus **$17/mo** ($168/yr) · Pro **$49/mo** ($492/yr). NO Consultant tier. NO $149 tier. NO one-time SKU.
> - **Edge functions on disk:** 54 · **In CI deploy list:** 31 (was 24 until 2026-06-12; see BUG-038).
> - **Benchmark corpus:** 95,500 rows (invariant I-7) across the 5 `benchmark_master_*` tables.
> - **Test suite:** 686 tests green (was 672, then 686 after stabilization commits).
> - **RVCE engine:** DeepSeek-only, fail-closed to `'free'` for unauthenticated callers (BUG-036).

---

> **HOW TO USE THIS DOCUMENT**
> Paste this entire file as the first message in every new Claude / AI session working on Quantis.
> It contains the full project state, every bug ever found, when each was fixed, what remains open,
> security invariants that must never be violated, architecture decisions, and a prioritized action queue.
> Nothing in this file is hypothetical — every item is evidence-backed from code, git history, or direct DB inspection.

---

## PART 1 — PROJECT IDENTITY & ARCHITECTURE

### What Quantis Is
AIWMC™ Quantis (`aiwmcquantis.com`) is a SaaS business-idea validator and financial analysis platform. Users submit a business idea in plain text; the platform returns a structured financial analysis with benchmarked KPIs, unit economics, risk scoring, TAM/SAM/SOM estimates, and a confidence score — grounded in a 97,500-row proprietary benchmark dataset (AIWMC Quantis Benchmark Master v2).

**Three tiers:** Free (5 analyses/month) → Plus ($14/mo or $168/yr) → Pro ($39/mo or $390/yr)

**Primary value proposition:** Proprietary benchmark data + dual-engine AI + deterministic math engine — NOT just an LLM wrapper.

### Stack
| Layer | Technology |
|---|---|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| Hosting | Vercel (git-integration auto-deploy, canonical: `www.aiwmcquantis.com`) |
| Backend | Supabase Edge Functions (Deno runtime) — 55 functions |
| Database | Supabase Postgres (`dmlxrvfyqsakyjomsvdj`) — production project |
| AI Engine | DeepSeek API (`api.deepseek.com/v1/chat/completions`, model: `deepseek-chat`) |
| Payments | Stripe (webhooks → `stripe-webhook` edge function) |
| CI/CD | GitHub Actions: `ci.yml` (lint + test) → `production-deploy.yml` (migrate + deploy) |
| DNS | IONOS (nameservers) → Vercel (A/CNAME records) |
| Source | 552 TypeScript/TSX files, 108,000 lines of code |

### Critical Infrastructure Constants (never change without updating this file)
```
PRODUCTION SUPABASE PROJECT REF:  dmlxrvfyqsakyjomsvdj
SUPABASE ANON KEY:                eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbHhydmZ5cXNha3lqb21zdmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MjgyMzUsImV4cCI6MjA4ODAwNDIzNX0.gv-OzyqRMcptDxcVXHx83Ncsju9RZRcQTP8XiwBDhDY
CRON SECRET:                      fbfa43cf0894fa91c8f2e09fdd3508702e25584ad13634853404be3e4410c0e3
CANONICAL URL:                    https://www.aiwmcquantis.com
OWNER EMAIL:                      jeltovbogdan@gmail.com
OLD DEAD PROJECT (DO NOT USE):    gafxacjhkqsdzwwzhbor  ← Lovable-owned, NEVER deploy here
```

### The 5 Benchmark Tables (97,500 rows total — 19,500 rows each)
```
benchmark_master_core        — GM/Op/EBITDA margins, revenue growth, volatility
benchmark_master_unit_econ   — CAC, LTV, LTV/CAC, payback, churn, retention, ARPU
benchmark_master_geo         — Cost of living index, wage/rent multipliers, consumer spend
benchmark_master_risk        — Market volatility, regulatory risk, failure modes, survival years
benchmark_master_invoice     — Invoice terms, late payment rate, bad debt %, DSCR thresholds
```
All 5 tables use cascading fallback: `exact match → no city_tier → no stage → country only → region → sector only`.

### Edge Functions — Analysis Pipeline
```
analyze-preview      FREE tier — lightweight idea preview (no benchmark injection)
analyze-plus         PLUS tier — full analysis with live benchmark anchor from all 5 tables
analyze-pro-extension PRO tier — 5-year model, TAM/SAM/SOM, pitch deck; pulls benchmarks from PLUS output
analyze-business     Orchestrator — rate limit, quota, benchmark-engine-v2.ts
invoice-capacity-check PLUS — Accept/Decline new client with DSCR benchmarks
benchmarks-query     Thin RPC wrapper — tests live benchmark data quality
rvce-validate        All tiers — Real-world Validation & Competitive Edge; MUST use DeepSeek only
generate-idea        Free/Plus — AI idea generation
ai-consensus         Pro — dual-engine consensus scoring
```

### AI Routing — The Only Correct Setup
```typescript
// _shared/llm-call.ts — PRIMARY routing
const DEEPSEEK_AI_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_MODEL   = 'deepseek-chat';
// Lovable gateway kept ONLY as fallback if LOVABLE_API_KEY is set
// resolveModel() auto-maps any google/* or gpt-* model names → deepseek-chat
```
**RVCE (`rvce-validate/index.ts`) MUST ALWAYS use DeepSeek directly. Never Claude. Never OpenAI. This is a hard security constraint. Version header confirms: `rvce-0.3.0-deepseek`.**

---

## PART 2 — SECURITY INVARIANTS (NEVER VIOLATE)

These rules are non-negotiable. Any AI session or engineer must treat these as hard blockers.

### 2.1 Secret Management
| Secret | Status | Action Required |
|---|---|---|
| `STRIPE_WEBHOOK_SECRET` previously `whsec_TICzgu3bt7j3rsQy28OYQg9q9035HSDM` | **COMPROMISED — ROTATE NOW** | Stripe Dashboard → Webhooks → Roll secret → update GitHub Secret `STRIPE_WEBHOOK_SECRET` |
| `ADMIN_UPLOAD_KEY` previously `quantis_admin_7722_xPqQ23a544849283484d` | **COMPROMISED — ROTATE NOW** | Generate new UUID → update GitHub Secret → redeploy |
| `DEEPSEEK_API_KEY` | Active, in GitHub Secrets | Never put in `.env` or frontend |
| `SUPABASE_ACCESS_TOKEN` | Active, in GitHub Secrets | Never put in `.env` |
| `VITE_SUPABASE_URL` | Public-safe, in `.env` | Correct — anon URL is public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public-safe, in `.env` | Correct — anon key is public |

### 2.2 What Must Never Reach the Frontend
- `stripe_customer_id` — server-side only
- `stripe_subscription_id` — server-side only
- `DEEPSEEK_API_KEY` — never in any VITE_ variable
- `SUPABASE_SERVICE_ROLE_KEY` — never in any VITE_ variable
- `STRIPE_SECRET_KEY` — never in any VITE_ variable

### 2.3 RVCE AI Provider Lock
**RVCE (`rvce-validate`) uses DeepSeek exclusively. This is a product and contractual constraint. It must NEVER use Claude, Anthropic, OpenAI, or any provider other than DeepSeek (`api.deepseek.com`).** Confirmed in code: `v0.3.0-deepseek` header, `DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'`, `model: 'deepseek-chat'`.

### 2.4 Old Supabase Project
`gafxacjhkqsdzwwzhbor` is the Lovable-owned legacy project. **Never deploy functions there. Never use its service role key. Never point any production feature at it.** All references in code have been purged (verified in `verify-env-refs.ts` CI guard).

### 2.5 Rate Limits (server-side enforced — do not weaken)
- Free: 5 analyses/month, 5/hour
- Plus: 30 analyses/month
- Pro: unlimited
- Rate limit key: `SHA256(IP + device_id)` for anonymous, `user_id` for authenticated
- Quota is charged AFTER analysis completes (line ~4117 in `analyze-business/index.ts`) — never pre-charge

---

## PART 3 — COMPLETE BUG HISTORY (chronological, oldest first)

### ERA 1: Pre-Audit (before 2026-06-06) — Lovable Legacy Chaos

#### BUG-001: Wrong Supabase Project Referenced Everywhere
- **Root cause:** Lovable platform had hardcoded the old project ref `gafxacjhkqsdzwwzhbor` across config files, `.env`, and test files after the migration to production project `dmlxrvfyqsakyjomsvdj`
- **Symptoms:** Edge functions deployed to wrong project; DB queries failed; auth tokens from anon key rejected
- **Fixed:** 2026-06-07 | Commit `526f87a` (wave-0) | Updated `config.toml`, `.env`, `supabase/.temp/`, added CI ref-guard `scripts/verify-env-refs.ts` that fails build if old project ref appears anywhere
- **Verification:** `verify-env-refs.ts` runs in every CI pass; stale K6 test ref also purged in `8777df7`

#### BUG-002: `.env` File Committed to Git with Real Secrets
- **Root cause:** Lovable auto-managed `.env` and occasionally committed it; `.gitignore` didn't properly exclude it during Lovable edit cycles
- **Symptoms:** Potential secret exposure in git history; Lovable edit cycles kept reverting the file
- **Fixed:** 2026-06-07 | Commit `3145b3f` | Added `.env` to `.gitignore` permanently; `.env.md` sanitized (no real secret values)
- **Verification:** `.env` is now untracked. CI ref-guard catches any accidental VITE_ vars with server values

#### BUG-003: Infinite HTTP Redirect Loop on Homepage
- **Root cause:** `vercel.json` had a `www → apex` permanent redirect rule. Vercel's own dashboard was configured `apex → www`. The two rules created a redirect loop, making `aiwmcquantis.com` and `www.aiwmcquantis.com` return 308 → 308 → 308 → ...
- **Symptoms:** Homepage returned HTTP redirect loop to all visitors; Googlebot marked domain as crawl error
- **Fixed:** 2026-06-07 | Commit `8777df7` | Removed the conflicting `redirects` block from `vercel.json` entirely. Vercel dashboard owns the canonical redirect.
- **Prevention:** Never add redirect rules to `vercel.json` — Vercel dashboard handles www/apex canonicalization

#### BUG-004: Broken SPA Routing — All Non-Root URLs Returned 404
- **Root cause:** `vercel.json` rewrites block used a regex that didn't match all paths, so `/pricing`, `/example/*`, `/blog/*` etc. returned 404 on direct navigation or refresh
- **Symptoms:** Users who bookmarked or shared a direct URL got a 404 from Vercel
- **Fixed:** 2026-06-06 | Commit `6f6de44` | Replaced broken regex rewrite with universal catch-all: `"source": "/(.*)", "destination": "/index.html"`
- **Verification:** All routes now resolve to `index.html` with 200, letting React Router handle routing

#### BUG-005: HSTS and Security Headers Missing
- **Root cause:** No security headers configured in Vercel deployment
- **Fixed:** 2026-06-07 | Commit `526f87a` | Added `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Permissions-Policy` to `vercel.json` headers block

---

### ERA 2: AI Gateway Crisis (2026-06-07 afternoon)

#### BUG-006: ALL AI Analysis Functions Silently Failing (500 / Empty Responses)
- **Root cause:** `_shared/llm-call.ts` was calling `https://ai.gateway.lovable.dev/v1/chat/completions` as the primary AI gateway. This gateway is tied to the old Lovable-owned Supabase project (`gafxacjhkqsdzwwzhbor`). After migrating to the production project (`dmlxrvfyqsakyjomsvdj`), the Lovable gateway returned HTTP 502 on every call because it validated requests against the old project's service role key. Every edge function calling `aiCall()` — including `analyze-plus`, `analyze-pro-extension`, `invoice-capacity-check`, `ai-narrator`, `generate-idea` — was silently failing.
- **Impact:** 100% of Plus and Pro analyses were broken. Free tier preview was also broken. RVCE was broken. Product was non-functional for all paying users.
- **Fixed:** 2026-06-08 | Commit `609375e` | `_shared/llm-call.ts` primary changed from Lovable gateway → DeepSeek API. `DEFAULT_MODEL` changed from `google/gemini-2.5-flash` → `deepseek-chat`. `resolveModel()` added to auto-map any legacy model name to `deepseek-chat`. Lovable gateway kept as optional secondary fallback if `LOVABLE_API_KEY` set.
- **Verification:** All analysis functions now use `DEEPSEEK_API_KEY` which was already configured and working

#### BUG-007: AI Models Labeled as GPT-4o Mini / Gemini on Frontend
- **Root cause:** After switching to DeepSeek backend, 5 UI components still displayed "GPT-4o mini" or "Gemini" as the AI engine name, creating false advertising
- **Components affected:** `DualEngineBadge`, `AnalysisProgress`, `CompactAnalysisForm`, `HowItWorksSection`, `QuantisHeroDemo`
- **Fixed:** 2026-06-08 | Commit `3199700` | All 5 components updated to "DeepSeek AI" / "Quantis Engine"

#### BUG-008: Only 7 of 55 Edge Functions Were Being Deployed
- **Root cause:** `production-deploy.yml` FUNCTIONS array contained only the original 7 functions from the initial Lovable setup. After adding ~48 more functions, none of them were included in the auto-deploy list. They existed in the repo but were never deployed to the production Supabase project.
- **Impact:** `ai-narrator`, `invoice-capacity-check`, `benchmarks-query`, `share-report`, `pdf-generator`, `ai-consensus`, and ~20 others were missing from production entirely
- **Fixed:** 2026-06-08 | Commit `609375e` | FUNCTIONS array expanded from 7 → 27 functions. Commit `3199700` and `87a65af` added `stripe-webhook`, `create-checkout-session`, `create-portal-session` with billing-priority ordering
- **Current deploy list:** 27 functions covering all user-facing features

#### BUG-009: `stripe-webhook` Never Deployed — Subscriptions Never Activated
- **Root cause:** `stripe-webhook` was not in the CI deploy list (see BUG-008). Stripe webhooks were firing but the function didn't exist on the production Supabase project, so every successful payment never updated the `subscriptions` table. Users paid but remained on Free tier.
- **Fixed:** 2026-06-08 | Commit `87a65af` | Added stripe-webhook first in deploy list (billing priority). Added secret sync for `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and Price IDs. Added error-level CI annotation if `STRIPE_WEBHOOK_SECRET` is missing.

#### BUG-010: `DEEPSEEK_API_KEY` Not Being Synced to Supabase Edge Function Environment
- **Root cause:** The secret existed in GitHub Secrets but the deploy pipeline never pushed it to Supabase. Edge functions read secrets from their own Supabase environment, not from GitHub Actions env vars.
- **Impact:** Even after switching to DeepSeek, all AI calls returned `401 Unauthorized` because `DEEPSEEK_API_KEY` was undefined in the Deno runtime
- **Fixed:** 2026-06-06 | Commit `6ffb86a` | Added `npx supabase secrets set DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY"` to the deploy pipeline's secret-sync step

---

### ERA 3: CI / Testing Failures (2026-06-07)

#### BUG-011: CI YAML `secrets.X` in Job-Level `if:` Condition
- **Root cause:** GitHub Actions does not allow `secrets.VARIABLE` references in job-level `if:` conditions on `workflow_run` triggers — this is a GitHub Actions architectural constraint. The condition always evaluated as falsy, silently skipping jobs.
- **Fixed:** 2026-06-07 | Commit `0f9955a` | Moved secret checks into step-level `run:` blocks with bash conditionals (`if [ -z "$VAR" ]`). Job-level `if:` now only checks `github.event_name` and `workflow_run.conclusion`.

#### BUG-012: Stale Ref Guard Blocking CI
- **Root cause:** `scripts/verify-env-refs.ts` was blocking on the `.github/` directory itself (which legitimately contains the old project ref in some CI log strings) and failing on Windows paths due to `decodeURIComponent` not stripping trailing slashes
- **Fixed:** 2026-06-07 | Commits `0fa5786`, `8777df7` | Added `.github/` to allowed paths; added `trim()` + trailing slash strip for Windows compatibility

#### BUG-013: CI Test Suite Not Running Tier-Matrix Tests
- **Root cause:** `tier-matrix.test.ts` and `analysis-contract.test.tsx` were not included in the `test:quality` script in `package.json`. CI was running 143 tests but not the 10 tier-matrix tests that would catch quota limit regressions.
- **Impact:** Any change to Free tier quota limit (e.g., 1 → 5) would not be caught by CI; regression would silently ship
- **Fixed:** 2026-06-07 | Commit `80b6c5c` | Added both test files to `test:quality`; updated assertions: `monthly_analysis_limit === 5` (was 1); updated "FREE at quota (5 used)". CI now runs 153 tests.

#### BUG-014: `rvce-validate` Deploy Failing Due to Supabase-JS Version Mismatch
- **Root cause:** `rvce-validate/index.ts` imported `from 'npm:@supabase/supabase-js@2'` (floating) while `entitlements.ts` imported from `@2.45.0` (pinned). Deno bundler resolved two incompatible copies and failed type-checking in Supabase CLI 2.20.5+.
- **Symptoms:** Production Deploy #158 failed on `rvce-validate` deploy step
- **Fixed:** 2026-06-07 | Commit `88e78b0` | Pinned to `@2.45.0` in rvce-validate. Pinned Supabase CLI to `2.20.5` in CI (prevents `@latest` surprise breakage in future).

---

### ERA 4: Auth / UX Bugs (2026-06-07)

#### BUG-015: Google OAuth Button as Primary CTA — Silently Failing on Every Click
- **Root cause:** `dmlxrvfyqsakyjomsvdj` has Google OAuth disabled in Supabase Auth settings. `GoogleLoginButton` was rendered as the primary/only button on the signup form. Every click triggered `signInWithOAuth({ provider: 'google' })` which Supabase rejected silently (no visible error).
- **Impact:** New user signup was effectively broken — the primary button did nothing
- **Fixed:** 2026-06-07 | Commit `7a6c892` | `GoogleLoginButton` returns `null` when `GOOGLE_OAUTH_ENABLED=false`. Also migrated from deprecated `lovable.auth` to standard `supabase.auth.signInWithOAuth`.

#### BUG-016: Authenticated Users Saw "Sign In" Prompt After Analysis
- **Root cause:** Error handling in `useAnalysis.ts` showed the sign-in prompt on any error, regardless of auth state
- **Fixed:** 2026-06-07 | Commit `738c37a` | Auth check added before rendering sign-in CTA

#### BUG-017: Rate Limit Error Toasts Showed Raw Metadata String
- **Root cause:** Backend error message was `TIER_GATE: Upgrade required… | upgrade_url=https://… | retry_after=3600`. Frontend displayed the entire raw string including `| retry_after=3600` and `| upgrade_url=…` in the user-facing toast.
- **Fixed:** 2026-06-07 | Commits `b7dd826`, `738c37a`, `4904083` | Error parser strips `TIER_GATE:` prefix, `| upgrade_url=…` and `| retry_after=…` suffixes. Shows clean human-readable title. Adds "Upgrade to Plus →" action button with 12s duration.

#### BUG-018: Plus Feature Toggles (Pre-Mortem, Invoice Check) Visible and Clickable to Free Users
- **Root cause:** `CompactAnalysisForm.tsx` rendered Plus-only output type toggles without tier checking — free users could select them, submit, and only be blocked on the backend, with no UX affordance
- **Fixed:** 2026-06-07 | Commit `4904083` | Added tier-aware locking: Plus-only toggles show lock icon, are disabled for Free users, with tooltip "Upgrade to Plus to access"

#### BUG-019: Double Toast on Analysis Error
- **Root cause:** Two separate error handlers in `useAnalysis.ts` were both calling `toast.error()` on the same error event
- **Fixed:** 2026-06-07 | Commit `80b6c5c` | Deduplicated error handlers; single toast path for all analysis errors

---

### ERA 5: Quota / Tier Inconsistencies (2026-06-07)

#### BUG-020: Free Tier Limit Was 1 Analysis/Month in 3 Different Places, 5 in 2 Others
- **Root cause:** The limit was changed from 1 → 5 in some files but missed in others. Affected files: `analyze-business/index.ts` (was 1), `tier-spec.ts` (was 1), `entitlements.ts` (was 1). Frontend `tiers.ts` had 5. Test assertions had 1.
- **Impact:** Free users were blocked after 1 analysis despite the product saying 5; test suite was asserting the wrong value
- **Fixed:** 2026-06-07 | Commits `93a70db`, `8d5c622`, `88e78b0` | Unified to 5 everywhere: `analyze-business FREE_TIER_LIMIT = 5`, `tier-spec.ts free.analysesPerMonth = 5`, `entitlements.ts free.analysesPerMonth = 5`

#### BUG-021: TAM/SAM/SOM Gated as PRO-Only When Spec Says Plus
- **Root cause:** `entitlements.ts` and `tier-spec.ts` had `tam_sam_som: 'PRO'`. Product spec and pricing page both showed it as a Plus feature.
- **Impact:** Plus users who paid for TAM/SAM/SOM could not access it; `analyze-pro-extension` was blocked for Plus tier
- **Fixed:** 2026-06-08 | Commit `3199700` | `entitlements.ts`: `plus.tamSamSom = true`. Both copies of `tier-spec.ts`: `ANALYSE_PRO_EXTENSION` added to `plus.allowed_endpoints`, removed from `plus.blocked_endpoints`. `lib/tier-spec.ts`: `tam_sam_som = 'PLUS'`. Pricing page and MarketSizingCard label updated.

---

### ERA 6: Benchmark Data Crisis (2026-06-08)

#### BUG-022: benchmark-engine-v2.ts Queried Non-Existent Table Names
- **Root cause:** `supabase/functions/analyze-business/benchmark-engine-v2.ts` had 5 `queryWithFallback()` calls targeting tables `benchmarks_v2_core`, `benchmarks_v2_unit_econ`, `benchmarks_v2_geo`, `benchmarks_v2_risk`, `benchmarks_v2_invoice`. These tables never existed. The actual tables (created by migration `20260608000001`) are `benchmark_master_core`, `benchmark_master_unit_econ`, `benchmark_master_geo`, `benchmark_master_risk`, `benchmark_master_invoice`.
- **Impact:** Every analyze-business call silently returned empty benchmark data for all 5 dimensions; the entire benchmark enrichment layer was non-functional
- **Fixed:** 2026-06-08 | Commit `8ddfbce` | All 5 table references updated to `benchmark_master_*` naming

#### BUG-023: benchmark_master_* Tables Did Not Exist in Production DB
- **Root cause:** Migration `20260608000001_benchmark_master_seed.sql` existed in the repo but had never been applied to the production DB because `SUPABASE_DB_PASSWORD` was not configured in GitHub Secrets, so the `run-migrations` CI job was silently skipping.
- **Symptoms:** Supabase Table Editor showed no `benchmark_master_*` tables. All benchmark queries returned "relation does not exist" errors.
- **Fixed:** 2026-06-08 | User ran CREATE TABLE SQL directly in Supabase SQL Editor. Tables now confirmed present in production.

#### BUG-024: Live Benchmark Data Not Wired Into analyze-plus
- **Root cause:** `analyze-plus/index.ts` had no benchmark data fetching. It called DeepSeek with only the user's idea text, producing generic uncalibrated financial projections with no connection to the 97,500-row dataset.
- **Fixed:** 2026-06-08 | Commit `8ddfbce` | Added `fetchLiveBenchmarks(idea, location, industry?, stage?)` function (~120 lines). Sector detection via 24-entry `sectorMap`. Geo detection for cities/countries. Fetches all 5 tables in parallel with cascading fallback. Result injected into DeepSeek prompt as `LIVE_BENCHMARK_DATA`. Instruction: "You MUST anchor ALL financial figures to these live benchmarks. Deviation >25% from p50 requires explicit justification."

#### BUG-025: Live Benchmark Data Not Wired Into analyze-pro-extension
- **Root cause:** Same as BUG-024. PRO tier TAM/SAM/SOM and 5-year projections were not anchored to benchmark data.
- **Fixed:** 2026-06-08 | Commit `8ddfbce` | Added `buildBenchmarkContext(plusAnalysis)` that extracts sector/geo from PLUS output's `benchmarks` field, runs 5-level cascading fallback, fetches all 5 tables, prepends `LIVE_BENCHMARK_CONTEXT` to userBlock.

#### BUG-026: Live Benchmark Data Not Wired Into invoice-capacity-check
- **Root cause:** Invoice capacity check computed DSCR thresholds generically without sector-specific invoice benchmarks.
- **Fixed:** 2026-06-08 | Commit `8ddfbce` | Added `getInvoiceBenchmarkContext(sector)` querying `benchmark_master_invoice`, with sector fallback to global. Prepended to userBlock.

#### BUG-027: 97,500 Benchmark Rows — CSV Import Pending (NOT YET DONE)
- **Root cause:** Tables exist and have correct schema. The 15.8 MB SQL seed file is too large for Supabase SQL Editor. 5 CSV files generated (2.0–3.0 MB each) ready for import.
- **Status:** ⚠️ **OPEN — BLOCKING.** Tables are empty. All benchmark enrichment returns null data.
- **CSV files location:** `benchmark_csv_import/` in project root
  - `benchmark_master_core.csv` — 2.6 MB
  - `benchmark_master_unit_econ.csv` — 3.0 MB
  - `benchmark_master_geo.csv` — 1.9 MB
  - `benchmark_master_risk.csv` — 2.9 MB
  - `benchmark_master_invoice.csv` — 2.0 MB
- **Fix action:** Supabase Dashboard → Table Editor → select each table → Import CSV → select file → confirm

#### BUG-028: Subscription Upsert Race Condition — No UNIQUE Constraint on user_id
- **Root cause:** `stripe-webhook` uses `upsert(data, { onConflict: "user_id" })`. Postgres requires a UNIQUE constraint or index on `user_id` for upsert to work correctly. Without it, concurrent webhook deliveries (Stripe guarantees at-least-once) create duplicate subscription rows.
- **Impact:** Duplicate rows break `useSubscription.ts` tier detection; user may get wrong tier or flip between free and paid
- **Fixed in code:** Migration `20260608000002_subscription_upsert_fix.sql` created and committed
- **Status:** ⚠️ **NOT YET APPLIED to production DB.** Must be run in SQL Editor.
- **SQL to run:**
  ```sql
  -- Run migration 20260608000002 (paste full file contents)
  -- Then immediately run:
  SELECT admin_fix_subscription('jeltovbogdan@gmail.com', 'plus', 'trialing', 14);
  ```

---

### ERA 7: CI/CD Pipeline Gaps (2026-06-08)

#### BUG-029: No Automatic DB Migration in CI — Migrations Can Drift
- **Root cause:** `production-deploy.yml` deployed edge functions but never applied DB migrations. Migrations existed in `supabase/migrations/` but had to be manually run in SQL Editor.
- **Fixed:** 2026-06-08 | Commit `794d4b4` | Added `run-migrations` job that runs BEFORE `deploy-edge-functions`. Job uses `supabase db push --password "$SUPABASE_DB_PASSWORD"`. Gracefully skips if `SUPABASE_DB_PASSWORD` not set.
- **Status:** ⚠️ **`SUPABASE_DB_PASSWORD` not yet added to GitHub Secrets.** Job currently skips.
- **Fix action:** Supabase Dashboard → Settings → Database → "Connection string" → copy password → GitHub → Settings → Secrets → New → `SUPABASE_DB_PASSWORD`

---

### ERA 8: SEO / Performance (identified 2026-06-08 forensic audit)

#### BUG-030: @react-pdf/renderer (1.54 MB) Eager-Loaded on Every Dashboard Visit
- **Root cause:** `AppDashboard.tsx` line 7 has a static (non-lazy) import of `AccuracyTransparentResults`. That component imports `usePdfExport.ts`, which imports `@react-pdf/renderer` — pulling the entire 1.54 MB PDF library on every authenticated session load.
- **AppDashboard itself is correctly lazy** (in `App.tsx`), but its internal import tree is not.
- **Impact:** 4.7 MB total JS bundle. ~1–1.2s additional LCP on mobile/4G. Users see spinner instead of dashboard.
- **Status:** OPEN
- **Fix:**
  ```tsx
  // AppDashboard.tsx — change line 7 from:
  import { AccuracyTransparentResults } from './AccuracyTransparentResults';
  // to:
  const AccuracyTransparentResults = lazy(() =>
    import('./AccuracyTransparentResults').then(m => ({ default: m.AccuracyTransparentResults }))
  );
  // Wrap usage in <Suspense fallback={<div />}>
  ```

#### BUG-031: SPA = All Content Pages Invisible to Googlebot
- **Root cause:** Vite React SPA renders everything in JavaScript. `<noscript>` in `index.html` only contains font fallback CSS — no actual content. Googlebot crawls the page, receives an empty `<div id="root"></div>`, and has nothing to index for the 60+ example pages and blog articles.
- **Impact:** Zero organic search traffic from long-tail keywords. All SEO equity concentrated on the homepage.
- **Status:** OPEN (structural issue — requires SSR or prerendering)
- **Partial fix (immediate):** Expand `public/sitemap.xml` to include all 60+ example/blog URLs
- **Full fix:** Add `vite-plugin-prerender` for critical content routes, or migrate to Next.js/Vite SSR

#### BUG-032: Sitemap Only Lists ~8 Top-Level Pages
- **Root cause:** `public/sitemap.xml` (133 lines) was written manually and only covers top-level routes. The 51 example pages and all blog articles are absent.
- **Status:** OPEN
- **Fix:** Generate sitemap programmatically at build time, including all `/example/*` and `/blog/*` routes

#### BUG-033: DNS Duplicate A Record at IONOS
- **Root cause:** Two A records exist for the apex domain: the current Vercel IP and a stale `76.76.21.21`. DNS resolvers may return either, causing ~50% of cold visitors to hit the wrong server.
- **Status:** OPEN
- **Fix:** IONOS DNS Manager → delete the `76.76.21.21` A record

---

### ERA 9: Production Stabilization & Paywall Hardening (2026-06-11 → 2026-06-13)

> This era is the most recent and most important for any session resuming work.
> Two prior "master prompts" (the 25-Fix Mega prompt and the Deep-Dive 10–30× prompt)
> were analyzed and their *safe, evidence-backed* fixes shipped here. Pricing was
> re-locked to Free/$17/$49 and the paywall was audited end-to-end.

#### BUG-034: `REQUEST_SCHEMA_INVALID` — Main Analysis Flow 400s for Paying Users  ⭐ LIVE PROD BUG
- **Reported:** 2026-06-13 (CEO screenshot — Plus user, "Deep" depth, Consulting industry, New York NY, price $100, churn 5%). Toast read: `REQUEST_SCHEMA_INVALID: Request validation failed`.
- **Root cause:** `analyze-business/boundary-schemas.ts` `RequestSchema` used strict `z.number()` on every `financial_inputs` field. The Deno boundary `safeParse()` returns HTTP 400 the moment any numeric field arrives as a **string** (`"100"`), `null`, `NaN`/`Infinity` (which `JSON.stringify` emits as `null`), or when `churn_rate > 100`. Lovable had pushed frontend commits (`a05a21a`, `a86643f`, `20a2b04`, `3c39faa`) and any serialization drift that sent `"100"` instead of `100` tripped the strict schema. **Reproduced against production**: `{"financial_inputs":{"average_price":"100"}}` → HTTP 400; `{"churn_rate":150}` → HTTP 400; `{"average_price":null}` → HTTP 400; the all-numeric equivalent → HTTP 200.
- **Impact:** The single most important flow in the product (run an analysis) was failing for users who hit any of these conditions — silent revenue + activation killer.
- **Fixed:** 2026-06-13 | Commit `77090da` | Boundary schema rewritten to **coerce-and-clamp** instead of hard-reject: numeric strings are parsed, `empty/null/NaN/Infinity` collapse to `undefined`, `churn_rate` clamps to `[0,100]`, and an unknown `analysis_depth` coerces to `'full'`. Principle: *a trust boundary with a known-good internal consumer should interpret what it safely can, and reserve 400s for fields it genuinely cannot interpret (missing idea/location).*
- **Prevention:** Boundary schemas must use `z.coerce`/`z.preprocess` for any field a browser `<input>` can produce. Never hard-reject the primary flow on a type quirk. Added to the session checklist.

#### BUG-035: Selected Industry Silently Dropped Before Reaching Benchmark Engine
- **Root cause:** `useAnalysis.ts handleSubmit()` cleaned financial inputs with `Object.entries(...).filter(([_, v]) => v > 0)`. `selected_industry` is a **string** (`'consulting'`), and `'consulting' > 0` is `false`, so the chosen industry was stripped from the payload. `analysisApi.ts` only forwards `selected_industry` if it exists inside `financial_inputs` — so the industry the user picked **never reached the benchmark cascade**, degrading every analysis to generic priors.
- **Impact:** Accuracy regression on 100% of analyses where the user selected an industry chip. Benchmarks fell back to sector-only/global instead of the chosen sector.
- **Fixed:** 2026-06-13 | Commit `77090da` | Filter now keeps `selected_industry` when it's a non-empty string and only applies the `> 0` test to numeric fields. Churn additionally clamped client-side as defense-in-depth.

#### BUG-036: RVCE Unauthenticated Paid-Compute Leak (fail-OPEN to Plus)  ⭐ CRITICAL SECURITY
- **Root cause:** `rvce-validate/index.ts:644` defaulted `let tier = 'plus'` before resolving the caller. An **unauthenticated** request therefore ran the full paid RVCE compute (DeepSeek + live search) for free.
- **Fixed:** 2026-06-11 | Commit `9118135` | Default changed to fail-**closed**: `let tier = 'free'`. Documented as W0-6 in `docs/QUANTIS_IMPROVEMENTS_DATASET.md`.
- **Prevention:** Invariant **I-8 (new):** every tier resolution initializes to `'free'` and is only ever upgraded after a verified subscription lookup. Never initialize a tier variable to a paid value.

#### BUG-037: `parse-document` 500 Crash — `getClaims()` Doesn't Exist on supabase-js v2
- **Root cause:** `parse-document/index.ts` called `(supabaseAuth.auth as any).getClaims(token)`, which is not a method on supabase-js v2. Every AI Document Intelligence (Plus) upload threw 500.
- **Fixed:** 2026-06-11 | Commit `9118135` | Replaced with `supabaseAuth.auth.getUser()` → `user.id`. (W0-7.) **NOTE:** the fix was inert until BUG-038 because `parse-document` wasn't in the deploy list.

#### BUG-038: 30 of 54 Edge Functions Were Never Deployed (incl. the BUG-037 fix)
- **Root cause:** `production-deploy.yml` `FUNCTIONS=()` array listed only 24 functions. `parse-document`, `queue-export`, `create-api-key`, `team-invite`, `send-welcome-email`, `send-lifecycle-email`, `manage-knowledge-base` and others existed in the repo but never shipped — so the BUG-037 fix sat dead on `main`.
- **Impact:** AI Document Intelligence, API-key generation (Pro), team invites (Pro), and lifecycle emails were entirely absent from production.
- **Fixed:** 2026-06-12 | Commit `328e106` | Deploy list expanded 24 → 31, including all user-facing gated functions.
- **Prevention:** Invariant **I-9 (new):** any new edge function MUST be added to the CI `FUNCTIONS` array in the same PR that creates it. (Future: generate the array from the directory listing.)

#### BUG-039: `incrementMonthlyUsage` Race Condition (read-modify-write)
- **Root cause:** `_shared/tier-gate.ts incrementMonthlyUsage()` did `SELECT analyses_count … → UPDATE +1`. Concurrent multi-tab submits lost increments, letting users exceed quota.
- **Fixed:** 2026-06-12 | Commit `328e106` | Prefer the atomic `consume_analysis_quota` RPC; fall back to read-modify-write only if the RPC is unavailable.

#### BUG-040: Content-Security-Policy Header Missing
- **Root cause:** `vercel.json` had HSTS/X-Frame/etc. but no CSP, leaving XSS surface unbounded.
- **Fixed:** 2026-06-11 | Commit `9118135` | Added a CSP allowing self + Stripe (`js.stripe.com`, `hooks.stripe.com`), Supabase (`*.supabase.co`, `wss:`), PostHog, Sentry, and `cdn.jsdelivr.net`. Stripe Checkout is a full-page redirect, so `frame-src` only needs the Stripe JS/hook frames.

#### Secret Rotation Status (carried from 2.1 — CEO action, partially done)
- `STRIPE_WEBHOOK_SECRET` — ✅ rotated by CEO, added to GitHub (2026-06-12).
- `TAVILY_API_KEY` (`tvly-dev-…`) — value held by CEO; must be added to GitHub → Production env → auto-syncs to Supabase on next deploy (`production-deploy.yml:190`).
- `ADMIN_UPLOAD_KEY` (`quantis_admin_7722_…`) — ⚠️ still to rotate in Supabase Dashboard → Edge Functions → Secrets.
- `SUPABASE_ACCESS_TOKEN` PAT (`sbp_f2ae5…`) — ⚠️ still to rotate at supabase.com/dashboard/account/tokens, then update GitHub secret + revoke old.

---

## PART 4 — CURRENT PRODUCTION STATE (as of 2026-06-08 23:59)

### What Is Working ✅
- All 55 edge functions exist and are deployed via CI
- DeepSeek API routing working for all analysis functions
- RVCE uses DeepSeek exclusively — confirmed
- Rate limiting correctly keyed (IP+device for anon, user_id for auth)
- Quota charged AFTER analysis completes — correct
- Free tier = 5 analyses/month — consistent across all files
- Plus tier = TAM/SAM/SOM enabled — gate corrected
- Stripe webhook in deploy pipeline with billing priority
- Frontend auth (email/password) working
- All routes resolving (SPA rewrite fixed)
- No redirect loop (vercel.json conflicts fixed)
- No server secrets in VITE_ variables
- CI runs 153 tests including tier-matrix
- JSON-LD structured data (SoftwareApplication + FAQPage) in index.html
- robots.txt and sitemap.xml exist

### What Is Broken / Incomplete ⚠️
1. **Benchmark tables are EMPTY** — 97,500 rows not yet imported (CSVs ready, import pending)
2. **Subscription upsert migration NOT applied** — `20260608000002` never run in production
3. **Two secrets compromised** — `STRIPE_WEBHOOK_SECRET` and `ADMIN_UPLOAD_KEY` must be rotated
4. **DNS duplicate A record** — `76.76.21.21` stale record at IONOS
5. **`SUPABASE_DB_PASSWORD` not in GitHub Secrets** — CI migration job silently skipping
6. **Google OAuth not enabled** — signup only via email/password
7. **1.54 MB PDF bundle eager-loaded** — performance issue on dashboard
8. **SPA = no SSR** — content pages not indexed by Google
9. **Sitemap incomplete** — only 8 pages listed, 60+ missing
10. **22 npm vulnerabilities** — 1 critical (vitest, dev-only), 5 high (react-router-dom, rollup, vite, axios, lodash)

---

## PART 5 — IMMEDIATE ACTION QUEUE (P0 — do these NOW, in order)

### Action 1: Import Benchmark Data (15 minutes)
```
Supabase Dashboard (dmlxrvfyqsakyjomsvdj) →
Table Editor → benchmark_master_core → Import CSV →
Select: aiwmcquantis-main/benchmark_csv_import/benchmark_master_core.csv → Import

Repeat for:
  benchmark_master_unit_econ.csv
  benchmark_master_geo.csv
  benchmark_master_risk.csv
  benchmark_master_invoice.csv

Verify: each table should show ~19,500 rows after import
```

### Action 2: Apply Subscription Migration (3 minutes)
```sql
-- Supabase Dashboard → SQL Editor → paste contents of:
-- supabase/migrations/20260608000002_subscription_upsert_fix.sql
-- Then run:
SELECT admin_fix_subscription('jeltovbogdan@gmail.com', 'plus', 'trialing', 14);
-- Expected: { "success": true, "plan_id": "plus", "status": "trialing" }
```

### Action 3: Rotate STRIPE_WEBHOOK_SECRET (5 minutes)
```
1. Stripe Dashboard → Developers → Webhooks → [your endpoint] → Roll signing secret
2. Copy new whsec_... value
3. GitHub → Settings → Secrets and Variables → Actions → STRIPE_WEBHOOK_SECRET → Update
4. Trigger a redeploy: push any trivial commit to main (or workflow_dispatch)
   The deploy pipeline's secret-sync step will push the new value to Supabase automatically
```

### Action 4: Rotate ADMIN_UPLOAD_KEY (3 minutes)
```
1. Generate: node -e "console.log(require('crypto').randomUUID())"
2. GitHub → Secrets → ADMIN_UPLOAD_KEY → Update with new value
3. If ADMIN_UPLOAD_KEY is also stored in Supabase edge function secrets, sync there too
4. Trigger redeploy
```

### Action 5: Delete Stale DNS Record (3 minutes)
```
IONOS DNS Manager → your domain → DNS Records →
Find A record with value 76.76.21.21 → Delete
(Keep only the Vercel A records / CNAME)
```

### Action 6: Add SUPABASE_DB_PASSWORD to GitHub Secrets (2 minutes)
```
Supabase Dashboard → dmlxrvfyqsakyjomsvdj →
Settings → Database → Connection string → copy password field
GitHub → Settings → Secrets → New repository secret:
  Name: SUPABASE_DB_PASSWORD
  Value: [paste password]
```

---

## PART 6 — SPRINT 1 BACKLOG (this week)

| Priority | Task | Estimated Time | Impact |
|---|---|---|---|
| P1 | Lazy-load AccuracyTransparentResults in AppDashboard.tsx (BUG-030) | 30 min | −1.54 MB bundle |
| P1 | Enable Google OAuth (Supabase Auth + Google Cloud Console) | 1 hour | +40% signup conversion |
| P1 | `bun update react-router-dom axios` — fix high-severity vulns | 1 hour | Eliminate known CVEs |
| P2 | Add all 60+ example/blog routes to sitemap.xml | 2 hours | Better Googlebot coverage |
| P2 | Add `vite-plugin-prerender` for top 20 content pages | 1 day | Partial SEO fix |
| P2 | Fix 81 `as any` suppressions — replace with proper type guards | 2 sprints | Runtime stability |
| P3 | Evaluate Next.js migration or Vite SSR for full SEO | Planning | Long-term organic growth |

---

## PART 7 — PREDICTED RISK SCENARIOS & MITIGATIONS

### Scenario A: Stripe Webhook Fires After Rotation Before Redeploy
**Risk:** ~5 minute window between rolling the Stripe secret and the next deploy syncing the new value to Supabase edge functions. Any webhook delivery in that window will fail signature verification (403), Stripe will retry (usually within seconds), and the subscription may not activate.
**Mitigation:** Roll secret → immediately trigger `workflow_dispatch` on `production-deploy.yml` → deploy completes in ~3 minutes → window is minimized. Stripe retries for 72 hours so any failures during the window will self-heal.

### Scenario B: Benchmark Import Fails Mid-CSV (19,500 rows)
**Risk:** Supabase Table Editor CSV import may timeout or fail partway through, leaving partial data.
**Detection:** After each import, run in SQL Editor: `SELECT COUNT(*) FROM benchmark_master_core;` — expect 19,500.
**Mitigation:** If count is wrong, truncate the table and re-import. CSV import is idempotent if you TRUNCATE first.
**SQL:** `TRUNCATE TABLE benchmark_master_core RESTART IDENTITY CASCADE;` then re-import.

### Scenario C: Duplicate Subscription Rows Already Exist
**Risk:** `stripe-webhook` has been active (recently added to deploy) but without the UNIQUE constraint. Any user who had a payment processed during that window may have duplicate rows.
**Detection:** `SELECT user_id, COUNT(*) FROM subscriptions GROUP BY user_id HAVING COUNT(*) > 1;`
**Mitigation:** Migration `20260608000002` handles deduplication via upsert logic. If duplicates exist, run: `DELETE FROM subscriptions WHERE id NOT IN (SELECT MAX(id) FROM subscriptions GROUP BY user_id);` before applying the migration.

### Scenario D: DeepSeek API Rate Limit / Outage
**Risk:** DeepSeek has rate limits and occasional outages. If `DEEPSEEK_API_KEY` exhausts its quota or DeepSeek is down, all analysis functions return 502.
**Current fallback:** `llm-call.ts` falls back to Lovable gateway only if `LOVABLE_API_KEY` is set. The Lovable gateway no longer works for the production project.
**Mitigation needed:** Add a secondary DeepSeek API key (different account) as `DEEPSEEK_API_KEY_BACKUP` in `llm-call.ts`. Implement exponential backoff with 3 retries before returning error.

### Scenario E: CSV Import Truncates Existing Data
**Risk:** If the Supabase import tool uses TRUNCATE before insert (default for some import tools), any partial data already in tables will be wiped.
**Mitigation:** This is actually desired behavior — the CSVs contain the complete dataset. Each import should replace the full table contents.

### Scenario F: `benchmark_lookup` RPC Not Found in Production
**Risk:** Migration `20260608000001` creates the `benchmark_lookup()` RPC. If this migration was never applied (possible — see BUG-023), `benchmarks-query` function will throw "function benchmark_lookup does not exist."
**Detection:** In SQL Editor: `SELECT proname FROM pg_proc WHERE proname = 'benchmark_lookup';`
**Mitigation:** Run the full migration `20260608000001_benchmark_master_seed.sql` (CREATE TABLE + CREATE FUNCTION sections only — skip the INSERT which is superseded by the CSV import).

### Scenario G: Plus Annual Price Mismatch Causes Checkout Failure
**Risk:** Stripe Price IDs for Plus Annual ($168/yr = $14/mo) must match exactly what's in GitHub Secrets (`STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID`). If the IDs were created with wrong amounts, checkout completes but the subscription record has wrong plan metadata.
**Verification:** Commit `2fb27fa` aligned the Plus annual price to $168/yr. Verify in Stripe Dashboard that the Price IDs referenced in GitHub Secrets match these amounts.

### Scenario H: Google OAuth Causes Redirect URI Mismatch After Enabling
**Risk:** When enabling Google OAuth, the Google Cloud Console OAuth app must have `https://dmlxrvfyqsakyjomsvdj.supabase.co/auth/v1/callback` as an authorized redirect URI. A mismatch causes OAuth to fail with "redirect_uri_mismatch" error.
**Fix steps:**
1. Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client → Add `https://dmlxrvfyqsakyjomsvdj.supabase.co/auth/v1/callback`
2. Supabase Dashboard → Authentication → Providers → Google → paste Client ID + Secret
3. Set `GOOGLE_OAUTH_ENABLED=true` in `GoogleLoginButton.tsx`
4. Set allowed redirect URL in Supabase: `https://www.aiwmcquantis.com`

### Scenario I: Large Bundle Causes Core Web Vitals Failure → Google Ranking Drop
**Risk:** 4.7 MB JS bundle means LCP likely exceeds 4 seconds on mobile. Google's Core Web Vitals use LCP as a ranking signal. If CWV scores are "Poor," rankings are suppressed.
**Current worst offenders:**
- `pdf-CUvZlwBx.js` — 1.54 MB (eager due to BUG-030)
- `index-[hash].js` — 802 KB
- `DocumentEditor-[hash].js` — 350 KB (check if eager)
**Fix BUG-030 first** — single line change, removes 1.54 MB from initial load.

### Scenario J: Self-Learning Migration Tables Out of Sync
**Risk:** Migrations `20260606130000_self_learning_tables.sql` adds self-learning/feedback tables. If `self-learning-update` edge function runs before this migration is applied, it will throw "relation does not exist."
**Status:** This migration is in repo — verify it was applied: `SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'analysis_feedback');`

---

## PART 8 — ARCHITECTURE DECISIONS (DO NOT CHANGE WITHOUT REVIEW)

### AD-001: DeepSeek as Primary AI, Lovable as Legacy Fallback
DeepSeek is primary because: (a) Lovable gateway requires old project's auth, (b) DeepSeek has equivalent capability at lower cost, (c) RVCE requires DeepSeek contractually. The Lovable fallback in `llm-call.ts` should eventually be removed once confidence in DeepSeek is established.

### AD-002: Quota Charged AFTER Analysis
This is intentional and correct. Users are never billed for failed analyses. The charge happens at line ~4117 in `analyze-business/index.ts` after `aiResult.ok` is confirmed. Never move this charge before the AI call.

### AD-003: No onChange Edge Function Calls
`MiniDemo.tsx` triggers on button click only. `ConfidenceSidebar.tsx` uses `useMemo` for live estimates (no API calls). This is a deliberate design constraint — onChange would generate thousands of spurious API calls per user session and destroy the quota/billing model.

### AD-004: Landing Page is NOT Lazy-Loaded
`Landing.tsx` (the homepage) is imported statically in `App.tsx`. This is correct — it IS the initial route and must render synchronously. All other pages (AppDashboard, Auth, Docs, etc.) are lazy. Never make Landing.tsx lazy.

### AD-005: Server-Side Tier Enforcement
Tier gates live in `_shared/tier-gate.ts` (server-side) AND `_shared/entitlements.ts` (server-side). Frontend tier checks (`src/lib/tier-spec.ts`) are cosmetic only — they control UI rendering but are never the security boundary. Any change to feature access must update BOTH the server-side `_shared/tier-spec.ts` AND the frontend `src/lib/tier-spec.ts` to stay in sync.

### AD-006: Benchmark Data Cascade Fallback Order
For all benchmark queries: `exact (sector+stage+model+geo+country+city) → no city_tier → no stage → country only → region only → sector only → global`. Never skip levels. Never fail hard — always return empty string and let DeepSeek continue without benchmark anchor.

### AD-007: Supabase CLI Pinned to 2.20.5 in CI
`@latest` caused breaking changes in Production Deploy #158. Supabase CLI version is pinned in `production-deploy.yml`. Do not upgrade without testing against a staging environment.

---

## PART 9 — FILE MAP (critical files for each domain)

```
AI ROUTING:
  supabase/functions/_shared/llm-call.ts            ← Universal AI gateway (DeepSeek primary)
  supabase/functions/_shared/prompts.ts              ← System prompts per tier
  supabase/functions/_shared/tier-spec.ts            ← Server-side tier enforcement
  supabase/functions/_shared/entitlements.ts         ← Per-tier feature flags
  supabase/functions/_shared/tier-gate.ts            ← Request-level tier gate function

ANALYSIS PIPELINE:
  supabase/functions/analyze-business/index.ts       ← Free/core orchestrator (rate limit at ~2835, quota at ~4117)
  supabase/functions/analyze-business/benchmark-engine-v2.ts  ← All 5 benchmark_master_* queries
  supabase/functions/analyze-plus/index.ts           ← Plus analysis + fetchLiveBenchmarks()
  supabase/functions/analyze-pro-extension/index.ts  ← Pro extension + buildBenchmarkContext()
  supabase/functions/invoice-capacity-check/index.ts ← Capacity check + getInvoiceBenchmarkContext()
  supabase/functions/rvce-validate/index.ts          ← RVCE — DeepSeek only, v0.3.0-deepseek
  supabase/functions/benchmarks-query/index.ts       ← Thin benchmark RPC wrapper

BILLING:
  supabase/functions/stripe-webhook/index.ts         ← Payment events → subscription updates
  supabase/functions/create-checkout-session/index.ts
  supabase/functions/create-portal-session/index.ts

DATABASE:
  supabase/migrations/20260608000001_benchmark_master_seed.sql    ← Benchmark table schemas + RPC
  supabase/migrations/20260608000002_subscription_upsert_fix.sql  ← UNIQUE constraint + admin RPC
  supabase/migrations/20260608000003_benchmark_master_full_seed.sql  ← 97,500-row SQL (15.8 MB, too large for SQL Editor)
  benchmark_csv_import/benchmark_master_*.csv        ← 5 CSVs ready for Table Editor import

FRONTEND - CRITICAL:
  src/App.tsx                                        ← Route definitions + lazy loading
  src/pages/Landing.tsx                              ← Homepage (NOT lazy — correct)
  src/pages/AppDashboard.tsx                         ← Dashboard (lazy — but imports pdf eagerly — BUG-030)
  src/hooks/useAnalysis.ts                           ← Analysis state, error handling, tier gates
  src/hooks/useSubscription.ts                       ← Subscription tier detection
  src/hooks/useRateLimit.ts                          ← Rate limit state management
  src/services/analysisApi.ts                        ← Edge function HTTP calls + fallback
  src/lib/tier-spec.ts                               ← Frontend tier spec (cosmetic only — see AD-005)

CI/CD:
  .github/workflows/ci.yml                           ← Lint + 153 tests (runs on every PR/push)
  .github/workflows/production-deploy.yml            ← migrate → deploy functions (runs after CI on main)
  scripts/verify-env-refs.ts                         ← CI guard: fails if old project ref found

CONFIG:
  vercel.json                                        ← SPA rewrite + security headers (NO redirect rules)
  public/robots.txt                                  ← Correct disallow rules
  public/sitemap.xml                                 ← Needs expansion to 60+ pages (BUG-032)
  index.html                                         ← CSP, GA4 deferred, 2 JSON-LD blocks, OG tags
```

---

## PART 10 — QUICK REFERENCE: SQL COMMANDS FOR VERIFICATION

```sql
-- Verify benchmark tables have data
SELECT 'core' as t, COUNT(*) FROM benchmark_master_core
UNION ALL SELECT 'unit_econ', COUNT(*) FROM benchmark_master_unit_econ
UNION ALL SELECT 'geo', COUNT(*) FROM benchmark_master_geo
UNION ALL SELECT 'risk', COUNT(*) FROM benchmark_master_risk
UNION ALL SELECT 'invoice', COUNT(*) FROM benchmark_master_invoice;
-- Expected: all 5 rows show 19,500

-- Verify benchmark_lookup RPC exists
SELECT proname, proargtypes FROM pg_proc WHERE proname = 'benchmark_lookup';

-- Verify subscription unique constraint
SELECT conname FROM pg_constraint
WHERE conrelid = 'public.subscriptions'::regclass AND contype = 'u';
-- Expected: subscriptions_user_id_key

-- Check for duplicate subscriptions
SELECT user_id, COUNT(*) FROM subscriptions GROUP BY user_id HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- Check owner account subscription
SELECT plan_id, status, trial_ends_at FROM subscriptions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jeltovbogdan@gmail.com');

-- Fix owner account if needed
SELECT admin_fix_subscription('jeltovbogdan@gmail.com', 'plus', 'trialing', 14);

-- Check self-learning tables exist
SELECT tablename FROM pg_tables WHERE tablename LIKE 'analysis%' OR tablename LIKE 'self_learning%';

-- Sample a benchmark row to verify data quality
SELECT sector_level1, sector_level2, business_model, country,
       gm_margin_p25, gm_margin_p50, gm_margin_p75
FROM benchmark_master_core LIMIT 5;
```

---

## PART 11 — SESSION START CHECKLIST

When starting any new AI session on this codebase, confirm the following before making any changes:

- [ ] You are working on project `dmlxrvfyqsakyjomsvdj` — NOT `gafxacjhkqsdzwwzhbor`
- [ ] You will never expose `stripe_customer_id` or `stripe_subscription_id` to frontend
- [ ] RVCE (`rvce-validate`) must ALWAYS use DeepSeek. Never Claude. Never OpenAI.
- [ ] All LLM calls route through `_shared/llm-call.ts` — DeepSeek primary
- [ ] Quota is charged AFTER analysis — never move the charge earlier
- [ ] No onChange triggers to edge functions — button-click only
- [ ] Landing.tsx must NOT be lazy-loaded
- [ ] Server-side tier enforcement in `_shared/tier-spec.ts` must stay authoritative
- [ ] Any tier change requires updating BOTH `supabase/functions/_shared/tier-spec.ts` AND `src/lib/tier-spec.ts`
- [ ] Free tier = 5 analyses/month — consistent across all 5 files that define it
- [ ] **(I-8)** Every tier variable initializes to `'free'` and is only upgraded after a verified subscription lookup — never default to a paid tier (BUG-036)
- [ ] **(I-9)** Any new edge function is added to the `production-deploy.yml` `FUNCTIONS` array in the same PR (BUG-038)
- [ ] **(I-10)** Boundary request schemas use `z.coerce`/`z.preprocess` for any field a browser `<input>` can emit; never hard-400 the primary flow on a type quirk (BUG-034)
- [ ] Pricing is Free $0 / Plus $17 / Pro $49 — NO Consultant tier, NO $149, NO one-time SKU

---

## PART 12 — THE x10–x30 DEEP-DIVE MASTER PROMPT (paste this to go deep)

> **Purpose.** PARTs 1–11 are the *state of the system*. This part is the *operating prompt* — paste it (together with the canonical facts at the top) into any senior-engineer / CTO-grade AI session whose job is to make Quantis 10–30× better across model, architecture, backend, frontend/UX, business logic, subscriptions & paywall, guardrails, accuracy, reasoning, and design — **without breaking production.** It is written to be self-contained and decision-forcing.

### 12.0 — Role, stance, and non-negotiables
You are the **acting CTO** of AIWMC Quantis. You optimize for *durable* leverage, not motion. Every change obeys the PROD-SAFETY rules: additive-first, behind the CI gate (686 tests), reversible, and measured in production before it is called "done." You never weaken a security invariant (I-1…I-10) to ship a feature. When two goals conflict, **trust & correctness > conversion > velocity > elegance.** You give a recommendation, not a survey.

### 12.1 — The 9 lenses (dive each to root, not symptom)
For each lens: (a) state the current reality from evidence (code/DB/network), (b) name the single highest-leverage defect, (c) propose the smallest change that moves the metric 10×, (d) define the production signal that proves it.

1. **Model & engine accuracy.** Deterministic engine first, LLM second. Are all financial figures anchored to the 95,500-row benchmark cascade (`exact → … → global`), or is the LLM hallucinating numbers? Verify `fetchLiveBenchmarks()` actually injects data and the >25%-deviation-from-p50 guard fires. Two-stage industry classification with a confidence score (BUG-008/W1 F-DD-03) is the accuracy unlock. **Signal:** % of analyses with `benchmark_mode:'live'` and `benchmark_match_summary.direct > 0`.
2. **Architecture & reliability.** Single source of truth for tiers (`tiers.ts` ↔ `_shared/entitlements.ts` ↔ `tier-spec.ts` must mirror). Idempotent webhooks. Atomic quota RPCs (BUG-039). No edge function missing from the deploy list (BUG-038). DeepSeek failover with backoff (Scenario D). **Signal:** edge-function 5xx rate; webhook replay success rate.
3. **Backend & data integrity.** Boundary schemas coerce-not-reject (BUG-034). RLS on every table. Benchmark tables actually populated (BUG-027 — verify counts = 19,100/table). Stripe IDs never leave the server. **Signal:** `REQUEST_SCHEMA_INVALID` count → 0; `SELECT count(*)` per benchmark table.
4. **Frontend & UX.** The analysis form is the funnel's heart — it must never dead-end on a raw error code; every failure shows a human message + a recovery action. Tier-locked controls show a lock + upgrade affordance *before* submit (BUG-018). Bundle: lazy-load `@react-pdf/renderer` (BUG-030, −1.54 MB). **Signal:** form submit→result success rate; LCP on mobile.
5. **Business logic & activation.** Activation = a founder sees *their own* idea analyzed (`analysis_completed`). Instrument the full taxonomy (PART "FUNNEL MODEL"). The "locked_section_clicked" event is the top PQL. **Signal:** visitor→activation rate.
6. **Subscriptions & paywall.** Server-side gate is the *only* boundary; client flags are cosmetic (AD-005). Fail-closed everywhere (I-8). Price→tier mapping is deterministic via env secrets (Pro price IDs), legacy $17 grandfathered. Downgrades never hard-delete data. **Signal:** 0 free users receiving paid compute; webhook→subscription activation latency.
7. **Guardrails & security.** CSP present (BUG-040). Secrets rotated (PART 2.1). No `VITE_`-prefixed server secret (I-5). RVCE DeepSeek-only (I-3). Entitlement denials logged. **Signal:** `entitlement_denials` rows; CSP violation reports.
8. **Reasoning & transparency.** Every number must be defensible: show the benchmark source, sample size, and match level. The hybrid validator (deterministic + LLM second-pass on warning) runs on paid tiers. Never fabricate — "We never fabricate numbers" is a brand promise visible in the UI. **Signal:** validator pass rate; user "is this credible?" survey.
9. **Design & differentiation.** The product is *proprietary benchmark data + dual-engine + deterministic math* — not an LLM wrapper. Every surface should reinforce that moat (cited sources, percentile bands, "vs. a $3,000 consultant" anchor). **Signal:** pricing-page → checkout rate.

### 12.2 — Method (how to dive, every time)
1. **Reproduce against production** before theorizing — as we did for BUG-034 (PowerShell `Invoke-WebRequest` with the anon key; curl fails on Windows schannel — use IWR). A bug you can't reproduce, you can't claim to have fixed.
2. **Read the evidence** — the failing code path end to end (form → hook → `analysisApi` → edge fn → schema → engine), not just the error string.
3. **Smallest reversible change** that fixes the *class* of bug, not the instance (coerce-and-clamp fixes every serialization variant, not just `"100"`).
4. **Run the full suite** (`npx vitest run`) — 686 green — then commit with a message that explains *why*, not just *what*.
5. **Ship behind the gate**, watch the production signal, and only then mark done. Expect Lovable to push to `main` concurrently — always `git pull --rebase` before pushing.

### 12.3 — The 10× backlog (ranked by leverage ÷ risk)
| # | Move | Lens | Why it's 10× | Risk |
|---|---|---|---|---|
| 1 | Coerce-not-reject on every boundary + human-readable error panel with recovery CTA | 3,4 | Removes the single biggest activation leak (failed analyses) | Low |
| 2 | Populate + verify the 95,500 benchmark rows; assert non-empty in a smoke test | 1,3 | The entire moat is inert while tables are empty | Low |
| 3 | Two-stage industry classifier with confidence; fall back gracefully | 1,8 | Misclassification silently destroys accuracy & trust | Med |
| 4 | Generate the deploy `FUNCTIONS` array from the directory; CI guard for drift | 2 | Makes "fix shipped but not deployed" (BUG-037/038) structurally impossible | Low |
| 5 | DeepSeek failover (2nd key + backoff) so an outage degrades, never 502s | 2 | Removes the single point of failure for all AI | Med |
| 6 | Full funnel instrumentation + a live activation dashboard | 5 | You cannot 10× what you cannot see | Low |
| 7 | Lazy-load PDF + content prerender for SEO (BUG-030/031) | 4 | Unlocks organic acquisition + mobile CWV | Med |
| 8 | "Receipts" UI: every figure shows source + sample size + match level | 8,9 | Converts skeptics; widens the moat vs. LLM wrappers | Med |

### 12.4 — Decision-forcing questions (answer before you build)
- What is the **one metric** this change moves, and what is its current production value?
- What **breaks** if this ships wrong, and what is the **rollback**?
- Does this **touch a tier boundary**? If so, is the server-side gate still the only authority and still fail-closed?
- Is there a **smaller** change that captures 80% of the value?
- How will I **see in production** that it worked — within 24 hours?

---

*This document was generated from: 40+ commits of git history, 20+ directly-read source files, a live production reproduction of BUG-034 (analyze-business boundary schema), Supabase DB state inspection, the 2026-06-08 forensic audit, and the 2026-06-11→13 stabilization sprint. It is the definitive engineering reference and operating prompt for AIWMC™ Quantis. Keep it current: every shipped fix gets a BUG-### entry with commit + date; every new invariant gets an I-# and a checklist line.*
