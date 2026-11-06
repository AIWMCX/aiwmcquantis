# Phase 1 — One contract set: financial kernel plan, evidence schema, vocabulary, Tavily client

Date: 2026-11-05. Branch: `feat/phase1-contracts` (from `main` `ed59c1b1`). Scope: `AIWMC LLC\QUANTIS-ANALYTICA-PREDICTA-SCOPE.md` §3 Phase 1.

Status: **built, not wired.** This branch adds the kernel, the `aiwmc.evidence.v1` schema with three adapters, one vocabulary and one Tavily client, plus their tests. **No existing call site changed.** No migration, no deploy and no secret was touched.

Evidence labels: **[code]** read in source at the cited line; **[test]** pinned by a test on this branch; **[inferred]** follows from the code but was not executed; **[unknown]** needs a database query or a production run.

`AB/` = `supabase/functions/analyze-business/`.

---

## 1. Every financial calculation path today

At least 14 places compute money metrics. Only the first two feed what paying customers see.

| # | Engine | Runtime | Status |
|---|---|---|---|
| E1 | `AB/financial-calculator.ts::calculateStrictFinancials` L84 | Deno (`analyze-business` index.ts L1813, `run-scenario` L203, `_shared/scenario-sensitivity.ts`) | **Live**: the customer report |
| E2 | `AB/operating-projection.ts` + `AB/roi-year1.ts` (ramp model, Year-1 ROI) | Deno + browser (pure TS) | **Live** (used by E1, the browser fallback and the landing calculator) |
| E3 | `src/financial/*` (`payback`, `cac-payback`, `contribution-margin`, `profitability-margins`, `leverage-ratios`, `reconcile`) + hand-synced Deno copies in `AB/` | both | Deno copies live as sub-contracts and cross-checks; `cac-payback.ts` and `reconcile.ts` have no caller |
| E4 | `AB/financial-analysis-shape.ts::shapeFinancialAnalysis` L47 | Deno | **Live**: adds its own Year-3 ROI, a duplicate NPV, scenarios, and stores break-even month `null` as `0` |
| E5 | `AB/index.ts` post-processing (CAC payback recomputed 3×, reconciliation R-001..R-011, investment verdict, cross-validator, sensitivity) | Deno | **Live** |
| E6 | `AB/quantis-engine.ts::processQuantisAnalysis` L169 ("shadow" engine) | Deno | **Live output**: `validation.break_even_revenue` and `confidence_score` on the stored report come from here |
| E7 | `src/lib/quantis-math.ts` / `AB/quantis-math-server.ts` (precision helpers; same names, different meanings) | both | live helpers |
| E8 | `src/services/analysisApi.ts::emergencyFallbackAnalysis` L55 | browser | **Live when the edge call fails**; different ROI, NPV (12%), LTV, CAC payback |
| E9 | `src/lib/financial-engine.ts` (monthly cohort P&L/cash model, `ENGINE_VERSION '2.0.0-precision'`) | browser | consultant demos only |
| E10 | `src/lib/demo/*` (hiring, founder, second location, price change, capacity) | browser | public demo pages; 3 different payback definitions |
| E11 | `src/lib/formula-registry.ts` | browser | landing mini-calculator + admin dashboard |
| E12 | `src/lib/break-even.ts`, `verdict.ts`, `profit-range.ts`, `analysis-contract.ts` | browser | display layer, a second verdict, a Monte Carlo range |
| E13 | `AB/financial-engine.ts`, `src/lib/reconciliation-engine.ts`, `src/services/scenario-engine.ts`, `src/lib/goal-solver.ts`, `src/lib/consensus-evaluator.ts` | — | dead (no production caller) |
| E14 | `run-scenario` + `_shared/scenario-delta.ts` | Deno | **Live** (Scenario Lab), re-runs E1 + E4 |

### Where they disagree (the ones that matter most)

