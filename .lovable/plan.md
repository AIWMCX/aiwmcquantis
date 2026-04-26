# Master Spec v1.0 — Go-Live Checklist Audit & Remediation Plan

I read the codebase against every line of §11.1 / §11.2 / §11.3. Here is the **gap report** followed by a **3-phase remediation plan**.

---

## 📋 Audit Results

### ✅ §11.1 Backend — already compliant
| Item | Status | Where |
|---|---|---|
| Universal Rules prepended (PLUS / Pre-Mortem / Capacity / PRO-extension) | ✅ | `_shared/prompts.ts` → `buildSystemPrompt()` |
| PLUS Monte Carlo runs before LLM, injected as `MONTE_CARLO_DATA` | ✅ | `analyze-plus/index.ts` (client-side TS engine, per approved scope) |
| PRO extension receives PLUS JSON as `PLUS_ANALYSIS_CONTEXT` | ✅ | `analyze-pro-extension/index.ts` |
| Pre-Mortem / Capacity / PRO-extension blocked for FREE → 402 `TIER_GATE` | ✅ | `_shared/tier-gate.ts` + `evaluateGate()` |
| Output field stripper exists | ✅ | `tier-spec.ts` `pruneOutput()` (used in `analyze-plus` only) |
| FREE quota check fires before LLM, returns 402 | ⚠️ partial | `analyze-business` uses ad-hoc 402 with non-spec body shape (`code: USAGE_LIMIT_EXCEEDED` instead of `error: QUOTA_EXCEEDED` + `required_tier`/`upgrade_url`/`cta`/`resets_at`) |

