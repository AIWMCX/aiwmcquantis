# Existing Quantis Evidence/Research Architecture — Code-Verified Map

Version: 2026-08-10
Produced for: Predicta Evidence Service Implementation Master Prompt, Section 4/42
Status: **Read-only inspection. No production mutation. No implementation code written.**

## Methodology and honesty note

Every claim below was produced by directly reading source files (`Read`/`Grep`/`Glob`)
across four parallel research passes, not by trusting prior documentation. Where an
older doc/comment disagreed with the code, the disagreement is called out explicitly.

**Classification key** (per the master prompt, Section 4):
`PROD_VERIFIED` / `CODE_VERIFIED` / `TEST_VERIFIED` / `PARTIAL` / `BROKEN` /
`UNVERIFIED` / `MISSING` / `DEPRECATED`.

**Important limitation**: this pass had **no live database access** (the Supabase
management-API MCP has returned `permission denied` all session — a pre-existing,
unresolved infra issue tracked elsewhere as INFRA-3). Everything below is therefore
`CODE_VERIFIED` (confirmed by reading the actual source/migration files) rather than
`PROD_VERIFIED` (confirmed by querying the live database), **except** where an
existing in-repo document already records a `PROD_VERIFIED` finding, which is cited
as such. Do not upgrade any `CODE_VERIFIED` item below to `PROD_VERIFIED` without an
actual live query — this session has hit real cases (analyses.analyses table grants,
scenario tables, rvce_validation_log) where code-level intent and live production
state diverged.

---

## 1. `analyze-business` hot path — CODE_VERIFIED

`supabase/functions/analyze-business/index.ts` (4335 lines). Full request→response
order, cited by line number:

health probe (1967) → CORS/request-id (1970-1973) → HTTP validation (2000) →
env/config check (2031-2040) → auth resolution: trusted-worker / bearer-token+quota /
anonymous (2068-2161) → anonymous rate limit RPC (2167-2256) → authenticated hourly
rate limit RPC (2260-2313) → body parse + Zod validation (2319-2341) → tier-based
depth coercion (2352-2385) → **pro-tier async queue branch, returns 202 immediately**
(2392-2450) → input sanitization/safety checks (2459-2557) → archetype/revenue-shape
detection (2577-2589) → document-derived financial merge (2591-2685) → DB-driven
industry detection (2700-2721) → Benchmark Engine V2 (2724-2785) → location
intelligence (2788) → sub-industry detection (2798) → narrator prompt construction
(2807-2978) → AI call via `aiCall(...)` (2999-3020) → deterministic fallback if AI
fails (3063/3080) → **`transformResponse()` (3095, defined 1653-1963), which calls
`calculateStrictFinancials` at 1742-1754** → "GOLDEN checkpoint" snapshot set (3100,
see §5) → narrative sanitizer (3104-3141) → immutable snapshot emit (3156-3187) →
Quantis 2.0 engine (3224) → insights/warnings merge (3233-3284) → confidence scoring,
capped at 50 if integrity issues exist (3286-3560) → usage RPCs (3595, 3612) →
cross-validation/sensitivity/benchmark-confidence/anti-BS checks (3651-3697) →
**reconciliation check** (3719-3763, see §4) → assumption graph, model confidence,
market prior, SCORE compliance (3769-3841) → case-memory insert (3850-3871) → full
payload assembly (3873-4095) → hybrid validator, paid tiers only (4101-4136) →
tier-based response stripping for free/anon (4142-4194) → outgoing
`ResponseSchema.parse()`, degrades to GOLDEN snapshot on schema failure rather than a
bare error (4199-4213) → QOC shadow-mode observer call, cannot alter response
(4238-4271) → final response (4273-4276).

Input schema: Zod `RequestSchema`, `boundary-schemas.ts:51-64` — `idea`, `location`
required; optional `financial_inputs` (monthly_revenue, monthly_costs,
startup_investment, expected_customers, average_price, cac, churn_rate),
`selected_industry`, `documents[]`, `analysis_depth`.

**Design note**: the whole function is architected around a "GOLDEN checkpoint" —
once a valid deterministic result exists, no later failure path returns a bare 500;
it degrades to the GOLDEN snapshot instead (outermost catch, 4278-4333).

---

## 2. Deterministic financial calculator — CODE_VERIFIED

