# Current Decision Pipeline (as-built, verified 2026-10-03)

Phase A reconciliation doc for the JEV / decision-intelligence implementation contract.
Produced by direct code inspection (file:line citations below), not from memory or from the
spec's own baseline numbers, which were stale by the time this was written and have been
re-verified against production.

## Production baseline at time of writing

```
main / Vercel production SHA   2a35cff2ab4ac83c04714e42882d21223bb1fb6d  (PR #215)
Vercel production state        READY
Supabase project                dmlxrvfyqsakyjomsvdj (AIWMC QUANTIS)      ACTIVE_HEALTHY
analyze-business                ACTIVE  v6870
ai-consensus                    ACTIVE  v6601
scenario-breakpoint             ACTIVE  v4059
qoc-orchestrate                 ACTIVE  v6032
rvce-validate                   ACTIVE  v6791

30-day funnel (re-queried):
  analyses total                220
  analyses last 7d                4
  distinct analysis users 30d     2
  analysis_complete              45
  verdict_viewed                 17
  scenario_compared               4
  assumption_changed             60
  subscription_activated          0
  scenario_sets created 30d       2
```

Same shape as the contract described: completion and inspection exist, scenario comparison is
weak, paid activation is zero. The commercial direction the contract proposes (critical driver →
breakpoint → independent review → next action) is the right target.

## Pipeline, in actual execution order

All line numbers refer to `supabase/functions/analyze-business/index.ts` (4,576 lines; README
calls it "the live monolith — GOLDEN checkpoint") unless otherwise noted.

1. **HTTP/auth/rate-limit/tier resolution** — lines 2025-2399. Per-plan rate limits, trusted-worker
   auth for the Pro async queue (`analyze-pro-worker` service-role callback, 2074-2106), free/anon
   per-device+IP limiting (2194-2342), Pro async-queue branch (2399-2467).
2. **Input validation & sanitization** — lines 2468-2640, `validateAndSanitizeInput`
   (`ai-safety-guardrails.ts`), "Smart Idea Validation v3."
3. **Document aggregation** — lines 2641-2709, merges uploaded-document-derived financial inputs.
4. **Industry/benchmark extraction & normalization**:
   - Industry detection — lines 2710-2737 (`industry-classifier-core.ts`).
   - Benchmark Engine v2, 97,500-row dataset — lines 2738-2747 (`benchmark-engine-v2.ts`).
   - v2 → legacy benchmark overlay — lines 2748-2801.
   - Location intelligence — lines 2802-2811 (`location-intelligence.ts`).
   - Sub-industry detection — lines 2812-2994 (`sub-industry-detection.ts`).
5. **AI narration call** — lines 2995-3084; the actual LLM call is `aiCall(...)` at line 3014
   (tier-routed model via `_shared/llm-call.ts`). This produces narrative/qualitative text only.
6. **Deterministic fallback / canonical numbers** — lines 3085-3140
   (`generateDeterministicFallbackResult()`, defined line 1399). This is the only place
   `calculateStrictFinancials()` (`financial-calculator.ts:1730`) and `deriveInvestmentVerdict()`
   (`investment-verdict.ts:1772`) are invoked, inside `transformResponse()` (defined line 1641,
   called line 3130). Both the AI-narrator path and the deterministic-fallback path converge
   through `transformResponse()` before returning
   (`supabase/functions/analyze-business/VERDICT_CONSUMERS.md` §2). **This is the one and only
   canonical verdict derivation on the backend** — confirmed by grep, documented explicitly in
   `VERDICT_CONSUMERS.md`.
7. **Narrative honesty sanitizer** — lines 3141-3197, `sanitizeNarrativeAgainstNumbers` strips AI
   prose that contradicts the locked numeric result.
8. **Immutable analysis snapshot** — lines 3198-3259, `emitAnalysisSnapshot()`
   (`_shared/analysis-snapshot.ts`). Frozen, versioned (`ENGINE_VERSION`/`FORMULA_REGISTRY_VERSION`)
   snapshot used later for scenario/breakpoint reconstruction — this is the origin of
   `analyses.scenario_base_input`, which `scenario-breakpoint` reads.
9. **Canonical analysis-complete event** — lines 3260-3292, `emitAnalysisComplete()`
   (`_shared/analysis-complete-event.ts`), wired via DB trigger
   (`20260816000000_analysis_complete_event_trigger.sql`).
10. **Quantis 2.0 engine integration** — lines 3293-3389, `processQuantisAnalysis()`
    (`quantis-engine.ts`), warnings merged with legacy warnings.
11. **Confidence scoring** — lines 3390-3678 ("PROFESSIONAL CONFIDENCE SCORING SYSTEM"), builds
    `confidenceBreakdown` via `_shared/quality-dimensions.ts`.
12. **Usage recording** — lines 3679-3733. Note: `analyze-business` does **not** insert the final
    `analyses` row itself — the caller persists it afterward (documented P0 fix note at
    index.ts:1987-1998).
13. **Validation layer** — lines 3762-3986:
    - Cross-validation + sensitivity + benchmark confidence — lines 3762-3802,
      `crossValidateEngines()` (line 3766, `engine-cross-validator.ts`) — a **deterministic**
      second-engine agreement check, field `cross_validation.agreement_score`. This is NOT an LLM
      consensus and is unrelated to `ai-consensus` despite the similar-sounding name (see
      `AI_CONSENSUS_CALL_GRAPH.md` for a documented confusion between the two in dead code).
    - Anti-BS sanity checks — lines 3803-3819, `runAntiBS()` (`bulletproof-validator.ts`),
      rule-based (e.g. LTV:CAC bounds, margin ceilings).
    - Reconciliation check — lines 3820-3938, `runReconciliationCheck()`
      (`reconciliation-check.ts`).
