# AIWMC Quantis + Predicta + Analytica — unified PRD and multi-role audit

Date: 2026-11-05. Owner: founder. Status: **proposal for approval**. Builds on the approved scope (`AIWMC LLC\QUANTIS-ANALYTICA-PREDICTA-SCOPE.md`, decisions D1-D7) and Phase 1 (`docs/phase1/financial-kernel-plan.md`).

Evidence labels: **[live]** checked against production today; **[code]** read in source; **[test]** pinned by a test on branch `feat/phase1-contracts`; **[spec]** from the founder spec or ontology addendum (not built); **[estimate]** a judgement, not measured; **[unknown]** needs data we don't have.

Truth rules apply to this document as to the product: no guaranteed outcomes, no invented customer counts, ratings or market sizes. Every number below is either measured, read from code, or marked *estimate*.

---

## 0. The answer on one page

**What we get technically.** Today Quantis is a deterministic decision calculator with a strong trust layer (reconciliation, assumption register, scenario lab, decision memo) **[code]**. Its weakness is that most of the numbers it works with are benchmarks or AI estimates that are *frozen at analysis time* and *not linked to evidence* **[code: `assumption-origin.ts`, `quality-dimensions.ts`]**. Predicta and Analytica each solve half of that:

| Layer | Comes from | What it adds to Quantis |
|---|---|---|
| **Data core (ontology)** | Predicta, rebuilt as the Palantir-style ontology **[spec]** | Every fact is a typed object/assertion with source, valid time, recorded time and extraction method. Facts are reused across customers (public kernel) and private per workspace (overlays). |
| **Evidence** | Predicta search + Analytica evidence graph, unified as `aiwmc.evidence.v1` **[test]** | Sources with licence/use policy, passages, claims with one status vocabulary, contradictions kept, lineage. |
| **Pipelines** | Analytica's 10 pipeline units **[spec]** | Connectors (SEC, Census, FRED, BLS, BEA, company web), entity resolution, peer cohorts, 10-year trajectories, findings, "Top 10 lessons". |
| **Financial kernel** | Quantis, extracted in Phase 1 **[test]** | One versioned, deterministic engine for every number in all three products. |
| **Decision surfaces** | Quantis | Analysis, Scenario Lab, Decision Memo, decision review, consultant client workspaces, engagements, Stripe. |

**The game-changing mode: the Living Decision.** A Quantis decision stops being a one-time report and becomes a live object:
1. every assumption is an ontology assertion with a source and an "as of" date;
2. the kernel computes the decision from those assertions, reproducibly (`as_of(t)` gives back any past answer);
3. monitors watch the sources behind the assumptions that matter most (the sensitivity ranking already tells us which);
4. when a source moves or is contradicted, Quantis re-runs the kernel and tells the customer what changed and why: *"Payback moved from 11 to 14 months because the BLS wage series for your metro was revised (source, date)."*
5. Analytica adds the outside view: what happened to comparable businesses over 10 years, and the lessons that change the decision.

This is the Palantir pattern applied to one decision at a time for a small-business buyer: **ontology (objects + links + actions) → deterministic operational logic → humans approve actions → everything audited.** We copy the pattern, not the enterprise forward-deployed-engineer model.

**The moat.** Not the AI and not public data (both are commodities). It is:
1. a **compounding fact graph**: each paid case adds reviewed, linked facts that the next case reuses (knowledge-reuse rate, ontology addendum **[spec]**);
2. a **measurable accuracy record**: golden vectors, reconciliation and (later) outcome calibration, published honestly;
3. **workflow lock-in for consultants**: their client workspaces, memos and monitors live in Quantis;
4. **decision history with outcomes**: once customers report what happened, Quantis is the only tool that can show its own calibration.

**The money.** Live prices stay (Free, Plus $17/mo, Pro $49/mo, Founder Decision Review $349, Consultant Founding Pilot $499) **[code: `src/config/tiers.ts`, `engagement-offers.ts`]**. New: the Assumption Evidence Pack ($149, founder spec, modelled contribution $89-138 per pack **[spec]**) as a Quantis engagement, and monitors as the reason Plus/Pro customers come back every week. Every new offer is gated on the founder spec's PMF gates (≥3 unrelated payers from ≥10 qualified offers; ≥3 of 5 packs used in client work) before it becomes self-service.

**What changed today.** Phase 1 contracts are built and tested, and two live defects were found and fixed on the branch (§12). Nothing is pushed or deployed (§13).

---

## 1. What each product is today

### 1.1 AIWMC Quantis (live, paying) — capability inventory

Verified today **[live]**: `www.aiwmcquantis.com` returns 200 ("Test a Business Decision Before You Fund It"); the apex 308-redirects to www; `analyze-business` (v1.1.0) and `rvce-validate` (v0.5.0) report commit `ed59c1b1` = `main`.

