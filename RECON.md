## 1. Project shape

- **Framework**: Vite 5 + React 18 SPA with `react-router-dom` v7 (NOT Next.js, NOT Remix). No App Router / Pages router.
- **Language**: TypeScript 5 (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.financial.json`).
- **Monorepo**: No — single package at repo root.
- **Package manager**: `bun` (scripts call `bun run …`, lockfile is bun's).
- **Build pipeline**: `bun run typecheck:financial && bun run verify:business-logic && vite build`.
- **Source roots**:
  - App root: `src/`
  - Entry: `src/main.tsx` → `src/App.tsx`
  - Pages (route components): `src/pages/**` (flat files + `admin/`, `examples/`, `settings/`, `dev/` subdirs)
  - Shared lib/utils: `src/lib/**` (utilities + engines), `src/utils/**` (smaller helpers)
  - Reusable components: `src/components/**` with domain folders (`analysis/`, `docs/`, `pdf/`, `landing/`, `layout/`, `ui/` shadcn primitives, etc.)
  - Services (API wrappers): `src/services/**`
  - Hooks: `src/hooks/**`
  - Calculation engines: `src/lib/monte-carlo.ts`, `src/lib/financial-engine.ts`, `src/lib/quantis-math.ts`, `src/lib/reconciliation-engine.ts`, `src/engine/rvce/**`
  - Edge functions (Deno): `supabase/functions/<name>/index.ts` with `supabase/functions/_shared/**`
  - Migrations: `supabase/migrations/*.sql` (~140 files, timestamps from 2025-11 → 2026-05)

## 2. Existing API surface

Backend = Supabase Edge Functions (Deno). There is no `app/api/**` or `pages/api/**`. Each function exposes a single HTTP endpoint at `https://<ref>.functions.supabase.co/<name>`. Called from the client via `supabase.functions.invoke('<name>', …)`.

Functions (from `supabase/functions/`):

| Function | Purpose (from name / handler comment) |
|---|---|
| `aggregate-quality-metrics` | Aggregate daily quality metrics |
| `ai-consensus` | Multi-LLM consensus evaluator |
| `ai-narrator` | LLM narrator for analysis text |
| `alert-webhook` | Receive alerting webhooks |
| `analyze-business` | Main business analysis pipeline (Free/Plus) |
| `analyze-plus` | Plus-tier analysis variant |
| `analyze-preview` | Lightweight preview / hero analysis |
| `analyze-pro-extension` | Pro async deep-analysis kickoff |
| `analyze-pro-worker` | Pro worker that finishes the deep job |
| `api-analyze` / `api-analyze-main` | Public API key analysis endpoints |
| `autoposter-generate-content` | LLM-generated social posts |
| `benchmarks-query` | Read benchmark store |
| `bot-detection` | UA / heuristic bot filtering |
| `calculate-financials` | Server-side financial engine |
| `check-churn-signals` / `check-lifecycle-emails` | Lifecycle email triggers |
| `create-api-key` | Issue user API key |
| `create-checkout-session` / `create-portal-session` | Stripe |
| `doc-queue-worker` / `process-doc-job` / `generate-document` / `generate-document-content` | Docs Studio generation pipeline |
| `export-document` / `queue-export` / `pdf-generator` | Document export pipeline |
| `generate-idea` | AI idea generator |
| `health-check` | Liveness |
| `ingest-benchmark-data` / `ingest-benchmark-v2` / `ingest-data-sources` / `seed-benchmarks` / `manage-benchmarks` / `score-import` | Benchmark ingestion / governance |
| `invoice-capacity-check` | Plus invoice quota |
| `manage-knowledge-base` | KB admin |
| `newsletter-unsubscribe` | Newsletter management |
| `parse-document` | Upload parse |
| `process-subscription-downgrades` | Daily downgrade job |
| `publish-due-posts` | Autoposter scheduler |
| `replay-webhook-events` | Stripe webhook replay |
| `run-accuracy-harness` / `run-tier-qa-harness` | QA harnesses |
| `rvce-validate` | Reference-class validation engine |
| `self-learning-update` | Learning signal ingestion |
| `send-lead-magnet` / `send-lifecycle-email` / `send-weekly-insights` / `send-welcome-email` | Email senders |
| `share-report` | Issue/resolve share token |
| `stripe-webhook` | Stripe webhook receiver |
| `team-invite` | Team invitations |
| `template-optimizer` | Doc template performance optimizer |
| `warm-functions` | Cold-start warmer |

## 3. Database layer

- **Supabase client init** — `src/integrations/supabase/client.ts` (auto-generated, do NOT edit):
  ```ts
  import { createClient } from '@supabase/supabase-js';
  import type { Database } from './types';
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { storage: localStorage, persistSession: true, autoRefreshToken: true }
  });
  ```
- **Edge-function client init** — see `supabase/functions/_shared/tier-gate.ts`:
  ```ts
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
  // user-scoped:
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  // service-role (bypasses RLS, never exposed):
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
  ```
- **Generated DB types**: `src/integrations/supabase/types.ts` (auto-generated, do NOT edit).
- **Migrations**: `supabase/migrations/*.sql`.
- **Auth approach**: Supabase Auth (email/password via `supabase.auth.signInWithPassword`, `signUp` — see `src/hooks/useAuth.ts`). Sessions persisted in `localStorage`.

**Existing tables** (parsed verbatim from `CREATE TABLE …` in migrations):

```
accuracy_runs, activation_events, ai_calls, analyses, analysis_break_even,
analysis_burn_runway, analysis_cases, analysis_cash_flow, analysis_dcf,
analysis_dscr_credit, analysis_edge_cases, analysis_jobs, analysis_logs,
analysis_monte_carlo, analysis_pre_mortem, analysis_run_logs, analysis_scenario,
analysis_self_learning, analysis_tam_sam_som, analysis_unit_economics,
anonymous_usage, api_keys, api_request_logs, autoposter_analytics_weekly,
autoposter_credentials, autoposter_post_analytics, autoposter_post_platforms,
autoposter_posts, autoposter_publishing_logs, benchmark_calibration,
benchmark_ingestion_runs, benchmark_master_core, benchmark_master_geo,
benchmark_master_invoice, benchmark_master_risk, benchmark_master_unit_econ,
benchmark_sources, benchmark_store, benchmarks_v, branding_settings,
data_provenance, doc_generation_jobs, doc_performance_signals, doc_templates,
document_downloads, document_exports, document_versions, documents,
email_send_log, email_sequence_log, email_sequences, engine_learning_signals,
entitlement_denials, export_jobs, funnel_events, golden_test_vectors,
gsc_verification, industry_benchmarks, industry_distributions, invoices,
launch_checklists, leads, location_data, marketing_channels, newsletter_sends,
profiles, quality_metrics_daily, quantis_learning_config, rate_limits,
reconciliation_log, referral_codes, referral_conversions, referral_rewards,
report_outputs, risk_factors, rvce_cache, rvce_observation_cache,
rvce_validation_log, safety_evaluations, scenario_comparisons, scenario_library,
scenarios, security_logs, shared_reports, stripe_webhook_events,
subscription_audit_log, subscriptions, team_invitations, team_members, teams,
template_improvement_suggestions, template_performance_history, tier_qa_runs,
training_cases, usage_tracking, user_brand_profiles, user_engagement,
user_notifications, user_realism_feedback, user_roles, user_settings,
user_validation_progress
```

Roles live in `user_roles` (separate table, per `<user-roles>` mandate). Admin check uses `public.has_role(_user_id uuid, _role app_role)` SECURITY DEFINER function; client wrapper in `src/hooks/useAdmin.ts`.

## 4. Calculation engines

### `src/lib/monte-carlo.ts` (browser-side)
Header comment: *"Browser-based probabilistic forecasting using seeded PRNG. All arithmetic uses QuantisMath for precision safety."*

Exported types & functions (verbatim signatures):
```ts
export interface MonteCarloParam {
  name: string;
  baseValue: number;
  minValue: number;
  maxValue: number;
  distribution: 'uniform' | 'normal' | 'triangular';
}

export interface MonteCarloConfig {
  iterations: number;
  params: MonteCarloParam[];
  outputFn: (params: Record<string, number>) => number;
  seed?: number;
  storeSamples?: boolean;
  target?: number;
}

export interface MonteCarloResult {
  iterations: number;
  mean: number; median: number; stdDev: number;
  p10: number; p25: number; p75: number; p90: number;
  min: number; max: number;
  probabilityPositive: number;
  probabilityExceedsTarget?: number;
  histogram: { bucket: number; count: number; pct: number }[];
  rawSamples?: number[];
}

export async function runMonteCarlo(config: MonteCarloConfig): Promise<MonteCarloResult>
export function estimateRuntime(iterations: number, paramCount: number): number
export function generateCorridorData(/* … */)
```

- **Randomness**: seeded PRNG via `mulberry32(seed)` (line 51). Distributions: uniform, Box-Muller normal, inverse-CDF triangular.
- **Seed**: `config.seed ?? Date.now()` — deterministic when seed is supplied.
- **Iterations default**: `Math.max(1, Math.min(10000, config.iterations || 1000))` — clamp `[1, 10000]`, default **1000**.
- **Chunking**: yields to main thread every `CHUNK_SIZE = 500` iterations via `setTimeout(0)`.

### `src/lib/financial-engine.ts`
Exports (line numbers):
```
121: export function calculateUnitEconomics(params: UnitEconomicsParams): UnitEconomicsResult
171: export function generate3YearPL(params: FinancialModelParams): PLStatement[]
273: export function generateCashFlow(...): CashFlowStatement[]
343: export function findBreakEvenMonth(cashFlows: CashFlowStatement[]): number | null
350: export function calculateCashRunway(cashFlows, currentMonth): number
355: export function calculateROI(cashFlows, initialInvestment): number
360: export function calculatePaybackPeriod(cashFlows): number | null
374: export const ENGINE_VERSION = '2.0.0-precision'
390: export function calculateWithTrace(...)
```

### Other engines
- `src/lib/quantis-math.ts` — decimal.js wrapper `QuantisMath` (canonical for all financial math; never raw JS `+ - * /`).
- `src/lib/reconciliation-engine.ts` — sum/sign consistency rules (R-001…R-010).
- `src/engine/rvce/{rvceService.ts,aggregator.ts,referenceClassBuilder.ts,useRvceValidation.ts,types.ts}` — Reference-class validation engine.
- `src/services/scenario-engine.ts` — scenario orchestration (also references Monte Carlo).
- Server-side: edge function `calculate-financials` mirrors `financial-engine.ts` for parity (tested in `src/__tests__/business-logic-parity.test.ts`).

**No `PL36` symbol present in the codebase.** Closest match is `generate3YearPL` (36-month P&L = "PL36" semantically).

## 5. PDF generation

- **Library**: `@react-pdf/renderer` v4.3.2 (canonical; see memory `pdf-export-canonical` — `html2pdf.js` must not be re-added).
- Also installed but used for non-PDF rasterization: `html-to-image`, `jszip`.
- Edge function: `supabase/functions/pdf-generator/index.ts`.

**HTML report template** (rendered to canvas / used as fallback preview) — `src/components/pdf/`:

```
ExecutiveReport.tsx     ← root <ExecutiveReport result={…} />, forwardRef<HTMLDivElement>
ReportCoverPage.tsx
ReportExecutiveSummary.tsx
ReportFinancials.tsx
ReportMarketAnalysis.tsx
ReportRiskAssessment.tsx
ReportActionPlan.tsx
ReportBenchmarks.tsx
ReportAppendix.tsx
ReportPageElements.tsx
pdfStyles.ts
```

`ExecutiveReport` signature:
```tsx
export const ExecutiveReport = forwardRef<HTMLDivElement, { result: BusinessAnalysisResult }>(
  ({ result }, ref) => (
    <div ref={ref} className="executive-report" style={{ width: '210mm', minHeight: '297mm', /* … */ }}>
      <ReportCoverPage result={result} />
      …
      <ReportAppendix result={result} />
    </div>
  )
);
```

Doc-side export hooks: `src/hooks/useDocumentExport.ts`, `src/hooks/useDocumentDownload.ts`, `src/hooks/useExportQueue.ts`.

## 6. Docs Studio

- **Route**: `/docs` (`src/App.tsx` line 159), gated by `<ProtectedRoute><PlusGate module="docs">…</PlusGate></ProtectedRoute>`.
- **Entry page**: `src/pages/DocsStudio.tsx` (842 lines).
- **Document type forms** (lazy-loaded in `DocsStudio.tsx` lines 56–65):
  ```
  InvoiceForm, QuarterlySummaryForm, NDAForm, BusinessPlanForm, PitchDeckForm,
  OnePagePlanForm, FinancialForecastForm, PartnershipForm, FounderAgreementForm,
  MarketAnalysisForm
  ```
  Each lives in `src/components/docs/forms/`.
- **Template registration is data-driven** — templates are rows in the `doc_templates` table (NOT a JS array). Loader: `src/hooks/useTemplates.ts`:
  ```ts
  supabase.from('doc_templates')
    .select('*').eq('is_active', true)
    .order('usage_count', { ascending: false })
  // columns referenced: template_id, category, tier ('free'|'plus'), template_json, is_active, usage_count
  ```
- **Type definitions**: `src/types/document.ts` (`DocTemplate`, `TemplateCategory`, `Document`).
- Generation pipeline: `useDocuments.ts` + `useDocQueue.ts` → edge functions `generate-document`, `generate-document-content`, `doc-queue-worker`, `process-doc-job` → export via `export-document` / `queue-export` / `pdf-generator`.
- Related components: `src/components/docs/{DocumentLibrary,DocumentsList,TemplatePicker,TemplateCard,IntakeForm,DocumentEditor,ExportPanel,PreviewDownloadBar,InvoiceCreator,…}.tsx`.

## 7. Navigation

Two navigation surfaces.

### Marketing/site header (top bar, all routes)
- File: `src/components/layout/Header.tsx`
- Shape: **JSX-hardcoded** (no array). Items currently rendered: theme toggle, mobile `<MobileNav>`, `<NotificationCenter />`, conditional Admin link `<Link to="/admin">`, user email pill, sign-out button, OR `<Link to="/auth">Sign In</Link>`.
- Mobile sheet: `src/components/layout/MobileNav.tsx`.

### App sidebar (authenticated app shell)
- File: `src/components/layout/AppSidebar.tsx`
- Shape: **declarative typed array** `NAV_SECTIONS: NavSection[]` (lines 58–102) of `{ label, items: NavItem[] }` where:
  ```ts
  interface NavItem {
    title: string;
    url: string;            // supports '__settings__' placeholder, query strings, http(s) URLs
    icon: React.ElementType; // lucide-react
    adminOnly?: boolean;
    external?: boolean;
    badge?: string;
    plusOnly?: boolean;     // shows 🔒 Plus chip for Free users
  }
  ```
- Current sections & items (verbatim):
  ```
  ANALYSIS:    Dashboard (/app), History (/app?tab=history)
  DOCUMENTS:   My Documents (/docs, plusOnly), Templates (/docs?view=templates, plusOnly)
  BILLING:     Invoices (/app/invoices, plusOnly)
  INTELLIGENCE: Benchmarks (/admin/benchmarks, adminOnly), Scenarios (/app?tab=scenarios),
                My Stats (/app/stats), Progress (/leaderboard)
  ADMIN:       Autoposter (/admin/autoposter, adminOnly)
  ACCOUNT:     Settings (__settings__), Billing (__settings__?tab=billing),
                Help (https://aiwmcquantis.lovable.app/how-it-works, external)
  ```
- Routing is `react-router-dom` v7 with `<Routes>` defined declaratively in `src/App.tsx` (see §1).

## 8. UI primitives

- **Styling**: Tailwind CSS v3 (`tailwind.config.ts`) + shadcn/ui (Radix primitives). No CSS Modules, no styled-components. Semantic design tokens defined as CSS vars in `src/index.css` (`--q-bg-*`, `--q-text-*`, `--q-accent-*`, `--q-status-*`, `--q-chart-*`, `--q-verdict-*`, `--q-border-*`, `--q-radius-*`) plus legacy shadcn tokens (`--background`, `--foreground`, `--primary`, etc., mapped via `hsl(var(--…))` in `tailwind.config.ts`).
- **Fonts** (from `tailwind.config.ts`):
  ```ts
  fontFamily: {
    sans:    ['Cabinet Grotesk', 'DM Sans', ...defaultTheme.fontFamily.sans],
    display: ['Cabinet Grotesk', 'Sora', 'DM Sans', ...defaultTheme.fontFamily.sans],
    mono:    ['JetBrains Mono', 'Fira Code', ...defaultTheme.fontFamily.mono],
  }
  ```
- **Shadcn primitives present** in `src/components/ui/`:
  ```
  accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button,
  calendar, card, carousel, chart, checkbox, collapsible, command, context-menu,
  dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label,
  menubar, navigation-menu, optimized-image, OptimizedImage, pagination, popover,
  progress, radio-group, resizable, scroll-area, select, separator, sheet,
  sidebar, skeleton, TrafficLightBadge, … (full shadcn set)
  ```
  Each follows the stock shadcn API — Button has `variant` / `size` / `asChild`, Input is standard, Card uses `CardHeader/CardTitle/CardContent/CardFooter`, etc.
- **Class merging**: `clsx` + `tailwind-merge` via `src/lib/utils.ts` (`cn()`).
- **Charts**: `recharts` 2.12 (also a shadcn `chart.tsx` wrapper).
- **Rich editor**: `@tiptap/*` 2.27 (used in `DocumentEditor.tsx`).

## 9. State management

- **No global store** (no Zustand, Redux, Jotai, or app-wide Context provider). State management = `useState` + custom hooks (~70 in `src/hooks/`) + **TanStack Query** (`@tanstack/react-query` v5) for server cache.
- Single `QueryClient` configured in `src/App.tsx` (staleTime 5 min, gcTime 30 min, retry 2, no refetchOnWindowFocus).
- Theme via `next-themes` (`<ThemeProvider attribute="class" defaultTheme="light" storageKey="theme">`).
- i18n via `react-i18next` (`src/i18n/index.ts`).
- **Forms**: `react-hook-form` v7 + `@hookform/resolvers` + `zod` schemas (`src/lib/validationSchemas.ts`). Some smaller forms use plain `useState`.

## 10. Auth and RLS

- **Client auth hook**: `src/hooks/useAuth.ts` — uses `supabase.auth.onAuthStateChange`, `getSession`, `signInWithPassword`, `signUp` (`emailRedirectTo: ${window.location.origin}/`), `signOut`. Returns `{ user, session, isLoading, isAuthenticated, signIn, signUp, signOut }`.
- **Route guards**: `src/components/auth/ProtectedRoute.tsx` (`requireAdmin` prop). Plus/Pro gating via `src/components/PlusGate.tsx`.
- **Canonical "get user from request" pattern in edge functions** — `supabase/functions/_shared/tier-gate.ts`:
  ```ts
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) return { userId: null, tier: 'FREE', monthlyAnalysesUsed: 0 };

  // Service-role for RLS-bypassed reads (never returned to caller)
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
  ```
  Most functions then `await resolveCallerTier(req)` and gate with `evaluateGate(...)`.
- **RLS pattern**: every user-data table has RLS enabled; admin checks go through `public.has_role(auth.uid(), 'admin')` SECURITY DEFINER function (see `<user-roles>` mandate). Admin email enforcement: `beltovbogdan@gmail.com` (memory: `admin-access-and-observability`).
- **Shared CORS helper**: `supabase/functions/_shared/cors.ts`.
- **Other shared helpers**: `ai-safety-guardrails.ts`, `tier-spec.ts`, `cost-guard.ts`, `entitlements.ts`, `email-guard.ts`, `hybrid-validator.ts`, `llm-router.ts`, `llm-call.ts`, `prompts.ts`, `schemas.ts`, `request-id.ts`, `logger.ts`, `analysis-event-logger.ts`.

## 11. Environment and feature flags

- **`.env` file** present (auto-managed). Variables:
  ```
  SUPABASE_PUBLISHABLE_KEY     # legacy/duplicate
  SUPABASE_URL                 # legacy/duplicate
  VITE_SUPABASE_PROJECT_ID
  VITE_SUPABASE_PUBLISHABLE_KEY
  VITE_SUPABASE_URL
  ```
  No `.env.example`. Server-side edge functions additionally read (from `Deno.env.get`): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, plus secrets stored via Lovable Cloud (Stripe keys, LOVABLE_API_KEY for AI gateway, Resend, etc.).
- **Feature flags**: no dedicated feature-flag library. Gating is done via:
  - Tier checks (`useSubscription`, `useTier`, `useSpecTier`, `<PlusGate module=...>`)
  - Admin role (`useAdmin`, `requireAdmin` on `ProtectedRoute`)
  - A/B testing helper at `src/lib/abTesting.ts` (lightweight, not a flag service)
  - Maintenance route `/maintenance` toggled manually

## 12. Testing

- **Framework**: Vitest 4 (`vitest.config.ts`). React Testing Library (`@testing-library/react`, `…/jest-dom`, `…/user-event`, `@testing-library/dom`), JSDOM (`jsdom`).
- No Playwright, no Jest, no Cypress.
- **Engine tests present** in `src/__tests__/`:
  ```
  financial-engine.test.ts
  financial-engine-v2.test.ts
  monte-carlo-scenarios.test.ts
  reconciliation-engine.test.ts
  business-logic-parity.test.ts
  quantis-math.test.ts
  golden-vectors.test.ts
  formula-registry-complete.test.ts
  benchmark-pipeline-invariants.test.ts
  industry-priors.test.ts
  qsl-confidence.test.ts
  regression-suite.test.ts
  narrator-numeric-coherence.test.ts
  rvce-fanout.test.ts
  tier-matrix.test.ts / tier-matrix-server-parity.test.ts
  llm-router.test.ts, prompt-injection.test.ts, bulletproof-validator.test.ts,
  htmlSanitizer.test.ts, logger.test.ts, logger-prod-integration.test.ts,
  correlation.test.ts, pdf-export.test.ts, share-token-access.test.ts,
  signup-mobile.test.tsx, anon-results-cleanup.test.ts,
  analysis-contract.test.tsx, auth-e2e.test.ts
  ```
- Test config / setup: `src/test/setup.ts`, `vitest.config.ts`.
- Quality gate script: `package.json → scripts.test:quality` runs a curated subset; `pre-commit` husky hook runs lint + financial typecheck + business-logic hash verify + `test:quality`.
- Additional perf test: `tests/k6-doc-generation.js` (k6 load test, not part of Vitest).
