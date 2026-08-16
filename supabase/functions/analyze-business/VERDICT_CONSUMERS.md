# Investment-verdict consumer inventory

FREE-NULL-VERDICT root-cause fix, 2026-08-16. Built by grepping the whole repo
for `investment_verdict`, `investmentVerdict`, `HIGH_RISK`, `MEDIUM_RISK`,
`LOW_RISK`, `PROMISING` (narrowed from a first pass on `isProfitable` /
`ltvCacRatio` / `paybackMonths`, which matched 89 files — almost all of them
unrelated financial-display code, not verdict derivation). Goal: exactly one
derivation, every other site a read-only consumer or dead code, none of them
silently deciding the same financial conclusion a second way.

## 1. Canonical derivation (the only place a verdict is decided)

| File | Role |
|---|---|
| `investment-verdict.ts` — `deriveInvestmentVerdict()` | **SOURCE OF TRUTH.** Pure function over `calculateStrictFinancials()`'s already-computed `calc` object. Classifies `verdict` + `basis` + `reasons`. Never recomputes profitability/payback/LTV:CAC itself. |
| `investment-verdict.test.ts` | 11-case test matrix against the function above (run via the standalone `vitest.investment-verdict.config.ts` — no Deno test harness exists for this directory; eslint also ignores `supabase/functions/**` entirely, confirmed by running it directly against these files). |

## 2. Live read-only consumer (the funnel point)

| File | Role |
|---|---|
| `index.ts` `transformResponse()` (~line 1786) | Calls `deriveInvestmentVerdict(calc, userInputs)` once, exposes `verdict` / `verdict_basis` / `verdict_reasons` on the API response. This is the single point both the AI-narrator path and `generateDeterministicFallbackResult()`'s quick/free path converge on before their return — one call covers both. **Superseded** the PR #33 fix that lived at this exact spot (`verdict: raw.investment_verdict ?? null`), which was real but incomplete: it only fired for the AI-narrator branch, not the actual free/anonymous "quick" path most users hit. No other `investment_verdict`/`HIGH_RISK`/etc. reference exists anywhere else in `index.ts` — confirmed by grep. |

## 3. Upstream of the canonical derivation — the AI's own raw opinion (now fully superseded, but still produced)

The AI narrator is still *prompted* to state its own qualitative verdict, and that raw guess is still parsed into `NarratorOutput.investment_verdict` — but nothing downstream in `index.ts` reads that field for the response's `verdict` anymore (confirmed: the only assignment to the response's `verdict` field is the canonical call in §2). These are documented so the AI's internal opinion doesn't get mistaken for a second live derivation:

| File | Role | Status |
|---|---|---|
| `quantis-master-prompt.ts:90` | Prompt instructions telling the LLM how to phrase its own verdict opinion (`VIABLE → PROMISING`, etc.) | Advisory prompt text only — shapes the AI's raw guess, not the canonical verdict. No action needed. |
| `narrator-prompt.ts:415` `parseNarratorResponse()` | `investment_verdict: (r.investment_verdict as ...) || 'MEDIUM_RISK'` — parses the AI's raw guess into `NarratorOutput.investment_verdict` | **Dead for the response's `verdict` field** (nothing in `index.ts` reads it anymore). Left in place because `NarratorOutput.investment_verdict` is still a schema field the AI is asked to fill, and removing the parse would just leave it `undefined` instead of a typed default — no behavior change either way for the live response, not worth the churn. |
| `narrator-prompt.ts:466` QA hook | `if (... && result.investment_verdict === 'PROMISING')` — appends a caveat sentence to `executive_summary` when the AI's own raw verdict was PROMISING but data quality was weak | **Reads the AI's raw opinion, not the canonical verdict** — and only ever *appends prose*, never mutates a verdict field. Harmless overlap with the canonical basis-downgrade rule (both react to weak-data situations), not a duplicate derivation. Flagged here, not changed: touching AI-narrator prose generation is out of scope for this fix and this hook cannot produce a numeric contradiction (it can only make the executive summary *more* cautious, never less, and never touches the `verdict`/`verdict_basis`/`verdict_reasons` fields this PR owns). |

## 4. Dead code — a second, unused, but formula-correct derivation

| File | Role | Classification |
|---|---|---|
| `narrator-prompt.ts:487` `generateFallbackNarrator()` (verdict formula at lines 497-501) | Computes its own `verdict` from `isProfitable` / `ltvCacRatio` / `paybackMonths` — same shape of formula `investment-verdict.ts` now implements canonically. | **LEGACY_RULE, confirmed dead.** Imported at `index.ts:75`, zero call sites anywhere in the repo (grep for `generateFallbackNarrator(` finds only the export and the import — no invocation). Not deleted: removing an unused exported function is a larger, unrelated cleanup and the user's mandate scoped this fix to closing FREE-NULL-VERDICT, not a dead-code sweep. Left as-is; if this function is ever wired up in the future, it must be replaced with a call into `deriveInvestmentVerdict()` rather than reintroducing this duplicate formula. |

## 5. Schema/type definitions (no logic)

| File | Role |
|---|---|
| `schemas.ts` / `_shared/schemas.ts` — `NarratorOutput.investment_verdict: 'HIGH_RISK'\|'MEDIUM_RISK'\|'LOW_RISK'\|'PROMISING'` | Type shape only. Both files declare the same union independently of `investment-verdict.ts`'s `InvestmentVerdict` type — not unified in this PR (would require changing the AI-facing schema contract, out of scope), but the union values are identical so no drift risk today. |

## 6. Unrelated (false positives from the broad first-pass grep, verified and excluded)

`src/__tests__/prompt-injection.test.ts` uses `'PROMISING'`/`'LOW_RISK'` as literal string constants inside adversarial-input test fixtures — not a reference to any verdict-deriving code. The other 82 files matched only on `isProfitable`, `ltvCacRatio`, or `paybackMonths` for unrelated financial-display purposes (charts, PDF sections, reconciliation checks, the scenario-modeling engine, etc.) — none of them independently classify a `HIGH_RISK`/`MEDIUM_RISK`/`LOW_RISK`/`PROMISING` verdict.

## Result

One canonical derivation (§1), one live consumer that writes it onto the response (§2), one upstream input that's fully superseded but harmless to leave in place (§3), one confirmed-dead duplicate formula documented so it's never revived incorrectly (§4). No second live verdict derivation exists in the codebase after this fix.
