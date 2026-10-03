# JEV Decision-Intelligence — Phases A–D Final Report

Per contract §40. Produced 2026-10-03 at the close of PR #218. Status vocabulary per
contract §37: `CODE_VERIFIED`, `TEST_VERIFIED`, `DEPLOYED`, `PROD_VERIFIED`, `PARTIAL`,
`FAIL`, `BLOCKED`, `UNVERIFIED`.

## A. Production baseline

```
main / Vercel production SHA   2a35cff2ab4ac83c04714e42882d21223bb1fb6d  (PR #215, re-verified live)
Vercel production state        READY
Supabase project                dmlxrvfyqsakyjomsvdj (AIWMC QUANTIS)      ACTIVE_HEALTHY
analyze-business                ACTIVE  v6870
ai-consensus                    ACTIVE  v6601  (orphaned — see §C)
scenario-breakpoint             ACTIVE  v4059  (already live, unmodified by this work)
qoc-orchestrate                 ACTIVE  v6032  (confirmed dormant)
rvce-validate                   ACTIVE  v6791
review-decision                 ACTIVE  v2 / FUNCTION_VERSION 1.1.0 (NEW, this work)

30-day funnel at spec time (re-queried, not trusted from the pasted contract):
  analyses total 220, analysis_complete 45, verdict_viewed 17, scenario_compared 4,
  assumption_changed 60, subscription_activated 0
```

## B. Existing pipeline discovered

See `CURRENT_DECISION_PIPELINE.md` for the full trace with file:line citations. Summary:
`analyze-business/index.ts` (4,576 lines) runs auth/rate-limit → input validation →
benchmark/industry extraction → AI narration (narrative only) → deterministic
calculation (`calculateStrictFinancials` + `deriveInvestmentVerdict`, the one canonical
verdict derivation) → narrative sanitizer → immutable snapshot → validation layer
(`engine-cross-validator`, `bulletproof-validator`, `reconciliation-check`) → confidence
scoring → hybrid validator (paid tiers) → response shaping. `scenario-breakpoint` is a
separate, already-live pure bisection function reading the snapshot's
`scenario_base_input`, wired into `ScenarioWorkspace.tsx`.

## C. `ai-consensus` disposition

**What it did:** generic two-LLM (GPT-5-mini + Gemini-3-flash) structured-output
cross-check with a fixed 60/40 weighted numeric merge and a disagreement-scaled
synthetic confidence — exactly the pattern the JEV contract flags as incompatible with
"deterministic calculations own canonical numbers."