| # | Metric | Disagreement | Live impact |
|---|---|---|---|
| D1 | Year-1 ROI | 4 formulas. Golden SaaS case: E1 **139%** (ramp, not net of investment), E8 fallback **62%** (`(profit×12 − inv)/inv`), E11 landing **162%** (`profit×12/inv`) [code, hand-computed] | fallback report and landing calculator contradict the live report |
| D2 | Year-3 ROI | E4 uses steady state with `max(inv, 1)`; Year-1 uses the ramp. Same report, two bases [code] | live |
| D3/D4 | NPV | 10% effective annual (E1/E4) vs 12% (E8) vs 10%/12 nominal (E9). E1's NPV uses steady-state profit while its payback and ROI use the ramp [code] | live |
| D5 | Investment payback | integer ramp month (stored) vs fractional typed contract (also stored) vs `ceil(inv/profit)` (helpers, spec §25). SaaS: ramp **11** vs simple **8** [code] | live |
| D7/D8 | Break-even month | 4 definitions under one name; `null` stored as `0` by E4 and E8 [code] | live |
| D9 | Break-even revenue | legacy floors the contribution ratio at 1%; CVP says NOT_ACHIEVABLE; E6 says 0. The stored report can carry three [code] | live |
| D12/D13 | CAC payback | live clamps to [1, 120], so 0.29 months shows as 1; "unprofitable" is 999 for display, `null` for reconciliation, 120 in the helper [code] | live |
| D15 | LTV | E1 `check × GM × orders × min(120, 1/churn)` vs no-orders/240-cap helper vs E6 benchmark lifetime vs E8 capped at 4×CAC. Restaurant: E1 **1 567** vs helper **392** [code, hand-computed] | live vs shadow and fallback |
| D17 | Churn | percent in E1, fraction in vectors/demos; stored `inputs.churn_rate` is the benchmark, not the churn the engine used [code] | live |
| D18 | New clients | fractional in E1, `ceil` in E6, sensitivity and E11 [code] | shadow/sensitivity differ |
| D20 | Verdict | edge `deriveInvestmentVerdict` (LTV:CAC < 2 = HIGH_RISK) vs UI `computeVerdict` (fail < 1.5, payback ≥ 36) [code] | two verdicts on one report |
| D24/D25 | Runway, burn, IRR | none in the live engine; IRR exists only in marketing copy (`CaseGridDisplay.tsx:21`) [code] | truth-rule risk |
| D26 | Missing inputs | E1 falls back to the AI narrator's revenue/investment, then $50k/$100k (index.ts L1760-1771): same idea can give different numbers per run [code; non-determinism inferred] | live |
| D27/D28 | Scenario Lab | "+10% costs" with no typed costs → base `0` → total costs 0; `rent` replace sets a multiplier, not dollars (`scenario-delta.ts:121-130`) [inferred, not run] | **likely live bugs** |
| D29 | Rounding | `Math.round` (half toward +∞) vs decimal ROUND_HALF_UP (half away from zero): −x.5 differs by 1 [code] | negative profits |
| D31 | Version stamp | snapshot `ENGINE_VERSION '2.0.0-precision'` names the dead/demo engine and did not change through the October formula changes [code] | provenance gap |
| D32 | decimal.js | Deno `10.4.3`, tests/browser `10.6.0` (bun.lock) [code] | tests don't run the prod library |

The full map (32 disagreements with file:line on both sides, the live-path trace and the CI guards) is in the session notes: `side-session-notes/local_3e053854-433f-4906-acc8-57101c258903/financial-map.md`.

---

## 2. Which engine becomes canonical

**The live semantics (E1 + E2), in the typed contract style of E3, in one shared location.** Not any single existing file:

- E1/E2 is the only engine behind paying customers' reports and the Scenario Lab, it carries every product decision since July (user values flagged not overwritten, churn as percent, fractional replacement clients, user total costs incl. COGS, the ramp ROI), and the five exact golden cases pin it.
- E3's style (decimal strings in, `status/value/reasonCode/formulaId` out, no placeholder numbers) already passes the strict typecheck, sentinel scan and property tests.
- E9 is better structured as a time-series model but is demo-only and uses different conventions; adopting it would change every live number. It becomes the candidate for a later time-series layer (open question Q1).

## 3. The module boundary

Location: `supabase/functions/_shared/financial-kernel/` (Deno can import it; Vite and Vitest import `supabase/functions/_shared` already).