- **Surfaces [code: `src/App.tsx`]**: anonymous-first `/app` analysis; first-decision flow; client workspaces (`/app/clients/:id`); Scenario Lab (`/app/scenarios`); pre-mortem; invoices; documents; Docs Studio; brand and API-key settings; service quotes; 6 public decision demos; `/decision-review` ($349) and `/consultant-pilot` ($499) with intake and engagement workspace; share links; status page; admin (funnel, AI costs, benchmarks, formulas, accuracy, invariant sweeps, engine, QOC, growth tools).
- **Edge functions [code]**: 78 directories, 70 deployed (`FUNCTIONS=()`). Analysis (analyze-business 4.8k lines, plus/pro/preview, narrator, consensus, API); scenarios (create/run/promote/breakpoint); evidence (rvce-validate with DuckDuckGo/Tavily + extraction, qoc-orchestrate, review-decision in shadow mode); documents/PDF/share; Stripe (checkout, portal, webhook, reconcile, engagements); email/outreach; content/autoposter; LinkedIn growth; admin/health; accuracy harness. **Not deployed**: all ingestion (SEC XBRL, ProjectionHub, benchmark ingest, SCORE import).
- **Plans [code]**: Free (5 analyses/month, watermarked downloads, 36-month projections, 1 scenario set per analysis); Plus $17/mo or $168/yr (unlimited analyses, Doc Studio, branding, 10 scenario sets, evidence refresh); Pro $49/mo or $492/yr (Pro depth, 60-month model, 3 seats, 30 scenario sets, white-label, API keys, pitch-deck package).
- **Data assets [code]**: `data_provenance`, `dataset_releases`, `metric_formula_registry`, `golden_test_vectors`, `accuracy_runs`, `rvce_observations` (+ cache and log), `calibration_metrics`, `industry_benchmarks` + `benchmark_master_*`, `analysis_snapshots` (insert-only), assumption graph per analysis, `reconciliation_log`, `qoc_audit*`, `decision_*` workflow tables, scenario sets/versions/runs, `shared_reports`, `clients`.

### 1.2 Predicta (to become the data core)
Client-side "instant answer" search over ~70 keyless sources, 27 unit + 20 browser tests, no paid APIs **[scope doc]**. An older Vite/TS/Zod build has `/api/search` (`predicta.search.v1`). `aiwmc.org` now 302-redirects to `aiwmcquantis.com` **[live]**. Founder spec: wedge = consultants and fractional CFOs; first paid product = $149 reviewed assumption evidence pack **[spec]**. Ontology addendum: 14 object types, 17 link types, bitemporal assertions, actions as the only write path **[spec]**.

### 1.3 Analytica (to become the pipeline layer)
Evidence-driven historical business intelligence: business + geography → peer cohort → 10-year trajectory → evidence → findings → Top 10 lessons → decision brief. Typed evidence graph (10 node types, 9 relationships), content-hashed packets, contradictions kept, financial truth firewall (proposed → reviewed → canonical), reviewer workflow, cost ledger, provider governance catalog, 95 tests **[scope doc]**. Not real yet: synthetic fixture data, paid path fails on purpose, own NO_GO **[scope doc]**.

---

## 2. Target architecture

```
                    ┌────────────────────────── Decision surfaces (Quantis) ───────────────────────────┐
                    │ Analysis · Scenario Lab · Decision Memo · Decision Review · Client workspaces     │
                    │ Evidence Pack ($149) · Living Decision monitors · /app/analytica · /app/predicta │
                    └───────────────▲──────────────────────────────▲────────────────────────────────────┘
                                    │ numbers                      │ facts, evidence, lessons
             ┌──────────────────────┴─────────┐     ┌──────────────┴──────────────────────────────────┐
             │ Financial kernel v1 (Phase 1)  │◄────│ Ontology / data core ("Predicta", Phase 2)       │
             │ deterministic, versioned,      │ as_of│ objects · links · bitemporal assertions ·       │
             │ typed results, golden vectors  │ (t)  │ actions log · entity resolution · metric registry│
             └──────────────▲─────────────────┘     └──────────────▲───────────────────────────────────┘
                            │ resolved inputs + provenance          │ typed facts with lineage
             ┌──────────────┴───────────────────────────────────────┴──────────────────────────────────┐
             │ Pipelines ("Analytica", Phase 3): connectors (SEC, Census, FRED, BLS, BEA, company web   │
             │ via one Tavily client, Predicta keyless sources) · durable jobs · quality gates ·        │
             │ cohorts · trajectories · events · findings · lessons                                     │
             └──────────────▲────────────────────────────────────────────────────────────────────────────┘
                            │ aiwmc.evidence.v1 (Phase 1): Source · Passage · Claim · Contradiction · Lineage
             ┌──────────────┴──────────────────────────────────────────────────────────────────────────┐
             │ Trust layer: one vocabulary · truth firewall (AI proposes, reviewer approves) ·          │
             │ reconciliation · RLS overlays · licence/use policy enforced · cost ledger · audit        │
             └──────────────────────────────────────────────────────────────────────────────────────────┘
```

Everything runs in the existing Supabase project and Vercel app (D2, D3, D7): `$0` extra infrastructure **[estimate, scope §4]**.

### 2.1 What "Predicta as Palantir" means here, concretely