**Where used:** nowhere live. Its one non-dead caller (`qoc-orchestrate`'s verify stage)
is itself confirmed dormant. Three frontend references
(`src/services/ai-consensus.ts`, `quantis-logger.ts`'s `logAIConsensus`,
`quantis-safety-agent.ts`) are dead code with zero call sites — one of them
(`quantis-safety-agent.ts`) also references a field name that was never the real
response shape.

**What replaced it:** nothing replaced it in the sense of a drop-in swap — JEV answers a
narrower, different question (bounded independent decision-readiness review, not a
second numeric opinion) and was built from a clean slate with no caller added to
`ai-consensus`.

**What remains:** `ai-consensus/index.ts` itself, left deployed (zero live traffic
depends on it, so no cutover risk) but marked `DEPRECATE` in
`AI_CONSENSUS_CALL_GRAPH.md`. The five dead-code call sites are flagged for a separate
cleanup PR — deliberately not bundled into this diff.

## D. JEV implementation

**Files** (`supabase/functions/_shared/decision-review/`): `contracts.ts` (types),
`hashes.ts` (idempotency), `provider.ts` (timeout/retry helpers), `packet-builder.ts`
(blinded packet construction), `jev-provider.ts` (`TypesafeJevProvider`),
`quantis-internal-test-provider.ts` (fixture), `telemetry.ts` (reuses `ai_calls`),
`consensus-policy.ts` (Phase C). Entry point: `supabase/functions/review-decision/index.ts`.

**Contracts:** `DecisionReviewer` interface, never throws, always resolves to
`{status:'completed', review}` or `{status:'unavailable', reason, detail}`. Bounded
`choice`/`score`/`noul` response shapes only — no free-form forecast, no probability of
success, no synthetic confidence percentage anywhere in the type system.

**Database:** `decision_reviews` (idempotent, cache-keyed, RLS: own + admin),
`decision_consensus_runs` (same ownership shape, joined through `analyses`). `ai_calls`
widened to carry `typesafe_jev`/`quantis_internal_test` as providers (a real drift from
the repo's own migration snapshot — production already had a `dahl` provider value not
in that file — caught and fixed before the ALTER could silently fail in CI later).

**Feature flags:** `DECISION_REVIEW_ENABLED` (env var; no flags table/service exists in
this repo, so this was the honest minimum rather than building new infrastructure for
one flag). Default unset = OFF. `isAdmin` gates the UI panel (contract §23's
founder-only-first rollout).

**Tests:** 19 Deno unit/contract tests (`decision-review.test.ts`,
`consensus-policy.test.ts`) — packet PII/verdict exclusion, hash idempotency, every
fixture-provider outcome (agree/disagree/insufficient-evidence/contradiction/timeout/
rate-limited/malformed), financial non-interference (byte-identical result before/after
a review), and every consensus-policy branch including both JEV-unavailable directions.

## E. Decision UX implementation

Before: `DecisionSummary.tsx` already had "The decision" / "What has to be true" / "What
breaks first" / cash metrics / "Test before committing capital" from a prior wave — this
was discovered during Phase A and deliberately not duplicated.

After: one new section, "Independent review (founder-only preview)" — an explicit button
(never auto-fired, since the call is metered once a real key exists), rendering the
consensus state, rationale, and next-validation-action, or an honest "temporarily
unavailable" message. Gated on `isAdmin`.

## F. Financial-integrity proof

`decision-review.test.ts`'s "financial non-interference" test asserts the canonical
result object is byte-for-byte unchanged (`JSON.stringify` equality) after building a
packet and running a review through it. The packet builder and consensus policy touch
only derived/extracted copies, never the source `analyses.result` object. The consensus
policy's type system has no field through which a numeric value could flow back into a
financial figure — `ConsensusResult` carries only state enums, strings, and booleans.

## G. Activation instrumentation

Two new canonical `funnel_events` names: `independent_review_viewed`,
`decision_consensus_viewed`. Added via the same additive-CHECK-constraint pattern as
every prior wave, with the live constraint confirmed via `pg_get_constraintdef` before
writing the migration (not trusted from the repo snapshot, after the `ai_calls`/`dahl`
lesson). Aggregation into the admin funnel ladder is Phase F, not yet done (see §K).

## H. Deployment proof

```
Commit (PR #218 branch): 1f8daf6 (latest at report time)
decision_reviews table:          PROD_VERIFIED (information_schema query)
decision_consensus_runs table:   PROD_VERIFIED (information_schema query)
ai_calls.provider CHECK:         PROD_VERIFIED (pg_get_constraintdef, includes dahl+new)
funnel_events CHECK:             PROD_VERIFIED (pg_get_constraintdef, includes new names)
review-decision edge function:   PROD_VERIFIED — ACTIVE v2, health endpoint returns
                                  version 1.1.0 + correct commit_sha; a real invalid-
                                  token POST returns {"error":"Invalid token"} FROM THE
                                  FUNCTION'S OWN CODE (not a gateway rejection), proving
                                  the deployed bundle actually executes its logic.
Frontend (IndependentReviewPanel, DecisionSummary wiring): DEPLOYED_UNVERIFIED — code
                                  complete, typechecks, builds, passes existing tests,
                                  but not live on aiwmcquantis.com until PR #218 merges
                                  and Vercel rebuilds.
```

## I. Production state per promised capability

| Capability | State |
|---|---|
| Phase A reconciliation docs | `PROD_VERIFIED` (docs committed, findings independently confirmed against live DB/code) |
| JEV provider contract + packet builder | `TEST_VERIFIED` (19/19 unit tests; real vendor call still blocked — see below) |
| `review-decision` edge function | `PROD_VERIFIED` (deployed, health-checked, logic confirmed via real request) |
| `decision_reviews` / `decision_consensus_runs` schema + RLS | `PROD_VERIFIED` |
| Decision consensus policy | `TEST_VERIFIED` (10/10 branch tests); wired into the deployed function |
| Founder-only UI panel | `DEPLOYED_UNVERIFIED` (not live until merge) |
| Real JEV vendor call (typesafe-jev.com) | `BLOCKED` — `TYPESAFE_API_KEY` not provisioned; no account/key exists for this session to use |
| Scenario handoff (breakpoint → decision header click-through) | `DEFERRED` — Phase E, not started |
| Admin activation-ladder funnel report | `DEFERRED` — Phase F, not started |
| `ai-consensus` dead-code removal | `DEFERRED` — flagged for a separate cleanup PR |

## J. Metrics to observe once this merges and the founder tests the panel

- Review outcome distribution once `DECISION_REVIEW_ENABLED=true` and a real
  `TYPESAFE_API_KEY` exist: `completed` vs `unavailable` rate, broken down by
  `error_code`.
- Consensus state distribution (`decision_consensus_runs.consensus_state`) — is
  `DECISION_READY` the common case, or is `REVIEW_REQUIRED`/`CONDITIONAL` dominant
  (which would mean the canonical verdict and JEV disagree often, worth investigating
  before wider rollout)?
- `independent_review_viewed` vs `decision_consensus_viewed` fire-together rate (the
  panel should fire both on a completed review — a gap would indicate a UI bug, not a
  real usage signal).

No vanity metrics (no "accuracy," no combined confidence — consistent with contract §24).

## K. Remaining P0/P1 only

1. **P0 — provision `TYPESAFE_API_KEY`** as a Supabase Edge Function secret. Nothing
   else in this chain can be end-to-end verified against the real vendor until this
   exists. (Founder action, not something this session can do.)
2. **P0 — merge PR #218**, then verify the frontend panel renders in production for an
   admin account.
3. **P1 — Phase E**: wire the critical-assumption/breakpoint click-through from
   `DecisionSummary.tsx`'s "What has to be true" section into `ScenarioWorkspace.tsx`
   with the relevant assumption preselected (the underlying `scenario-breakpoint`
   function already exists and needs no new backend work).
4. **P1 — Phase F**: aggregate the real activation ladder
   (`analysis_complete → verdict_viewed → driver_inspected → scenario_compared →
   independent_review_viewed → subscription_activated`) into an admin-visible report
   with correct per-stage denominators (users/sessions/analyses kept distinct, per
   contract §19).
5. **P2 — cleanup PR**: remove the five dead `ai-consensus` call sites identified in
   `AI_CONSENSUS_CALL_GRAPH.md`.
6. **P2 — one real disagreement case and one real provider-failure case**, verified
   against the live vendor, once the key exists (contract §33's Definition of Done for
   JEV v1 — cannot be satisfied without the key, and is not claimed as satisfied here).