| File | Role |
|---|---|
| `kernel.ts` | `computeFinancialKernelV1(input) → KernelResultV1` |
| `projection.ts` | `projection.ramp6_growth.v1` in decimal |
| `decimal.ts` | a cloned Decimal (precision 20, ROUND_HALF_UP); never touches the global `Decimal.set` |
| `version.ts` | `KERNEL_VERSION = '1.0.0'`, `FORMULA_IDS`, `FORMULA_REGISTRY_V1` (rows in the `metric_formula_registry` column shape) |
| `golden-vectors.v1.ts` | 13 vectors in the `golden_test_vectors` row shape |

Contract:
- **The kernel never chooses inputs.** The caller passes resolved monthly P&L lines (revenue, COGS, variable opex, fixed costs), investment, unit price, orders per customer, unit gross margin, churn (ratio) and CAC as decimal strings, plus an optional provenance map the kernel echoes but never reads. Benchmarks, location multipliers, user overrides and AI estimates stay in an input-assembly step (today: E1 lines 84-610; later its own versioned function).
- **Every metric is a `MetricResult`** `{formulaId, unit, status, value: string|null, reasonCode, flags}`. Status is one of `VALUE`, `NOT_ACHIEVED_WITHIN_HORIZON`, `NOT_APPLICABLE`, `NOT_ACHIEVABLE`, `NOT_MEANINGFUL`, `INSUFFICIENT_INPUTS`, `INVALID_INPUTS`. No 999, 0 or Infinity stands in for a state.
- Rounding at the boundary only: money 2 dp, ratios 4 dp, months 2 dp, month indices integer. Presentation rounding (integer %, whole dollars) belongs to the UI.
- A non-numeric input string throws `KernelInputError` (a caller bug). A business state (negative line, zero revenue, no investment) is a status.
- Runtime-neutral: the only import outside the folder is `npm:decimal.js@10.4.3`; `vitest.config.ts` and (new) `vite.config.ts` alias it to the package. A test fails if any other specifier, `Deno.`, `process.env` or `import.meta.env` appears [test]. Verified to type-check and run under Deno 2.1.4 [test: same numbers in Node and Deno].
- Versioning: `KERNEL_VERSION` (semver) bumps whenever any output can change; each formula id carries `.vN`. Ids reused where semantics match: `roi_year1.ramp_model.v1`, `investment_payback.cumulative_fcf.v1`, `profitability_margins.v1`, `cvp.contribution_margin_breakeven.v1`.

Metrics in v1: gross/net profit and margins, contribution margin ratio, break-even revenue, revenue for a target profit, operating break-even month, investment payback (integer month and fractional), Year-1 ROI, NPV, customer lifetime, LTV, LTV:CAC, CAC payback.

## 4. Parity with the live engine [test]

`src/__tests__/financial-kernel-v1.test.ts` feeds the P&L lines the live engine resolved into the kernel and compares on every metric both compute the same way: net profit, total expenses, gross/net margin %, break-even revenue, revenue for $45k, operating break-even month, integer and fractional payback, Year-1 ROI, NPV (±$1), plus LTV and LTV:CAC on the golden cases.

- 5/5 golden cases (`golden-cases.test.ts` inputs) and 10/10 range vectors (`src/lib/golden-test-vectors.ts`) match.
- The ramp projection matches `operating-projection.ts` within 1e-6 for months 1-60.
- One case the parity set does not reach: when a customer's total costs are below COGS, E1 caps COGS for margins. Input assembly must pass the capped COGS; the vectors assert they don't hit that case.

## 5. Deliberate differences from the live engine (to approve before switching)

| # | Live today | Kernel v1 | Why |
|---|---|---|---|
| K1 | 999 / 0 / null-as-0 placeholders for payback, break-even month, CAC payback | typed status + reason, `value: null` | the sentinel rule already applied to `src/financial` |
| K2 | Year-1 ROI = 0 when investment is 0 | `NOT_APPLICABLE / NO_INVESTMENT` | 0% is a claim; "no investment" is the fact |
| K3 | break-even revenue floors the contribution ratio at 1% (a huge but finite number) | `NOT_ACHIEVABLE` when the ratio ≤ 0 | the floor invents a figure |
| K4 | CAC payback clamped to [1, 120]; 999 when unprofitable | unclamped `cac / (price × GM × orders)`; `NOT_APPLICABLE` when unit contribution ≤ 0 | 0.29 months shown as 1 is wrong; needs founder decision Q2 |
| K5 | integer %, whole dollars | ratio 0-1 at 4 dp, money at 2 dp | presentation rounding moves to the UI |
| K6 | `Math.round` | decimal ROUND_HALF_UP | identical for positives; −x.5 differs by 1 |

