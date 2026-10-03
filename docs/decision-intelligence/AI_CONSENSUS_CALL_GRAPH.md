# `ai-consensus` Call Graph & Disposition

Phase A reconciliation doc. Verified by direct code inspection, 2026-10-03.
`supabase/functions/ai-consensus/index.ts` (309 lines), `FUNCTION_VERSION = '1.0.0'`, deployed
ACTIVE v6601.

## What it actually does

A **generic** "ask two LLMs the same structured-output question, cross-check the numbers"
utility. Not finance-specific — takes an arbitrary `prompt` + JSON `schema` and returns whatever
the models produce, merged.

- Calls `openai/gpt-5-mini` and `google/gemini-3-flash-preview` in parallel (25s timeout each).
- `calculateConsensus()`: walks every numeric leaf key present in either output, computes
  per-field agreement `1 - |a-b| / max(|a|,|b|,1)`, flags any field with agreement < 0.7 as
  divergent, averages into a 0-100 `consensusScore` (100 if there are no comparable numeric
  fields at all — i.e. trivially "agrees" when a schema has no numbers or only one model
  returned any).
- Merge policy by `consensusScore` band: ≥90 → GPT's raw output verbatim ("full_agreement");
  70-89.99 → `weightedMerge(gpt, gemini, 0.6, 0.4)` — a **fixed-ratio linear blend**, not
  confidence- or accuracy-weighted; 50-69.99 → GPT's raw output again ("primary_wins"); <50 →
  HTTP 422 `QE-007` ("blocked"), no `finalOutput` returned at all.
- `overallConfidence` = self-reported per-model confidences (same 0.6/0.4 weights) scaled by
  `consensusScore/100`. The "confidence" each model reports is whatever it put in its own JSON
  response, not independently computed.

This is exactly the "weighted numeric merge + synthetic confidence" pattern the JEV contract
(§2) correctly identifies as incompatible with "deterministic calculations own canonical
financial numbers."

## Call sites

| Caller | Location | Purpose | Load-bearing today? | User-visible? | Numeric/financial? | Disposition |
|---|---|---|---|---|---|---|
| `qoc-orchestrate` verify stage | `supabase/functions/qoc-orchestrate/adapters.ts:156-184` | Maps `ai-consensus`'s output into QOC's `Verdict` enum as its "RVCE-flavoured" cross-check stage | **No** — `qoc-orchestrate` is itself confirmed dormant (README: "dormant — for migration"/"idle"; `src/__tests__/production-freeze.test.ts:534-537,864-866` asserts it is never invoked from `analyze-business`; zero `functions.invoke('qoc-orchestrate')` call sites anywhere) | No | Indirectly | **REMOVE_DEAD_CODE** once JEV lands (this stage disappears with the rest of the dormant QOC pipeline unless/until QOC migration is revived — not urgent, no live traffic depends on it) |
| `src/services/ai-consensus.ts` (185 lines, full client wrapper: cache, health ring buffer, typed `QE-007`/429/402 handling) | whole file | Client-side consumption wrapper for `ai-consensus` | **No** — `runConsensusAnalysis()` (line 135, the only exported entry point) has zero callers anywhere else in `src/` | No | N/A (unreachable) | **REMOVE_DEAD_CODE** |
| `src/services/quantis-logger.ts:73-74` (`logAIConsensus()`) | — | Enqueues an `'ai_consensus'` event into `analysis_logs` | **No** — zero callers of `logAIConsensus` or of the `quantisLogger` singleton itself anywhere in `src/` | No | N/A (unreachable) | **REMOVE_DEAD_CODE** |
| `src/services/quantis-safety-agent.ts:94-95` (`QuantisSafetyAgent.evaluateAnalysis`) | — | Checks `result.cross_validation?.consensus_score` | **No** — `QuantisSafetyAgent` has zero callers in `src/`. Also factually broken even if called: the real field the backend emits is `cross_validation.agreement_score` (from the unrelated **deterministic** `engine-cross-validator.ts`), not `consensus_score` — this code confuses the AI-consensus concept with a different, deterministic cross-validation concept that was never wired to `ai-consensus` in the first place. | No | N/A | **REMOVE_DEAD_CODE** (also factually incorrect, not just unreachable) |
| `supabase/functions/aggregate-quality-metrics/index.ts:86-100` | — | Averages `payload.consensusScore` from `analysis_logs` rows with `event_type='ai_consensus'` into a daily `avgConsensus` metric | Runs, but **always finds zero rows** (nothing writes `event_type='ai_consensus'` — see `logAIConsensus` above) → `avgConsensus` is always `null` in production today | Possibly on an admin dashboard, always empty | Vacuous | **REMOVE_DEAD_CODE** (the read side of a write path that never fires) |
| `scripts/verify-r3-enforcement.ts:32` | CI script | Explicit exemption allowlist entry for the R3-enforcement CI gate, with comment "P2-006 — to wire alongside consensus-evaluator refactor" | Tooling only | No | N/A | **Update when `ai-consensus` is deprecated** — remove the allowlist entry once the function itself is fully migrated off, or keep until then since removing the exemption without wiring R3 would just fail CI on a function nobody calls |
| `supabase/functions/admin-health-sweep/index.ts:20` | infra | Deploy-health ping list | Infra only | No | No | **KEEP_NON_NUMERIC_ONLY** until the function is actually removed — harmless |
| `.github/workflows/production-deploy.yml:434` | CI | Deployed-functions list | Infra only | No | No | Update alongside function removal/deprecation |
| README.md:110,149 | docs | Describes it as "dual-model agreement scoring" | — | — | — | Update when deprecated |

## Bottom line

**`ai-consensus` is built, deployed, and healthy — but has no live caller anywhere in the actual
request path of any real user today.** Its one non-dead caller (`qoc-orchestrate`) is itself
confirmed dormant. Every frontend reference to it is dead code with zero call sites, and one of
those dead references (`quantis-safety-agent.ts`) is also factually wrong about the response
shape it expects.

## Classification (per contract §3 taxonomy)

- **The function itself (`ai-consensus/index.ts`)**: `DEPRECATE`. Leave it deployed but mark it
  deprecated in README/docs; do not route any new JEV traffic through it or alongside it. It is
  not "replaced" in the sense of code deletion in Phase A/B — nothing calls it today, so there is
  no cutover risk — but it should not be presented as part of the active architecture going
  forward, and no new feature should add a caller to it.
- **The architectural role it was meant to fill** (a second-opinion cross-check on AI-adjacent
  output): `REPLACE_WITH_JEV`. JEV's bounded `choice`/`score`/`noul` review contract is the
  intended successor for "does an independent opinion agree with what we produced" — but JEV
  reviews *decision-readiness given evidence*, not raw financial numbers, so it is a narrower,
  better-scoped replacement, not a drop-in swap of the same interface.
- **The five dead-code call sites**: `REMOVE_DEAD_CODE`. Recommend removing them in a small,
  separate, low-risk cleanup PR (not bundled into the JEV feature work, to keep that diff
  reviewable) — flagged as a P2 item in the final report rather than done inline here, since
  Phase A is inspection-only per the contract ("no code yet except trivial inspection fixes").
