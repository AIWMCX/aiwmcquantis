# Closing the Master Spec gaps + UX/admin requests

Goal: lock down tier gating in the UI, finish the §11 backend checklist (white-label, RLS, PRO auto-provisioning, universal rules everywhere), make `beltovbogdan@gmail.com` a real DB-level admin, and do a focused readability pass.

## 1. Gate Deep Audit / Monte Carlo for FREE (UI + server)

Today `WizardForm.tsx` always renders the **Deep Audit (95,500 Monte Carlo scenarios)** option. Spec says `monte_carlo` is a PLUS feature (`tier-spec.ts: FEATURE_TIER_REQUIREMENT.monte_carlo = 'PLUS'`).

Changes:
- `src/components/analysis/WizardForm.tsx` — read `useFeature('monte_carlo')`. For FREE:
  - Render the Deep card with a padlock + "PLUS" badge, disable selection, route click to `/pricing?reason=monte_carlo` (canonical `UPGRADE_TRIGGERS.monteCarlo`).
  - If `analysisDepth === 'deep'` and tier downgrades, snap back to `'full'`.
- `src/pages/PreMortem.tsx` — same gate before forcing `'deep'`; for FREE, show the existing `LockedFeaturePreview` instead of submitting.
- `src/hooks/useAnalysis.ts` — server-side double-check: if `depth === 'deep'` and tier is FREE, throw a `TIER_GATE` error before invoking and surface via the existing `AnalysisErrorPanel`.
- `supabase/functions/analyze-business/index.ts` — at request entry, when `analysis_depth === 'deep'` and the resolved tier is FREE, return the canonical 402 envelope (`error: "TIER_GATE", required_tier: "PLUS", feature: "monte_carlo"`) before any LLM/Monte Carlo work. (Quota check stays first.)

## 2. Founder admin: `beltovbogdan@gmail.com`

`user_roles` table exists. We will:
- Migration: ensure `app_role` enum has `'admin'`; insert role for the user id matched by `auth.users.email = 'beltovbogdan@gmail.com'` (idempotent `ON CONFLICT DO NOTHING`).
- Confirm/refresh `public.has_role(_user_id, _role)` SECURITY DEFINER (already referenced in code).
- Add a `public.is_founder_admin()` SECURITY DEFINER convenience wrapper used by RLS and edge functions (returns true iff caller has `admin` role).
- Wire `useAuth`/admin guards (already use email check per memory) to additionally trust `has_role(uid, 'admin')` so the check works even if the email check is bypassed.

## 3. Universal Rules on every legacy LLM endpoint

These functions still call the gateway directly — they will be refactored to route through `_shared/llm-call.ts::callTierLlm` (or, where the response shape is non-JSON / streaming, through a new `callTierLlmRaw` that still prepends `UNIVERSAL_RULES` and applies `LLM_BUDGET[tier]`):

- `supabase/functions/ai-narrator/index.ts`
- `supabase/functions/ai-consensus/index.ts` (both legs of the dual-LLM consensus)
- `supabase/functions/analyze-business/index.ts` (the remaining direct fetch on line ~3441)
- `supabase/functions/generate-idea/index.ts`
- `supabase/functions/generate-document-content/index.ts`
- `supabase/functions/template-optimizer/index.ts`
- `supabase/functions/parse-document/index.ts`

Each call will pass the resolved `tier` (from existing tier resolution) and a `module` ('main' | 'pre_mortem' | 'capacity' | 'docs' | 'idea' | 'narrator'). New `'narrator'`, `'idea'`, `'docs'`, `'parse'` modules will be added to `_shared/prompts.ts` so `buildSystemPrompt(tier, module)` always prepends `UNIVERSAL_RULES`.

Add a lightweight `dev_assertions` check in `_shared/llm-call.ts` that logs (and increments a `llm_universal_rules_violations` counter via `ai_calls` ledger) if `system` ever lacks the rules sentinel. Memory note: per `correlation-and-observability`, request_id is already threaded — reuse it.

## 4. White-label PDF (server-side branding strip)

- Migration: add `subscriptions.white_label_enabled boolean default false` and a trigger `enforce_white_label_pro` that blocks setting it true unless plan_id = 'pro' (the existing PRO trigger pattern from the previous migration is the template).
- Server-side: in `supabase/functions/export-document/index.ts` and `supabase/functions/pdf-generator/index.ts`, before render:
  1. Resolve user_id → fetch `subscriptions.white_label_enabled` (service-role).
  2. If true AND `verify_pro_subscription(user_id)` is true, pass `{ hideBranding: true }` to the React-PDF renderer. (Per `pdf-export-canonical` memory, single pipeline = `@react-pdf/renderer` — we do not reintroduce html2pdf.js.)
  3. If white_label flag is true but tier is no longer PRO, ignore the flag and render branded.
