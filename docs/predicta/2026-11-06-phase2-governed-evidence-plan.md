# Phase 2 plan: governed evidence inside Quantis

Date: 2026-11-06. Branch: `docs/predicta-phase2-plan` from `main` at `9522bfb5`. Status: **proposal for founder approval. Docs only.** Nothing in this file is built, migrated, deployed or switched on.

## 0. Inputs, labels and the answer in short

### Governing inputs

| Input | Where | Role |
|---|---|---|
| Architecture lessons (2026-11-06) | `docs/predicta/2026-11-06-PREDICTA-PALANTIR-LESSONS.md` (copied verbatim in this PR) | Object chain, three layers, policy before every call, the 7 provider run states, public and private kept apart, Quantis stays the financial authority, modular monolith, 10 modules, release stages |
| Strategy and technical spec v1.0 (2026-10-18) | `docs/predicta/2026-10-18-PREDICTA-STRATEGY-AND-TECHNICAL-SPEC-v1.0.md` (copied verbatim in this PR) | §2 preserve the existing evidence contract, §5 reconcile Systems A, B and C, §6 provider registry, §7 budgets and durable states, §8 data contracts, §9 privacy, §11 evaluation, §14 backlog P01 to P13 |
| Scope with decisions D1 to D7 (approved 2026-11-05) | Outside the repo: `C:\Users\AIWMC\OneDrive\Desktop\Projects 2025-26\AIWMC LLC\QUANTIS-ANALYTICA-PREDICTA-SCOPE.md` (found in this pass; the PRD only names it) | D2 same Supabase project, separate schema with RLS. D4 salvage System A, archive the branch, do not merge it. D5 one checkout. D6 "Predicta" is the data core and search. D7 private modules behind Quantis login plus an allowlist role. §5: no change to existing tables before Phase 4; every migration needs a rollback |
| Evidence charter (MR. PREDICTA v1.0, 2026-08-14) | Founder-supplied, not in this repo | Invariants I-1 to I-8, truth hierarchy, evidence labels, shadow gate before cutover gate |
| Phase 1 | `docs/phase1/financial-kernel-plan.md`, `docs/prd/2026-11-05-quantis-unified-prd.md` | Kernel, `aiwmc.evidence.v1`, one vocabulary, one Tavily client. Built, not wired |

A third founder document exists in the founder's notes folder (`quantis-brain/predicta/2026-11-06-QUANTIS-PREDICTA-ANALYTICA-STRATEGY-AND-SPEC.md`). It was not part of this brief and is not copied here. I read its architecture and technical sections; they agree with this plan (accepted assumptions only, reviewer identity, rejected assumptions kept, run manifest with failed or skipped providers, tenant scope never taken from the client). Three of its requirements are added below: a `data_class` (live or synthetic) on every run, a hash of each raw provider response, and the engine version plus accepted-assumption ids on every calculation.

### Evidence labels used in this plan

- **CODE_VERIFIED**: read at the cited `file:line` on `main` `9522bfb5`, on branch `feature/evidence-service` `cb833b90`, or on Predicta `master` through the GitHub API in this pass.
- **SPECIFIED**: stated in a founder document; not built.
- **HISTORICAL**: from an older report, not rechecked.
- **INFERRED**: follows from the code; not executed.
- **UNVERIFIED**: needs a database query, a production run or a document I could not read.
- **PROD_VERIFIED (HTTP only)**: one live HTTP response observed in this pass, not tied to a deployment SHA.

No DB_VERIFIED claim appears in this plan: no production database was queried. Existing tests are named where they exist; the suite was not rerun for this docs PR, so nothing is labelled TEST_VERIFIED.

### The answer in short

1. Quantis already has the evidence **format** (`aiwmc.evidence.v1`: Source, Passage, Claim, Contradiction, Lineage), the **vocabulary**, a deterministic **kernel** and one **Tavily client** on `main`. It has no ResearchRequest, ProviderRun, Observation, Calculation record, Decision record or Import Preview, and nothing persists evidence.
2. The dormant System A branch has most of the retrieval logic as pure modules (provider contract, registry with a real Tavily terms review, privacy gate, fetch guard, numeric firewall, dedupe, independence). It is 587 commits behind `main`, edits already-applied migrations and adds a trigger to the customer analysis insert path. Salvage the pure modules file by file (D4); do not merge the branch.
3. Phase 2 adds one module tree, `supabase/functions/_shared/evidence-core/`, and one database schema with typed tables for the founder's object chain, admin-only at first. No graph database, no generic object store, no crawler, no agent fleet.
4. The first PR is pure TypeScript: the existing provider contract ported unchanged from the branch, the 7-state provider run machine, its mapping onto SUCCESS, DEGRADED and FAILED, and the provider registry. No database, nothing wired.
5. Quantis stays the financial authority. Evidence can only reach the kernel through a per-field accept, reject or modify decision, recorded append-only, with the evidence references carried into the kernel's provenance map. Phase 2 never writes to `analyses`, `scenario_base_input` or `decision_assumptions`.

---

## 1. Current state

### 1.1 Three evidence-related systems, one owner each

| System | What exists | Label | Phase 2 owner of |
|---|---|---|---|
| **A. Evidence Service (retrieval)** | Not on `main`. Branch `feature/evidence-service` `cb833b90`: 15 commits ahead, 587 behind `main`, merge base `97540bc7`. Pure modules in `_shared/evidence/` (19 files), 5 evidence migrations, `evidence-shadow-worker`, 18 test files. On `main` only its packet shape survives, as the read-only adapter `_shared/contracts/adapters/quantis-system-a.ts`. | CODE_VERIFIED | Retrieval: Query Gateway, Policy and Budget Engine, Retrieval Broker, Provider Registry, Evidence Repository writes. Salvaged into `_shared/evidence-core/` (D4). |
| **B. QOC orchestration** | `qoc-orchestrate/index.ts`: auth, plan from the database (L43-62, L106), stages `preflight, dedupe, engine, narrate, verify` (`qoc/types.ts` L29-34), audit envelope stored in `qoc_audit_envelopes` (`adapters.ts` L44-65). Listed for deploy (`production-deploy.yml` L552). | CODE_VERIFIED. Production execution UNVERIFIED | Orchestration of analysis requests and the audit envelope. **No change in Phase 2.** Research runs in Phase 2 are a bounded synchronous fan-out inside the broker, not a second orchestrator. When durable research jobs come (deferred, §5), they reuse QOC's stage, trace and envelope pattern. |
| **C. RVCE validation** | `rvce-validate/index.ts` v0.5.0: query templates, Tavily then DuckDuckGo HTML search (L183-286), DeepSeek extraction, unit-safety layer `rvce-validate/unit-normalization.ts` (`METRIC_UNIT_CONTRACTS` L83, `normalizeObservation` L258), rows in `rvce_observations` (L1086-1155). | CODE_VERIFIED | Numeric unit contracts. Evidence core imports RVCE's unit rules instead of writing a second unit table. RVCE becomes a broker consumer in a later, separately approved PR. |
| **Quantis financial authority** | Live engine E1 (`analyze-business/financial-calculator.ts`) and kernel v1 (`_shared/financial-kernel/kernel.ts` L121, `computeFinancialKernelV1`). The kernel has no production caller; only `src/__tests__/financial-kernel-v1.test.ts` imports it. | CODE_VERIFIED | All financial numbers. Evidence never computes a financial metric. |

### 1.2 The object chain against what exists

`v1` means `supabase/functions/_shared/contracts/evidence-v1.ts` on `main`.

