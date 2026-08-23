# AIWMC Quantis — R&D Scope (Decision Graph / Evidence Service / Analysis Orchestrator)

**Created:** 2026-08-21
**Revised:** 2026-08-21 (v2 — corrects v1's over-narrowing; see §0)
**Status:** Governing architecture + execution scope. §5 (Track A) is authorized to close defects immediately; §6 (Track B) is authorized to build schemas/contracts immediately; nothing in Track B becomes production-load-bearing until its own stated gate passes.

## 0. Correction from v1

v1 of this document made two mistakes, both corrected here:

1. **It promoted Gate I to "nearly complete" from stale evidence.** That violates Quantis's own operating doctrine: `CODE ≠ DEPLOYED`, `CI ≠ PRODUCTION`, `MIGRATION FILE ≠ MIGRATION APPLIED`, `GREEN BUILD ≠ GREEN SYSTEM`. Historical green runs from a prior session are **not** a current PASS. Every Gate I row must be re-verified against production evidence gathered *today*, not cited from memory. Where §5/Track A hasn't re-run a check yet, it is marked `NOT VERIFIED`, not "probably fine."
2. **It scoped the NSA-tool R&D track out entirely.** That's too absolute. The corrected disposition is in §7: direct dependency/fork is rejected by default, but architectural research and concept reimplementation continue.

v1 also reduced "tomorrow" to a five-item bug list and deferred all architecture work. That was too conservative — corrected in §5/§6 below: architecture work (schemas, contracts, interfaces) starts now, in parallel with defect closure. What's deferred is only making the new subsystems *load-bearing* in production.

## 1. The actual objective

Not "more features," and not "technical problems disappear forever" — no production system reaches that state. The real objective:

> No known structural technical weakness should prevent Quantis from selling, and future failures should be detected, diagnosed, contained, and recovered without destabilizing the business.

That's failure **prevention + visibility + isolation + recovery + regression prevention** — not the absence of all future failure. "Technically complete" means this property holds, not that nothing will ever break again.

## 2. What stays rejected (Quantis-specific technical restraint)

Graph database as first move (Neo4j/LemonGraph/etc.), DataWave-style distributed data plane, autonomous/self-modifying agents, a second confidence score, a second financial engine, a second analytics system, blockchain, Kubernetes/microservices, a generic AI research assistant, lender/institutional features, anything justified only by "it would be interesting." Postgres/Supabase remains the graph substrate until a real query pattern proves it inadequate — not before.

## 3. The non-negotiable boundary

```
External research / evidence / AI
        ↓
may propose or support an assumption, with provenance
        ↓
MUST NOT silently create canonical financial truth
        ↓
deterministic financial engine
```

This is the single most important long-term design decision in the project. Every subsystem contract below (§6.5) exists to make this boundary structurally hard to violate, not just documented as a rule.

## 4. Gate structure (strict definitions)

### GATE I — Production Integrity
Not "tests pass." All of the following, independently:

| Row | Definition of PASS |
|---|---|
| Security | RLS/authorization tests green against real role contexts, no known unaudited privilege-escalation pattern |
| Migration reconstruction | Empty DB + all migrations → matches expected schema/functions/policies/grants |
| Production schema parity | Repo migration ledger == production ledger == schema contract, verified live, not assumed |
| Release fidelity | Deployed commit SHA provably matches `git HEAD`, verified via a live check each time, not cached |
| Billing lifecycle | Full Stripe lifecycle matrix (20+ scenarios, §5) passes against live/test Stripe |
| Financial invariants | Golden-case + regression fixtures pass; no formula duplicated across surfaces |
| Artifact parity | Dashboard == PDF == API == Docs Studio for the same `CanonicalResult`, tested, not asserted |
| Observability | Every analysis traceable end-to-end by `trace_id` in under a minute |
| Rollback | A documented, tested path back to last-known-good |
| Incident controls | Kill switches exist and are tested (publishing, analysis, billing) |

**`QUANTIS_TECHNICAL_BASELINE = GREEN`** only when every row above is independently verified — not when the row above it happened to pass in a previous session.

### GATE II — Decision Intelligence
Evidence Service, `EvidencePacket`, Decision Graph, dynamic analysis orchestration, provenance, contradiction detection, freshness, sensitivity/threshold solving. Schemas and contracts (§6) may be built now; none of it becomes load-bearing until its own acceptance test passes (shadow-mode parity for Evidence, in particular — §6.2).

### GATE III — Professional Workflow
`Decision → Analyze → Inspect → Challenge → Change assumption → Compare → Explain → Export/share → Return.` Docs Studio, saved clients/companies, analysis history, scenario comparison, second-analysis loop. Activation = interaction with the decision model (already the definition recorded in this session's Activation/Feedback slice: `verdict_viewed`, `scenario_compared`, `assumption_changed` in `funnel_events`), not form completion.

### GATE IV — Empirical Learning
Forecast-vs-actual (30/90/180/365-day), calibration, archetype/benchmark refinement, cohort learning. Gated on Gate III producing real usage to learn from — sequencing matters, this cannot start on synthetic data.

### Development freeze line
Once Gate I is green plus the commercially-necessary slice of Gates II–III: engineering policy flips to *no new features* unless triggered by a customer blocker, sales blocker, security issue, financial-integrity issue, reliability incident, or a **measured** (not guessed) activation problem. Effort ratio flips from ~80/20 build-vs-sell toward ~20/80.

## 5. Track A — Production integrity (re-verify, don't cite history)

Every row below must be re-checked against current repository + production state before being marked. None of the following statuses carry over from any prior session:

- Release/deployed SHA vs. `git HEAD` — live check
- Vercel deployment state
- Supabase migration parity (repo ledger vs. production ledger vs. schema contract)
- RLS/security — real role-context tests, not policy-inspection-only
- Stripe lifecycle (20+ scenario matrix: checkout, webhook idempotency/out-of-order/replay, upgrade/downgrade, failed/recovered payment, cancel-now vs. period-end, unknown Price ID fail-closed, refund/dispute, Customer Portal, delinquency access)
- Analysis pipeline — actual execution, not code presence
- Financial reconciliation — cross-surface number agreement
- Dashboard/PDF/API/Docs Studio parity
- Analytics parity (persisted records vs. fired events — this session already found a real ~59% gap here; re-measure, don't assume it's fixed)
- Edge Function health
- Current P0/P1 defects, freshly enumerated

**Known open items from the most recent verified pass (2026-08-19/20), to be re-confirmed, not re-claimed:**
1. Two public example fixtures (`coffee-shop-denver`, `consulting-firm-new-york` in `src/pages/examples/exampleData.ts`) had payback numbers that didn't reconcile against either simple divisor.
2. No live browser walkthrough of visitor→signup→analysis→result had been run.
3. `is_service_role()` NULL-collapse authorization bug: confirmed exploitable and fixed in one function; the same raw pattern exists, unaudited, in 4 other migration files.
4. Stripe lifecycle not re-verified against live Stripe (no connector access that session).
5. Two JS chunks over 500KB (`index-*.js` 923KB, `pdf-*.js` 1.46MB) — real, not yet acted on.

Close the highest-risk items first (customer harm, then financial accuracy, then security, then everything else), with fresh evidence recorded against each, per Quantis's own evidence-labeling discipline (`VERIFIED COMPLETE` / `IMPLEMENTED, NOT DEPLOYED` / `PARTIALLY COMPLETE` / `BLOCKED` / `NOT STARTED`).

## 6. Track B — Permanent architecture (build now, load-bear later)

Runs in parallel with Track A, without destabilizing production. The distinction that makes this safe:

| Component | Schema/contract | Production dependency |
|---|---|---|
| Decision Graph | BUILD NOW | LATER |
| EvidencePacket contract | BUILD NOW | — |
| Evidence system | — | Shadow-mode run SOON; **affecting real numbers is BLOCKED** until shadow-vs-off parity is proven |
| Analysis Orchestrator contract | BUILD NOW | Full pipeline cutover AFTER testing |

### 6.1 Decision Graph — the canonical dependency system, not a visualization

```
SOURCE → EVIDENCE CLAIM → OBSERVATION → ASSUMPTION → FINANCIAL VARIABLE
  → FORMULA → METRIC → SCENARIO → RISK → DECISION
```

Every edge carries semantics, not just a link: `supports`, `contradicts`, `derived_from`, `depends_on`, `overrides`, `supersedes`, `affects`, `validated_by`, `invalidated_by`.

This is what lets Quantis answer *"why did runway fall from 14 months to 9?"* with a real dependency chain (Runway ← Ending Cash ← Operating FCF ← Payroll ← Headcount assumption ← User staffing plan, and separately: Sales volume assumption ← contradicted_by Source B) instead of "because expenses increased." That's the actual product advantage — implement relationally in Postgres (`decision_nodes`, `decision_edges`, typed edge relation), not in a graph database.

### 6.2 Evidence Service — four levels, never collapsed

```
SOURCE → EVIDENCE → OBSERVATION → ASSUMPTION
```

A Census figure is not an assumption. A website claim is not a verified fact. A benchmark median is not the user's actual business performance. An LLM extraction is not a measured observation. Each level needs its own provenance record, carried all the way to the report.

**Provenance classification (canonical, do not add ad hoc variants elsewhere):**
`USER_CONFIRMED`, `USER_ESTIMATED`, `SOURCE_OBSERVED`, `BENCHMARK_OBSERVED`, `DERIVED`, `MODELED_DEFAULT`, `AI_EXTRACTED`, `IMPUTED`, `UNVERIFIED`.

**Acceptance test before this ever touches a real number:** identical deterministic output with the Evidence Service ON vs. OFF, in shadow mode, logged and compared. Fails → stays shadow-only.

### 6.3 Analysis Orchestrator — a real state machine with failure states

```
RECEIVED → VALIDATING_INPUT → CLASSIFYING_ARCHETYPE → PLANNING_EVIDENCE
  → COLLECTING_EVIDENCE → RESOLVING_CONTRADICTIONS → LOCKING_ASSUMPTIONS
  → RUNNING_FINANCIAL_ENGINE → RUNNING_SCENARIOS → RECONCILING
  → LOCKING_NUMERIC_RESULT → GENERATING_NARRATIVE → VERIFYING_ARTIFACT_PARITY
  → PUBLISHABLE
```
Plus explicit failure states: `DEGRADED`, `BLOCKED`, `FAILED`, `REQUIRES_USER_INPUT`. This is what stops Quantis from presenting an analysis as succeeded when part of the pipeline actually degraded — every transition gets `status`, `started_at`, `completed_at`, `input_hash`, `output_hash`, `engine_version`, `error`, `retry_count`, `trace_id`.

### 6.4 Formula Registry + Analysis Snapshot

Every material calculation gets a registry entry (`formula_id`, `version`, `definition`, `inputs`, `units`, `periodicity`, `edge cases`, `rounding`, `tests`, `introduced_version`, `deprecated_version`). Every completed analysis gets an immutable `AnalysisSnapshot` (input, assumptions + provenance, evidence packet hash, dataset/formula-registry/engine versions, canonical outputs, quality state) — so "why did Quantis tell this customer something different six months ago?" is answerable by rerunning the exact historical snapshot.

### 6.5 Capability contracts — what makes the boundary structural, not just documented

| Subsystem | CAN | CANNOT |
|---|---|---|
| `EvidenceService` | retrieve, extract, rank, dedupe, detect contradiction, return observations | write canonical financial outputs, change user assumptions, publish reports, change billing |
| `FinancialCore` | consume approved assumptions, calculate canonical outputs | browse web, call LLM, invent missing values, render UI |
| `Narrator` | consume `LockedNumericPayload`, explain results | recalculate, change metrics, invent evidence |
| `Renderer` (Dashboard/PDF/Docs Studio/API) | display the canonical result | perform any business calculation |

Enforce with schemas/types and tests, not prompt instructions or code review discipline alone.

## 7. Open-source R&D disposition (corrected — not discarded)

For LemonGraph, DataWave, Emissary, or any future candidate, one question: *does this solve a currently identified Quantis architectural problem better than our existing stack?* Score on: problem addressed, architectural fit, implementation/operational complexity, security surface, maintenance quality, license compatibility, dependency risk, performance advantage, migration cost, vendor/maintainer risk, long-term ownership.

Disposition options — **not a single reject**:

| Disposition | When |
|---|---|
| `DIRECT DEPENDENCY / FORK` | NO, by default |
| `ARCHITECTURAL RESEARCH` | YES — keep reading/inspecting these and future candidates |
| `SELECTIVE CODE ADOPTION` | Only after license + technical review, per-candidate |
| `CONCEPT REIMPLEMENTATION` | YES where valuable — this is where LemonGraph/Emissary/DataWave land today |
| `PRODUCTION DEPENDENCY` | Only if a benchmarked advantage over the current stack is actually proven |

Current calls: LemonGraph → `CONCEPT REIMPLEMENTATION` (§6.1). Emissary → `CONCEPT REIMPLEMENTATION` (§6.3). DataWave → `ARCHITECTURAL RESEARCH` only, no reimplementation scheduled (nothing in current Quantis scale justifies it yet).

## 8. Track C — GTM Truth & Commercial Decision Engine

Full question bank: `docs/QUANTIS_GTM_QUESTION_BANK.md` (160 questions, 16 categories, plus the top-20 operating queue). Runs alongside Track A/B — this is not a fourth sequential phase, it's the third parallel track, because several of its questions are blocked on the *same* infrastructure Track A/B are already touching (analytics parity, provenance classification).

**Operating model (do not violate this tomorrow):** this is a rolling decision engine, not a report to fill in. `160-question bank → select ~10 relevant to the current bottleneck → gather evidence → answer → convert unresolved high-impact questions into tasks/experiments → execute → measure → select next 10.` A question is only worth investigating if answering it would actually change a product, sales, distribution, pricing, ICP, or resource-allocation decision.

### 9.1 What this session already knows — don't re-derive it tomorrow

- **Analytics parity is already a known, measured gap, not a hypothesis.** 27 `analyses` persisted vs. 11 combined `analysis_completed`/`analysis_complete` funnel events in a trailing 30-day window (~59% under-reporting). This is direct evidence for GTM-top-20 **Q9** (largest funnel loss with trustworthy evidence) and bears directly on **Q1–Q6** — any "how many X happened" answer sourced from `funnel_events` alone is currently an undercount, not a clean number. Existing follow-up task chip `task_46a94f92` covers the code-path investigation; that work directly unblocks Track C, it isn't separate from it.
- **`funnel_events` already implements real decision-interaction telemetry**, not just page views: `verdict_viewed`, `scenario_compared`, `assumption_changed` all fire from live code (`AccuracyTransparentResults.tsx`) with real counts (27 `verdict_viewed`, 11 `scenario_compared` in 30d as of 2026-08-18; `assumption_changed` fires from the same code path but had 0 real rows as of that check — worth a fresh count, not an assumption it's still 0). This is direct partial evidence for **Q2, Q3, Q4** (activation & decision interaction) — the instrumentation exists, the volume is just very low.
- **There is no `EXTERNAL_REAL` / `FOUNDER` / `STAFF` / `QA` / `BOT` / `SYNTHETIC` / `DEMO` classification anywhere in the schema today.** This was explicitly called for in the standing activation master prompt (commercial-clean cohort separation) and never built. **This is the single blocking prerequisite for GTM top-20 Q1** ("how many `EXTERNAL_REAL` people...") and materially affects Q2/Q5/Q6 in the bank. Nothing about the current funnel numbers can be trusted as "real users" vs. founder/QA activity until this exists — treat every raw count above as **contaminated-unknown**, not clean.
- **`activation_events` (the gamification score system) is a separate table from `funnel_events`** and was restored 2026-08-18 specifically because its event vocabulary (pdf_exported, doc_generated, invoice_created, etc.) doesn't overlap with the commercial funnel. Don't conflate the two when answering Q71–80 (Activation & Decision Interaction) — the *decision-interaction* signal lives in `funnel_events`, not `activation_events`.
- **Real, current, freshly-queried business volume** (2026-08-20/21, not historical): 0 new signups in the trailing 7 days, 2 `analyses` created in the trailing 7 days, 24 active/trialing subscriptions (flat across the last several days of this session — no movement). This is hard evidence, not a guess, for GTM-top-20 **Q18** ("is distribution the bottleneck, or does the product fail to activate people already sent to it?") — with signups at zero, the honest answer right now is **neither is yet measurable**; there isn't enough top-of-funnel volume this week to distinguish a traffic problem from an activation problem. Don't force a diagnosis the data can't support yet.
- **Referral reward issuance has no write path** (`referral_rewards` schema-restored, zero code path ever inserts into it) — relevant background for GTM Q93/Q94/Q100 (paid boundary, "I need this again" moments) if referrals were ever considered part of the retention/repeat-use loop; currently they structurally cannot be.

### 9.2 Tomorrow's Track C queue

Given §9.1, the top-20 list from the bank needs one adjustment before use: **Q1 cannot be answered at all until the `EXTERNAL_REAL` classifier exists.** So tomorrow's actual first move in Track C is infrastructure, not a query:

1. **Build the commercial-clean cohort classifier** (`EXTERNAL_REAL`/`FOUNDER`/`STAFF`/`QA`/`TEST`/`BOT`/`SYNTHETIC`/`DEMO`) — reuse whatever exclusion mechanism already exists for founder/test accounts elsewhere in the codebase (check first — do not build a second one) rather than inventing new logic. Without this, every number below is contaminated-unknown, not a real answer.
2. Re-run the analytics-parity check fresh (don't cite the 59%-gap number as still current without re-measuring) and, in parallel, pick up task chip `task_46a94f92`'s code-path audit — these are the same underlying question from two angles.
3. With the classifier in place, answer top-20 **Q1–Q6** for real (external, real, completed/viewed/compared/changed/returned) — this is the honest version of "how many unrelated professionals used Quantis this week," per bank question I.10.
4. Answer **Q9–Q10** (largest funnel loss + single highest-leverage fix) using the now-clean numbers, not the contaminated raw counts.
5. Q7, Q8, Q11–Q20 wait for a second pass once Q1–Q10 produce actual evidence — resist the urge to answer all 20 in one sitting; that violates the rolling-engine model in §9's opening paragraph.

Do not attempt sections XI–XVI of the full bank (pricing, Stripe/GTM, sales motion, outbound/CRM, content/SEO, scale/ops) tomorrow — none of them are reachable with trustworthy evidence until the cohort classifier and parity numbers exist. Forcing an answer without that foundation would just produce another set of numbers nobody can trust, which is the exact failure mode this whole track exists to prevent.

## 9. Final transition

```
CURRENT QUANTIS (fragmented technical truth)
        ↓
PRODUCTION INTEGRITY (Gate I)
        ↓
CANONICAL FINANCIAL CORE
        ↓
EVIDENCE + DECISION GRAPH (Gate II)
        ↓
ORCHESTRATED ANALYSIS
        ↓
PROFESSIONAL DECISION WORKFLOW (Gate III)
        ↓
REAL OUTCOMES → CALIBRATION (Gate IV)
        ↓
TECHNICAL FREEZE
        ↓
SELL / GTM / INVEST
```

Tomorrow runs Track A and Track B in parallel — re-verified production truth on one side, permanent schemas/contracts on the other — neither blocking the other, with the explicit rule that Track B work stays non-load-bearing until its own gate passes.
