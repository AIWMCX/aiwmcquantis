# JEV Decision-Intelligence — Phases A–F Final Report

Per contract §40. Produced 2026-10-03, updated at the close of Phase F on PR #218
(originally written after Phase D; Phases E and F were completed in the same PR
afterward — the title and body below now cover the full contract). Status vocabulary
per contract §37: `CODE_VERIFIED`, `TEST_VERIFIED`, `DEPLOYED`, `PROD_VERIFIED`,
`PARTIAL`, `FAIL`, `BLOCKED`, `UNVERIFIED`.

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

## E. Decision UX implementation (Phase D)

Before: `DecisionSummary.tsx` already had "The decision" / "What has to be true" / "What
breaks first" / cash metrics / "Test before committing capital" from a prior wave — this
was discovered during Phase A and deliberately not duplicated.

After Phase D: one new section, "Independent review (founder-only preview)" — an explicit
button (never auto-fired, since the call is metered once a real key exists), rendering
the consensus state, rationale, and next-validation-action, or an honest "temporarily
unavailable" message. Gated on `isAdmin`.

After Phase E: "What breaks first" items whose assumption-graph label maps onto a real
`ScenarioAssumptionKey` (Price, Customer Count, CAC, Churn Rate, Fixed Costs — `COGS %`
deliberately left unmapped, since it has no scenario-assumption equivalent to guess at)
now carry a "Test this assumption →" link into `ScenarioWorkspace.tsx?focusAssumption=`,
which auto-runs that one breakpoint search and highlights the matching input. No backend
change — `scenario-breakpoint` was already live and unmodified; this phase only wired
the handoff.

After Phase F: `src/pages/admin/Funnel.tsx` — found to already exist in the repo but
**unroutable** (no entry in `App.tsx` or the sidebar) and reading from two views that
**did not exist in production** (`funnel_summary_30d`/`funnel_daily_30d` — defined in an
early migration, confirmed missing via `information_schema.tables` before fixing, not
assumed from the migration file). Both are now fixed: the views are recreated (with a
real security correction — `security_invoker = true`, since the original definition's
plain `GRANT SELECT TO authenticated` let any signed-in user read the admin-only
aggregate funnel directly via the REST API, bypassing `funnel_events`' own admin-only
RLS; this was a latent gap in the original design, closed now rather than carried
forward since this is the first time the view becomes reachable at all), the page is
routed at `/admin/funnel` and linked from the sidebar, the ladder is extended through
`driver_inspected` and `subscription_activated` (closing the loop to real paid
conversion), and a `unique_analyses` column (counted from `metadata->>'analysis_id'`,
kept as a separate denominator from users/sessions per contract §19) was added.

## F. Financial-integrity proof