`supabase/functions/analyze-business/financial-calculator.ts:79-91`:

```ts
export function calculateStrictFinancials(
  rawMrr, rawInvestment, rawCac, rawLtv, rawAvgCheck,
  benchmarks: IndustryBenchmarks,
  locationMultipliers: LocationMultiplierResult,
  subIndustry: SubIndustryResult | null,
  userProvidedCosts?, userProvidedChurnRate?, userProvidedCustomers?
): StrictFinancialResult
```

Output (`StrictFinancialResult`, lines 34-77): mrr, totalExpenses, netProfit,
margins, expense breakdown, cac, ltv, ltv:cac, payback (with independent
cash-roll-forward cross-check), ROI, breakeven, NPV (36mo DCF), CVP, profitability
margins, leverage ratios (**always `INSUFFICIENT_INPUTS`**, no debt schedule
collected — documented at lines 712-715), corrections array, audit trail.

**Determinism**: confirmed by grep — zero `await`/`fetch`/`Math.random`/
`Deno.env`/`supabase` references in the file; function is not `async`. File header
(1-13) states it was deliberately isolated from `index.ts` for Vitest unit-testing
independent of Deno-only imports.

**Implication for Evidence Service**: this is the correct, and only, place external
evidence may ultimately influence a number — and only via the `benchmarks` /
`locationMultipliers` parameters (assumption inputs), never by the calculator
reaching out or trusting an LLM's numeric prose directly.

---

## 3. Scenario engine — TWO separate, non-overlapping systems

### 3a. "Phase D" server-backed scenario workspace — CODE_VERIFIED (built) / **PROD: shipped-but-broken**

`supabase/functions/run-scenario/index.ts`, `create-scenario-set/index.ts`. Freezes
`analyses.scenario_base_input` and re-runs `calculateStrictFinancials`. Tables
`scenario_sets`/`scenarios`(new)/`scenario_versions`/`scenario_runs` defined in
migration `20260730084255_scenario_framework_foundation.sql`, designed as an
append-only, idempotent (SHA-256 `canonical_run_key`) ledger.