| Founder object | `aiwmc.evidence.v1` type | Elsewhere on `main` | Dormant branch (System A) | Predicta | Label and gap in one line |
|---|---|---|---|---|---|
| **ResearchRequest** | None. Only `lineage.run_id` (v1 L172), `subject` (L183-187), `gaps` (L178) | QOC `AnalysisRequest` (`qoc/types.ts` L63) is an analysis request, not a research request. RVCE builds queries from templates | `EvidenceRequest {analysisRunId, riskClass, questions[]}` (`_shared/evidence/types.ts` L277) and table `evidence_requests` (migration `20260810090000` L61) | `predicta.search.v1` query object `{queryId, rawQuery, normalizedQuery, language, country, lens, safeSearch, sensitiveInputDetected}` as pinned by the adapter (`adapters/predicta-search-v1.ts` L29-39) | CODE_VERIFIED for the shapes. Predicta `master` no longer contains that schema (its tree is `src/*.js`), so whether anything still emits `predicta.search.v1` is UNVERIFIED. No persisted request with policy, budget or filters exists on `main`. |
| **ProviderRun** | None | `TavilySearchOutcome {status, latencyMs, retrievedAt, errorCode, droppedCount}`, in memory only (`_shared/tavily-client.ts` L53-63). RVCE `SearchDiagnostics.error` per metric (`rvce-validate/index.ts` L163-179). LLM calls go to `ai_calls` (`_shared/ai-logger.ts` L57) | `ProviderSearchResult {providerId, status, results, latencyMs, costUsd, errorCode}` (`provider.ts` L35-42); per-call failure is reduced to a boolean `degraded` (`pipeline.ts` L149-153); `evidence_telemetry` aggregates per packet | `diagnostics.providersRequested/Succeeded/Failed`, `degraded` (adapter L67-75). Predicta `master` `src/providers.js` L140 turns a provider error into an empty list (`.catch(()=>[])`) | CODE_VERIFIED. No per-call record is persisted anywhere, and no system has the 7 states. |
| **Source** | `SourceSchema` (v1 L88-110): url, canonical_url, title, publisher, author, language, published_at (partial date), retrieved_at, source_kind, primacy, freshness, independence_cluster, snapshot, policy, legacy | `data_provenance` is a dataset-level licence register (`20260309045112` L3-18). `rvce_observations.source_url/source_title/publisher` (`20260802054648` L88-110) | `EvidenceSource`, table `evidence_sources` with uppercase enums (L100-120) | `candidates[]` | CODE_VERIFIED. Missing against spec §8 SourceRecord: `parser_version`, a source version, and retrieval status (which belongs on ProviderRun). |
| **EvidencePassage** | `PassageSchema` (v1 L112-128): text, locator (heading, page, anchor, offsets), extracted_at, sha256 checked against the text | `decision_evidence_items.source_locator, extracted_text` (`20260911075212` L223-240), schema only, for customer uploads | `evidence_passages` (L139) | None. The adapter makes one passage per snippet (adapter L133-140) | CODE_VERIFIED. Missing against §8 EvidenceSpan: source version, table-cell locator, extraction method and quality. |
| **Observation** | None. The System A adapter records numeric observations as dropped (`adapters/quantis-system-a.ts` L168-170) | `rvce_observations` has value, unit, currency, period and geography columns, but RVCE always writes `unit: 'unknown'` (L1117, L1138) and leaves period and geography empty. RVCE `NormalizedObservation` (`unit-normalization.ts` L241) is in memory | `NumericObservation {value (string), unit, currency, period, geography, statisticType, sourceId, passageId, transformationIds, status OBSERVED/TRANSFORMED/ESTIMATE}` (`types.ts` L205-220), table `numeric_observations` (L208), numeric firewall | None | CODE_VERIFIED. Missing against §8 NumericObservation: scale, population, denominator, nominal or real basis, revision vintage, valid time separate from record time. |
| **Claim** | `ClaimSchema` (v1 L136-146) with 7 statuses (`vocabulary.ts` L17-25), kinds observed, calculated, inferred, customer_provided (v1 L50), typed evidence links; `ContradictionSchema` (v1 L148-155) | QOC verify claims `{text, verdict, sources}` from `ai-consensus` (`qoc/types.ts` verify signature, `adapters.ts` L159-184) | `evidence_claims` with 6 uppercase statuses (L189-198) | `claims[]` | CODE_VERIFIED. Missing against §8 ClaimRecord: verification method and timestamp. |
| **Calculation** | None | Kernel `MetricResult {formulaId, unit, status, value, reasonCode, flags}` (`kernel.ts` L36-43), `FORMULA_IDS` (`financial-kernel/version.ts`), `metric_formula_registry` (`20260802054648` L54) never seeded. `decision_calculation_runs {input_hash, output_json, formula_version}` (`20260911075212` L364-372), schema only, no writer. RVCE unit conversions are not recorded | `transformationIds` on observations, with no record behind them | None | CODE_VERIFIED. No record of an evidence-side transformation (function, version, inputs, rounding, output) exists. |
| **Decision** | None | `decision_frames`, `decision_review_events`, `decision_packet_versions` (`20260911075212`), schema only: no edge function or page writes them; only `src/__tests__/decision-workflow-schema.test.ts` references them. `review-decision` runs in shadow mode | `AssumptionCandidate.status PROPOSED/ACCEPTED/REJECTED/EXPIRED` (`types.ts` L234-266), no actor, no rationale | None | CODE_VERIFIED. No per-assumption decision with actor, time and rationale exists. |
| **QuantisImportPreview** | None | Target fields exist: `AssumptionKey` (`_shared/scenario-delta.ts` L13-21) and `AssumptionOriginClass` (`_shared/assumption-origin.ts` L24-29), classified at `analyze-business/index.ts` L1802 and frozen in `_scenarioBaseInput.assumptionOrigins` (L2065-2081), which the client saves to `analyses.scenario_base_input` (`src/services/analysisDb.ts` L93) | `AssumptionCandidate` with comparability fits and materiality is the nearest shape | None | SPECIFIED only (spec §8 `POST /v1/evidence/import-preview`). |

### 1.3 The existing evidence contract the spec says to preserve

Spec §2 says the contract was "verified directly". That verification was against the branch, not `main`:

- `ProviderSearchRequest {query, lens?, maxResults?}` (branch `provider.ts` L12-16)
- `ProviderExecutionContext {requestId, analysisRunId, timeoutMs?}` (L18-22)
- `ProviderSearchStatus = 'SUCCESS' | 'DEGRADED' | 'FAILED'` (L33)
- `ProviderResult {url, title?, content?, publishedAt?, score?}` (L24-31): URL, title, content and publication time, with latency and cost on the result (L35-42)

On `main`, `tavily-client.ts` has the same three statuses (L41) but a different call shape: `search(query, {maxResults, searchDepth, timeoutMs})` with no lens and no execution context. **PR-1 ports the branch contract onto `main` unchanged** and adapts the Tavily client to it, so the contract the founder approved is the one in code.

### 1.4 Defects found in this pass that Phase 2 must not repeat

| # | Defect | Where | Label |
|---|---|---|---|
| F1 | RVCE's `tavilySearch` returns `[]` on an HTTP error and on any exception; `webSearch` then falls back to DuckDuckGo, so a Tavily outage looks the same as "no results", and `persistObservations` writes `no_external_evidence_found` for both | `rvce-validate/index.ts` L197, L204-205, L280-286, L1125 | CODE_VERIFIED. Live frequency UNVERIFIED |
| F2 | QOC `verifyAdapter` reads a missing `overall` as `"PASS"` | `qoc-orchestrate/adapters.ts` L182 | CODE_VERIFIED. Whether `ai-consensus` ever omits it is UNVERIFIED |
| F3 | The Tavily client returns DEGRADED with zero results on an unexpected response shape | `tavily-client.ts` L197 | CODE_VERIFIED. Not a success, but an empty degraded result; §3.4 maps it to FAILED |
| F4 | Predicta search swallows provider errors into empty lists | Predicta `master` `src/providers.js` L140 | CODE_VERIFIED (GitHub API read). `aiwmc.org` now answers 302 to `https://aiwmcquantis.com` (PROD_VERIFIED, HTTP only, 2026-11-06 06:55 UTC) |
| F5 | The branch pipeline keeps only a boolean `degraded`; which provider failed and why is lost | branch `pipeline.ts` L149-153 | CODE_VERIFIED |
| F6 | Analytica asks Predicta for `lens: 'financial'`, which no provider serves, and gets zero results not marked degraded | Phase 1 plan §9 | HISTORICAL (Phase 1 finding, not rechecked) |

F1 and F2 are on live customer paths and are outside this plan's PR chain; §4.11 lists them as separate candidate fixes.

### 1.5 The dormant branch: what to reuse and what conflicts

