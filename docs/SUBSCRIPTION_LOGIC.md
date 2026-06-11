# AIWMC Quantis — Subscription, Paywall & Entitlement Logic (Canonical Spec)
**Version:** 1.0 · **Date:** June 11, 2026 · **Status:** Verified against live code (citations below)
**Rule:** any change to billing/gating behavior MUST update this doc in the same PR.

---

## 1 · The money path (end to end)

```
Pricing page (PricingSection.tsx, values from TIERS constant)
   → Stripe Payment Link (useStripeCheckout.ts PAYMENT_LINKS, 14-day trial configured in Stripe)
      → Stripe hosted checkout (card, trial)
         → webhook: checkout.session.completed (stripe-webhook/index.ts:289)
            → upsert public.subscriptions { user_id, plan_id, status, period bounds } (:354-361)
            → Pro plans additionally: rpc provision_pro_features (:369)
         → entitlements flip IMMEDIATELY on next request (no cache):
            tier-gate.ts resolveCallerTier() reads subscriptions LIVE per request
   → user calls a gated edge function
      → tierGate(req, ENDPOINT) is the FIRST statement in the handler
         (analyze-plus/index.ts:246, analyze-pro-extension/index.ts:150,
          generate-document/index.ts:57, invoice-capacity-check/index.ts:91)
      → or requireFeature()/requireDownloadQuota() from entitlements.ts
         (export-document, queue-export, parse-document, api-analyze, generate-idea, rvce-validate)
```

## 2 · Source-of-truth hierarchy

| Layer | File | Role |
|---|---|---|
| **Stripe** | Dashboard payment links + price IDs | What is actually billed (trials configured HERE, not in code) |
| **Server entitlements** | `supabase/functions/_shared/entitlements.ts` (LIMITS) + `tier-spec.ts` (FEATURE_MANIFEST) | The REAL gate. Free = 5 analyses/mo |
| **Client mirror** | `src/config/tiers.ts` (TIERS) | UX cosmetics only — MUST mirror server; enforced by `tier-matrix-server-parity.test.ts` (76 assertions, in CI) |
| **DB truth** | `public.subscriptions` (plan_id, status), `usage_tracking` (analyses_count per month_year) | What tier-gate reads per request via service role |

**Prices (verified consistent across all four sources as of 2026-06-11, fix `49102ef`+):**
Plus $17/mo · $168/yr ($14/mo-equiv) — legacy $17 price grandfathered.
Pro $49/mo · **$492/yr ($41/mo-equiv)** ← tiers.ts previously said $469/$39.08 (drift, fixed this date).
Trials: Plus monthly+annual 14d · Pro monthly 14d · **Pro annual NO trial** (`isTrialEligible()`).

## 3 · Tier resolution (fail-closed, per request)

`tier-gate.ts:27-67 resolveCallerTier()`:
1. JWT → `auth.getUser()` via anon-key client. No user ⇒ tier FREE, and `tierGate` returns 402 "Authentication required".
2. Service-role client reads `subscriptions.plan_id/status` + `usage_tracking.analyses_count` for current `YYYY-MM`.
3. Tier = planToTier(plan_id) ONLY if status ∈ {active, trialing}; anything else ⇒ FREE. **Fail closed.**
4. Client claims/session metadata are NEVER consulted. A forged client flag cannot unlock paid compute.

Quota: `evaluateGate()` blocks the 6th free analysis of the month (HTTP 402 TierGateBlock with `upgrade_url`); `incrementMonthlyUsage()` (tier-gate.ts:101) increments only after the gate passes.

## 4 · Webhook event handling (stripe-webhook/index.ts)

| Event | Behavior | Line |
|---|---|---|
| (all) | Signature verified; **idempotent on `event.id`** via processed-events table — replays are no-ops | :151-186, :792 |
| `checkout.session.completed` | Resolve user (metadata → email fallback :466-482), upsert subscription, provision Pro features | :289 |
| `customer.subscription.updated` | Upsert plan/status; idempotent RPC for repeated fires | :387, :446 |
| `customer.subscription.deleted` | **SOFT downgrade**: status='canceled', plan_id KEPT until period end; `process-subscription-downgrades` cron (deployed v98) flips plan_id→'free' at `current_period_end` | :499, :517-532 |
| `invoice.paid` | Idempotent renewal record | :583 |
| `invoice.payment_failed` | Handled at :702 (dunning emails = open roadmap item B-? in improvements dataset) |

Cancellation UX consequence: a canceling user keeps paid features until the period they paid for ends — correct and dispute-safe.

## 5 · Gate audit results (2026-06-11, all 10 paid surfaces)

| Function | Mechanism | Verified |
|---|---|---|
| analyze-plus | `tierGate(ANALYSE_MAIN)` first statement in handler | ✅ :246 |
| analyze-pro-extension | `tierGate(ANALYSE_PRO_EXTENSION)` first statement | ✅ :150 |
| generate-document | `tierGate(DOCUMENTS_STUDIO)` | ✅ :57 |
| invoice-capacity-check | `tierGate(TOOLS_CAPACITY_CHECK)` | ✅ :91 |
| export-document | `requireFeature` + `requireDownloadQuota` | ✅ import :3 |
| queue-export | `requireFeature` + `requireDownloadQuota` | ✅ :2 |
| parse-document | `requireFeature` (dynamic import before LLM) | ✅ :139 |
| api-analyze | `requireFeature` | ✅ :13 |
| generate-idea | `getUserTier` after auth | ✅ :314-325 |
| rvce-validate | `getUserTier` → free tier 403 locked; obs caps 40/60 by tier | ✅ :15, :674 |
| analyze-business (free path) | FREE_TIER_LIMIT=5 + anonymous device-fingerprint limit (2/hr) + per-plan rate RPC | ✅ :2724, :2846-2916 |

**No gate leaks found.** Stripe secrets and price-granting IDs live only in Supabase function secrets (verified via Management API listing); nothing Stripe-secret behind `VITE_`.

## 6 · Invariants this spec locks (violations = blocked PR)
1. `tierGate`/`requireFeature` is called before any LLM/paid compute in every gated function.
2. Entitlements resolve from `subscriptions` DB rows only — never client claims.
3. Free = 5 analyses/month, single constant, client/server parity test green.
4. Webhook idempotent on event.id; soft-downgrade keeps paid features to period end.
5. Prices come from `TIERS`; Stripe dashboard is billing truth; the parity between them is checked manually on any price change (test-mode checkout).
6. Pro annual never gets a trial.

## 7 · Open items (tracked in docs/QUANTIS_IMPROVEMENTS_DATASET.md)
- B-3 three-SKU ladder ($39 one-time, $149 Consultant) — additive, server-gated via `requireFeature('white_label')`.
- Dunning email sequence on `invoice.payment_failed` (handler exists; lifecycle emails not yet wired).
- `entitlement_denials` analytics surfaced as upgrade-intent dashboard.
- Stripe test-mode end-to-end checkout truth-test (UNVERIFIED in audit — needs test-mode session).
