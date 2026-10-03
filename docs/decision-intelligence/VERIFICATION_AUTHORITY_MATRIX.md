# Verification Authority Matrix

Phase A reconciliation doc, per JEV contract §17. Defines which system answers which question
today, and where JEV / the Decision Consensus Policy slot in without duplicating an existing
concept. Verified by direct code inspection, 2026-10-03.

| Question | Canonical authority | Secondary check | User-visible representation | Fallback on failure |
|---|---|---|---|---|
| What are the canonical revenue/cost/margin/break-even/payback/LTV:CAC numbers? | `calculateStrictFinancials()` (`financial-calculator.ts:1730`) + `deriveInvestmentVerdict()` (`investment-verdict.ts:1772`), invoked inside `transformResponse()` (`analyze-business/index.ts:1641`, called at 3130) | `crossValidateEngines()` (`engine-cross-validator.ts`, called `analyze-business/index.ts:3766`) — a deterministic second-engine agreement check, `cross_validation.agreement_score` | Results page (`AccuracyTransparentResults.tsx`), Decision Memo (`decision-memo-data.ts`), PDF export | `generateDeterministicFallbackResult()` (`analyze-business/index.ts:1399`), guarantees a schema-valid result even with zero AI involvement |
| Is the numeric output internally sane (no fabricated/implausible values)? | `runAntiBS()` (`bulletproof-validator.ts`, called `analyze-business/index.ts:3806`) — rule-based (LTV:CAC bounds, margin ceilings by vertical) | `defaultFinancialReconciler()` (`_shared/r3-validator.ts:131-152`) — CI-enforced on every LLM output, stricter LTV:CAC ceiling (0-20 vs. hybrid-validator's 0.3-20) | Sanity flags surfaced in `sanity_flags` on the result object | Reject with typed reason, never throws (`r3-validator.ts` R3 "Reject" stage) |
| Does the result reconcile internally (inputs → outputs, no contradiction)? | `runReconciliationCheck()` (`reconciliation-check.ts`, called `analyze-business/index.ts:3834`) | — | Surfaced via `validation`/`reportIntegrity`-style fields consumed downstream (export/share gating) | — |
| Does external, real-world evidence support the inputs/benchmarks used (CAC, pricing, typical margins for this industry+location)? | **RVCE** (`rvce-validate`, web-evidence validator: search → extract → gate by tier) | — | Live, user-visible: `AccuracyTransparentResults.tsx` → `RvceValidationSection` (`src/components/rvce/ValidationSection`) | Hard 50s timeout, fail-safe fallback object, never blocks analysis render (`rvceService.ts:13-58`) |
| Does an LLM-adjacent output (narration, classification) pass a cheap deterministic sanity pass, and only escalate to a second LLM pass if needed? | **Hybrid validator** (`_shared/hybrid-validator.ts`), Layer 1 deterministic rules on every paid analysis, Layer 2 LLM pass only if a rule fires | Fed the canonical `verdict` as read-only input — never overrides it (`analyze-business/index.ts:4291`) | Paid tiers, server-side only (not directly rendered as its own section) | Returns `ValidatorResult` with warnings; does not block the response |
| Does every LLM-calling function's JSON output pass schema + domain-invariant checks before reaching the UI/PDF/storage? | **R3** (`_shared/r3-validator.ts`), CI-enforced repo-wide via `scripts/verify-r3-enforcement.ts`, one JSON-repair retry, then typed rejection (never throws) | — | Invisible by design (a gate, not a feature) | Typed rejection object with reason + raw preview |
| What value would change the decision (threshold/breakpoint on an assumption)? | **`scenario-breakpoint`** — pure bisection root-finding against the same deterministic calc function used everywhere else, no independent numeric authority of its own | — | Live: `ScenarioWorkspace.tsx:289-308,675-689` | `NOT_FOUND_IN_RANGE` / `ALREADY_AT_TARGET` typed states, never a fabricated number |
| Does an independent, bounded reviewer (blind to the Quantis verdict) agree this decision is ready? | **JEV** (new, Phase B) — bounded `choice`/`score`/`noul` questions only, never originates or modifies a financial number | — | New (Phase D): "Independent Review" panel on the decision header | "Independent review temporarily unavailable" — never blocks or replaces the Quantis result (contract §5) |
| Given the canonical verdict + JEV's independent review + integrity state, what is the final decision-readiness state? | **Decision Consensus Policy** (new, Phase C) — deterministic, versioned code, not a second LLM vote | Canonical verdict (`deriveInvestmentVerdict`) and JEV output are both inputs; policy itself is pure logic | New (Phase D): consensus state (`DECISION_READY`/`CONDITIONAL`/`REVIEW_REQUIRED`/`DEFER_AND_VALIDATE`/`BLOCKED`) | If JEV unavailable, policy must have an explicit branch that still returns a usable state using only the canonical verdict + integrity (never silently treats "unavailable" as "agree") |
| Orchestrates the above into one quality state (today, mostly unused)? | `qoc-orchestrate` — confirmed **dormant**, not in any live request path (README: "dormant — for migration"; test explicitly asserts non-invocation) | — | Admin-only (`QocMonitor.tsx` reads its audit table; nothing triggers it from the live flow) | N/A — not in the critical path |
| Does a second, independently-thresholded UI-tone classifier exist anywhere? | **Yes, and it should not be treated as a numeric authority**: `src/lib/verdict.ts` (`computeVerdict()`), consumed by `DecisionSummary.tsx`. Runs its own pass/fail/mixed thresholds over the same canonical numbers (different LTV:CAC cutoffs, different taxonomy than the backend's `HIGH_RISK/MEDIUM_RISK/LOW_RISK/PROMISING`). It does not recompute dollar figures, but it is a second decision-classification surface that could disagree with the backend's canonical verdict on borderline cases. | — | `DecisionSummary.tsx` | — |

## Two previously undocumented overlaps worth closing (not urgent, flagged here)

1. **`engine-cross-validator.ts`'s `agreement_score` vs. `ai-consensus`'s `consensusScore`** — one
   dead-code caller (`quantis-safety-agent.ts`) conflates these two unrelated concepts (see
   `AI_CONSENSUS_CALL_GRAPH.md`). No live impact today since the caller is dead code, but the
   naming collision is a real landmine for future contributors.
2. **`DecisionSummary.tsx`'s `computeVerdict()` vs. the backend's `deriveInvestmentVerdict()`** —
   two independently-thresholded pass/fail classifiers over the same canonical numbers. The
   Decision Consensus Policy (Phase C) should reconcile against the **backend** verdict only,
   never the frontend's independent classification, to avoid building a three-way disagreement
   surface (Quantis backend vs. Quantis frontend vs. JEV).

## No duplicate concept is introduced by JEV / Decision Consensus Policy

JEV answers a question nothing else today answers: "does a reviewer who has not seen our verdict,
looking only at the evidence and canonical numbers, reach a compatible conclusion?" RVCE answers
"does external reality support the inputs?" — a different question (evidence-grounding, not
decision-endorsement). The Decision Consensus Policy is new deterministic code, not a second LLM
vote, and does not replace `runReconciliationCheck`, `runAntiBS`, or R3 — it sits one layer above
all of them, consuming their already-settled outputs plus JEV's independent read.