**Reusable (pure modules, relative imports only, each with tests):** `provider.ts` (the contract), `provider-registry.ts` (Tavily terms review of 2026-08-10: redisplay allowed, training prohibited, caching and persistence not addressed so `canCache` and `canPersist` stay false, L67-89), `provider-router.ts`, `privacy-gate.ts`, `fetch-guard.ts`, `numeric-firewall.ts` (a value is OBSERVED only if its digits occur in the passage), `url-normalize.ts`, `dedupe.ts`, `independence.ts`, `freshness.ts`, `evidence-telemetry.ts`, `evidence-run-key.ts`, `request-compiler.ts`, `db-mapping.ts` (shape needs rework). Also the RLS integration test pattern in `src/__tests__/evidence-service-rls.test.ts`, which refuses to run against the production project ref.

**Conflicts (do not carry over):**

1. Uppercase vocabularies (`SUPPORTED`, `OBSERVED`, `METADATA_ONLY`) against v1's lowercase. Map only through `vocabulary.ts`.
2. Packet hashing with async `crypto.subtle` and key-sorted JSON (`packet.ts`) against v1's synchronous SHA-256 over `canonical-json-v2`. Use v1. Legacy hashes stay opaque through the adapter.
3. Tables in `public` named `evidence_*`, scoped by `analysis_id` plus a denormalized `user_id` with an owner trigger (L61-293). No workspace scope, no ProviderRun table, and the names would collide with the Phase 2 design.
4. An `AFTER INSERT` trigger on `public.analyses` (`20260810120000` L79-82) adds a write to the customer analysis insert path even with the flag off, and the queue stores the customer's raw `idea` and `location` text (worker L120). This breaks the "nothing on the customer path" rule.
5. The cron migration (`20260810130000`) writes the cron secret header value into SQL. The same pattern exists on `main` (for example `20260725195336`). Phase 2 adds no cron and must not repeat it.
6. Commits `bc4e2129`, `a2b9180b` and `183cd148` edit 18 historical migration files that also exist on `main`. Merging would rewrite migrations production already ran (INFERRED; the ledger was not queried) and collide with the migration ledger check.
7. Multi-table writes are not transactional (worker header comment): a retry can leave partial packets.
8. Its Tavily adapter duplicates HTTP code now owned by `main`'s `tavily-client.ts`.

---

## 2. Gaps

### 2.1 Per object

| Object | Gap to close in Phase 2 | Closed by |
|---|---|---|
| ResearchRequest | Persisted request with redacted query, lens, maxResults, filters, sensitivity, policy version, budget, deadline, live or synthetic class, idempotency key, request-level outcome | PR-2 (type), PR-4 (table) |
| ProviderRun | 7 terminal states, per-call reason, latency, cost reserved and settled, raw response hash; written once, immutable after | PR-1 (machine), PR-3 (in memory), PR-4 (table) |
| Source | Persist v1 Source; add parser version and source version; a source can only hang off a SUCCEEDED or DEGRADED run | PR-5 |
| EvidencePassage | Persist v1 Passage; store text only where the storage policy allows, otherwise hash and locator only; extraction method and quality | PR-5 |
| Observation | New companion type `aiwmc.observation.v1` with all §8 numeric fields, numeric status, value-in-passage result, RVCE unit status | PR-5 (type and table), PR-7 (checks) |
| Claim | Persist v1 Claim and its links; add verification method and time; keep contradictions | PR-5, PR-7 |
| Calculation | Immutable record of every evidence-side transform and every kernel run: function id, version, code hash, inputs, rounding, output hash | PR-5 (table), PR-8 (kernel runs) |
| Decision | Append-only accept, reject or modify per preview field with actor, time and rationale; rejected rows retained | PR-8 |
| QuantisImportPreview | Versioned preview contract, validator (schema, scope, units, lineage, policy), per-field acceptability | PR-8 |

### 2.2 Per module (the founder's 10)

| # | Module | Exists today | Gap | Closed by |
|---|---|---|---|---|
| 1 | Query Gateway | QOC input-length guard (`qoc-orchestrate/index.ts` L125-139) and plan from the database; branch `privacy-gate.ts` and `request-compiler.ts` | One entry for research requests: server-derived identity and admin role, validation, sensitivity class, request id, redaction, idempotency | PR-2 |
| 2 | Policy and Budget Engine | `DAILY_BUDGET_USD: 100` constant and an error-rate kill switch (`_shared/ai-safety-guardrails.ts` L40-44, L607, L647); QOC per-tier cost ceilings (`qoc/policies.ts`); no reservation ledger anywhere (grep for reservation found none) | A pure `decidePolicy()` called before every provider call; per-request reservation and settlement; deny means SKIPPED_BY_POLICY | PR-2 |
| 3 | Retrieval Broker | Branch `provider-router.ts`, `pipeline.ts`, `url-normalize.ts`, `dedupe.ts` | Deadlines per call, per-call state, partial-coverage text, output as a v1 packet plus run records | PR-3 |
| 4 | Provider Registry | Branch `provider-registry.ts` (Tavily reviewed, DuckDuckGo not); v1 `SourcePolicySchema` | Registry on `main` with permitted uses, credentials reference, rate limit, timeout, cost estimate, geography and language support, health | PR-1 |
| 5 | Evidence Repository | Nothing on `main` persists evidence | Schema, tables, RLS, immutability, transactional writes through one RPC | PR-4, PR-5, PR-6 |
| 6 | Calculation Engine | Financial: kernel v1 (unwired). Evidence-side: RVCE unit conversions in memory only | Allowlisted deterministic transforms (percent to ratio, annual to monthly, scale, currency only with a cited rate) recorded as Calculations; financial math stays in the kernel | PR-5 (record), PR-8 (kernel runs) |
| 7 | Verification and Composition | Branch numeric firewall, independence, evidence graph; RVCE unit contracts; v1 `deriveContradictions` (L284-295) | Claim support checked against the stored passage, independence counted by cluster, contradictions kept, partial results composed honestly | PR-7 |
| 8 | Export Service | None | Markdown and CSV with a source appendix, run id and version, formula-injection neutralized, partial status visible | PR-9 |
| 9 | Quantis Import Preview | None | Contract, validator, per-field decisions, resolver into kernel inputs with provenance | PR-8 |
| 10 | Evaluation and Operations | Branch `evidence-telemetry.ts`; `ai_calls`; accuracy harness tables | Per-provider outcome counts, cost per request, admin view, the first evaluation fixtures (insufficient and conflicting evidence, adversarial source, tenant isolation, timeout, budget) | PR-10 |

---

## 3. Target design inside Quantis

### 3.1 Shape: one module tree, one schema, admin-only first

```text
Admin page (/admin/evidence)            Quantis kernel (unchanged)
        |                                        ^
        v                                        | accepted inputs + provenance
edge function evidence-research          _shared/import-preview/
        |                                 (Quantis side: validate, decide, resolve)
        v                                        ^
_shared/evidence-core/                           | candidate observations
  gateway -> policy -> broker -> providers -> repository rows -> verify -> export
        |
        v
schema `evidence` (Postgres, RLS forced, admin-only reads, writes only through RPCs)
```

Folders:

| Path | Module | Notes |
|---|---|---|
| `_shared/evidence-core/provider-contract.ts` | Provider contract | Branch `provider.ts` verbatim |
| `_shared/evidence-core/run-state.ts` | Run state machine | §3.3, §3.4 |
| `_shared/evidence-core/providers/registry.ts`, `providers/tavily.ts` | Provider Registry and adapters | Tavily adapter wraps `_shared/tavily-client.ts`; no new HTTP code |
| `_shared/evidence-core/gateway.ts`, `policy.ts`, `privacy-gate.ts` | Query Gateway, Policy and Budget Engine | Privacy gate salvaged from the branch |
| `_shared/evidence-core/broker.ts`, `url-normalize.ts`, `dedupe.ts` | Retrieval Broker | Salvaged, emits a v1 packet and run records |
| `_shared/evidence-core/repository-rows.ts` | Evidence Repository (pure mapping) | SQL lives in migrations and RPCs |
| `_shared/evidence-core/transforms.ts` | Calculation Engine, evidence side | Allowlisted pure functions with ids like `transform.percent_to_ratio.v1` |
| `_shared/evidence-core/verify.ts`, `numeric-firewall.ts`, `independence.ts` | Verification and Composition | Imports RVCE's `unit-normalization.ts`; no second unit table |
| `_shared/evidence-core/export.ts` | Export Service | |
| `_shared/contracts/observation-v1.ts`, `import-preview-v1.ts` | Contracts | Companion types that reference v1 ids. **No second evidence schema** |
| `_shared/import-preview/` | Quantis Import Preview | Owned by Quantis. May import contracts and the kernel; never evidence-core internals |