Nothing else differs on the parity set.

## 6. Migration order

Each step is its own PR, gated on the parity suite staying green; any output change bumps `KERNEL_VERSION` and `ENGINE_INPUT_CACHE_VERSION`.

1. **This branch**: kernel, golden vectors, parity tests. No call site changes.
2. **Shadow run in `analyze-business`**: compute the kernel next to E1, log disagreements (no customer-visible change), stamp `kernel_version` and formula ids into `analysis_snapshots` next to the old `'2.0.0-precision'`.
3. **Input assembly**: extract E1 lines 84-610 into `resolveKernelInputs()` with a provenance map in the new vocabulary (§8). Make the AI-narrated revenue/investment an explicit labelled `analyst_assumption`, never a silent fallback (D26).
4. **Switch E1's outputs** to the kernel (K1-K6 approved first), keeping E1's field names so `production-freeze.test.ts` and the UI scans hold. Then E4 (D2 Year-3 basis, D8 null-as-0, duplicate NPV).
5. **Collapse duplicates**: the triple CAC-payback rule (D13), stop storing E6's break-even revenue (D9), retire E6 or keep it test-only, E8 browser fallback calls the kernel, one verdict (D20), stored churn (D17).
6. **Scenario Lab**: fix D27/D28 with unit tests, then run scenarios through the kernel.
7. **Browser**: landing calculator (E11) and demos (E9/E10) through the kernel or a v2 time-series layer (Q1). Delete the hand-synced `src/financial` ↔ `AB/` copies.
8. **Then** Analytica and Predicta get numbers only from the kernel (scope §3 Phase 1 item 1).

## 7. Golden vectors

- **On this branch** [test]: `GOLDEN_VECTORS_V1`, 13 vectors in the `golden_test_vectors` row shape (`vector_code`, `archetype`, `promotion_status`, `input_data`, `expected_ranges` with `target`/`abs_tolerance`, `expected_statuses`, `oracle_method`, `oracle_version`, two reviewer fields, `evidence_urls`).
  - 5 value vectors (the golden-case archetypes). Expected values come from an independent plain-float re-derivation of the documented formulas, not from the kernel; for payback/ROI/NPV it agrees with the values captured from E1.
  - 8 status vectors: unprofitable, zero revenue, no investment, unknown churn and CAC, negative contribution, zero CAC, payback beyond horizon, negative investment.
  - All stay `candidate`: `run-accuracy-harness` only runs silver/gold vectors with two different reviewers.
- **In the database** [code; counts unknown]: migration `20260802054648` creates `golden_test_vectors` (v1 shape) and `metric_formula_registry`. No migration seeds either; nothing reads `metric_formula_registry`. Earlier March/April migrations create an older `golden_test_vectors` shape, so a fresh replay keeps the old shape (`create table if not exists` becomes a no-op) [inferred].
- **To promote** (needs approval; not done): a migration that inserts `FORMULA_REGISTRY_V1` with `implementation_sha` = the file hash, and the vectors after two reviewers sign. Note the harness calls `analyze-business` end to end (AI step included), so it tests the whole path, not the kernel; a kernel-only harness mode is a small follow-up.

## 8. One vocabulary (`supabase/functions/_shared/contracts/vocabulary.ts`)

Claim status: `supported, partially_supported, contested, single_source, stale, inferred, unsupported`. Assumption origin: `customer_input, source_estimate, benchmark, analyst_assumption, derived_calculation`.

Each old vocabulary has one map. A mapping that loses detail is marked `lossy` and keeps a `qualifier`; a value with no honest target maps to `null`. A test reads the literal unions out of the Quantis source files, so adding a value anywhere fails CI until it is mapped [test].

