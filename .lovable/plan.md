

# Ultra Master Audit — AIWMC™ Quantis (v3.0)

## EXECUTIVE SUMMARY

The Quantis backend is genuinely strong — every public table has RLS enabled, the deterministic financial engine is well-tested (13 test files including golden vectors and reconciliation rules), and the new Anthropic firewall correctly prevents Claude from overwriting numbers. However, the codebase is carrying **two parallel PDF stacks** (`@react-pdf/renderer` + `html2pdf.js`), a **legacy `AnalysisResults.tsx` with hardcoded Russian copy** rendered into an English product, **TypeScript strict mode is OFF**, and **CORS is wildcard `*` on every public edge function** — including authenticated ones. The single biggest risk right now is the new `pdf-export.ts` path: it ships ~1.2 MB of `html2pdf.js` to every user but `usePdfExport.ts` (1,500 lines, `@react-pdf/renderer`) is still the active export pipeline — meaning duplicated bundle weight, divergent output, and a maintenance trap on the marquee deliverable.

---

## ISSUE REGISTRY

### P0 — CRITICAL

**[ ISSUE-001 | P0 | UX/Brand ]**
- File: `src/components/AnalysisResults.tsx` (lines 16–43)
- What: Hardcoded Russian strings ("Ожидаемая прибыль", "Окупаемость", "месяцев", "Анализ рынка") rendered inside an English product.
- Why: Brand-breaking. Any user landing on this code path sees a different language. Violates `mem://marketing/brand-standard`.
- Fix: Either (a) delete this file — `AccuracyTransparentResults.tsx` is the canonical results component on `AppDashboard`; or (b) translate to English. Confirm via `grep -rn "from.*AnalysisResults'" src` first.
- Effort: XS · Risk if ignored: High

**[ ISSUE-002 | P0 | Architecture / Bundle ]**
- File: `src/lib/pdf-export.ts` + `src/hooks/usePdfExport.ts`
- What: Two PDF generation stacks coexist — `html2pdf.js` (newly added, ~1.2 MB) and `@react-pdf/renderer` (1,500-line existing pipeline). Different fonts, layouts, behaviors.
- Why: Double bundle cost, divergent PDF output for paying users, maintenance hell. Violates `mem://ux/unified-export-typography`.
- Fix: Pick ONE. Recommendation: keep `@react-pdf/renderer` (richer, already used everywhere), delete `pdf-export.ts` and `html2pdf.js` from `package.json`, OR migrate everything to `pdf-export.ts` and delete `usePdfExport.ts`. Document the choice in memory.
- Effort: M · Risk if ignored: High

**[ ISSUE-003 | P0 | Type Safety ]**
- File: `tsconfig.json`, `tsconfig.app.json`
- What: `strict: false`, `noImplicitAny: false`, `strictNullChecks: false` across the entire project. 71 files use bare `any`.
- Why: Financial-engine code with `null`/`undefined` slipping through type holes is exactly how money-math bugs reach production. The Quantis precision contract (`mem://technical/quantis-precision-and-quality-v3`) is undermined.
- Fix: Flip `"strict": true` and `"strictNullChecks": true` in `tsconfig.app.json`. Expect ~200 errors initially — fix in phases starting with `src/lib/financial-engine.ts`, `quantis-math.ts`, `reconciliation-engine.ts`.
- Effort: L · Risk if ignored: Critical

**[ ISSUE-004 | P0 | Observability — Anthropic costs ]**
- File: `supabase/functions/_shared/anthropic.ts`, `_shared/hybrid-validator.ts`
- What: No `ai_calls` table exists. Anthropic spend (Opus 4.5 at $15/$75 per M tokens) is not logged per-user, per-task, per-model. `estimateCostUsd()` is computed but discarded.
- Why: Cannot detect runaway costs, cannot bill, cannot audit which user triggered Opus. One bad-actor loop could rack up $1k+ silently.
- Fix: Create `ai_calls (id, user_id, analysis_id, task, provider, model, input_tokens, output_tokens, cost_usd, latency_ms, created_at)` with RLS (admin-only read). Insert from `hybrid-validator.ts` after each `callClaude()`.
- Effort: S · Risk if ignored: Critical