| Palantir concept | Our implementation | Status |
|---|---|---|
| Ontology objects and links | `ont_object`, `ont_link` with a type registry (Organization, Person, Place, Industry, ProductOrService, Market, Metric, Observation, Source, Claim, ResearchRun, Decision, Assumption, Monitor) | [spec], Phase 2 |
| Properties with lineage | `ont_assertion`: bitemporal, cannot be written without evidence or a calculation (DB constraint) | [spec] |
| Actions | `create_object`, `assert_property`, `link`, `merge_entities`, `split_entity`, `retract`, each in `ont_action_log` | [spec] |
| Pipelines / data integration | Analytica connectors with run manifests, idempotent upserts, cost ledger, `dataset_releases` versions | [spec], Phase 3 |
| Operational logic | Financial kernel v1 | **[test]** built |
| AI proposes, humans decide | Analytica's truth firewall + Quantis decision review | partly built in both |
| Object-level security | Public kernel + per-workspace overlays under RLS, property masking for customer data | [spec] |
| Applications | Quantis surfaces | live |

What we deliberately do **not** copy: forward-deployed engineers per customer, a graph database before a measured bottleneck, a general crawler, model training on sources (founder spec).

---

## 3. Users and jobs

| User | Job | Today | With the unified platform |
|---|---|---|---|
| **Fractional CFO / independent consultant** (wedge) | Give a client a defensible go/no-go on a decision fast, and keep the client | $499 pilot, client workspaces, memo **[code]** | Evidence Pack per client assumption, peer trajectories, monitors per client, white-label memos with a source appendix |
| **Founder / SMB owner** | Know whether a decision (hire, price change, second location, funding) pays back before committing money | analysis, scenarios, $349 review **[code]** | the same, plus "what businesses like mine learned" and alerts when the assumptions move |
| **Later: lenders, accelerators, SBA advisors** | Screen many small-business plans consistently | none | portfolio view over many Living Decisions **[estimate; not in scope until the wedge pays]** |

---

## 4. Requirements

IDs: `UP-` unified platform. Priority: P0 = needed for the first paid unified release.

### 4.1 Financial kernel (`UP-K`)
- **UP-K1 (P0)** Every number in Quantis, Analytica and Predicta comes from the kernel. Acceptance: parity suite green; no other engine on a customer path; `scan:sentinels` covers the kernel. *Built and parity-tested; not wired* **[test]**.
- **UP-K2 (P0)** Decisions K1-K6 (typed states instead of placeholders, no 1% break-even floor, unclamped CAC payback, ROI not applicable without investment, ratio units, decimal rounding) approved, then E1/E4 switched (plan §6 steps 2-4).
- **UP-K3 (P0)** Inputs are resolved explicitly with provenance in the new vocabulary; AI-narrated revenue/investment is a labelled `analyst_assumption`, never a silent fallback.
- **UP-K4 (P1)** `as_of(t)` reproducibility: kernel version + input assertions + formula ids stamped per analysis.
- **UP-K5 (P1)** Kernel v2 time-series layer for consultant demos and cash runway (open question Q1).