Dependency rules, enforced by a static test in PR-1 and kept in every later PR:

- `evidence-core` may import `contracts/`, `tavily-client.ts`, `canonical-json.ts`, `request-id.ts` and `rvce-validate/unit-normalization.ts`. It must not import `financial-kernel/`, `analyze-business/`, `run-scenario/` or `import-preview/`.
- `financial-kernel/` imports nothing from `evidence-core/` or `import-preview/` (its existing runtime-neutral test already limits its imports).
- `import-preview/` may import `contracts/` and `financial-kernel/`.

### 3.2 Database: schema, tables, tenant scope and RLS

**Schema name.** D2 approved a separate schema named `ont` in the same project. This plan uses `evidence`, because the 2026-11-06 lessons doc says not to copy that terminology. Keeping `ont` is a one-word change before PR-4 (decision O1).

**Not exposed to the API.** The schema is not added to the Supabase API's exposed schemas. Reads go through `public.ev_*` functions declared `security invoker`, so RLS decides what a caller sees. Writes go only through `public.ev_*` action functions declared `security definer` with `set search_path = ''`, which check `public.has_role(auth.uid(), 'admin')` first and append to the action log. `authenticated` gets `usage` on the schema and `select` on its tables (filtered by RLS), never insert, update or delete; `anon` gets nothing. Background writers use `service_role`.

**Tenant columns on every table:** `owner_user_id uuid not null references auth.users(id)`, `workspace_id uuid null references public.decision_workspaces(id)`, `visibility text not null default 'private' check (visibility = 'private')`. Public shared evidence is deferred (§5); allowing `'public'` later is a reviewed migration. Each parent has `unique (id, owner_user_id)`, and each child references `(parent_id, owner_user_id)` with a composite foreign key, so a row can never link to another tenant's row, even through a bug in a service-role writer.

**RLS (Phase 2):** `enable` and `force row level security` on every table. One select policy: `using (public.has_role(auth.uid(), 'admin'))`. One `service_role` policy for writers. Later (not Phase 2): owner and active workspace member read, mirroring the existing member policy on `decision_workspaces` (`20260911075212` L164-176).

**Tables** (columns abbreviated where they repeat the tenant columns above; `ts` = `timestamptz`):

```text
evidence.research_requests                          ResearchRequest
  id uuid pk, request_id text not null unique       (ProviderExecutionContext.requestId)
  analysis_run_id text null                         (ProviderExecutionContext.analysisRunId)
  analysis_id uuid null references public.analyses(id)
  idempotency_key text not null, unique (owner_user_id, idempotency_key)
  mode text check in ('search','answer','research') (Phase 2 writes 'search' only)
  data_class text not null check in ('live','synthetic')
  query text not null                               (ProviderSearchRequest.query, after redaction)
  query_sha256 text not null                        (hash of the pre-redaction text; raw text not stored)
  lens text null                                    (ProviderSearchRequest.lens, branch SOURCE_LENSES)
  max_results int not null check (max_results between 1 and 20)   (maxResults; tavily-client cap L22)
  geography text null, language text null, period_from date null, period_to date null
  filters jsonb not null default '{}'               (source classes etc.)
  sensitivity text not null check in ('public','private','sensitive'), sensitivity_reasons text[]
  policy_version text not null, policy_decision jsonb not null
  budget_usd numeric(10,4) not null, timeout_ms int not null      (ProviderExecutionContext.timeoutMs)
  outcome text null check in ('SUCCESS','DEGRADED','FAILED')      (set when the request closes, §3.4)
  coverage_summary text null                        (plain-language partial-coverage line)
  created_at ts not null, closed_at ts null

evidence.provider_runs                              ProviderRun
  id uuid pk, research_request_id uuid not null (composite FK with owner_user_id)
  provider_id text not null, registry_version text not null, attempt int not null check (attempt >= 1)
  query_sent text not null, lens text null, max_results int not null, timeout_ms int not null
  state text null check (state in ('SUCCEEDED','DEGRADED','FAILED','RATE_LIMITED',
                                   'TIMED_OUT','SKIPPED_BY_POLICY','UNAVAILABLE_CREDENTIALS'))
  error_code text null, failure_reason text null
  started_at ts not null, deadline_at ts not null, ended_at ts null, latency_ms int null
  retrieved_at ts null, result_count int null, dropped_count int not null default 0
  response_sha256 text null                         (hash of the raw provider response body; body not stored)
  reserved_cost_usd numeric(10,6) not null default 0, actual_cost_usd numeric(10,6) null
  cost_basis text null check in ('provider_reported','registry_estimate')
  policy_decision jsonb not null

evidence.sources                                    Source (v1 SourceSchema columns)
  id uuid pk, provider_run_id uuid not null (composite FK), source_key text not null  (v1 source_id)
  url, canonical_url, title, publisher, author, language, published_at text (partial date),
  retrieved_at ts, source_kind, primacy, freshness, independence_cluster,
  snapshot_status, snapshot_sha256, snapshot_bytes, snapshot_media_type, snapshot_storage_ref,
  policy jsonb not null (v1 SourcePolicySchema), legacy jsonb null,
  parser_version text null, source_version int not null default 1
  unique (provider_run_id, source_key)

evidence.passages                                   EvidencePassage (v1 PassageSchema)
  id uuid pk, source_id uuid not null (composite FK), passage_key text not null (v1 passage_id)
  text text null, text_sha256 text not null
  check (text is null or encode(sha256(convert_to(text, 'UTF8')), 'hex') = text_sha256)
  locator jsonb null (heading, page, anchor, offsets; table_cell added), extracted_at ts null,
  extraction_method text null, extraction_quality text null, legacy_hash text null

evidence.observations                               Observation (aiwmc.observation.v1)
  id uuid pk, passage_id uuid not null, source_id uuid not null,
  foreign key (passage_id, source_id) references evidence.passages (id, source_id)
  value numeric not null, value_text text not null  (exact string as found)
  unit text not null, scale text not null check in ('one','thousand','million','billion'),
  currency char(3) null, basis text not null check in ('nominal','real','unknown'),
  period_start date null, period_end date null, periodicity text null,
  geography text null, population text null, denominator text null,
  revision_vintage text null, statistic_type text null,
  numeric_status text not null check in ('observed','transformed','estimate','unsupported'),
  origin text not null (vocabulary ASSUMPTION_ORIGINS), origin_qualifier text null,
  value_in_passage boolean not null, unit_normalization_status text null (RVCE status),
  recorded_at ts not null

evidence.claims                                     Claim (v1 ClaimSchema)
  id uuid pk, research_request_id uuid not null, claim_key text not null,
  statement, status (CLAIM_STATUSES), status_qualifier, kind (CLAIM_KINDS),
  independent_source_count int not null, freshness, limitations text[],
  verification_method text null, verified_at ts null
evidence.claim_evidence                             v1 ClaimEvidenceLink
  claim_id, passage_id, observation_id null, relation check in ('supports','contradicts','qualifies')
evidence.contradictions                             v1 ContradictionSchema
  id, claim_id, supporting_passage_ids, contradicting_passage_ids (min 1), explanation, status

evidence.calculations                               Calculation
  id uuid pk, function_id text not null, function_version text not null,
  implementation_sha256 text not null, runtime text not null, library_versions jsonb not null,
  parameters jsonb not null, rounding_policy text not null,
  input_sha256 text not null, output jsonb not null, output_sha256 text not null,
  kernel_version text null, accepted_decision_ids uuid[] not null default '{}',
  rejected_decision_ids uuid[] not null default '{}', created_at ts not null
evidence.calculation_inputs
  calculation_id, position int, observation_id null, input_calculation_id null,
  check (num_nonnulls(observation_id, input_calculation_id) = 1)

evidence.import_previews, evidence.import_preview_fields, evidence.import_decisions   (§3.7)

evidence.action_log                                 append-only audit of every write action
  id, actor_user_id, action, target_table, target_id, inputs_sha256, reason, created_at
```

Immutability: `provider_runs` (after the terminal state), `sources`, `passages`, `observations`, `calculations`, `import_decisions` and `action_log` reject `update` and `delete` by trigger. Corrections are new rows. Child foreign keys use `on delete restrict`, so a rejected decision cannot be removed by deleting its preview.

### 3.3 Provider run state machine (exactly the 7 states)