`decision-review.test.ts`'s "financial non-interference" test asserts the canonical
result object is byte-for-byte unchanged (`JSON.stringify` equality) after building a
packet and running a review through it. The packet builder and consensus policy touch
only derived/extracted copies, never the source `analyses.result` object. The consensus
policy's type system has no field through which a numeric value could flow back into a
financial figure — `ConsensusResult` carries only state enums, strings, and booleans.
Phases E and F touched no financial calculation code at all (E only added a navigation
link; F only restored/fixed existing aggregate views over `funnel_events`, unrelated to
`analyses`' financial data).

## G. Activation instrumentation

Five new canonical `funnel_events` names, each added via the same additive-CHECK-
constraint pattern, with the live constraint confirmed via `pg_get_constraintdef` before
every migration (not trusted from the repo snapshot, after the `ai_calls`/`dahl` lesson
in Phase B): `independent_review_viewed`, `decision_consensus_viewed` (Phase D),
`decision_breakpoint_viewed` (Phase E). Phase F aggregates these plus the pre-existing
ladder into the now-live `/admin/funnel` dashboard, with `driver_inspected` and
`subscription_activated` added to close the loop from engagement to real paid
conversion, and the three JEV events kept in a visually separate card row so founder
testing traffic never dilutes a real-user conversion denominator.

## H. Deployment proof

```
Commit (PR #218 branch, latest): cc996c6
decision_reviews table:          PROD_VERIFIED (information_schema query)
decision_consensus_runs table:   PROD_VERIFIED (information_schema query)
ai_calls.provider CHECK:         PROD_VERIFIED (pg_get_constraintdef, includes dahl+new)
funnel_events CHECK:             PROD_VERIFIED (pg_get_constraintdef, includes all 5 new names)
funnel_summary_30d/daily_30d:    PROD_VERIFIED — recreated, queried with real data
                                  (e.g. analysis_complete: 45 events / 43 sessions /
                                  3 users / 40 analyses)
review-decision edge function:   PROD_VERIFIED — ACTIVE v2, health endpoint returns
                                  version 1.1.0 + correct commit_sha; a real invalid-
                                  token POST returns {"error":"Invalid token"} FROM THE
                                  FUNCTION'S OWN CODE (not a gateway rejection), proving
                                  the deployed bundle actually executes its logic.
Frontend (IndependentReviewPanel, DecisionSummary wiring, ScenarioWorkspace handoff,
  /admin/funnel route): DEPLOYED_UNVERIFIED — code complete, typechecks, builds, passes
                                  existing tests, but not live on aiwmcquantis.com until
                                  PR #218 merges and Vercel rebuilds.
```

## I. Production state per promised capability

| Capability | State |
|---|---|
| Phase A reconciliation docs | `PROD_VERIFIED` (docs committed, findings independently confirmed against live DB/code) |
| JEV provider contract + packet builder | `TEST_VERIFIED` (19/19 unit tests; real vendor call still blocked — see below) |
| `review-decision` edge function | `PROD_VERIFIED` (deployed, health-checked, logic confirmed via real request) |
| `decision_reviews` / `decision_consensus_runs` schema + RLS | `PROD_VERIFIED` |
| Decision consensus policy | `TEST_VERIFIED` (10/10 branch tests); wired into the deployed function |
| Founder-only UI panel (Phase D) | `DEPLOYED_UNVERIFIED` (not live until merge) |
| Scenario handoff (Phase E) | `DEPLOYED_UNVERIFIED` (code complete, not live until merge) |
| Admin funnel dashboard + restored views (Phase F) | `PARTIAL` — DB views `PROD_VERIFIED`; route/UI `DEPLOYED_UNVERIFIED` until merge |
| Real JEV vendor call (typesafe-jev.com) | `BLOCKED` — `TYPESAFE_API_KEY` not provisioned; no account/key exists for this session to use |
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
- On `/admin/funnel`: `decision_breakpoint_viewed` → actual breakpoint-run rate on
  `ScenarioWorkspace.tsx` (does the handoff actually get used, or just viewed?), and
  whether `driver_inspected`/`subscription_activated` show any real lift once enough
  volume accumulates — the whole point of Phases D/E per the contract's own framing is
  whether independent review + an explicit threshold + a direct next action cause more
  interaction than a report alone, not just more instrumentation.

No vanity metrics (no "accuracy," no combined confidence — consistent with contract §24).

## K. Remaining P0/P1 only

1. **P0 — provision `TYPESAFE_API_KEY`** as a Supabase Edge Function secret. Nothing
   else in this chain can be end-to-end verified against the real vendor until this
   exists. (Founder action, not something this session can do.)
2. **P0 — merge PR #218**, then verify the frontend panel, scenario handoff, and
   `/admin/funnel` all render correctly in production for an admin account.
3. **P1 — cleanup PR**: remove the five dead `ai-consensus` call sites identified in
   `AI_CONSENSUS_CALL_GRAPH.md`.
4. **P1 — one real disagreement case and one real provider-failure case**, verified
   against the live vendor, once the key exists (contract §33's Definition of Done for
   JEV v1 — cannot be satisfied without the key, and is not claimed as satisfied here).
5. **P2 — controlled external rollout** (contract §23's next stage after founder/admin
   testing): once the founder has observed a reasonable sample of agreement/disagreement
   cases from real admin usage, decide whether to extend `decision_consensus_ui_v1` past
   `isAdmin` to a small percentage of real users.
6. **P2 — multi-driver counterfactuals / global sensitivity** (contract §27–28):
   explicitly not started, and per the contract's own sequencing should not start until
   there is demonstrated user demand for more than the single-driver breakpoint handoff
   this PR ships.