**[ ISSUE-005 | P0 | Security — CORS wildcards ]**
- Files: 30+ edge functions (e.g. `analyze-business`, `ai-narrator`, `stripe-webhook`, `share-report`)
- What: `Access-Control-Allow-Origin: '*'` everywhere, including functions that read user auth tokens.
- Why: Combined with `Authorization` header acceptance, any malicious site can invoke authenticated endpoints from a victim's browser. Mitigated only because `credentials: 'include'` is not used by SDK, but still hostile-internet exposure for Pro `apiAccess`.
- Fix: Build an allowlist `[https://aiwmcquantis.com, https://www.aiwmcquantis.com, https://aiwmcquantis.lovable.app, /\.lovable\.app$/, /\.lovableproject\.com$/]` in `_shared/cors.ts`; echo back validated `Origin` instead of `*`.
- Effort: S · Risk if ignored: High

---

### P1 — HIGH

**[ ISSUE-006 | P1 | Performance — Web Vitals ]**
- File: `src/pages/Landing.tsx` + `src/main.tsx`
- What: Console shows TTFB 1653ms (poor), FCP 10112ms (poor) on landing.
- Why: Direct revenue loss — pricing page conversion correlates with FCP.
- Fix: Audit `Landing.tsx` synchronous imports; lazy-load below-the-fold sections (testimonials, FAQ); preconnect to fonts.googleapis.com; ensure no `@import` chains in `index.css`.
- Effort: M · Risk if ignored: High

**[ ISSUE-007 | P1 | Architecture — God function ]**
- File: `supabase/functions/analyze-business/index.ts` (4,425 lines)
- What: Single edge function does routing, validation, engine call, narrator, safety guardrails, hybrid validator, persistence.
- Why: Cold-start cost, impossible to unit-test, every commit risks the whole flow. Deno startup parses 4.4k lines on every invocation.
- Fix: Extract into `_shared/` modules: `engine-runner.ts`, `narrator-runner.ts`, `safety-runner.ts`, `persistence.ts`. Keep `index.ts` as a 200-line orchestrator.
- Effort: L · Risk if ignored: High

**[ ISSUE-008 | P1 | Async / Reliability ]**
- File: `src/hooks/useAnalysis.ts` (lines 145–168)
- What: `useEffect` watches `fileUpload.files.filter(...).length` — a fresh array each render; toast can fire repeatedly.
- Why: Spam toasts during re-renders, degraded UX.
- Fix: Track `lastSuggestionHash` in a `useRef`; only toast when the set of extracted financial keys changes.
- Effort: XS · Risk if ignored: Medium

**[ ISSUE-009 | P1 | Security — Logging ]**
- File: `src/lib/logger.ts` + 189 raw `console.log/error/warn` across `src/`
- What: 189 direct console calls bypass the logger; `vite.config.ts` drops them in prod, hiding failures from Sentry.
- Why: Real production bugs become invisible. Sentry capture is wired in `lib/sentry.ts` but not used at error sites.
- Fix: ESLint rule `no-console` (allow `console.error` only via wrapper that also calls `captureError`). Replace top-50 hot files in one PR.
- Effort: M · Risk if ignored: High

**[ ISSUE-010 | P1 | Sentry not initialized ]**
- File: `src/main.tsx` / `src/App.tsx`
- What: `initSentry()` exists but is never called. `App.tsx` only calls `initWebVitals()` + `initEngagementTracking()`.
- Why: Zero error tracking in production despite Sentry SDK being shipped (~80 KB wasted).
- Fix: Add `initSentry()` to `main.tsx` before `ReactDOM.render`; set `VITE_SENTRY_DSN` secret.
- Effort: XS · Risk if ignored: High

**[ ISSUE-011 | P1 | UX — pdf-export typography drift ]**
- File: `src/lib/pdf-export.ts` (line 41)
- What: Loads Sora + DM Sans + JetBrains Mono — but `mem://ux/unified-export-typography` mandates Sora+DM Sans only and `usePdfExport.ts` already enforces this with TTF embedding. New file uses Google Fonts CDN which won't load reliably during `html2canvas` capture.
- Why: PDFs may render in fallback serif on slow networks, breaking brand.
- Fix: If keeping `pdf-export.ts`, embed fonts as base64 (same approach as `usePdfExport.ts`), OR resolve via ISSUE-002.
- Effort: S · Risk if ignored: High

---

### P2 — MEDIUM

**[ ISSUE-012 | P2 | Dead/zombie components ]**
- Files: `src/components/AnalysisResults.tsx`, `src/components/AnalysisInputForm.tsx`, `src/components/HistorySection.tsx`
- What: Likely unused — modern equivalents live under `src/components/analysis/`. Need import-graph confirmation.
- Fix: Run `grep -rn "from.*'@/components/AnalysisResults'" src` for each; delete if no consumers.
- Effort: S · Risk if ignored: Medium