- React-PDF templates: thread an optional `hideBranding` prop through the PDF document component; when true, omit the AIWMC™ Quantis header strip, footer logo and watermark, but keep the legal disclaimer (per `legal/financial-disclaimer-standard`).
- Client never decides — the server is the single source of truth.

## 5. Team-read RLS + 30-day readonly window

Already created in the last migration: `team_invitations`, seat trigger, `subscriptions.history_readonly_until`. Missing pieces:

- `analyses` (and any related per-user tables: `analysis_runs`, `documents`) — add SELECT RLS policy:
  `USING ( user_id = auth.uid() OR public.is_team_member(auth.uid(), user_id) OR public.has_role(auth.uid(), 'admin') )`
  with `is_team_member(member uuid, host uuid)` SECURITY DEFINER reading `team_invitations` where status = 'accepted'.
- INSERT/UPDATE/DELETE policies on those tables: keep restricted to `user_id = auth.uid()` only — invited members are read-only (checklist line "cannot generate new analyses on host's account").
- Readonly window on downgrade: extend the existing SELECT policy with `OR (now() < history_readonly_until)` so a freshly-downgraded FREE user can still read (but not write/regenerate) their own analyses for 30 days. Writes are blocked because `verify_pro_subscription` (or the equivalent FREE check) will reject the LLM call upstream.

## 6. PRO auto-provisioning

Add a DB function `public.provision_pro_features(p_user_id uuid)` (SECURITY DEFINER) that:
1. Sets `subscriptions.plan_id = 'pro'`, `status = 'active'` (or 'trialing'), `trial_ends_at = now() + 14d` if first-time PRO.
2. Generates an initial API key row in `api_keys` (active, name = 'Default') if none exists — returns the secret once via the webhook response context only.
3. Sets default seat cap to 3 and inserts the host into `team_members` (or equivalent) as `owner`.
4. Logs `lifecycle_event: 'pro_provisioned'`.

Wire it into `stripe-webhook`:
- `customer.subscription.created` / `invoice.paid` for the PRO price → call `provision_pro_features(user_id)`.
- `customer.subscription.updated` (PLUS→PRO upgrade) → same call.
- Existing 3-day grace + downgrade path (`payment_failed_at`, `subscription.deleted`) untouched, but on `subscription.deleted` also set `history_readonly_until = now() + 30 days`.

Reminder (already noted in earlier turns): `STRIPE_PRO_PRICE_ID` must be set as a project secret for Pro checkout / provisioning to fire. I will surface a clear `CONFIG_MISSING` log if absent.

## 7. Global readability pass ("readable text everywhere")

Scope: apply consistent contrast tokens from `quantis-v2-bloomberg-aesthetic` — no redesign, just legibility.

- Audit usages of `text-muted-foreground`, `text-[var(--q-text-tertiary)]`, `opacity-50/60/70` on body copy across:
  - `src/pages/Landing.tsx` and landing sections (`PricingSection`, `FAQSection`, `FreeVsProMatrix`)
  - `src/pages/AppDashboard.tsx` and analysis cards (`MarketSizingCard`, `CapacityCheckCard`, `TwelveVariableGrid`, `AnalysisErrorPanel`)
  - Settings, Pricing, PreMortem, Changelog
- Rules:
  - Body copy ≥ 14px, line-height ≥ 1.5, contrast ≥ 4.5:1 on Space Black.
  - Replace ad-hoc `opacity-50/60` on text with the canonical `--q-text-secondary` / `--q-text-primary` tokens.
  - Tiny labels (`text-[8px]`, `text-[9px]`) bumped to ≥ 11px or removed.
  - Light theme variant (now globally toggleable per recent change) gets a parallel sweep — verify dashboard cards are not white-on-white.
- No changes to layout, brand fonts (Cabinet Grotesk / DM Sans / JetBrains Mono per Core memory) or spacing system.

## 8. Verification

- Manual matrix in staging: FREE / PLUS / PRO × {analysis depth selector, deep submit, capacity check, market sizing, premortem, PDF export with and without white_label}.
- New `__tests__/tier-gates.test.ts` with table-driven cases for `evaluateGate` covering monte_carlo, pre_mortem, capacity_check, white_label, api_access, team_seats.
- Edge-function smoke test (existing `supabase test` harness) that POSTs to each LLM endpoint and asserts the system prompt sent to the gateway contains the `UNIVERSAL_RULES` sentinel — fails the build if any function regresses.
- Linter + type-check after migrations; review supabase linter warnings only for the new migrations (existing 141 warnings out of scope).

## Out of scope / explicitly not doing

- Reintroducing `html2pdf.js` (canonical pipeline is `@react-pdf/renderer`).
- Redesigning the landing or dashboard — readability pass only.
- Generic backend rate-limiting infra — per project rules, the API daily cap stays implemented on top of `api_request_logs`.