14. **Assumption graph / model confidence / market prior / SCORE compliance** — lines 3939-4020.
15. **Case memory insert** — lines 4021-4046 (non-blocking).
16. **Build full response payload** — lines 4047-4283 (attaches `cross_validation` at line 4148).
17. **Hybrid validator** — lines 4284-4371, `validateAnalysis()` (line 4291,
    `_shared/hybrid-validator.ts`), **paid tiers only**. Two layers: cheap deterministic rules run
    on every paid analysis for free (LTV:CAC in [0.3,20], margin ceilings by vertical); an LLM
    second pass runs only if a rule fires. Fed the canonical `verdict` as read-only cross-check
    input — never overrides it.
18. **Decision run access envelope** — line 4372+, tier-based response shaping.
19. **Last-resort fallback** — line 4546+, guarantees a response even if everything above throws.

## Scenario / breakpoint layer (separate, already-live feature)

`supabase/functions/scenario-breakpoint/index.ts` (193 lines) + `_shared/scenario-sensitivity.ts`
`findBreakpoint()` — pure bisection root-finding against the *same* deterministic calc function
`run-scenario` uses, search range [-95%, 500%], tolerance 0.01pp, max 60 iterations. Reads the
frozen `analyses.scenario_base_input` snapshot (step 8 above), applies any client-side deltas,
and answers "what % change in assumption X makes metric Y cross value Z." No persistence (pure
read+compute). Gated by the `scenarioCustom` entitlement — same gate as `run-scenario`'s live
preview — and documented as free-tier-eligible (never paywalled on correctness, only on
persistence/comparison/documents).

**Confirmed wired end-to-end into the live UI**: `src/services/scenario-sets-api.ts:180-194`
(`findScenarioBreakpoint()`) → `src/pages/ScenarioWorkspace.tsx:289-308`
(`handleFindBreakpoint()`) → rendered at `ScenarioWorkspace.tsx:675-689`. This is exactly the
"what would change the decision?" capability §13 of the JEV contract asks for — it already
exists and is already live. Phase E (scenario handoff) extends its reach into the decision
header rather than building anything new.

## Validation/verification surfaces already live (see VERIFICATION_AUTHORITY_MATRIX.md for the
full breakdown)

- **RVCE** (`rvce-validate`, web-evidence validator) — live, user-visible on the results page via
  `AccuracyTransparentResults.tsx` → `RvceValidationSection`.
- **Hybrid validator** (`_shared/hybrid-validator.ts`) — live, paid tiers, server-side.
- **R3** (`_shared/r3-validator.ts`) — CI-enforced repo-wide primitive for every LLM-calling
  function's output; `ai-consensus` is its one documented, allowlisted exemption
  (`scripts/verify-r3-enforcement.ts:32`, comment "P2-006 — to wire alongside consensus-evaluator
  refactor").
- **`qoc-orchestrate`** — fully built, confirmed dormant (README's own diagram: "dormant — for
  migration" / "idle"; `src/__tests__/production-freeze.test.ts:534-537,864-866` explicitly
  asserts it is never invoked from `analyze-business`). Its only consumer is an admin dashboard
  that reads its audit table, not a trigger path.
- **`ai-consensus`** — built, deployed, but effectively orphaned. See `AI_CONSENSUS_CALL_GRAPH.md`.

## A second, independent verdict-classification surface worth naming explicitly

`src/components/analysis/DecisionSummary.tsx` → `src/lib/verdict.ts` (`computeVerdict()`) runs a
second, independently-thresholded pass/fail/mixed classification over the same canonical numbers
(different LTV:CAC cutoffs, different taxonomy — `fail/pass/mixed` vs. the backend's
`HIGH_RISK/MEDIUM_RISK/LOW_RISK/PROMISING`). It does not recompute any dollar figure — it is a
UI-tone classifier, not a second financial engine — but it could disagree with the backend's
canonical verdict on borderline cases. This is pre-existing, not something Phase D introduces;
flagged here so the Decision Consensus Policy (Phase C) reconciles against the backend's verdict,
not the frontend's independent classification.

## Decision-UX scaffolding that already exists

`src/pages/NewDecision.tsx` and `DecisionSummary.tsx` already fire funnel events named
`driver_inspected`, `next_action_selected`, `new_decision_viewed`, `decision_type_selected`,
`decision_input_started`, `result_rendered`, `result_viewed` — all already in the canonical
`funnel_events` allowlist (see below). This means some "decision-first" framing the contract asks
for in §12 already exists in a prior iteration; Phase D should extend/wire into this rather than
replace it wholesale.

## `funnel_events` — canonical allowlist (current, migration `20260927020000`)

Enforced by a DB `CHECK` constraint, not just client-side convention. ~49 canonical names as of
the latest migration found; three (`subscription_activated/failed/cancelled`) are deliberately
server-only, written exclusively from `stripe-webhook` to avoid trusting unreconciled client
claims against Stripe truth. A second, structurally distinct table (`quantis_events`, migration
`20260904222003`) exists for revenue/activation events tied to `engagement_id`/`offer_id` —
additive, not a replacement for `funnel_events`. New JEV/decision-review events (Phase B/D/F)
should extend the `funnel_events` allowlist via migration, following the same pattern, rather
than introducing a third event system.