**[ ISSUE-013 | P2 | ESLint rules too lax ]**
- File: `eslint.config.js`
- What: `@typescript-eslint/no-unused-vars: "off"`, no `no-floating-promises`, no `no-console`, no a11y plugin.
- Fix: Add `eslint-plugin-jsx-a11y`, enable `no-floating-promises`, `no-console: ['error', { allow: ['error'] }]`.
- Effort: S · Risk if ignored: Medium

**[ ISSUE-014 | P2 | Missing audit-info endpoint ]**
- File: `src/services/safety-evaluation-service.ts` (warned in console)
- What: Two warnings per page-load: "Failed to fetch audit info, using defaults" — endpoint returning 404 or RLS-blocked.
- Fix: Verify `safety_evaluations` query, add `.maybeSingle()`, suppress warning when zero rows.
- Effort: XS · Risk if ignored: Low

**[ ISSUE-015 | P2 | Apollo tracker noise ]**
- File: `index.html` (Apollo script)
- What: Repeated `TypeError: Failed to fetch` from Apollo tracker pollutes Sentry once enabled.
- Fix: Wrap Apollo in try/catch, add to `Sentry.ignoreErrors`.
- Effort: XS · Risk if ignored: Low

**[ ISSUE-016 | P2 | Tests structurally thin ]**
- File: `src/__tests__/*` (13 files)
- What: All tests are unit-level on lib code. Zero React component tests, zero E2E for analysis submit flow despite `signup-mobile.test.tsx` precedent.
- Fix: Add Playwright, write 3 critical E2E flows: (1) anonymous → analysis, (2) signup → checkout, (3) Plus → PDF export.
- Effort: L · Risk if ignored: Medium

**[ ISSUE-017 | P2 | Bundle — html2pdf.js cost ]**
- File: `package.json`
- What: `html2pdf.js@0.10.2` adds ~1.2 MB uncompressed (jsPDF + html2canvas bundled). Not in `manualChunks`, will land in main bundle if any synchronous import path exists.
- Fix: Resolve via ISSUE-002 or ensure `pdf-export.ts` is dynamically imported only and add to `manualChunks` as `'pdf-html': ['html2pdf.js']`.
- Effort: XS · Risk if ignored: Medium

**[ ISSUE-018 | P2 | Magic strings — Anthropic models ]**
- File: `supabase/functions/_shared/anthropic.ts`
- What: Model IDs are string-typed but no central registry; `claude-haiku-4-5` referenced in comments isn't yet wired anywhere despite being the cheapest tier.
- Fix: Add `AI_MODELS` constant; wire Haiku into industry classifier (currently does deterministic only).
- Effort: S · Risk if ignored: Low

---

### P3 — LOW

**[ ISSUE-019 | P3 | A11y — focus rings ]** Sparse `focus-visible` styling on custom buttons. Audit with axe. Effort: S.
**[ ISSUE-020 | P3 | Naming ]** `AnalysisResults.tsx` vs `AccuracyTransparentResults.tsx` — confusing. Rename canonical → `AnalysisResults.tsx` after deleting legacy. Effort: XS.
**[ ISSUE-021 | P3 | `@ts-ignore` ]** `pdf-export.ts:1` uses `@ts-ignore`. Replace with `@ts-expect-error` so it surfaces if types ever ship. Effort: XS.
**[ ISSUE-022 | P3 | Console drop in prod ]** `vite.config.ts` drops ALL console (including `console.error`). Errors silently disappear. Effort: XS.

---

## QUICK WIN MATRIX (Effort=XS, Risk=High/Critical — do this week)

| # | Issue | Why now |
|---|---|---|
| 1 | ISSUE-001 | Delete/translate Russian results component — 5 min |
| 2 | ISSUE-010 | Wire `initSentry()` in `main.tsx` — 2 min |
| 3 | ISSUE-008 | Fix toast spam in `useAnalysis.ts` useEffect — 15 min |
| 4 | ISSUE-022 | Stop dropping `console.error` in prod build — 1 min |
| 5 | ISSUE-014 | Suppress audit-info warning — 10 min |

---

## RATING SCORECARD