```text
                     (policy denies before dispatch)
   [insert] --------------------------------------------> SKIPPED_BY_POLICY
      |
      | dispatch: insert with state = null, started_at, deadline_at
      v
   (open: state is null)
      |  exactly one terminal write, then the row is frozen
      +--> SUCCEEDED
      +--> DEGRADED
      +--> FAILED
      +--> RATE_LIMITED
      +--> TIMED_OUT                (also written by the sweeper for open rows past deadline_at)
      +--> UNAVAILABLE_CREDENTIALS
```

An open row (`state is null`) is "not ended yet"; it is not an eighth state. Rules, enforced by check constraints and a trigger:

- `state is null` if and only if `ended_at is null`.
- `SKIPPED_BY_POLICY` is only ever written at insert, with `ended_at = started_at`, `reserved_cost_usd = 0`, `actual_cost_usd = 0` and the policy reason in `error_code`. A provider result can never produce it.
- Once `state` is not null, any update raises.
- `SUCCEEDED`: `error_code is null`, `result_count >= 0`. Zero results is a real answer and is shown as "no results", never as a failure and never as content.
- `DEGRADED`: `result_count >= 1` and `error_code is not null`. A degraded run with nothing usable is FAILED.
- `FAILED`, `RATE_LIMITED`, `TIMED_OUT`, `UNAVAILABLE_CREDENTIALS`: `result_count = 0` and `error_code is not null`.
- Sources may only be inserted for runs in `SUCCEEDED` or `DEGRADED` (trigger on `evidence.sources`).
- Sweeper: `public.ev_expire_open_runs()` sets `TIMED_OUT` with `failure_reason = 'NO_COMPLETION_RECORDED'` on open rows past `deadline_at` plus a grace period. The writer calls it at the start of each request, so Phase 2 needs no cron.

Classification of a provider result into a state (pure, PR-1), using the error codes `main`'s Tavily client already emits (`tavily-client.ts` L43-51):

