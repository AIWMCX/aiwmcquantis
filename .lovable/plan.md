## Quantis Production Stabilization — Execution Plan

This is a large, multi-day hardening effort spanning 5 workstreams. Before I start writing code, I want to confirm scope, sequencing, and a few real-world facts I can't safely guess. Once you confirm, I'll execute workstream-by-workstream with green CI gates between each.

### What I found in the codebase (so we don't redo work)

- `src/config/tiers.ts` already exists as a single source of truth with Free / Plus ($17) / Pro ($49) and real Stripe price IDs wired (`price_1TNnKk…` Pro monthly, `price_1TKemw…` Plus monthly grandfathered, annual variants). It is **richer** than the prompt's stripped TIERS sample — it includes Pro Annual, trial flags, limits, templates, white-label/api gating. Replacing it with the prompt's reduced shape would be a regression.
- `supabase/functions/stripe-webhook/`, `_shared/entitlements.ts`, `charge_free_analysis` RPC, `entitlement_denials` table, and `health-check` function already exist.
- 672-test CI suite is live; `.github/workflows/production-deploy.yml` exists.

So this is **harden + close gaps + add the missing acceptance tests**, not greenfield.

### Proposed execution order (5 PR-sized passes)

**Pass 1 — Deploy-chain trust (Workstream 0)**
- Add `?health=1` handler to every Edge Function via a shared helper (`_shared/health.ts`); each function exports a `FUNCTION_VERSION` constant.
- New `scripts/verify-deploy.sh` curls all health endpoints and diffs live `version` vs the constant in source. Non-zero exit on mismatch.
- Wire script into `production-deploy.yml` as a post-deploy gate.
- Audit workflow for `secrets.*` inside job-level `if:` and refactor to `env:` indirection.

**Pass 2 — TIERS drift guard + plan_entitlements mirror (Workstream 1)**
- KEEP the current rich `tiers.ts` (do not strip).
- New migration: `plan_entitlements(tier pk, monthly_analyses int, features jsonb)` seeded from TIERS.
- New CI test `tiers-db-parity.test.ts` asserts byte-identical feature flags between `TIERS` and `plan_entitlements` rows.
- Grep-based test that fails if `"$17"`, `"$49"`, `"unlimited"` appear in pricing components outside `tiers.ts`.

**Pass 3 — Server entitlement guards + 12-test suite (Workstream 2)**
- Verify `requireFeature` / `requireUsage` shape matches prompt; refactor if drift.
- Add the guard to `pdf-export` / `export-document`, `location-comparison` paths, `document-studio` (`generate-document`), white-label PDF branch, `analyze-plus` / `analyze-pro-worker`.
- Always return `{ ok:false, reason:'feature_locked' }` envelope at HTTP 200.
- Write the 12-test suite covering forged-tier body, expired sub, trialing, quota-exhaust, legacy grandfathering.

**Pass 4 — Stripe ↔ Quantis bulletproofing + 20-scenario matrix (Workstream 3)**
- Audit `stripe-webhook` for: signature verify, `stripe_events` idempotency table (create if missing), event coverage (`checkout.session.completed`, `customer.subscription.*`, `invoice.payment_succeeded|failed`), price→tier mapping ONLY via `TIERS.*.stripePriceId`, single-active-subscription invariant (partial unique index).
- Audit `create-checkout-session` to ensure server builds session from TIERS (no client-trusted price).
- Add 20 webhook-fixture tests (Stripe test-mode JSON payloads checked into `__tests__/stripe-fixtures/`).

**Pass 5 — Paywall safety + resilience drills + observability (Workstreams 4 + 5)**
- Direct-fetch leak hunt test: as Free user, POST to each paid endpoint, assert `feature_locked`, zero compute side effects.
- `locked_section_clicked` analytics event on every locked surface.
- 7 resilience drills as CI tests (Anthropic 500, DeepSeek timeout, Upstash down, malformed body, dup webhook, RVCE timeout, cold-start).
- Bundle grep for `sk_live_`, `upstash`, etc.; securityheaders check is manual.

### Final Gate
Run all 9 scoreboard claims; report each as PASS/FAIL with proof artifact (curl output, test name, grep result).

### Questions I need answered before starting

1. **Pro Annual + trial config**: the existing `tiers.ts` has Pro Annual `price_1TNnUb…` and Plus Annual `price_1TKenY…`. The prompt explicitly says "No annual." Should I (a) delete annual everywhere, or (b) keep annual support and just ensure the 20-scenario matrix exercises monthly (my recommendation: keep — removing live SKUs risks breaking existing customers)?
2. **Pro feature split**: prompt suggests `white_label` + `api_access` are Pro-only. Current `tiers.ts` already enforces that. Confirm I should not change the Plus/Pro feature boolean split beyond what's already there.
3. **Stripe test-mode keys in CI**: do you have a `STRIPE_TEST_SECRET_KEY` in GitHub Actions secrets, or should the 20 scenarios run purely against checked-in webhook fixtures (no live Stripe API calls)? Fixture-only is faster and deterministic; I recommend that.
4. **Scope of this turn**: do you want me to execute Pass 1 immediately and report back, or write out all 5 passes' code in one mega-response? I strongly recommend pass-by-pass with verification between — that's the whole point of this stabilization prompt (avoid "CI green but nothing shipped").

Once you answer those four, I'll start Pass 1.