| Dimension | Score | Evidence |
|---|---|---|
| **Engineering** | | |
| Code readability & clarity | 6/10 | Clean module split, but 4.4k-line god function (ISSUE-007) |
| Architecture soundness | 7/10 | Strong RLS + entitlements model, but PDF dual-stack (ISSUE-002) |
| Separation of concerns | 6/10 | Engine vs UI clean; edge function monolith fails (ISSUE-007) |
| Error handling | 5/10 | 189 raw consoles, Sentry not initialized (ISSUE-009, 010) |
| Type safety | **3/10** | Strict mode OFF (ISSUE-003), 71 files using `any` |
| Async/concurrency | 6/10 | Atomic RPCs for quotas (good), useEffect dep bugs (ISSUE-008) |
| DRY | 6/10 | Two PDF pipelines, duplicate tier matrix (entitlements:25) |
| **Quality & Testing** | | |
| Unit test coverage | 6/10 | 13 lib tests, golden vectors |
| Integration coverage | 4/10 | One auth-e2e, no edge-function tests |
| E2E coverage | 2/10 | Effectively zero (ISSUE-016) |
| CI/CD robustness | 5/10 | Vitest exists, no merge gating visible |
| **Security** | | |
| Authentication | 8/10 | Supabase Auth + JWT validation in 9 functions |
| Authorization | 8/10 | All 70+ tables RLS-enabled, server entitlement guard |
| Input validation | 7/10 | Zod schemas present, some routes missing |
| Secrets management | 9/10 | Anthropic key in Vault, no hardcoded keys in source |
| Dependency posture | 6/10 | `html2pdf.js` outdated, recharts 2.x |
| **Performance** | | |
| Frontend load | **3/10** | TTFB 1653ms, FCP 10112ms (ISSUE-006) |
| Backend response | 6/10 | Hybrid validator gates Opus to needed cases |
| Database efficiency | 7/10 | RLS via SECURITY DEFINER, no obvious N+1 |
| Caching | 6/10 | React Query staleTime tuned |
| **UX** | | |
| Visual consistency | 7/10 | Quantis V2 aesthetic strong, ISSUE-001 breaks it |
| Interaction quality | 7/10 | Tooltips/keyboard mostly there |
| Accessibility | 5/10 | SkipToContent good, no axe coverage (ISSUE-019) |
| Mobile experience | 7/10 | Responsive strategy enforced |
| Error/empty states | 6/10 | EmptyState component exists, narrator fallbacks present |
| **Operations** | | |
| Observability | **3/10** | Sentry shipped but inert, no `ai_calls` ledger (ISSUE-004, 010) |
| Documentation | 6/10 | Memory system rich, code-level JSDoc sparse |
| Deployment | 7/10 | Lovable Cloud auto-deploy, supabase config.toml clean |
| Onboarding DX | 5/10 | No CONTRIBUTING.md, ESLint loose (ISSUE-013) |

### **OVERALL SCORE: 5.8/10**

### **VERDICT: 🟡 YELLOW — Ship with mitigation plan**

### TOP 5 RISKS

1. **PDF dual-stack divergence** (ISSUE-002) — paying users get inconsistent exports
2. **Anthropic cost runaway** (ISSUE-004) — no ledger, Opus is $75/M output tokens
3. **Russian text in English UI** (ISSUE-001) — instant credibility loss
4. **Type-safety blackhole** (ISSUE-003) — financial bugs reach prod undetected
5. **Sentry inert** (ISSUE-010) — flying blind in production

---

## RECOMMENDED ROADMAP

**WEEK 1 — Stop the bleeding**
ISSUE-001, ISSUE-002 (decision + delete one stack), ISSUE-004 (`ai_calls` table), ISSUE-005 (CORS allowlist), ISSUE-010 (Sentry init), ISSUE-022, ISSUE-008.

**MONTH 1 — Shore up fundamentals**
ISSUE-003 (strict mode rollout, file-by-file), ISSUE-006 (Web Vitals), ISSUE-007 (split god function), ISSUE-009 (logger migration), ISSUE-011 (PDF font embedding), ISSUE-013 (ESLint hardening).

**QUARTER 1 — Build toward excellence**
ISSUE-016 (Playwright E2E suite), ISSUE-018 (model registry + Haiku wiring), ISSUE-019 (axe CI), ISSUE-012 (dead-code sweep), full integration tests for `analyze-business` orchestrator.

---

## WHAT YOU ARE DOING WELL

- **RLS discipline**: 70+ tables, 100% coverage. Rare in early-stage SaaS.
- **Server-side entitlements**: `requireFeature` / `requireUsage` with atomic RPC quota consumption — denials logged for observability.
- **Financial firewall**: `stripFinancialFields()` is exactly the right pattern; Claude cannot corrupt deterministic math.
- **Memory system**: 80+ memory files keep architectural intent explicit across sessions.
- **Math precision**: `decimal.js` via `QMath`, golden test vectors, reconciliation rules with R-001…R-011 IDs.
- **Hybrid validator**: Cheap rules first, Opus only when warnings fire. Cost-aware AI architecture.