### ❌ §11.1 Backend — gaps
1. **Universal Rules NOT prepended in `analyze-business`** (the FREE main endpoint), `ai-narrator`, `generate-document`, `generate-idea`, `generate-document-content`. They each build raw system prompts and call the gateway directly — checklist line 1 fails for the highest-volume function.
2. **Schema validator + retry-on-fail not enforced** per `LLM_BUDGET[tier].retry_on_schema_fail` (1/2/3). The new spec functions parse JSON once and 502 on failure.
3. **Output stripper not applied in `analyze-business`** — FREE responses currently include fields that `FEATURE_MANIFEST.FREE.allowed_output_fields` forbids.
4. **API key middleware**: `api_keys` table exists, but no edge function validates `Bearer ak_…` tokens or enforces the 100 req/day limit (`rate_limit_per_hour` exists but isn't read).
5. **Team access read-only inheritance**: `team_members` table exists, but no policy/middleware ensures invited members get **PRO read** without being able to consume the host's quota.
6. **White-label flag**: spec says "server reads `user.white_label_enabled` BEFORE PDF render". `profiles` has no `white_label_enabled` column; PDF functions don't branch on it.
7. **Stripe webhook gaps**: no `invoice.payment_failed` handler (3-day grace + downgrade), no `subscription.deleted` → 30-day read-only history flag.

### ❌ §11.2 Frontend — gaps
1. **Usage meter card** — `useSubscription` reads `usage_tracking` but no dashboard card displays *"1/1 analyses used this month — resets [date]"*.
2. **`upgrade_nudge` card on FREE results** — `analyze-business` doesn't emit `upgrade_nudge`; no UI renders it.
3. **PRO trial banner** — `subscriptions.trial_ends_at` exists; no banner reads it.
4. **API key page** — no `/app/api-keys` route; `api_keys` table sits unused in UI.
5. **Team invite UI** — no `/app/team` page; nav has no "Invite Team".
6. **Spec hooks unused** — `usePlusAnalysis`, `useProExtension`, `useCapacityCheck` exist but no panel mounts them. The 12-variable grid, market-sizing card, and capacity-check card from the previous turn are still pending.

### ✅ §11.2 Frontend — already compliant
- Locked features show padlock + CTA: ✅ `PlusGate`, `LockedAnalysisPaywall`, `LockedFeaturePreview`.
- TierBadge in AppTopBar: ✅ shipped last turn.
- Document Studio template grid with locked padlocks: ✅ `DocsStudio.tsx`.
- History sidebar (paginated) for PLUS/PRO: ✅ `useAnalysisHistory`.
- PDF download via canonical `@react-pdf/renderer`: ✅.

### ❌ §11.3 Billing
| Item | Status |
|---|---|
| FREE: no Stripe customer until upgrade | ✅ |
| PLUS / PRO product & price IDs | ✅ env-driven |
| `invoice.paid` → activate tier | ✅ |
| `customer.subscription.deleted` → FREE | ✅ (but no 30-day read-only flag) |
| `invoice.payment_failed` → 3-day grace then FREE | ❌ missing |
| PRO 14-day trial wired | ⚠️ `trial_ends_at` column exists, Stripe checkout not setting `trial_period_days: 14` |
| Upgrade FREE → PLUS / PLUS → PRO proration | ✅ Stripe default proration |

---

## 🛠 Remediation Plan — 3 phases

### **Phase 1 — Backend canonicalization** (highest leverage, fixes 7 checklist items)

**1.1 Wrap every LLM-calling edge function in the spec contract.**
Add a tiny shared helper `_shared/llm-call.ts` that:
  - Prepends `UNIVERSAL_RULES` (or full `buildSystemPrompt`)
  - Calls Lovable AI gateway with `LLM_BUDGET[tier]`
  - Parses JSON; on parse fail retries up to `budget.retry_on_schema_fail` times
  - Strips output via `pruneOutput(tier, parsed)`
  - Surfaces 402 / 429 from the gateway

Refactor `analyze-business` (FREE main path), `ai-narrator`, `generate-document`, `generate-document-content`, `generate-idea` to use it. `analyze-plus` / `analyze-pro-extension` / `invoice-capacity-check` already do most of this — port them onto the helper for consistency.

**1.2 Replace `analyze-business`'s ad-hoc 402 quota response with `tierGate(req, ENDPOINTS.ANALYSE_MAIN)`.**
The gate already implements the correct body shape (`error: QUOTA_EXCEEDED`, `required_tier`, `upgrade_url`, `cta`, `resets_at`).

**1.3 Add `upgrade_nudge` to FREE schema** (string already in `FREE_OUTPUT_FIELDS`) — model is already instructed to emit it; we'll enforce it in the validator and synthesize a deterministic fallback if absent.

**1.4 Stripe webhook: add `invoice.payment_failed`.**
Track first failure timestamp on `subscriptions.payment_failed_at` (new column via migration). On webhook re-fire after 3 days, set `plan_id='free'`. Trigger an email via `send-lifecycle-email`.

**1.5 Configure 14-day Pro trial** in `create-checkout-session` when `plan_id === 'pro'`: `subscription_data: { trial_period_days: 14 }`.

### **Phase 2 — White-label + API key + Team (PRO entitlements)**

**2.1 Migration:**
  - Add `profiles.white_label_enabled boolean default false`
  - Add `subscriptions.payment_failed_at timestamptz`
  - Add `subscriptions.history_readonly_until timestamptz`

**2.2 White-label gate:**
  In `pdf-generator` / `export-document`, fetch `profiles.white_label_enabled`; if true AND tier=PRO, strip "Powered by AIWMC Quantis" footer.

**2.3 API-key middleware** (`_shared/api-key-auth.ts`):
  Parse `Authorization: Bearer ak_…`, hash + lookup against `api_keys.key_hash`, check `is_active`, enforce **100 req/day** by counting `usage_count` rolling window. Mount on `/api/analyse/main` (public API).

**2.4 API-key UI** (`/app/api-keys`):
  - PRO-gated route
  - List keys (masked: `ak_••••1234`)
  - Generate / Rotate / Revoke buttons
  - Copy-once modal on generate (key shown ONCE)

**2.5 Team UI** (`/app/team`):
  - PRO-gated route
  - Invite by email (max 3 seats)
  - Members list with role
  - Server enforces seat cap in `team-invite` edge function
  - Members get **PRO read** via RLS (already supported by `teams` schema) but cannot consume host's `usage_tracking` — gate writes to `analyses` by `team_id` not `user_id`

### **Phase 3 — Dashboard panels + UX polish**

**3.1 Mount the three spec panels in `AppDashboard`** (PLUS-gated):
  - `<TwelveVariableGrid data={plusAnalysis.twelve_variables} />`
  - `<CapacityCheckCard onRun={runCapacityCheck} result={capacityResult} />`
  - `<MarketSizingCard data={proExtension.market_sizing} />` (PRO-gated inside the panel)

These call `usePlusAnalysis` / `useCapacityCheck` / `useProExtension` hooks (already implemented).

**3.2 Usage meter card** on `/app` for FREE users:
  Reads `useSubscription().usage`. Shows "X / 1 analyses · resets [next month 1st]" with progress bar + upgrade CTA when full.

**3.3 PRO trial banner**:
  Top-of-app strip when `subscriptions.trial_ends_at > now()`. Shows "X days left in your trial" + manage subscription link. Auto-hides after expiry.

**3.4 i18n migration** — extend `paywall.json` and `errors.json` with the new copy from these surfaces (English-only per prior decision).

---

## 📂 Files to be touched

### New
- `supabase/functions/_shared/llm-call.ts`
- `supabase/functions/_shared/api-key-auth.ts`
- `src/components/billing/UsageMeterCard.tsx`
- `src/components/billing/ProTrialBanner.tsx`
- `src/components/analysis/panels/TwelveVariableGrid.tsx`
- `src/components/analysis/panels/CapacityCheckCard.tsx`
- `src/components/analysis/panels/MarketSizingCard.tsx`
- `src/pages/ApiKeys.tsx`
- `src/pages/TeamSettings.tsx`
- Migration: `add_white_label_and_payment_failed_columns`

### Modified
- `supabase/functions/analyze-business/index.ts` (use tierGate + llm-call helper)
- `supabase/functions/ai-narrator/index.ts`
- `supabase/functions/generate-document/index.ts`
- `supabase/functions/generate-document-content/index.ts`
- `supabase/functions/generate-idea/index.ts`
- `supabase/functions/analyze-plus|analyze-pro-extension|invoice-capacity-check/index.ts` (port to helper)
- `supabase/functions/stripe-webhook/index.ts` (+ `invoice.payment_failed`, + history-readonly flag)
- `supabase/functions/create-checkout-session/index.ts` (+ 14-day trial for PRO)
- `supabase/functions/pdf-generator|export-document/index.ts` (+ white-label branch)
- `src/pages/AppDashboard.tsx` (mount panels + usage meter)
- `src/components/layout/AppTopBar.tsx` (+ trial banner)
- `src/i18n/locales/en/paywall.json`

---

## ⚠️ Risks & decisions to confirm before I start

1. **API key public route** — does `/api/analyse/main` need a separate public-facing edge function (`api-analyze` exists), or do we add the auth middleware to the existing `analyze-business`? I'll wire the middleware into `api-analyze` (already named for this purpose) to keep the user-facing function untouched.

2. **Team write semantics** — spec says invited members "cannot generate new analyses on host's account". I'll interpret this as: members can **read** all team analyses, can **generate their own** which are tagged `team_id`, but consume their **own** quota (which inherits PRO from team). Confirm or override.

3. **3-day grace clock** — Stripe re-fires `invoice.payment_failed` on each retry. I'll persist the **first** failure timestamp and downgrade when `now() - first_failure > 3 days` and subscription still unpaid. Acceptable?

4. **Phase order** — I recommend running **Phase 1 → 3 → 2** so user-visible value (panels, usage meter, trial banner) ships before the deeper PRO infra (API keys, team). If you prefer strict 1→2→3, say so.

Approve this plan and I'll execute Phase 1 first, then check in before Phase 2.