**Critical finding**: that migration's own in-code comment (lines 30-58) admits the
new `CREATE TABLE public.scenarios` has no `IF NOT EXISTS` guard and collides with a
pre-existing older `scenarios` table (from `20260308082036_...sql`), aborting the
migration transaction — meaning `scenario_sets`/`scenario_versions`/`scenario_runs`
were **never actually created in production**. Corroborated by
`docs/execution/2026-08-09/OPEN_DEFECTS.md`, defect **DATA-5, status
`PROD_VERIFIED`**. This session's own migration-replay work on the P0 security branch
independently confirmed and fixed the underlying collision (rename-based fix, not yet
merged/deployed — see that branch's commit history). Client code
(`src/services/scenario-sets-api.ts`, `src/pages/ScenarioWorkspace.tsx`, route
`/app/scenarios`) is reachable in the UI today but would fail at runtime against
this backend until that fix ships.

### 3b. Client-side stress-test widget — CODE_VERIFIED, live, this is what users see

`src/services/scenario-engine.ts`: fully synchronous/local (zero
`supabase`/`fetch`/`invoke` references), 8 hardcoded Monte Carlo presets, uses
`@/lib/monte-carlo` + `@/lib/quantis-math` only. `ScenarioBar.tsx` /
`ScenarioSelector.tsx` are independent, presentational, each with their **own**
separately hardcoded preset catalog. Actively rendered in `AnalysisResults.tsx`,
`AccuracyTransparentResults.tsx` → `AppDashboard.tsx`, `PublicAnalysisResult.tsx`,
`PreMortem.tsx`.

**No file names or disambiguates the two systems anywhere in `docs/`.** Do not
conflate them when designing Evidence Service integration points — 3a is the
plausible attachment point for evidence-informed scenario re-runs; 3b is unrelated
UI sugar with no backend.

---

## 4. Reconciliation system — CODE_VERIFIED, real but soft/non-blocking

`runReconciliationCheck(input): ReconciliationResult` —
`supabase/functions/analyze-business/reconciliation-check.ts:97`, engine version
`1.0.0-live`. Runs 11 rules (R-001..R-011) against the **calculator's own output**
only (sum integrity, sign consistency, logical bounds, benchmark boundaries,
scenario-coherence flag) — does **not** cross-check AI narrative text against
numbers (that's §5's `enforceNarrativeIntegrity`).

Called from `analyze-business/index.ts:3719-3763` and `run-scenario/index.ts:271-302`
— both non-blocking. Only R-001..R-005 failures escalate `report_integrity` to
`'BLOCK'`, which merely caps the displayed confidence score at 50
(`Math.min(score,50)`, line 3559) — nothing branches on `'BLOCK'` to withhold the
HTTP response itself.

**Dead code found nearby**: `_shared/r3-validator.ts`'s `r3Validate` pipeline has
zero call sites. Its `defaultFinancialReconciler` factory has one call site
(`index.ts:1674-1676`) and is log-only (in-code comment admits it's "unused since it
was written"). A second, fully independent client-side implementation
(`src/lib/reconciliation-engine.ts`) exists but is referenced only by tests.

---

## 5. Numeric firewall / canonical guard — PARTIAL (real, but distributed, not one module)

No single unified "numeric firewall" component exists — treat this as an informal
umbrella term for several overlapping mechanisms, in call order on the live path:

1. `defaultFinancialReconciler` (`_shared/r3-validator.ts`) — log-only.
2. **`enforceNarrativeIntegrity`** (`ai-safety-guardrails.ts:531-554`, header literally
   titled `NARRATIVE NUMERIC FIREWALL`, called `index.ts:1765-1771`) — the only
   mechanism that actually **rewrites** output on detected numeric contradiction
   (10%-tolerance anchor match against `calc`), but scoped **only** to
   `business_plan.executive_summary`; fails open on internal error.
3. `sanitizeNarrativeAgainstNumbers` (`quantis-master-prompt.ts:154-201`, called
   `index.ts:3112-3121`) — despite the name, rewrites forbidden phrases/tone, not
   numbers.
4. `runAntiBS` (`bulletproof-validator.ts`) — plausibility flags, log + metadata
   only, never blocks.
5. `runReconciliationCheck` — see §4.
6. `validateAnalysis` (`_shared/hybrid-validator.ts`, `index.ts:4101-4136`, paid
   tiers only) — deterministic rules + conditional LLM adversarial review, explicitly
   barred from proposing new numbers, explicitly non-blocking.
7. `validateAIOutput`/`validateAndSanitizeInput` (`ai-safety-guardrails.ts`) —
   imported at `index.ts:59-60` but **never called** there; live only on the separate
   `analyze-plus` endpoint.
8. `canonical-facts.ts`/`canonical-data-sources.ts` — governs **public
   marketing-claim constants** (dataset size, citations), unrelated to per-analysis
   numeric integrity. Do not conflate with a numeric firewall.

The closest thing to a hard gate is reconciliation's `'BLOCK'` escalation, and it
only affects a displayed score/badge, never the HTTP response.

**User-supplied values always win over AI estimates** — confirmed at
`index.ts:1692-1693` (comment + code) and gated through `finite()` guards against
NaN/Infinity (`index.ts:1700-1705`).

---

## 6. RVCE — CODE_VERIFIED, real, already the closest thing to "Predicta" in this codebase

`supabase/functions/rvce-validate/index.ts` (header comment: "Rapid Validation &
Competitive Evidence"), client-invoked via `src/engine/rvce/rvceService.ts` and
`src/hooks/useRvceValidation.ts`.

- **Retrieval provider**: Tavily if `TAVILY_API_KEY` set (`index.ts:180-204`), else
  unofficial DuckDuckGo HTML scrape, no key required (`index.ts:206-283`).
- **Extraction**: DeepSeek `deepseek-v4-flash` (`index.ts:369-419`), regex fallback
  if no `DEEPSEEK_API_KEY` (`index.ts:427-475`).
- **Call graph**: runs **client-side, after** `analyze-business` already returned —
  `AccuracyTransparentResults.tsx` → `useRvceValidation.ts` → `rvceService.ts` →
  invokes the `rvce-validate` edge function with a 50s client timeout and fail-safe
  fallback. It is **not** called server-side from inside `analyze-business/index.ts`
  (confirmed by grep — no reference either direction).
- **Gate**: tier-aware observation limits (free=20/plus=40/pro=100,
  `index.ts:33-37`), runs for every authenticated user; unauthenticated requests get
  `SKIPPED_AUTH` with 200 status (`index.ts:790-811`).
- **`rvce_observations`** (schema: `20260802054648_accuracy_control_schema_v1.sql:134-157`)
  is populated by `persistObservations()` (`index.ts:989-1058`), fire-and-forget.
  **Self-documented prior bug** (`index.ts:959-974`): an earlier version wrote to
  `rvce_validation_log`, a table that was **never created** — every insert 404'd and
  was silently swallowed by a bare `catch {}`. Now fixed (this session's earlier work
  independently confirms/fixed a related instance of this exact "table referenced but
  never created" class of bug elsewhere in the P0 security branch). Treat any older
  doc describing RVCE persistence as suspect until re-verified.
- `rvce_cache`, `rvce_validation_log` — **MISSING** as live tables; the latter
  explicitly dead per the code comment above.

**This is the single most important existing asset for the Evidence Service**: RVCE
already embodies a primitive Provider Capability Registry (Tavily-or-DuckDuckGo),
live web retrieval, LLM-assisted extraction, and a persisted observations table.
Section 5/9's guidance to reuse existing Predicta-like primitives points directly at
extending RVCE's retrieval layer rather than building a parallel one from scratch —
subject to the shadow-mode/non-interference requirements in §17-20 of the master
prompt, since RVCE today is presentation-layer-adjacent (feeds an "accuracy" UI
panel), not upstream of the deterministic engine.

---

## 7. QOC / QoC — CODE_VERIFIED shadow-only, NOT load-bearing

`supabase/functions/qoc-orchestrate/index.ts`, `qoc/orchestrator.ts`,
`docs/QOC_MIGRATION_PLAN.md`.

`analyze-business/index.ts:4216-4271` calls `qoc-orchestrate` in code explicitly
labeled "QOC Shadow Mode" — comment states it "cannot change wirePayload or any
header the user actually receives," only writes a best-effort row to
`qoc_audit_envelopes`. Bounded 4s timeout exists only so the Deno isolate doesn't
tear down before the write lands, not to gate the response. The real response is
built and returned independently (`index.ts:4273-4276`) regardless of this call's
outcome. Only fires for authenticated requests with a bearer token
(`index.ts:4239-4240`) — anonymous traffic isn't shadowed at all.

`docs/QOC_MIGRATION_PLAN.md:75-80` confirms this is intentional "Stage 1" and
defines a bake-period gate (≥200 shadow rows across ≥5 sectors, lines 50-55) before
any promotion — that promotion has not happened per this doc.

`qoc_audit_envelopes` table is real (`20260623_qoc_audit.sql:11-24`). A separate
`qoc_audit` table (`20260624010000_qoc_audit_trail.sql`) is written only on a
security event inside `ai-narrator/index.ts:359-388`, not general traffic.

**Conclusion, matching this session's own earlier "QOC: make load-bearing or retire"
finding**: QOC is a parallel, observational system today. It does not gate,
validate, or alter what customers receive. Section 19 of the master prompt's
guidance ("verify whether QOC is actually load-bearing... if not, do not build
another duplicate orchestration architecture merely to satisfy this specification")
applies directly — the Evidence Service should very likely attach as an
**additional stage inside QOC's existing shadow envelope**, not as a third parallel
audit system.

---

## 8. AI narrator — CODE_VERIFIED, real separation between narrative and numbers

`supabase/functions/ai-narrator/index.ts` + inline logic in `analyze-business/index.ts`.

- Server-side tier→model firewall (`ai-narrator/index.ts:92-103`): free→
  `google/gemini-2.5-flash-lite`, plus→`google/gemini-2.5-flash`, pro→
  `openai/gpt-5-mini`, opus-tier→`openai/gpt-5`, routed through `LOVABLE_API_KEY` /
  `_shared/llm-call.ts`. Client-supplied `model` rejected if it doesn't match the
  tier-derived model (logged as `SECURITY_MODEL_MISMATCH`, lines 351-399).
- Separately, the general-purpose `aiCall()`/`callTierLlm()` path in
  `_shared/llm-call.ts` resolves provider priority as DeepSeek primary → Lovable
  gateway fallback → Anthropic hard fallback (`llm-call.ts:144-156,472-474`). These
  two findings are not contradictory: the narrator requests a tier-appropriate
  *model name*, and `llm-call.ts` resolves which *provider API* actually serves that
  request depending on availability — but this should be confirmed against a live
  `ai_calls.provider` sample before being treated as settled, since it wasn't
  independently cross-checked in this pass.
- Financial numbers are **not** sourced from raw LLM output as canonical: AI-produced
  `financial_json` values are only used as *fallback inputs* when the user didn't
  supply a value, gated by `finite()` guards and logged (not silently trusted) via
  the R3 plausibility reconciler.

---

## 9. Existing external retrieval integrations — CODE_VERIFIED

- **Tavily**: `TAVILY_API_KEY`, used only inside RVCE. `.env.md:17` marks it
  optional/not currently required in prod.
- **DuckDuckGo** (unofficial HTML scrape, no key): RVCE's default/fallback path.
- **No Google/Bing/SerpAPI integration anywhere in the repo.**
- RVCE is the **only** subsystem doing live external web retrieval today. QOC, the
  narrator, and the core engine do not fetch external search results — the narrator
  only sees engine-computed numbers and industry benchmark ranges baked into its
  prompt.

---

## 10. Benchmark lookup and provenance — CODE_VERIFIED — **this is the core gap the Evidence Service exists to close**

**RPC**: `public.benchmark_lookup(...)` —
`supabase/migrations/20260617000001_fix_benchmark_lookup_rpc.sql:28-125`. Routes 21
known metric names across five `benchmark_master_*` tables, 5-level fallback ladder
(lines 81-120), and returns **hardcoded constant literals** for `source`
(`'AIWMC Quantis Benchmark Master'`), `sample_size` (`NULL`), `data_version`
(`'v2.0'`), `data_date` (`'2026-06-01'`) — baked into the RPC, not read from any row
(lines 109-118).

**Tables** (`20260502222816_...sql:3-113`, DDL only):
`benchmark_master_core`, `benchmark_master_unit_econ`, `benchmark_master_risk`,
`benchmark_master_invoice` each carry table-level *default-constant* `source`/
`sample_size`/`data_version`/`data_date` columns (same value for every row).
`benchmark_master_geo` (line 46) has **no source/date columns at all**.

**Data origin**: hand-authored SQL `INSERT` literals in `seed_01_*.sql` through
`seed_05_*.sql`. Example: every US-T1-SaaS row across all stage/size combinations in
`benchmark_master_geo` repeats identical `1.45, 1.4, 1.85, 1` multipliers — manually
set constants per (sector × geo-tier), cross-multiplied to ~19,500 rows, not
per-row measured/scraped data.

**Per-row source/citation field**: **MISSING** on the tables the live RPC actually
reads. Migration comment (`20260617000001_...sql:10-13`) confirms: *"the function
SELECTed source, sample_size, data_version, data_date — columns that do NOT
exist... the CSV-imported schema omits them."*

**A separate, older, parallel provenance-capable system exists but is unused by the
live RPC**: `industry_benchmarks` + `benchmark_sources` (join to `data_provenance`)
+ edge functions `ingest-benchmark-data`/`manage-benchmarks`. Real per-row citation
infrastructure exists here — `benchmark_lookup()` simply never queries it.

---

## 11. `data_provenance` table — CODE_VERIFIED, real but disconnected from live analyses

Created by `20260309045112_...sql:3-18`; reconciled/seeded by
`20260721182623_seed_data_provenance.sql`, whose own header comment (lines 1-7)
states: *"The Methodology page has queried public.data_provenance since it was
built, but the table was never created... 'Verified Data Sources' has been
rendering nothing in production."* Now fixed with 6 hand-inserted rows (SEC XBRL,
World Bank Enterprise Surveys, JPMorgan Chase Institute, ProjectionHub, Kaggle
Coffee Shop Financials, self-referential Quantis library row).

**Wired into live flow**: `src/pages/Methodology.tsx:66-68` reads it for the public
`/methodology` disclosure page only. **Not** consumed by `benchmark_lookup()` or the
analysis/report pipeline. A static, hand-curated disclosure, disconnected from any
individual benchmark row or customer analysis.

---

## 12. Report / PDF pipeline — CODE_VERIFIED, shows source *labels*, not real citations

`src/hooks/usePdfExport.ts` (react-pdf), `src/components/analysis/BenchmarkCitations.tsx`
**does** render a "Source" column (`:160,187`), but `r.b.source` traces back to the
RPC's hardcoded literal (§10) — not a real per-datum citation.
`AccuracyTransparentResults.tsx:752-763` renders "Key Drivers" with source labels
(`'CoStar 2025'`, `'Quantis Benchmarks'`, etc.) that are **hardcoded string literals
in the JSX array**, not looked up from any database row.

**Conclusion**: the report shows source labels today, but they carry no URL,
publisher-with-date, or per-number verifiability. This is the exact surface the
Evidence Service's `EvidenceSource`/`EvidenceClaim` types (master prompt §11/§14)
would eventually replace — but only after the shadow-mode gates in §39 pass.

---

## 13. Analysis snapshot / versioning — CODE_VERIFIED

- `public.analysis_snapshots` (`20260719225336_...sql:25-40`): `engine_version`,
  `formula_registry_version`, `dataset_version`, `input_hash` (SHA-256),
  `numeric_output_hash` (SHA-256). **Hash-only** — explicitly does not store raw
  plaintext input (migration comment, lines 44-45). Insert-only, immutable.
- `public.analyses.scenario_base_input` (jsonb, `20260801030858_...sql:6-15`): the
  plaintext counterpart, added specifically because snapshots-by-hash "cannot be
  used to reconstruct calculateStrictFinancials' raw arguments for a scenario
  re-run." Stores the full frozen bundle (`rawMrr`, `benchmarks`,
  `locationMultipliers`, engine/formula/dataset versions, etc.), explicitly never
  re-derived via detection re-run. **NULL for analyses saved before ~2026-08-01.**

**Implication**: the frozen-bundle mechanism to tie evidence to a specific historical
run already exists architecturally — but since the benchmark data itself carries no
row-level citation (§10), even a perfectly preserved historical run can only trace
back to a constant string, not a verifiable external source. Evidence granularity
has to start at the benchmark-table layer, not the snapshot layer.

---

## 14. Feature flags / kill switches — PARTIAL, no generic mechanism, always ad hoc

No `feature_flags` table or service exists. Three distinct patterns coexist:

- **Tier entitlements** (closest to real gating): `_shared/entitlements.ts:43-83`
  (`FEATURES`/`LIMITS` matrices), enforced via `requireFeature()`/quota RPCs. A
  second, overlapping tier-manifest lives in `_shared/tier-spec.ts:111`
  (`FEATURE_MANIFEST`) — tier logic is split across two files that must be kept
  manually in sync (comment at `entitlements.ts:29-30`).
- **Per-user DB column**: `api-analyze/index.ts:6,50-73` reads
  `user_settings.use_v2_engine` to route engine versions — a one-off, not a
  reusable framework.
- **Automatic error-rate kill switch** (not a manual toggle):
  `_shared/ai-safety-guardrails.ts:39-41,595-625`, trips at 50% error rate over 5
  minutes, wired at `analyze-business/index.ts:63`.
- **No `FEATURE_X_ENABLED`-style env-var gate pattern exists anywhere** (grep
  confirmed no matches of that shape).

**Implication**: `QUANTIS_EVIDENCE_SHADOW_ENABLED` (master prompt §20) has no
existing primitive to hang off. Cheapest correct option: a cold-start
`Deno.env.get('QUANTIS_EVIDENCE_SHADOW_ENABLED')` read (manual dashboard secret,
not CI-synced by default unless added), or a new `FeatureKey` in
`entitlements.ts` if it should ever be tier-gated later.

---

## 15. Secrets — CODE_VERIFIED

Pushed via `supabase secrets set` in CI (`production-deploy.yml:160-236`), read via
`Deno.env.get(...)`. Full set of env-var **names** referenced across
`supabase/functions/**` (no values):

`ADMIN_UPLOAD_KEY`, `ALERT_EMAIL`, `ALERT_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`,
`APP_URL`, `COMMIT_SHA`, `CRON_SECRET`, `DEEPSEEK_API_KEY`, `DENO_REGION`,
`GLM_API_KEY`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LOVABLE_API_KEY`,
`META_IG_BUSINESS_ID`, `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID`, `RESEND_API_KEY`,
`SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SITE_URL`, `SLACK_WEBHOOK_URL`, four Stripe
price-id vars, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TAVILY_API_KEY`,
`TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`.

**Only a subset is CI-synced** (`production-deploy.yml:167-176,185-226`):
`DEEPSEEK_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Stripe price IDs,
`LOVABLE_API_KEY`, `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, `COMMIT_SHA`. Everything
else (`RESEND_API_KEY`, `SENTRY_DSN`, `SLACK_WEBHOOK_URL`, `CRON_SECRET`,
`GLM_API_KEY`, social OAuth creds) is manual-dashboard-only — a real gap to plan
around if a new evidence-provider API key is added.

---

## 16. Telemetry / cost logging (`ai_calls`) — CODE_VERIFIED, prior bugs fixed

Schema: `20260713055333_ai_calls_cost_ledger_with_deepseek.sql:5-20` — `user_id`,
`analysis_id`, `task`, `provider`, `model`, `input_tokens`, `output_tokens`,
`cost_usd numeric(10,6)`, `latency_ms`, `ok`, `error`, `metadata jsonb`,
`created_at`; `request_id` added later
(`20260801094334_ai_calls_add_request_id_column.sql:9`).

Two independent, non-unified write paths: `_shared/ai-logger.ts` (`logAiCall`, JS
client insert) and `_shared/llm-call.ts` (`recordAiCall`, raw `fetch` to PostgREST).

**Prior bugs, both self-documented as fixed** (matches this session's own earlier
P0-27/P0-28 fix history): (1) `request_id` was included in inserts before the
column existed → every insert 404'd, silently swallowed; now fixed + response is
checked (`llm-call.ts:449-452`). (2) `cost_usd` was hardcoded to `0`; now computed
via `estimateCostUsd()` against a hardcoded `COST_PRICING` table
(`llm-call.ts:396-411`) — **the code itself flags this rate table as "not
independently reconfirmed against each provider's live pricing page"** — treat as a
best-effort estimate, not provider-reported actual cost. (3) provider mislabeling
(`providerFromModel()`) also fixed.

Both insert paths are best-effort/non-throwing by design — telemetry loss won't
break analysis, but also won't surface loudly beyond a console warning.

---

## 17. Tracing — CODE_VERIFIED, two separate correlation-ID systems, not unified

- `_shared/request-id.ts:23-41` — `x-request-id` header, threaded through
  `llm-call.ts`/`ai-logger.ts`.
- `_shared/qoc-tracer.ts:33-42,52-99` — separate `QocTracer`/`correlation_id`
  abstraction across QOC pipeline stages, defaults to request_id by convention
  (`qoc-tracer.ts:66-68`) but not enforced by the type system.
- DB: `analyses.correlation_id` (`20260719225451_...sql`),
  `qoc_audit` trail table (`20260624010000_...sql`).

**Implication**: if Evidence Service becomes a QOC stage (per §7's recommendation),
use `qoc-tracer.ts`'s `correlation_id` convention rather than inventing a third ID
system.

---

## 18. Production deployment model — CODE_VERIFIED, direct-to-production, no staging DB

Single project ref `dmlxrvfyqsakyjomsvdj` (`supabase/config.toml:1`). Deploy
triggers on `workflow_run` completion of `ci.yml` on `main`, or manual dispatch
(`production-deploy.yml:6-11`). Frontend deploys via Vercel's native git
integration (not a redundant CLI deploy). Migrations: `supabase db push
--include-all` (`:82-118`). Edge functions: looped `supabase functions deploy`
over a **hardcoded `FUNCTIONS` array** (`:238-337`) — **any new function not added
to this array silently never deploys**, per an explicit prior-incident comment at
lines 308-312 (`run-tier-qa-harness` shipped source but 404'd because it wasn't in
the list). Deploy-fidelity check via `scripts/verify-deploy.sh` comparing live
`?health=1` `COMMIT_SHA` against the pushed SHA.

**No staging Supabase project/branch exists anywhere in the pipeline** — this is
direct-to-production, not blue/green or shadow-environment at the infrastructure
level. `staging-deploy.yml` only covers the Vercel frontend preview, and is a
no-op without hosting secrets configured.

**Critical implication for the Evidence Service's own shadow mode (master prompt
§20)**: "shadow mode" here cannot mean "a separate environment" — it has to mean
"a feature-flagged code path inside the single production deployment that
provably doesn't affect customer output," exactly as the master prompt specifies.
There is no infra-level shadow environment to lean on.

---

## 19. CI gates — CODE_VERIFIED (names + one-line purpose)

`ci.yml` (lint/typecheck/tests, gates deploy) · `db-security-invariant.yml` (P0
access-control regression lock, this session's earlier work) ·
`deploy-smoke-test.yml` (post-deploy contract checks) · `loadtest.yml` (manual k6) ·
`qoc-gate.yml` (fail-closed QOC-pipeline regression guard) ·
`security-p0-isolated-test.yml` (branch-scoped, this session's just-completed
work) · `seo-deploy.yml` / `seo-live-monitor.yml` (crawler prerender + live
monitor) · `staging-deploy.yml` (Vercel PR preview only) ·
`vercel-production-deploy.yml` (manual alternate deploy path with auto-rollback).

---

## 20. Which Predicta primitives already exist under another name

| Predicta primitive (master prompt §5) | Existing Quantis equivalent | Status |
|---|---|---|
| Provider Capability Registry | RVCE's Tavily-or-DuckDuckGo selection (`rvce-validate/index.ts:180-283`) | Primitive, single-purpose, not a registry abstraction |
| Retrieval Mesh | RVCE's single retrieval call | Not present as a mesh; one provider path at a time |
| Numeric Observation Firewall | Distributed across §5's 8 mechanisms | Real but not unified |
| Evidence packet versioning | `analysis_snapshots` (hash-only) / `scenario_base_input` (full bundle) | Exists for *inputs*, not for *evidence* |
| Locked Evidence Claims | Nothing found | MISSING |
| Evidence Graph / contradiction tracking | Nothing found | MISSING |
| Source lenses / authority weighting | Nothing found (benchmark `source` is a constant string) | MISSING |
| Freshness classification | `data_date` constant on benchmark tables (not real freshness) | MISSING as a real mechanism |
| Source independence / dedup | Nothing found | MISSING |
| Evaluation corpus / retrieval metrics | `training_cases` (accuracy-harness golden cases, not retrieval eval) | Adjacent but not equivalent |
| Cost/latency telemetry per call | `ai_calls` table | CODE_VERIFIED, reusable directly |
| Correlation/trace ID | `request-id.ts` + `qoc-tracer.ts` | CODE_VERIFIED, reusable directly |
| Shadow-mode non-interfering pipeline stage | QOC's existing shadow envelope | CODE_VERIFIED, the correct attachment point |

## 21. Genuinely missing capabilities (net-new work)

Evidence Request Compiler, Source Lenses, Provider Capability Registry (as a real
machine-readable registry rather than RVCE's single hardcoded provider pair),
canonical URL normalization, duplicate/syndication clustering, source
independence analysis, Evidence Graph, Locked Evidence Claims, Numeric
Observation Firewall (as one real module, not eight distributed mechanisms),
evidence packet versioning (as distinct from input versioning), evaluation
corpus for retrieval quality, retrieval/relevance metrics, per-provider
health/cost telemetry beyond generic `ai_calls`, privacy gate for outbound
research queries, SSRF/content-size/MIME guards for any HTML fetching.

## 22. Contradictions between the master prompt and production

- The master prompt's target architecture (§6) assumes a place to attach
  "shadow-only" evidence upstream of RVCE/QOC. In reality, RVCE already runs
  **downstream** of the customer response (client-triggered, post-return), and
  QOC's existing shadow hook is the only true pre/at-response attachment point
  that provably cannot alter `wirePayload`. Recommend designing the Evidence
  Service's shadow integration as a QOC stage, not an RVCE replacement, at least
  for V0.
- The master prompt's §39 cutover gate #1 ("Current Quantis P0 security defects
  are closed") — as of this session, the `security/p0-effective-access-control`
  branch has a fully green isolated-CI proof (all phases, RLS matrix, pgTAP,
  rollback rehearsal) but **has not been merged or deployed**; the standing
  constraint for that branch remains no-merge/no-deploy pending founder
  authorization. Gate #1 is therefore evidence-ready but not yet formally closed
  in production.
- No other direct contradiction found; the master prompt's caution against
  trusting historical docs (§4) was borne out repeatedly (RVCE persistence bug,
  Phase D scenario tables, data_provenance orphaning, QOC shadow-only status) —
  every one of these matches a pattern this session already independently
  discovered and partly fixed elsewhere in the P0 security work.
