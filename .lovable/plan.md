# AIWMC Quantis — Audit v3.1 Remediation Plan

Goal: close every P0/P1 from the audit, in dependency order, without regressing the conversion engine work shipped in Waves 1–3.

---

## Wave A — Quick Wins (this week, all XS effort)

Ship together in one PR. No risk, unblocks future waves.

1. **ISSUE-106 — Refactor Logger to read `isDev` per-call**
   - `src/lib/logger.ts`: replace constructor-captured `this.isDev` with a getter `get isDev() { return import.meta.env.DEV }`.
   - Re-enable the 2 skipped tests in `src/__tests__/logger.test.ts` (forwarding Errors → `captureError`, non-Errors → `captureMessage`).

2. **ISSUE-108 — Wire financial typecheck into build**
   - `package.json`: add `"typecheck:financial": "tsc -p tsconfig.financial.json --noEmit"`.
   - Chain into existing `build` (or `prebuild`) script so a null-safety regression in `quantis-math.ts` / `financial-engine.ts` / `reconciliation-engine.ts` / `formula-registry.ts` / `geo-calibrator.ts` fails the build.

3. **ISSUE-110 — Justify the 2 sentry.ts bootstrap warns**
   - `src/lib/sentry.ts:8,39`: add `// eslint-disable-next-line no-console -- bootstrap before logger transport is ready`.

4. **ISSUE-111 — Drop the test-fixture console.error**
   - `src/__tests__/quantis-math.test.ts:161`: remove the raw log; rely on Vitest's assertion message.

5. **ISSUE-113 — `@ts-ignore` → `@ts-expect-error`** (2 occurrences across `src/`).

Verification: `bun run test` green, `bun run typecheck:financial` green, `rg "@ts-ignore" src/` returns 0.

---

## Wave B — P0/P1 Hardening (next 2–3 weeks)

### B1. ISSUE-104 — Kill the wildcard CORS footgun
- `supabase/functions/_shared/cors.ts`: change the legacy `corsHeaders` export to an empty `{}` so any function still importing it visibly breaks in dev.
- Migrate the 37 importers to `corsHeadersFor(req)` in a single sweep PR.
- Add an ESLint rule (or a custom check in the existing lint config) banning `import { corsHeaders }` from `_shared/cors`.

### B2. ISSUE-102 — Edge function logger + Sentry transport
- Create `supabase/functions/_shared/logger.ts` mirroring frontend API (`info/warn/error/debug`), auto-stamping `request_id` from `_shared/request-id.ts`.
- Optional Sentry HTTP transport gated on `SENTRY_DSN` env (POST to ingest endpoint; no SDK to keep cold-start small).
- Run a Deno codemod across all 40 functions replacing `console.*` → `logger.*`. Keep raw `console.error` only inside the logger's own catch.
- Priority order: `stripe-webhook` → `analyze-business` → `ai-consensus` → `analyze-plus` → `analyze-pro-worker` → rest.

### B3. ISSUE-107 — Cost alert on `ai_calls`
- Migration: Postgres trigger `ai_cost_runaway_check` on `ai_calls` insert. When rolling-1h `sum(cost_usd) WHERE user_id = NEW.user_id > 5`, call `pg_notify('ai_cost_alert', json)`.
- New edge function `cost-alert` subscribes / is invoked by a 5-min cron checking the same condition (LISTEN over HTTP isn't reliable in serverless). Emits to Sentry + sends email to admin.
- Hard cap (separate, defense-in-depth): same trigger raises an exception when rolling-1h cost > $20/user, blocking further inserts.

### B4. ISSUE-109 — `request_id` on sibling log tables
- Migration: `ALTER TABLE analysis_logs ADD COLUMN request_id text` + `CREATE INDEX idx_analysis_logs_request_id`.
- Same for `reconciliation_log`.
- Update insert sites in `src/services/quantis-logger.ts` and reconciliation engine to populate from `getCurrentRequestId()`.

### B5. ISSUE-112 — Tighten Sentry ignore rules
- `src/lib/sentry.ts`: move Apollo/Clarity from `ignoreErrors` (message regex) to `denyUrls` (script origin regex). Keeps legitimate errors that happen to mention the script URL.

### B6. ISSUE-101 (start) — Flip `strictNullChecks` in `tsconfig.app.json`
- Expect ~80 errors. Fix in `src/lib/` first (already partially clean from `tsconfig.financial.json`), then `src/services/`, then `src/hooks/`.
- Track via `docs/strict-mode-rollout.md` Phase 2/3 checklist.

---

## Wave C — Architecture (Q1, larger lifts)

### C1. ISSUE-103 — Split the 4.4k-line god function
- Create `supabase/functions/_shared/runners/` with: `engine.ts`, `narrator.ts`, `safety.ts`, `persistence.ts`, `hybrid.ts`.
- `analyze-business/index.ts` shrinks to a ~200-line orchestrator: parse → route → run → persist → respond.
- Migrate behind feature flag `ANALYZE_BUSINESS_V2` (env var checked at request time). Old path remains for fallback for 2 weeks, then deleted.
- Add unit tests per runner — currently impossible because logic is inlined.

### C2. ISSUE-105 — Playwright E2E for the 3 conversion-critical flows
- `bun add -d @playwright/test`, `playwright.config.ts` pointed at staging URL.
- Tests:
  - `e2e/anonymous-to-result.spec.ts` — single input → `/r/:id` → verdict visible within 5s.
  - `e2e/signup-checkout.spec.ts` — signup → Stripe checkout test mode → webhook → tier upgraded.
  - `e2e/plus-pdf-export.spec.ts` — Plus user → analysis → PDF download → file > 50KB and contains expected verdict.
- Wire as a GitHub Action gate on PRs touching `src/pages/`, `src/services/`, or `supabase/functions/`.

### C3. ISSUE-101 (finish) — Full `strict: true`
- Once all phases of `docs/strict-mode-rollout.md` are green, flip `strict: true` in `tsconfig.app.json` and delete `tsconfig.financial.json`.

---

## Sequencing & Risk

```text
Wave A (week 1)
   │  XS items, no dependencies
   ▼
Wave B (weeks 2–4)
   │  B1 (CORS) → B2 (edge logger) in parallel
   │  B3 (cost alert) needs B2's logger to emit Sentry events
   │  B4, B5, B6 independent
   ▼
Wave C (weeks 5–12)
   │  C1 (god-function split) — feature-flagged, slow rollout
   │  C2 (Playwright) — gate added once 3 specs are green on staging
   │  C3 (strict: true) — capstone, only after B6 phases complete
```

Rollback for each wave: every change is additive or feature-flagged. CORS migration (B1) is the only one with a hard cutover — gated by ESLint rule + a 1-day staging soak before promoting.

---

## Out of Scope (deferred, tracked in audit but not this plan)

- ISSUE-114, 115 (P3 docs) — fold into the next mem update naturally.
- Frontend perf re-measurement — separate effort tied to LCP work, not type/observability.

---

## Acceptance Criteria

- `bun run build` runs `typecheck:financial` and fails on null-safety regressions.
- `rg "console\." supabase/functions/ -g '!_shared/logger.ts'` returns 0.
- `rg "import { corsHeaders }" supabase/functions/` returns 0.
- `analyze-business/index.ts` ≤ 250 lines.
- 3 Playwright specs green on staging.
- `tsconfig.app.json` has `"strict": true`.
- Cost alert verified by injecting a synthetic $6 row into `ai_calls` in staging and confirming Sentry event + email.

Approve to start Wave A.
