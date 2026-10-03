# JEV Implementation Decision

Phase A reconciliation doc. Commits to scope, sequencing, and the two real external blockers
before any Phase B code is written.

## Decision: JEV replaces the architectural role `ai-consensus` was meant to fill, not sits beside it

`AI_CONSENSUS_CALL_GRAPH.md` establishes that `ai-consensus` has no live caller today — its one
non-dead consumer (`qoc-orchestrate`) is itself dormant. There is no cutover risk in the sense of
"turning off something users depend on," because nothing in the live request path depends on it.
The decision is therefore simple: **no new feature adds a caller to `ai-consensus`; JEV is built
as the independent-review layer instead, from a clean slate.** `ai-consensus` itself is marked
deprecated in docs but left deployed (no deletion risk, no urgency — see dead-code cleanup note
below). This satisfies contract §3's requirement to prove all call sites before removing anything,
without blocking Phase B on a cleanup PR that is genuinely a separate, low-risk task.

The five dead-code call sites (`src/services/ai-consensus.ts`, `quantis-logger.ts`'s
`logAIConsensus`, `quantis-safety-agent.ts`, the now-vacuous read in
`aggregate-quality-metrics/index.ts`, and the `qoc-orchestrate` verify stage once QOC itself is
addressed) are recommended as a separate, small cleanup task — not bundled into this contract's
diff, to keep the JEV changes reviewable in isolation. (This will be filed as a follow-up task,
not left as a dangling TODO.)

## Decision: do not add SALib / OR-Tools / PyMC / DoWhy / Z3 in this pass

`scenario-breakpoint` already answers "what value would change the decision" with pure
deterministic bisection against the exact calc function every other scenario path uses
(`CURRENT_DECISION_PIPELINE.md`). It is already live in `ScenarioWorkspace.tsx`. Phase E's job is
to surface this existing, working capability on the decision header and wire it into the
critical-assumption flow — not to import a new optimization/sensitivity library. The contract's
own sequencing (one-way → two-way → threshold → only later global methods) is respected by
construction: nothing here precedes threshold analysis, because threshold analysis already
exists and ships today.

## Decision: provider abstraction, not a hard vendor lock to typesafe-jev.com

Per contract §4, `DecisionReviewer` is an interface with `review(packet): Promise<Review>`, and
`typesafe_jev` is one named implementation (`DecisionReviewProvider = 'typesafe_jev' |
'quantis_internal_test'`). The `quantis_internal_test` provider is a fixture/mock implementation
used in unit and contract tests, and optionally as a dev-mode fallback — it is not a second
production vendor.

## Two real external blockers, flagged before Phase B backend work starts

1. **`TYPESAFE_API_KEY` is not present anywhere in this repo or in the Supabase project's
   function secrets as far as code-level inspection can determine.** This session has no
   mechanism to obtain a real API key from the vendor — that requires the founder to provision
   an account/key with typesafe-jev.com and hand it over as a Supabase Edge Function secret
   (`supabase secrets set TYPESAFE_API_KEY=...` or via the Supabase dashboard). **Phase B backend
   code (contracts, packet builder, parser, persistence, tests against mocked responses) can be
   built and fully unit/contract-tested without this key**, using the `quantis_internal_test`
   provider and recorded fixture responses. The **real** `typesafe_jev` provider cannot be
   exercised end-to-end against the live vendor API until the key exists as a secret. This will
   be reported as `CODE_ONLY` / `BLOCKED` (not `PROD_VERIFIED`) in the final report until that
   happens.
2. **Outbound network egress from this environment to `api.typesafe.ai` has not yet been
   verified.** Supabase Edge Functions run in Deno Deploy's own network, not this session's
   sandboxed container, so the *production* call path is unaffected by this session's own egress
   restrictions — but this session cannot independently smoke-test the vendor's REST contract
   (request/response shape, auth header format, rate limits) before writing the adapter, beyond
   what the contract's own pasted documentation snippet describes. The adapter will be written
   to that documented contract, defensively (timeout, retry, 429/5xx handling, fail-open on
   provider unavailability per contract §5), and will need a first real production call —
   triggered by whoever holds the API key — to confirm the shape matches what was assumed.

Neither blocker prevents Phase B from proceeding on contracts, packet building, the DB schema, the
feature flags, or the fixture-backed test suite. Both block only the final "one real disagreement
case verified against the live vendor" item in the §33 Definition of Done, which will be reported
honestly as outstanding rather than claimed.

## Decision: shadow mode is the only way Phase B/C ship initially

Per contract §23/§33: `decision_review_shadow_v1 = ON`, `decision_consensus_ui_v1 = OFF` at first
deploy. JEV (once the key exists) runs against real completed analyses without changing any
customer-visible output. No UI exposure, no consensus-state rendering, until a manually-reviewed
sample confirms parse validity and a sane agreement/disagreement distribution. This is not
optional caution — it is the only way to satisfy contract §4's "JEV failure must not destroy a
valid Quantis analysis" and §21's financial-precision gate simultaneously: the safest way to prove
JEV cannot regress the canonical result is to run it where it cannot be seen before it can be
seen.

## Decision: new events extend `funnel_events`, not a third event system

`CURRENT_DECISION_PIPELINE.md` documents two existing event systems (`funnel_events`,
`quantis_events`). Phase B/D/F's new events (`decision_consensus_viewed`,
`critical_assumption_opened`, `decision_breakpoint_viewed`, `independent_review_viewed`,
`validation_action_selected`, `decision_alternative_started`, `decision_packet_exported`,
`second_decision_started`) extend the `funnel_events` canonical allowlist via a normal additive
migration (following the exact pattern of `20260927020000_add_subscription_lifecycle_events.sql`),
matching the existing `driver_inspected`/`next_action_selected` precedent already in that table.