| Old vocabulary | Where | Notable mappings |
|---|---|---|
| Analytica / Predicta claim status (7) | `evidence.py:17-24`, Predicta `schemas.ts:58-60` | 1:1 |
| System A claim status (6) | branch `_shared/evidence/types.ts:170-177` | 1:1; it has no `PARTIALLY_SUPPORTED` |
| Ontology / founder spec (4) | `ONTOLOGY-ADDENDUM` §18, `FOUNDER-SPEC` §8 | conflicting→contested; **insufficient→unsupported (lossy)** |
| decision-review strength | `_shared/decision-review/contracts.ts:45,54` | partial→partially_supported; contradicted→contested; unknown→null |
| commercial ClaimStatus | `_shared/commercial/contracts.ts:20` | INFERENCE→inferred; FACT→single_source (lossy unless a source count is known); ASSUMPTION is an origin, not a status; UNKNOWN→unsupported (lossy) |
| **`AssumptionOriginClass`** | `_shared/assumption-origin.ts:24-29` | USER_ACTUAL→customer_input; MODELED_BENCHMARK_PRIOR→benchmark; **DERIVED→analyst_assumption + `ai_extracted`** (its label is "AI-extracted from your description"); **SYSTEM_ASSUMPTION→derived_calculation + `benchmark_derived`**; **PLACEHOLDER→analyst_assumption + `placeholder_default`** |
| `InputOrigin` | `AB/engine-inputs.ts:182` | ai_estimate→analyst_assumption + ai_extracted; assumption→analyst_assumption (lossy) |
| `TruthLabel.source` | `_shared/ai-safety-guardrails.ts:431` | document→customer_input + customer_document |
| `AssumptionNode.source` | `AB/assumption-graph.ts:19` | calculated is lossy (it collapses three origins) |
| Analytica `AssumptionOrigin` (4) / register (5) | `evidence.py:27-31`, `domain.py:133` | 1:1 (evidence.py lacks DERIVED_CALCULATION) |
| Ontology origin / method; System A numeric status | addendum; branch `types.ts:202` | public_observation→source_estimate + official_series; ESTIMATE→analyst_assumption + value_not_in_passage |

Finding: `quality-dimensions.ts:132` counts `DERIVED` (AI-extracted) as real provenance [code]. With the new map it is an `analyst_assumption`; worth fixing when origins are switched over.

## 9. Evidence schema `aiwmc.evidence.v1` (`supabase/functions/_shared/contracts/`)

Zod schema (`evidence-v1.ts`): Source (URL + canonical URL, `retrieved_at`, `snapshot` {status captured/not_permitted/not_captured, SHA-256 of the fetched bytes, size, media type, storage ref}, `policy` {licence, terms URL and review date, storage policy, can_redisplay, can_cache, `can_train: false`, permitted uses}, kind and primacy kept apart, freshness, independence cluster, `legacy` hash), Passage (text, locator, SHA-256 of the text), Claim (status + qualifier, kind, typed evidence links, independent source count, limitations), Contradiction (structured, open/resolved), Lineage (producer, upstream packets with their hashes, transformations, component versions, run/case, retrieval window, degraded, gaps, **dropped fields**), and `integrity` (SHA-256 over canonical-json-v2 of everything except `packet_id`/`created_at`).

The schema enforces, not just documents [test]: unique ids, resolvable references, **a claim's passage must belong to the source it cites** (no system checked this before), passage hash = text hash, captured snapshot needs a hash and a `full_allowed` policy, http(s) URLs only, real timestamps (no "not-retrieved"), no unknown fields, and the content hash.

SHA-256 is a small synchronous pure-TS implementation (`sha256.ts`), checked against `node:crypto`, the NIST vector and System A's own hashes; it gives the same digest in Node and Deno [test].

Adapters and what they found:

| Adapter | Notes |
|---|---|
| `analytica-evidence-v1.ts` | Sentinels to null ("Unknown publisher", empty title, "UNKNOWN" type, "not-retrieved"). Quality scores dropped and recorded (freshness there is a constant 1.0). Analytica's packet hash **cannot be recomputed in JS** (Python writes `1.0`, JS `1`), so it stays an opaque legacy hash; its snapshot hash does recompute [test]. |
| `predicta-search-v1.ts` | **A real Predicta response has no `apiVersion`** (its schema strips it), while Analytica rejects any response without it: the Analytica↔Predicta link is broken in production and only mocks hide it [code]. Predicta emits no passages; the adapter makes one per snippet with the `passage_<id>` convention Analytica's links use. Analytica asks for `lens: 'financial'`, which no Predicta provider serves (zero results, not marked degraded) [code]. |
| `quantis-system-a.ts` | Title moves out of `publisher` (System A stores the title there). System A's packet hash recomputes exactly for both fixtures, and its passage hashes equal v1's [test]. `PARTIALLY_SUPPORTED` is rejected (System A never had it). Numeric observations are recorded as dropped until the Phase 2 Observation type. Saved System A packets probably can't be re-verified (passages are dropped on save but hashed) [inferred]. |

No existing system captures the fetched page, so every adapted source is `snapshot.status = not_captured`. Capturing snapshots is Phase 2/3 work and needs the licence check per provider.

## 10. One Tavily client (`supabase/functions/_shared/tavily-client.ts`)

Same request RVCE sends in production (key in the body, `search_depth: basic`, `include_answer: false`, 8 s timeout), typed SUCCESS/DEGRADED/FAILED outcome with error codes, `retrievedAt` for `Source.retrieved_at`, unsafe result URLs dropped (string check only), the key never logged or returned, and `toRvceSearchResults()` so RVCE can switch in one line [test].

The three call sites, none switched yet (waiting for review):

| Call site | State |
|---|---|
| `supabase/functions/rvce-validate/index.ts:183` `tavilySearch()` | live on `main`; fallback to DuckDuckGo HTML |
| System A `supabase/functions/_shared/evidence/tavily-provider.ts` (branch `feature/evidence-service`) | never merged; salvage per D4 by switching it to this client |
| Predicta `src/providers/types.ts:5` | declares `TAVILY_API_KEY` but has no client; it runs on Cloudflare Pages, so it would call Tavily through a Quantis edge function rather than import this file |

## 11. Config changes on this branch

- `vitest.config.ts`, `vite.config.ts`: alias `npm:zod@3.23.8` → `zod`; `vite.config.ts` also gets `npm:decimal.js@10.4.3` → `decimal.js` (vitest already had it). Inert until a front-end file imports a shared module; a Vite production build passes.
- `tsconfig.contracts.json`: strict typecheck of the three new modules; added to `typecheck:financial` (already a CI step, no extra minutes).
- `scan:sentinels` also scans `supabase/functions/_shared/financial-kernel`.

## 12. Open questions for the founder

1. **Q1** Is the consultant demo model (monthly cohort cash, E9/E10) in scope for kernel v1, or a v2 time-series layer? The consultant wedge suggests soon.
2. **Q2** One CAC payback rule: unclamped (kernel) or the live [1, 120] clamp? And one "unprofitable" rule for it (D13).
3. **Q3** Payback: keep both the integer month and the fractional value, or show one?
4. **Q4** NPV basis: steady state (live) or the same ramp series as payback/ROI? Keep 10% as the default assumed rate?
5. **Q5** Should the kernel own runway/burn now? IRR appears in marketing copy (`CaseGridDisplay.tsx:21`) but is computed nowhere; remove the copy or build it.
6. **Q6** Approve K1-K6 (§5) before any call site switches.
7. **Q7** Pin `decimal.js` to 10.4.3 in `package.json` so tests run the production library (lockfile change)?
8. **Q8** `QUANTIS_BUSINESS_LOGIC.md` §25 disagrees with the live engine (payback, LTV, break-even month); updating it needs the MD5 in `verify:business-logic` bumped.
9. **Q9** Promote the formula registry rows and vectors to the database (a migration; needs your go-ahead and two reviewers for silver/gold).
10. **Q10** The Scenario Lab bugs D27/D28 look live; fix them before the kernel work reaches scenarios?
11. **Q11** Fix the Analytica↔Predicta `apiVersion` break at the source, or let the adapter be the only bridge (recommended: the adapter, since both are being folded into Quantis)?