### 4.2 Evidence (`UP-E`)
- **UP-E1 (P0)** `aiwmc.evidence.v1` is the only evidence format; legacy formats only through adapters. *Built with contract tests* **[test]**.
- **UP-E2 (P0)** Licence/use policy enforced per source (storage, redisplay, cache, training always false). A source without a reviewed policy can be used for discovery/evidence but not for persisted excerpts.
- **UP-E3 (P1)** Snapshot capture (SHA-256 of fetched bytes) where the licence allows; otherwise `not_permitted` with the reproduction limit disclosed.
- **UP-E4 (P1)** Claim status derived by rule (System A's independence clusters) and only changed manually through allowed transitions.

### 4.3 Data core / ontology (`UP-O`) — Phase 2
- **UP-O1 (P0)** `ont` schema in the existing Supabase project with RLS; a fact cannot be written without evidence or calculation provenance (DB constraint). Exit: 100% of assertions carry provenance.
- **UP-O2 (P0)** Entity resolution with anchors (Wikidata QID, SEC CIK, LEI, domain); auto-merge precision ≥99% on a labelled golden set; merges reversible.
- **UP-O3 (P0)** RLS test suite proves no workspace can read another's overlay (Phase 2 exit gate).
- **UP-O4 (P1)** Metric registry joined to `metric_formula_registry`; unit conversion and period alignment as versioned functions.
- **UP-O5 (P1)** Knowledge-reuse rate measured per case (share of a new case's facts already in the graph).

### 4.4 Pipelines (`UP-P`) — Phase 3
- **UP-P1 (P0)** Connector framework on `ingest-data-sources`: rate limit, retries, provider use policy enforced, run manifest, idempotent upserts, cost-ledger entry, `dataset_releases` version.
- **UP-P2 (P0)** Durable jobs on Postgres (pg_cron + job table or Supabase Queues); a failed quality gate blocks downstream jobs.
- **UP-P3 (P0)** One real (non-fixture) case end to end: live sources → decision brief, every number traceable to a source row, cost measured.
- **UP-P4 (P1)** Peer cohorts, 10-year trajectories, events, findings, Top 10 lessons as ontology jobs.

### 4.5 Living Decision (`UP-L`) — the game-changing mode
- **UP-L1 (P0)** A Decision object links its assumptions (assertions), kernel version and memo version.
- **UP-L2 (P0)** Monitors on the top-N assumptions by sensitivity (the Scenario Lab ranking, now fixed for untyped inputs, §12.1). A monitor re-checks its source on a schedule within the AI budget and kill switch.
- **UP-L3 (P0)** Change report: what moved, by how much, which source, and the effect on payback / break-even / NPV, computed by the kernel, never by the LLM.
- **UP-L4 (P1)** Outcome capture: the customer reports what actually happened; `outcome_calibration` (today `NOT_AVAILABLE` **[code]**) becomes real.
- Acceptance: a change report is reproducible from `as_of` both before and after; no alert fires without a source change; alerts per customer capped.

### 4.6 Modules in Quantis (`UP-M`)
- **UP-M1 (P0)** `/app/predicta`: instant-answer search (client-side, keyless, $0); "Save to workspace" creates Source + Observation assertions through actions.
- **UP-M2 (P0)** Assumption Evidence Pack ($149 engagement): ≤5 assumptions, one geography, source appendix, one correction round **[spec]**, delivered inside the decision workspace.
- **UP-M3 (P1)** `/app/analytica`: peer cohort, trajectories, evidence drill-down, findings, Top 10 lessons, decision brief.
- **UP-M4 (P0)** Access: Quantis login + allowlist role (D7); one Stripe checkout (D5).

### 4.7 Non-functional
- Determinism: same inputs + kernel version = byte-identical outputs (CI determinism gate retargeted to the kernel).
- Provenance: 100% of customer-visible numbers trace to inputs with an origin in the vocabulary.
- Privacy: customer data only in workspace overlays; property-level masking; no training on customer data or sources.
- Cost: per-case cost ledger; daily AI budget ($100/day) and kill switch stay authoritative **[scope §4]**.
- Release safety: new tables behind feature flags; no change to existing tables before Phase 4; every migration has a rollback **[scope §5]**.

---

## 5. Commercial: what is sharper and more valuable for customers

| Customer outcome (deliverable, not a promise) | How the platform produces it | Who pays |
|---|---|---|
| A go/no-go memo where every number shows its source and date | kernel + evidence + memo "Where each input came from" (exists today for inputs **[code]**) | all tiers; white-label on Pro |
| The 5 assumptions that decide the outcome, each with sources or flagged as unsupported | sensitivity ranking + Evidence Pack | $149 pack, $349 review |
| "Businesses like yours": peer trajectories and lessons | Analytica pipelines over the ontology | Pro, consultant engagements |
| An alert when an assumption's source moves, with the recomputed payback | Living Decision monitors | Plus (few monitors) / Pro (more) — proposal |
| Client-ready output a consultant can bill for | client workspaces, white-label memos, source appendix | $499 pilot → consultant plan (proposal, after PMF gates) |

Pricing rules: prices live only in `src/config/tiers.ts` and `engagement-offers.ts` (repo rule). No new price ships before the founder-spec PMF gate for it is met. The $99/mo evidence workspace from the founder spec is folded into Pro or kept as a separate plan — open question C1.

Unit economics we can state: Evidence Pack modelled contribution $89-138 per pack **[spec]**; evidence workspace modelled ~79% margin **[spec]**; infrastructure $0 extra in the existing Supabase/Vercel **[estimate]**; Tavily and LLM cost per case measured by the cost ledger **[not yet measured]**.

---

## 6. Moat (what is real, what is not)

| Candidate | Real moat? | Why |
|---|---|---|
| Compounding fact graph (public kernel + reviewed overlays) | **Yes, over time** | every paid case adds linked, reviewed facts; measured by knowledge-reuse rate |
| Deterministic kernel + golden vectors + reconciliation | **Yes, as trust** | competitors' AI tools produce unreconciled numbers; ours reproduce and reconcile **[test]** |
| Decision history with outcomes | **Yes, the strongest, but later** | only possible once outcome capture exists (UP-L4) |
| Consultant workflow (client workspaces, memos, monitors) | **Yes** | switching cost is the client history |
| The LLM, prompts, "AI" | No | commodity |
| Public data alone (SEC, BLS, Census) | No | anyone can fetch it; the moat is the linking and reviewing |
| Number of agents or "PhDs" | No | the founder spec already rules this out as a claim |

---

## 7. Multi-role audit

Each role: verdict, the findings that matter, and the actions it requires.

**CEO / founder.** Verdict: the merge is the right move; Quantis has the customers and checkout, the other two have the data ideas. Findings: three products → one; live revenue must not be put at risk. Actions: keep the $149 pack and peer lessons as the first new paid things; approve Phase 1 decisions (§14).

**CFO.** Verdict: the numbers engine is the asset, and today it disagrees with itself. Findings: Year-1 ROI has four formulas (139% live vs 62% fallback vs 162% landing on the same case) **[code, hand-computed]**; CAC payback clamped (0.29 → 1 month) **[code]**; Scenario Lab costs/churn bug (fixed on branch) **[test]**. Actions: K1-K6 approval; route the browser fallback and landing calculator through the kernel; per-case cost ledger before scaling packs.

**CPO.** Verdict: the Living Decision is the product; everything else is plumbing. Findings: no "what changed since last run" (#148), no A-vs-B comparison (#144), no CSV import of actuals (#143), Google sign-in off (#153) **[code: buy-blockers register]**; `/app/start` not wired into post-login **[code]**. Actions: ship change reports before more surfaces; close #148 as part of UP-L3.

**CTO / architect.** Verdict: architecture is sound if one kernel and one evidence format really become the only paths. Findings: 14 engines **[code]**; hand-synced `src/financial` ↔ `AB/` copies **[code]**; same-name helpers with different meanings **[code]**; decimal.js 10.4.3 in prod vs 10.6.0 in tests **[code]**. Actions: migration order in the plan §6; pin decimal.js; delete copies after the switch.

**Data engineer.** Verdict: no ingestion runs in production today. Findings: SEC XBRL/ProjectionHub/benchmark ingestion functions exist but are excluded from deploy **[code]**; `golden_test_vectors` / `metric_formula_registry` have no seed rows in migrations and the March migration shape would win on a fresh replay **[code, inferred]**. Actions: connector framework (UP-P1), durable jobs, fix the replay hazard, seed the registry (needs approval).

**ML / AI lead.** Verdict: AI is used in the right places (extraction, narration) and fenced by deterministic checks. Findings: the deterministic engine falls back to AI-narrated revenue/investment when the user leaves them blank (non-deterministic per run) **[code]**; `quality-dimensions` counted AI estimates as provenance (fixed on branch) **[test]**; narrative check test `narrative-check-q6` fails on `main` **[test run]**. Actions: UP-K3; investigate q6; truth firewall for every AI-proposed number.

**Security / privacy.** Verdict: RLS is in place; overlays are the new risk. Findings: Phase 2 adds customer data into a shared schema; System A's fetch guard (SSRF, MIME, size caps) exists on a dead branch **[code]**; Tavily key handling is clean in the new client **[test]**. Actions: RLS test suite as a Phase 2 exit gate; salvage the fetch guard before any direct page fetch.

**Legal / licensing.** Verdict: the licence model is now in the schema, not in a doc. Findings: no source had a per-source licence before; Tavily's reviewed terms say no cache/persist **[code: System A capability]**; founder spec: no crawler, no training. Actions: provider catalog with reviewed terms for each connector before it ships; `can_train` is hard-wired false **[test]**.

**Sales (consultant buyer).** Verdict: the pitch becomes concrete: "every number has a source and a date, and Quantis tells you when it changes". Findings: $499 pilot and $349 review are live **[code]**; there is no evidence appendix per assumption yet. Actions: Evidence Pack first; one consultant-ready sample memo with a real source appendix (illustrative, labelled).

**Customer success.** Verdict: monitors give a reason to come back that isn't a marketing email. Findings: retention mechanisms today are lifecycle emails and weekly insights **[code]**. Actions: monitors capped per customer; every alert has an "explain" link to the source.

**Design / UX.** Verdict: one place for a decision and its evidence. Findings: two badge vocabularies for confidence exist (`verified/confident/...` vs `verified/confirmed/...`) **[code]**; "verified" contradicts ontology principle 12 ("never say verified") **[spec]**. Actions: one status vocabulary in the UI (the Phase 1 claim statuses); drop "verified".

**SRE / ops.** Verdict: deploy pipeline is mature; local developer setup is fragile. Findings: health endpoints report commit SHAs **[live]**; bun on Windows left empty package directories, `npm ci` fails, `npx vite` picks a global Vite 8, Deno needs `--node-modules-dir=none` locally **[observed today]**. Actions: document in CLAUDE.md; monitors run within the existing cron and AI budget.

**QA.** Verdict: strong test culture (2,800+ tests); some tests test copies instead of code **[code]**. Findings: 115 new contract tests **[test]**; golden values partly captured from the engine itself **[code]**. Actions: promote vectors with two reviewers; kernel-only harness mode.

**Growth / marketing.** Verdict: the truth rules are an advantage, keep them. Findings: marketing copy claims "NPV + IRR" while IRR is computed nowhere (`CaseGridDisplay.tsx:21`; the `/cases` route redirects to `/examples`, so reach is unclear) **[code]**; the leaderboard falls back to sample entries **[code]** — must be labelled or removed under the social-proof rule. Actions: fix or remove both claims; public accuracy page backed by real golden-vector runs.

---

## 8. 100 strengths we have now

Engine and accuracy
1. One live engine path for customer reports (`calculateStrictFinancials`) [code]
2. Ramp-aware payback instead of naive investment ÷ profit [code]
3. Year-1 ROI has one documented definition in the live path (`roi_year1.ramp_model.v1`) [code]
4. True DCF NPV, with the 10% rate labelled as an assumption [code]
5. User values are flagged, not overwritten (P0-01/02) [code]
6. Churn units fixed to percent end-to-end in the live path (#289) [code]
7. Fractional replacement clients instead of ceil (2026-10-29) [code]
8. User total costs include COGS (founder decision 2026-09-28) [code]
9. Cash roll-forward reconciliation inside the payback loop [code]
10. Typed payback contract cross-check (`investment_payback.cumulative_fcf.v1`) [code]
11. CVP contract with NOT_ACHIEVABLE states [code]
12. Profitability margins contract with NOT_MEANINGFUL at zero revenue [code]
13. Reconciliation rules R-001..R-011 with BLOCK escalation [code]
14. 5 exact golden cases on the live engine [test]
15. 10 archetype range vectors run through the live engine [test]
16. Determinism gate in CI (byte-identical double run) [code]
17. fast-check property tests on the financial contracts [code]
18. Sentinel scan forbids 999/Infinity/NaN in the financial modules [code]
19. Strict typecheck on the financial surface in CI [code]
20. Financial kernel v1 built, parity-tested on 15 cases, runs identically in Node and Deno [test]

Evidence and provenance
21. Living Assumption Register classifies every assumption's origin at analysis time [code]
22. Evidence range only when a real benchmark range exists (no invented ranges) [code]
23. Benchmark confidence scoring (staleness, sample size, authority) [code]
24. `data_provenance` source registry with licence and allowed/restricted uses [code]
25. `dataset_releases` versioning table [code]
26. `analysis_snapshots`, insert-only, per analysis [code]
27. Canonical JSON v2 for hashing, with the nested-key bug fixed [code]
28. Assumption graph with critical path and fragility score [code]
29. RVCE validation with unit-safety layer (accept/convert/quarantine/reject) [code]
30. `rvce_observations` cache and validation log [code]
31. Narrative integrity check: money mentions must match the engine within 1% [code]
32. Locked numeric payload so the narrator cannot change numbers [code]
33. `aiwmc.evidence.v1` schema that enforces graph, hash and licence rules [test]
34. Adapters from all three legacy evidence formats with contract tests [test]
35. One vocabulary for claim status and origin with a drift test over the sources [test]

Scenario and decision tools
36. Scenario Lab re-runs the same deterministic engine on a frozen base [code]
37. Scenario versions and runs persisted [code]
38. Promote a scenario to a new analysis version without overwriting [code]
39. Breakpoint search ("where does profit hit zero") [code]
40. Sensitivity ranking by dollar impact, elasticity null below a safe floor [code]
41. Scenario coherence checks across siblings [code]
42. Scenario monotonicity and invariant checks in the shaper [code]
43. Pre-mortem [code]
44. Invoice-capacity check [code]
45. "What has to be true" analysis [code]
46. Inline assumption editor with conflict badges [code]
47. Monte Carlo profit range [code]
48. Investment verdict with explicit thresholds [code]
49. Cross-validation between engines (detects drift) [code]
50. Untyped-input scenario bug found, measured and fixed on the branch [test]

Product surfaces and deliverables
51. Anonymous-first `/app` (value before sign-up) [code]
52. Decision Memo PDF with "Where each input came from" [code]
53. Memo and screen use the same selectors (no PDF/screen drift) [code]
54. White-label on Pro [code]
55. Share links with revoke [code]
56. Client workspaces grouping a consultant's decisions [code]
57. Engagement intake and workspace after payment [code]
58. Six public decision demos (hiring, price change, second location, founder, memo, consultant) [code]
59. Docs Studio and document templates [code]
60. Team seats on Pro [code]
61. API keys on Pro [code]
62. Public status page [code]
63. Methodology, security, AI policy, refund pages [code]
64. Changelog and "state of Quantis" pages [code]
65. Comparison pages (`/vs/:slug`) and examples for SEO [code]

Commercial
66. Live Stripe checkout, portal, webhook, reconciliation and replay [code]
67. Two paid engagements live ($349, $499) [code]
68. Prices in one config file, server-side amounts for engagements [code]
69. 14-day trials on Plus and Pro [code]
70. Annual plans [code]
71. Entitlements enforced server-side (`requireFeature`) [code]
72. Founder spec gives a priced, testable next offer ($149 pack) [spec]
73. A clear wedge (consultants, fractional CFOs) [spec]
74. PMF gates written down before spending [spec]
75. Truth rules that forbid fake social proof and guaranteed outcomes [code: CLAUDE.md]

Engineering and operations
76. Health endpoints report the deployed commit SHA [live]
77. Production deploy waits for green CI and rolls back on a failed smoke test [code]
78. Deploy coverage guard for edge functions [code]
79. Migration ledger check [code]
80. Self-hosted runner to save Actions minutes [code]
81. semgrep and gitleaks on PRs [code]
82. RLS on customer tables, admin-only accuracy tables [code]
83. Sentry, structured logging, request ids, OpenTelemetry helper [code]
84. AI cost tracking and a daily budget with kill switch [code, scope]
85. Bot detection [code]
86. ~2,800 automated tests [test run]
87. Pure logic kept in separate files so tests import the real code [code]
88. One Tavily client with typed outcomes and no key leakage [test]
89. Execution register instead of ad-hoc audits [code: docs/execution]
90. CLAUDE.md that records how releases and data rules really work [code]

Strategic assets from Analytica and Predicta
91. Analytica's financial truth firewall (AI proposes, reviewer approves) [scope]
92. Analytica's typed evidence graph and relationship vocabulary [scope]
93. Analytica's provider governance catalog (permitted uses per provider) [scope]
94. Analytica's per-case cost ledger [scope]
95. Analytica's peer cohort → trajectory → lessons design [scope]
96. Predicta's ~70 keyless sources at $0 [scope]
97. Predicta's client-side instant answers (no server cost) [scope]
98. The ontology addendum: a complete Palantir-style data model ready to build [spec]
99. System A's fetch guard, numeric firewall and independence clustering to salvage [code]
100. Backups of both apps and both sites before the merge [scope]

## 9. Every weakness we know, by priority

P0 — wrong or misleading for customers now
1. Scenario Lab: "+10% costs/churn/customers" on untyped inputs computed from 0 (costs $0, margin 100%; LTV 5× too high), and the sensitivity ranking gave costs/churn $0 impact. **Fixed on branch, not deployed** [test].
2. Source-coverage % on the PDF cover counted AI estimates as provenance. **Fixed on branch, not deployed** [test].
3. Year-1 ROI differs between the live report, the browser fallback and the landing calculator (139/62/162%) [code].
4. CAC payback clamped to [1, 120] and 999/null/120 for the same unprofitable state [code].
5. Up to three break-even revenues on one stored report [code].
6. Two verdict engines that can disagree on the same report [code].
7. Blank revenue/investment silently filled from the AI narrator, then $50k/$100k [code].
8. Break-even month `null` stored as `0` [code].
9. "NPV + IRR" claimed in copy; IRR not computed anywhere [code].
10. Leaderboard falls back to sample entries (check labelling against the social-proof rule) [code].

P1 — integrity, trust and data
11. Snapshot `ENGINE_VERSION '2.0.0-precision'` doesn't identify the engine that ran [code].
12. decimal.js 10.4.3 in production vs 10.6.0 in tests [code].
13. No ingestion deployed (SEC, ProjectionHub, benchmarks) [code].
14. `golden_test_vectors` / `metric_formula_registry` unseeded; fresh-replay shape hazard [code].
15. Accuracy harness tests the whole AI path, and supports zero invariants [code].
16. `outcome_calibration` not available (no outcome capture) [code].
17. Analytica↔Predicta contract broken (missing `apiVersion`); Analytica asks for a lens Predicta doesn't serve [code].
18. No source snapshot captured anywhere [code].
19. `review-decision` shadow-only; `qoc-orchestrate` has no front-end caller [code].
20. Stored `inputs.churn_rate` is the benchmark, not the churn used [code].
21. NPV on steady-state profit while payback/ROI use the ramp [code].
22. Golden payback/ROI/NPV values were captured from the engine, not independently derived (now independently re-derived for the kernel) [code, test].
23. `narrative-check-q6` test fails on `main` [test run].
24. "verified" used in UI confidence tiers (two inconsistent badge vocabularies) [code].

P2 — maintainability and product gaps
25. 14 engines; hand-synced copies; same-name helpers with different meanings [code].
26. Dead engines still in the tree (one is pinned by a test that reads its file) [code].
27. Consultant demos use three payback definitions [code].
28. Scenario tables missing from generated Supabase types [code].
29. `/app/start` not wired into post-login [code].
30. RiskGallery submit is a placeholder alert [code].
31. Buy blockers: no CSV import of actuals (#143), no A-vs-B (#144), no "what changed" (#148), Google sign-in off (#153) [code].
32. Runway/burn not computed in the live engine [code].
33. Rent in scenarios is a multiplier, not dollars (API "replace" now rejected on the branch) [test].
34. `aiwmc.org` uses a temporary 302 and a double hop (apex → www) [live].
35. Local setup fragile on Windows (bun empty packages, global Vite, Deno flag) [observed].
36. Deno type errors from mixed supabase-js versions (2.49.1 vs 2.45.0) in several functions, pre-existing [observed].

P3 — strategy risks
37. Phase 2 puts customer data in a shared schema: RLS mistakes would leak [scope].
38. Lovable edits can overwrite module routes [scope].
39. Monitor alerts could become noise without caps and source-change gating [estimate].
40. No demand evidence yet for the $149 pack beyond the founder spec's plan [spec].

---

## 10. "Impossible to skip" — the mechanisms, honestly

No dark patterns, fake scarcity or invented proof (repo truth rules). The product earns the habit:

1. **Value before sign-up**: `/app` is anonymous-first today [code]; keep the first answer under a minute, with the "where each input came from" table visible immediately.
2. **The number nobody else gives them**: reconciled, sourced, dated and compared with peers. A spreadsheet or a chat answer can't show its lineage; ours can (`aiwmc.evidence.v1`).
3. **The five assumptions that decide it**: the sensitivity ranking (now correct for untyped inputs) tells the customer exactly what to check first; the Evidence Pack checks it for them.
4. **A reason to come back that is real news**: Living Decision alerts fire only when a source behind one of their top assumptions changes.
5. **The consultant brings the client**: white-label memos, share links and client workspaces make each consultant a distribution channel. One consultant = many decisions.
6. **Public, honest accuracy**: publish golden-vector and reconciliation results on `/state-of-quantis` from real runs, never a claim we can't reproduce.
7. **Outcome loop**: "was this decision right?" capture turns into calibration only Quantis can show.

---

## 11. Roadmap in release units

The request was that every improvement unit carry the weight of about eight months of product work. Calendar time can't be compressed by declaring it, so each unit below is sized by outcome instead: a coherent capability with an exit gate that a customer can feel. Durations are *estimates* for one developer (scope §3 total: 11-17 weeks for Phases 1-6).

| Unit | Contents | Exit gate |
|---|---|---|
| **R1 One truth** (Phase 1 + switch) | Kernel wired (plan §6 steps 2-5), evidence v1, vocabulary, Tavily client, P0 weaknesses 1-10 closed | parity suite + CI green; one engine on every customer path; no placeholder numbers in stored reports |
| **R2 Data core** (Phase 2) | `ont` schema, assertions, actions, entity resolution, metric registry, RLS suite | 100% provenance; ≥99% merge precision; RLS suite green; `as_of` reproduces a past analysis |
| **R3 Real data** (Phase 3) | connectors (SEC, Census, FRED, BLS, BEA, web via Tavily, Predicta sources), durable jobs, quality gates, events | one non-fixture case end to end with costs measured |
| **R4 Evidence Pack + Predicta module** (Phase 5 first) | `/app/predicta`, $149 pack as engagement, source appendix in memos | founder-spec gates: ≥3 unrelated payers; ≥3 of 5 packs used in client work |
| **R5 Living Decision** | monitors on top assumptions, change reports, alert caps, "what changed" (#148) | alerts only on source changes; change report reproducible before/after |
| **R6 Analytica module + outcomes** (Phase 4) | `/app/analytica` peer trajectories and lessons; outcome capture; calibration page | first calibration numbers from real outcomes, published honestly |

## 12. What was done today

### 12.1 Scenario Lab untyped-input bug (P0) — fixed on the branch
- Cause: `scenario-delta.ts` applied `increase_pct` to `userProvidedCosts ?? 0` (and churn, customers). The Scenario Lab UI always sends `increase_pct` [code: `ScenarioWorkspace.tsx` `buildChanges`].
- Measured on the golden SaaS case with the old code: "+10% costs" → total costs **$0**, net profit $50,000, net margin **100%** (real: $29,736 costs, 41%); "+10% churn" → LTV **$43,200** instead of $8,640 [test run].
- Same path made the live sensitivity ranking give costs and churn a $0 swing, so "what matters most" ranked them last, and broke the breakpoint search for those inputs.
- Fix: the engine reports `churnRatePercentUsed`; `applyScenarioDelta` takes a `ResolvedScenarioBase` (the costs, churn and customers the engine actually used); a % change on an unknown base throws `BASE_VALUE_UNKNOWN` (422) instead of computing on 0; `replace` on rent (a multiplier) is rejected. Wired into `run-scenario`, `scenario-breakpoint`, `promote-scenario-to-analysis` and the sensitivity/breakpoint module. Tests: `src/__tests__/scenario-delta-untyped-base.test.ts`.

### 12.2 Source-coverage truth fix (P0) — fixed on the branch
`quality-dimensions.ts` counted `DERIVED` ("AI-extracted from your description") as real provenance; the % prints on the PDF cover. Now only the customer's own figures count, and the evidence line says how many are AI estimates. **This lowers a customer-visible score; it needs founder sign-off before merge.**

### 12.3 Phase 1 contract set
See `docs/phase1/financial-kernel-plan.md`: kernel, evidence schema with three adapters, vocabulary, Tavily client, 115 tests.

## 13. Process for every change (definition of done)

1. Branch from `main`; never push to `main` (it deploys production).
2. Multi-role checklist (§7 roles) in the PR description for anything customer-visible.
3. Tests: new behaviour pinned; full suite green except listed pre-existing failures.
4. Static: `typecheck:financial`, `scan:sentinels`, Deno check on touched functions.
5. Prod inspection, read-only, before and after deploy: health `commit_sha`, the page or function touched.
6. **Founder approval before push, PR merge, migration or deploy.**
7. Report code-complete / test-passed / deployed / live-verified separately.

## 14. Decisions needed from the founder

1. Approve kernel decisions K1-K6 and questions Q1-Q11 (plan §5, §12).
2. Approve the source-coverage change (§12.2) — it lowers a printed score.
3. Push `feat/phase1-contracts` and open a PR (CI runs; nothing deploys until merge).
4. Evidence workspace: fold the $99/mo plan into Pro, or keep it separate (C1)?
5. Monitors: which tier gets how many (proposal: a few on Plus, more on Pro)?
6. Fix or remove the "NPV + IRR" copy and the leaderboard sample entries.
7. Approve a migration to seed `metric_formula_registry` and candidate golden vectors.