| Provider result | State |
|---|---|
| `FAILED` + `PROVIDER_UNAVAILABLE` (no key, L161) | UNAVAILABLE_CREDENTIALS |
| `FAILED` + `HTTP_401` or `HTTP_403` | UNAVAILABLE_CREDENTIALS (the 403 reading is to confirm against Tavily's docs, decision O4) |
| `FAILED` + `HTTP_429` | RATE_LIMITED |
| `FAILED` + `TIMEOUT` (L186) | TIMED_OUT |
| `FAILED` + `EMPTY_QUERY` (L163) | FAILED (the gateway should stop it first and record SKIPPED_BY_POLICY) |
| `FAILED` + `NETWORK_ERROR`, `MALFORMED_RESPONSE` or any other `HTTP_*` | FAILED |
| `DEGRADED` with one or more results (`SOME_RESULTS_DROPPED_UNSAFE_URL`, L217) | DEGRADED |
| `DEGRADED` with zero results (`UNEXPECTED_RESPONSE_SHAPE`, L197) | FAILED |
| `SUCCESS` | SUCCEEDED (zero results allowed) |
| Any status or code the table does not know | FAILED with `error_code = 'UNMAPPED:<code>'`. Never SUCCEEDED |

### 3.4 How the 7 states map onto SUCCESS, DEGRADED and FAILED

The stored truth is the 7-state run. The existing 3-outcome contract is kept as a lossless view: the pair `(status, errorCode)` always identifies the state.

| Run state | `ProviderSearchStatus` | `errorCode` carried |
|---|---|---|
| SUCCEEDED | SUCCESS | none |
| DEGRADED | DEGRADED | the provider's code |
| FAILED | FAILED | the provider's code |
| RATE_LIMITED | FAILED | `RATE_LIMITED` |
| TIMED_OUT | FAILED | `TIMED_OUT` |
| UNAVAILABLE_CREDENTIALS | FAILED | `UNAVAILABLE_CREDENTIALS` |
| SKIPPED_BY_POLICY | FAILED | `SKIPPED_BY_POLICY:<reason>` (no provider was called) |

Request outcome (`research_requests.outcome`), computed when the request closes:

- **SUCCESS**: every planned run ended SUCCEEDED.
- **DEGRADED**: at least one run ended SUCCEEDED or DEGRADED, and at least one planned run ended in any other state.
- **FAILED**: no run ended SUCCEEDED or DEGRADED, including the case where policy skipped every run (for example an unsupported lens, which fixes F6).

`coverage_summary` is generated from the runs, in the lessons doc's style: "2 of 3 provider calls completed. sec-edgar was skipped: credentials not configured. No observation matched 2025." It is stored, shown in the admin page and printed in every export.

### 3.5 Where the policy and budget check sits

```text
request -> [1 Gateway check] -> plan provider calls
        -> for each call: [2 Policy and budget check] -> provider (or SKIPPED_BY_POLICY row)
        -> [3 Storage check per source] -> repository rows
        -> [4 Export check] / [5 Import check]
```

1. **Gateway, once per request.** Identity and admin role come from the JWT on the server; any client-supplied budget, owner or workspace id is ignored (spec §8, and QOC's plan-from-database rule at `qoc-orchestrate/index.ts` L103-106). Input validation, privacy gate (secrets, tokens, personal data blocked or redacted), mode bounds (Search: at most two providers, no model call, spec §4), idempotency key. A denied request still gets a row with outcome FAILED and its policy decision.
2. **Before every provider call (the broker calls `decidePolicy()`).** Checks: provider enabled and permitted for this use; lens, geography and language supported (an unsupported filter is either marked "not honored" or skips the call, per registry entry); credentials present; attempt within the retry limit; request budget minus reservations covers this call's worst-case cost; the existing $100 daily AI budget (`ai-safety-guardrails.ts` L44) and kill switch not tripped. Deny means a SKIPPED_BY_POLICY row and the provider is never called. Retries consume the same request budget.
3. **Storage, per source.** `policy.storage` decides whether passage text is stored (`passage_allowed` or `full_allowed`) or only its hash and locator. Tavily stays metadata-only until its caching and retention terms are clarified (branch `provider-registry.ts` L45-65). A snapshot is captured only with `full_allowed`.
4. **Export.** Only private requests the caller can read; excerpts only where `can_redisplay` is true.
5. **Import into Quantis.** A source can back a preview field only if `policy.permitted_uses` includes `financial_assumption_proposal` (v1 L47). `UNREVIEWED_POLICY` (v1 L298-301) does not include it, so an unreviewed source can be shown as evidence but never proposed as a financial input.

Budget arithmetic: reserve the registry's worst-case cost per attempt before dispatch; settle to the provider-reported cost when given, otherwise keep the reservation as the recorded cost (unknown stays reserved, spec §7). Decimal arithmetic only. The default request budget is decision O5.

### 3.6 Lineage: walking back from a claim

`public.ev_claim_lineage(p_claim_id uuid)`, `security invoker` so RLS applies; a caller who cannot read the claim gets zero rows:

```sql
select c.id as claim_id, c.statement, c.status, ce.relation,
       o.id as observation_id, o.value_text, o.unit, o.scale, o.currency,
       o.period_start, o.period_end, o.geography, o.numeric_status,
       p.id as passage_id, p.locator, p.text_sha256, (p.text is not null) as excerpt_retained,
       s.id as source_id, s.canonical_url, s.publisher, s.published_at, s.retrieved_at, s.policy,
       r.id as provider_run_id, r.provider_id, r.state, r.response_sha256,
       q.id as research_request_id, q.request_id, q.query, q.lens, q.policy_version, q.data_class
from evidence.claims c
join evidence.claim_evidence ce on ce.claim_id = c.id
join evidence.passages p        on p.id = ce.passage_id
left join evidence.observations o on o.id = ce.observation_id
join evidence.sources s         on s.id = p.source_id
join evidence.provider_runs r   on r.id = s.provider_run_id
join evidence.research_requests q on q.id = r.research_request_id
where c.id = p_claim_id;
```

Calculations chain, so a second function walks a calculation back to its observations:

```sql
with recursive chain as (
  select ci.calculation_id, ci.observation_id, ci.input_calculation_id, 0 as depth
  from evidence.calculation_inputs ci where ci.calculation_id = p_calculation_id
  union all
  select ci.calculation_id, ci.observation_id, ci.input_calculation_id, chain.depth + 1
  from evidence.calculation_inputs ci
  join chain on ci.calculation_id = chain.input_calculation_id
  where chain.depth < 20
)
select * from chain;
```

Every row answers the lessons doc's lineage questions: where it came from (URL, publisher), when (published, retrieved, observed period), scope (geography, period, unit, currency), which provider and run, whether it was observed, transformed, estimated or customer-supplied, which evidence supports or contradicts it, and whether the excerpt is still held. A hash proves the record did not change after capture; it does not prove the source is true.

### 3.7 Quantis Import Preview contract

Quantis validates and the human decides; evidence never writes a financial input.

```ts
// _shared/contracts/import-preview-v1.ts (PR-8)
export const IMPORT_PREVIEW_SCHEMA_VERSION = 'aiwmc.import_preview.v1';

export interface ImportPreviewV1 {
  schema_version: 'aiwmc.import_preview.v1';
  preview_id: string;
  research_request_id: string;
  packet: { packet_id: string; content_hash: string };        // aiwmc.evidence.v1 integrity
  target:
    | { kind: 'analysis'; analysis_id: string }
    | { kind: 'decision_workspace'; workspace_id: string };
  fields: ImportPreviewFieldV1[];
  created_at: string;
}

export interface ImportPreviewFieldV1 {
  field_id: string;
  target_field: AssumptionKey;                                 // scenario-delta.ts L13-21
  kernel_input: keyof KernelInputV1 | null;                    // null when there is no 1:1 input (table below)
  current: { value: string | null; origin: AssumptionOriginClass | null };  // assumption-origin.ts L24-29
  proposed: {
    value: string;                                             // decimal string
    unit: string;
    origin: 'source_estimate' | 'benchmark' | 'derived_calculation';        // vocabulary.ts L40-46
    origin_qualifier: OriginQualifier | null;
  };
  observation_id: string;
  calculation_ids: string[];                                   // unit or period conversions applied
  claim_ids: string[];
  checks: Array<{
    check: 'schema' | 'scope_geography' | 'scope_period' | 'unit' | 'scale' | 'currency'
         | 'lineage' | 'policy' | 'value_in_passage';
    result: 'pass' | 'fail' | 'not_checked';
    detail: string | null;
  }>;
  acceptable: boolean;                                         // false if any check failed
  label: string;                                               // e.g. "Public benchmark, not your business's figure"
}

export type ImportDecisionV1 =
  | { decision: 'accept'; field_id: string; rationale: string | null }
  | { decision: 'reject'; field_id: string; rationale: string }
  | { decision: 'modify'; field_id: string; value: string; unit: string; rationale: string };
```

Rules (each pinned by a PR-8 test):

- One decision per field per action, written to `evidence.import_decisions` (append-only, with `decided_by`, `decided_at`, `supersedes_decision_id`). The latest decision per field counts; earlier ones stay.
- **Accept** uses the proposed value and is refused when `acceptable` is false. **Reject** keeps the current Quantis value and requires a rationale; the rejected row stays visible as rejected in the preview and in every later calculation record (`rejected_decision_ids`). **Modify** records the reviewer's own value with a required rationale; its origin becomes `customer_input` and the observation stays linked as "evidence considered".
- A public benchmark is labelled as such and is never shown as the customer's own figure.
- Nothing is written to `analyses`, `analyses.scenario_base_input` or `decision_assumptions` in Phase 2 (scope §5: existing tables unchanged until Phase 4). The preview's result is an admin what-if calculation inside the `evidence` schema.
- The decision UI belongs to Quantis now; in Phase 4, Analytica's decision workspace takes it over through the same actions.

Illustrative example (assumptions: one public wage observation; numbers invented for the example):

```json
{
  "field_id": "f_01",
  "target_field": "churn_rate",
  "kernel_input": "monthlyChurnRate",
  "current": { "value": "5", "origin": "MODELED_BENCHMARK_PRIOR" },
  "proposed": { "value": "3.8", "unit": "percent_per_month", "origin": "source_estimate", "origin_qualifier": null },
  "observation_id": "obs_7f2c",
  "calculation_ids": [],
  "claim_ids": ["clm_19"],
  "checks": [
    { "check": "scope_geography", "result": "pass", "detail": "US" },
    { "check": "scope_period", "result": "fail", "detail": "observation covers 2022; model period 2026" }
  ],
  "acceptable": false,
  "label": "Public benchmark, not your business's figure"
}
```

### 3.8 How the kernel consumes accepted inputs

A pure resolver on the Quantis side, `_shared/import-preview/resolve.ts`:

```ts
resolveKernelInputsFromDecisions(
  base: KernelInputV1,                 // the analysis's resolved inputs
  fields: ImportPreviewFieldV1[],
  decisions: ImportDecisionRow[],      // latest per field
): { input: KernelInputV1; applied: AppliedField[]; rejected: string[] }
```

- Only `accept` and `modify` change an input. `reject` changes nothing and is listed.
- Every changed input gets a provenance entry in the map the kernel echoes but never reads (`kernel.ts` L11-12, L73, L310), for example `aiwmc.prov.v1;origin=source_estimate;decision=<id>;observation=<id>;packet=<content_hash>`. That is how evidence references are preserved into Quantis calculations.
- Unit conversions run through `transforms.ts` and are recorded as Calculations before the kernel runs.
- The kernel computes. The run is stored in `evidence.calculations` with `function_id = 'aiwmc.financial-kernel'`, `kernel_version` (`version.ts` `KERNEL_VERSION`), `input_sha256 = sha256(canonicalJson(input))`, `output_sha256`, and the accepted and rejected decision ids.
- Invariant: with no applied fields, the output bytes equal the base kernel run.

Field mapping from Quantis assumption keys to kernel inputs (`KernelInputV1`, `kernel.ts` L46-74):

| `AssumptionKey` | `KernelInputV1` | Rule |
|---|---|---|
| `monthly_revenue` | `monthlyRevenue` | 1:1 |
| `startup_investment` | `startupInvestment` | 1:1 |
| `cac` | `cac` | 1:1 |
| `average_price` | `unitPrice` | 1:1 |
| `churn_rate` | `monthlyChurnRate` | Quantis stores percent and divides by 100 (`analyze-business/index.ts` L3994, L4158); the kernel takes a ratio. Conversion `transform.percent_to_ratio.v1` is recorded |
| `monthly_costs` | none 1:1 | The kernel splits COGS, variable opex and fixed costs. The preview refuses accept until the reviewer picks the line |
| `rent` | part of `monthlyFixedCosts` | Accept only with a recorded recomposition |
| `expected_customers` | none | Kernel v1 has no customer-count input; shown, not applied |

### 3.9 Field names against spec §8 and existing contracts

| Spec §8 field | Phase 2 column or field | Existing contract it comes from |
|---|---|---|
| SourceRecord.source_id, canonical_url, publisher, title, language, published_at, retrieved_at | `sources.source_key`, `canonical_url`, `publisher`, `title`, `language`, `published_at`, `retrieved_at` | v1 `SourceSchema` (L88-110), same names |
| SourceRecord.content_hash | `sources.snapshot_sha256` (page bytes, when captured) and `provider_runs.response_sha256` (raw provider response) | v1 `snapshot.sha256` |
| SourceRecord.parser_version | `sources.parser_version` | new |
| SourceRecord.storage reference, rights metadata | `snapshot_storage_ref`, `policy` | v1 `snapshot.storage_ref`, `SourcePolicySchema` |
| SourceRecord.retrieval status | `provider_runs.state` | new (7 states) |
| EvidenceSpan.evidence_id, source_id, locator, permitted excerpt | `passages.passage_key`, `source_id`, `locator`, `text` (null when not permitted) | v1 `PassageSchema` |
| EvidenceSpan.source version, extraction method and quality | `sources.source_version`, `passages.extraction_method`, `extraction_quality` | new |
| ClaimRecord.claim_id, text, type, supporting and contradicting ids, status | `claims.claim_key`, `statement`, `kind`, `claim_evidence.relation`, `status` | v1 `ClaimSchema`; status via `vocabulary.ts` (spec's supported, conflicting, insufficient, stale map through `ONTOLOGY_CLAIM_STATUS`, L112-117) |
| ClaimRecord.verification method, timestamp | `claims.verification_method`, `verified_at` | new |
| NumericObservation (all fields) | `observations.*` | branch `NumericObservation` plus §8 additions; numeric status via `SYSTEM_A_NUMERIC_STATUS` (L226-230) |
| CalculationRecord | `calculations.*`, `calculation_inputs.*` | kernel `FORMULA_IDS`, `KERNEL_VERSION` |
| ResearchArtifact (run id, version, question, scope, gaps, review status, export refs) | `research_requests` plus v1 `lineage.gaps`, export rows in PR-9 | v1 `LineageSchema` |
| Provider request and context | `research_requests.query, lens, max_results, request_id, analysis_run_id, timeout_ms`; `provider_runs.query_sent, lens, max_results, timeout_ms` | branch `ProviderSearchRequest`, `ProviderExecutionContext` (preserved unchanged) |
| Provider outcome | `provider_runs.state` with the 3-outcome view (§3.4) | `SUCCESS`, `DEGRADED`, `FAILED` preserved |

---

## 4. PR sequence

Ten PRs, each one failure domain, each its own branch from `main`, merged only with every check green and the founder's explicit approval. Every PR reports code-complete, test-passed, deployed and live-verified as separate states. Tests named "invariant" below are kept and rerun in every later PR.

### PR-1. Provider contract, run-state machine and registry (pure, no database, nothing wired)

- **Goal:** put the approved contract and the 7 states into code before anything can call a provider.
- **Files:** `_shared/evidence-core/provider-contract.ts` (branch `provider.ts` verbatim), `run-state.ts` (`PROVIDER_RUN_STATES`, `classifyProviderOutcome()`, `toProviderSearchStatus()`, `aggregateRequestOutcome()`, `assertTerminalTransition()`, `coverageSummary()`), `providers/registry.ts` (branch registry with the Tavily terms review; DuckDuckGo listed, disabled, unreviewed), `src/__tests__/evidence-core-run-state.test.ts`, `src/__tests__/evidence-core-boundaries.test.ts`.
- **Migration:** none.
- **Tests:** every Tavily error code maps to the state in §3.3; no failure-family state maps to SUCCESS (invariant: provider failure never becomes empty success); DEGRADED with zero results maps to FAILED; SKIPPED_BY_POLICY cannot come from a provider result; an unknown code maps to FAILED `UNMAPPED`; the 7 to 3 view is lossless (round-trip); request outcome rules including "all skipped is FAILED"; a vocabulary-drift test fails if a state is added without a mapping; the boundary test proves `evidence-core` imports none of `financial-kernel`, `analyze-business`, `run-scenario`, and the kernel imports nothing from `evidence-core`.
- **Rollback:** revert the commit; nothing imports these files.
- **Founder gate:** approve the state table in §3.3 (especially 401/403 and zero results) and the 7 to 3 view in §3.4.

### PR-2. Query Gateway and Policy and Budget Engine (pure)

- **Goal:** every provider call has a recorded allow or deny decision before it happens.
- **Files:** `_shared/evidence-core/gateway.ts`, `policy.ts`, `privacy-gate.ts` (salvaged), `src/__tests__/evidence-core-policy.test.ts`.
- **Migration:** none.
- **Tests:** client-supplied budget, owner and workspace ids are ignored; secrets and tokens in a query are blocked; an exhausted budget, missing credentials, unsupported lens, kill switch or retry limit each produce a deny with a reason; reservation and settlement in decimal; retries draw from the same budget; unknown final cost stays reserved; the decision object records `policy_version`.
- **Rollback:** revert; nothing wired.
- **Founder gate:** default request budget for Search mode (O5) and the sensitivity rules.

### PR-3. Retrieval Broker and Tavily adapter (in memory, fetch injected, nothing wired)

- **Goal:** one bounded fan-out that turns provider calls into run records plus an `aiwmc.evidence.v1` packet.
- **Files:** `_shared/evidence-core/broker.ts`, `providers/tavily.ts` (wraps `tavily-client.ts`; no new HTTP code), `url-normalize.ts`, `dedupe.ts` (salvaged), tests with a fake fetch.
- **Migration:** none.
- **Tests:** a missing key gives UNAVAILABLE_CREDENTIALS without any fetch; 429, abort, network error and malformed body give their states; a policy deny means the fake fetch is never called; one provider failing and one succeeding gives request DEGRADED with a coverage line naming the failed provider; the packet passes `EvidencePacketV1Schema` and `lineage.degraded` matches the runs; the same input gives the same packet hash; the raw response hash is computed and the body is not kept.
- **Rollback:** revert; nothing wired.
- **Founder gate:** review the coverage-line wording.

### PR-4. Migration A: schema, research requests, provider runs, action log (admin-only)

- **Goal:** durable request and run records with the state machine enforced by the database.
- **Files:** `supabase/migrations/<ts>_evidence_core_requests_runs.sql`, its rollback file, `supabase/tests/database/evidence_core_requests_runs.test.sql` (pgTAP).
- **Migration:** schema `evidence` (or `ont`, O1), `research_requests`, `provider_runs`, `action_log`, `ev_expire_open_runs()`, RLS forced, admin-only select, no write grants to `anon` or `authenticated`.
- **Tests (pgTAP):** `anon` is denied and a non-admin user reads zero rows; an admin reads them; cross-tenant isolation: a provider run cannot reference another owner's request (composite FK error); an update after a terminal state raises; SKIPPED_BY_POLICY with non-zero cost is rejected; DEGRADED with zero results is rejected; the sweeper marks only overdue open rows.
- **Rollback:** `drop schema evidence cascade` (tables are empty until PR-6); remove the ledger row.
- **Founder gate:** approve the migration and decision O2 (how pgTAP runs; today no workflow runs `supabase/tests/database`).

### PR-5. Migration B and the Observation contract: sources, passages, observations, claims, calculations

- **Goal:** the evidence object chain in Postgres, mapped from v1.
- **Files:** `_shared/contracts/observation-v1.ts` (`aiwmc.observation.v1`, references v1 packet, source and passage ids; v1 packets and their hashes are unchanged), `_shared/evidence-core/repository-rows.ts` (salvaged `db-mapping.ts`, reworked to v1), migration and rollback, pgTAP, contract tests. The System A adapter stops dropping numeric observations and emits companion observations instead.
- **Migration:** `sources`, `passages`, `observations`, `claims`, `claim_evidence`, `contradictions`, `calculations`, `calculation_inputs`, `ev_claim_lineage()`, the calculation chain function, immutability triggers.
- **Tests:** passage text must hash to `text_sha256`; a passage with no permitted excerpt stores hash and locator only; an observation whose passage belongs to another source is rejected; sources cannot attach to a FAILED run; lineage returns the full chain to the research request; lineage for another tenant's claim returns zero rows (invariant: cross-tenant isolation); every existing v1 contract test still passes with identical hashes.
- **Rollback:** drop the new tables and functions; PR-4 tables stay.
- **Founder gate:** O3 (companion Observation type rather than a v1.1 packet field).

### PR-6. Admin-only writer: `evidence-research` edge function (flag off)

- **Goal:** run one Search-mode request end to end and persist it in one transaction.
- **Files:** `supabase/functions/evidence-research/index.ts` (health probe with `commit_sha`, admin check, gateway, broker, then one call to `public.ev_record_research_run(payload jsonb)`), the RPC migration, `production-deploy.yml` `FUNCTIONS` entry (this PR's only workflow change), tests.
- **Flag:** `EVIDENCE_CORE_ENABLED`, unset means the function returns 503 and calls no provider.
- **Tests:** a provider failure is stored as a FAILED run with zero sources and the request outcome FAILED, not an empty success (invariant); a repeated idempotency key returns the first run; a forced error mid-write leaves no partial rows; a non-admin caller gets 403; shadow-on vs shadow-off byte-identical financial output (invariant): the golden cases and kernel golden vectors produce the same `canonicalJson` SHA-256 with the flag set and unset, and no file under `analyze-business` or `run-scenario` imports `evidence-core`; `npx tsx scripts/verify-deploy-coverage.ts` passes.
- **Rollback:** unset the flag (instant), then revert; tables keep their audit rows.
- **Founder gate:** approve the deploy, the flag, and a Tavily spend cap for admin runs.

### PR-7. Verification and Composition

- **Goal:** claims are checked against stored passages and observations are typed honestly.
- **Files:** `_shared/evidence-core/verify.ts`, `numeric-firewall.ts`, `independence.ts`, `freshness.ts` (salvaged), imports RVCE `unit-normalization.ts`, tests.
- **Tests:** a value not found in its passage is `estimate`, never `observed`; "$24.60 in 2025" survives exactly while "$24.60 per month" from a per-hour passage is rejected (branch fixtures); two syndicated copies count as one independent source; contradicting evidence is kept and the claim is `contested`; a check that is not built reports `not_checked`, never a fake pass or a zero count (charter I-8).
- **Rollback:** revert; stored rows are unaffected.
- **Founder gate:** none beyond green checks, unless a status label shown to admins changes.

### PR-8. Quantis Import Preview, decisions and kernel consumption

- **Goal:** the only path from evidence to a financial input, reviewed per field.
- **Files:** `_shared/contracts/import-preview-v1.ts`, `_shared/import-preview/validate.ts`, `resolve.ts`, `_shared/evidence-core/transforms.ts`, migration for `import_previews`, `import_preview_fields`, `import_decisions` and the `ev_open_import_preview` and `ev_decide_import_field` actions, tests.
- **Tests:** a rejected decision is retained and listed in the calculation record (invariant: rejected observation retained); modify without a rationale is refused; accept on an unacceptable field is refused; an unreviewed-policy source cannot become a field; churn percent becomes a ratio through a recorded calculation; accepted provenance appears in the kernel result's provenance map; no applied fields gives byte-identical kernel output; a SQL scan proves no Phase 2 function writes `analyses`, `scenario_base_input` or `decision_assumptions` (charter I-1).
- **Rollback:** drop the three tables and two functions; earlier evidence stays.
- **Founder gate:** approve the field mapping in §3.8 and the "public benchmark" label text.

### PR-9. Export Service

- **Goal:** a pack a consultant can cite, correct and revisit.
- **Files:** `_shared/evidence-core/export.ts`, `ev_export_request()` read function, tests.
- **Tests:** Markdown and CSV carry the run id, version and a source appendix; a partial run says so at the top; cells starting with `=`, `+`, `-` or `@` are neutralized; excerpts appear only where `can_redisplay` is true; a later refresh creates a new version and never rewrites an earlier export.
- **Rollback:** revert.
- **Founder gate:** approve the export layout before the first pilot pack uses it.

### PR-10. Admin evidence page and operations counters

- **Goal:** the founder can run a search, read the lineage, decide each preview field and see provider health and cost.
- **Files:** `src/pages/admin/Evidence.tsx` as a child of the existing `/admin` route, which is wrapped in `ProtectedRoute requireAdmin` (`src/App.tsx` L329). It is not a public route, so no sitemap or SEO entries. The PR also adds read functions for per-provider outcome counts and cost per request, and the first evaluation fixtures (insufficient evidence, conflicting evidence, adversarial source text, timeout, budget exhaustion, two-tenant isolation).
- **Tests:** a non-admin is redirected; the page shows "DEGRADED" and the coverage line when a provider failed; rejected fields stay visible as rejected; no query text goes into URLs or analytics (spec §4, §9).
- **Rollback:** revert the route.
- **Founder gate:** approve the page before it ships; it is admin-only, so no customer-visible change.

### 4.11 Separate candidate fixes outside this chain (live customer paths)

- **RVCE honesty (F1):** switch `rvce-validate`'s `tavilySearch` to `tavily-client.ts` (`toRvceSearchResults()` exists for this, L224) and record the provider outcome in its diagnostics, so "Tavily failed" and "no results" stop looking the same. Touches a live paid-tier path; needs its own approval.
- **QOC verify default (F2):** treat a missing `overall` as `PARTIAL` with a note, not `PASS`. Touches QOC's envelope; needs its own approval.

### 4.12 Gates after PR-10

Phase 2 ends with admin-only governed evidence. Running evidence alongside real customer analyses is the charter's **shadow gate** (shadow output stored, byte-identical financial output proven in production, cross-tenant tests green, founder approval). Letting accepted evidence change a customer's report is the separate **cutover gate**, which also requires evidence that the new path is better than the RVCE path it replaces. Neither is part of this plan.

---

## 5. Deferred, risks and decisions

### 5.1 Deliberately deferred, and why

| Deferred | Why |
|---|---|
| Graph database or generic object and link tables (the PRD's 14 object types and 17 link types) | The lessons doc says relational first and no large model of everything before customer tasks need it. Typed tables for the 9-object chain cover the first paid job. Revisit when a measured query needs graph traversal |
| Crawler and own index | Spec §6: index expansion only after ten real tasks show the same gap; rights and robots handling first |
| Agent fleet, multi-step research DAG, durable job queue | Spec §7 and lessons Stage 4. Phase 2 is Search mode, bounded fan-out. Durable jobs will reuse QOC's pattern (§1.1) |
| Public search on aiwmc.org, shared public cache | aiwmc.org redirects to Quantis (PROD_VERIFIED, HTTP only). The public/private split needs rights checks and a separate cache identity first; Phase 2 allows `visibility = 'private'` only |
| Writing to `analyses`, `scenario_base_input` or `decision_assumptions` | Scope §5: existing tables unchanged until Phase 4; cutover gate |
| Entity resolution, bitemporal facts beyond valid period plus record time, monitors | PRD R2/R3 and Living Decision; need real cases first |
| Snapshot capture of pages | Needs a per-provider licence decision (Tavily persistence is unclear) |
| Migrating the branch's `evidence_*` tables or shadow worker | Conflicts listed in §1.5 |

### 5.2 Risks

1. **Cross-tenant leak once workspaces read evidence.** Mitigation: composite tenant foreign keys, forced RLS, admin-only first, pgTAP two-tenant tests. Residual risk: today no workflow runs the pgTAP suite (`supabase/tests/database` exists but no workflow references it), so these tests can pass locally and still not guard CI (O2).
2. **Tavily terms.** Caching and retention are not addressed in Tavily's terms per the branch review (2026-08-10, HISTORICAL). Until clarified, passages from Tavily keep hash and locator only, which limits later reproduction. That must be disclosed in exports.
3. **Public numbers mistaken for customer facts.** Mitigation: per-field review, scope checks, the label, `financial_assumption_proposal` required, no auto-apply.
4. **Spend.** Each admin search costs provider calls; reservations and the daily cap bound it, but Tavily's per-call price is not in the registry yet (UNVERIFIED).
5. **GitHub Actions minutes.** A Docker-based pgTAP job is several minutes per run; on the self-hosted runner, Docker availability is UNVERIFIED. Merging any PR to `main`, including this docs PR, runs CI on `main` and then the Production Deploy workflow, because CI's docs filter applies to pull requests only (`.github/workflows/ci.yml` L3-10).
6. **Salvage drift.** Copied branch modules can drift from their tests. Each salvaged file comes with its test, adapted to v1 vocabulary in the same PR.
7. **Hard-coded cron secret pattern** exists in migrations on `main` and on the branch (§1.5 item 5). Not introduced by this plan; worth a separate rotation review.
8. **Overclaiming.** A field or counter existing is not a capability (charter I-8). Unbuilt checks report `not_checked`.

### 5.3 Open founder decisions

| # | Decision | Recommendation |
|---|---|---|
| O1 | Schema name: `evidence` or D2's `ont` | `evidence` (avoids borrowed terminology); D2's intent (same project, separate schema, RLS) is kept either way |
| O2 | How cross-tenant pgTAP tests run in CI: a new manual or path-filtered workflow, or local runs recorded in the PR | A path-filtered job on `supabase/migrations/*evidence*` and `supabase/tests/database/evidence*`, on the self-hosted runner if Docker works there |
| O3 | Observation as a companion `aiwmc.observation.v1` object, or a v1.1 packet field | Companion object: v1 packets and hashes stay unchanged |
| O4 | Treat Tavily `HTTP_403` as UNAVAILABLE_CREDENTIALS or FAILED | Confirm against Tavily's docs in PR-1 |
| O5 | Default budget for an admin Search request and a daily Tavily cap for Phase 2 | Founder to set; the code refuses to run without one |
| O6 | Order against the kernel switch (Phase 1 plan §6 steps 2-5) | Run PR-1 to PR-7 in parallel with the kernel switch; PR-8 needs only the unwired kernel |
| O7 | Approve the separate RVCE and QOC fixes (§4.11) | Yes, as two small PRs after PR-1, each with its own test |
| O8 | Archive `feature/evidence-service` after PR-7 has salvaged what it needs (D4) | Yes; tag `cb833b90` first so the history stays reachable |
