# Wave 3 — Leverage / Financing Ratios (Formula Contract)

Handbook §19 wave-plan. Companion to Wave 1 (CVP) and Wave 2 (profitability margins).

## Scope

Six standard leverage / financing metrics:

1. Debt-to-Equity (D/E)
2. Debt-to-Assets
3. Debt-to-Capital
4. Debt-to-EBITDA
5. Interest Coverage Ratio (EBIT / Interest Expense)
6. Debt Service Coverage Ratio (DSCR = NOI / Total Debt Service)

## What the engine collects today

Reviewed the `analyze-business` input surface end-to-end. The engine collects:

- Revenue, unit price, unit variable cost, monthly fixed costs, one-time
  `startupInvestment`, monthly marketing spend, churn rate, target CAC,
  gross-margin assumptions, and archetype metadata.

The engine does **not** collect any of:

- Total interest-bearing debt outstanding (long-term or short-term)
- Interest expense (periodic)
- Scheduled principal repayments (for DSCR)
- Separate equity value (funded equity vs. retained earnings)
- Total assets (a balance sheet does not exist in the input schema —
  `startupInvestment` is a single lump used as an initial cash outflow,
  not a maintained asset base)
- EBITDA as a separately-tracked metric (the engine tracks `netIncome`
  and treats it as ≈ operating income; there is no D&A layer, no
  interest-and-tax add-back)

## Verdict per metric

Because none of the six formulas can be honestly computed from data the
engine currently collects, **every metric in this wave types as
`INSUFFICIENT_INPUTS`** with a specific `reasonCode` explaining exactly
which input is missing. This follows the CTO-verdict rule from the
initial 22-image audit: *"typed unavailable states over fabricated
proxies; never invent a denominator to fill a slot."*

| Metric | Status | reasonCode |
| --- | --- | --- |
| Debt-to-Equity | INSUFFICIENT_INPUTS | NO_DEBT_SCHEDULE_COLLECTED |
| Debt-to-Assets | INSUFFICIENT_INPUTS | NO_BALANCE_SHEET_COLLECTED |
| Debt-to-Capital | INSUFFICIENT_INPUTS | NO_DEBT_SCHEDULE_COLLECTED |
| Debt-to-EBITDA | INSUFFICIENT_INPUTS | NO_DEBT_SCHEDULE_COLLECTED |
| Interest Coverage | INSUFFICIENT_INPUTS | NO_INTEREST_EXPENSE_COLLECTED |
| DSCR | INSUFFICIENT_INPUTS | NO_DEBT_SERVICE_COLLECTED |

## Why ship a wave that computes nothing

Three concrete production benefits:

1. **Prevention of silent fabrication.** By reserving typed slots on the
   API payload (`financial_analysis.leverage_ratios`), any future
   developer who tries to inject a made-up leverage number into the
   report has to explicitly override the typed unavailable state — the
   pre-commit sentinel scan and integrity gate see the change.
2. **Honest UI copy path.** The report can now truthfully say
   "Leverage ratios not applicable — no debt / interest inputs collected"
   instead of silently omitting the section (which reads as an oversight
   rather than a deliberate scope decision).
3. **Documented resume point.** When the input schema gains debt +
   interest fields, the calculator is the single place to add real logic,
   with the reason codes serving as the checklist of inputs to collect.

## Applicability

This wave applies to **all business archetypes**. There are no archetype
combinations where these six ratios become computable from current inputs.

## Invalid / unavailable states

Only two:

- `INSUFFICIENT_INPUTS` — the default for every metric today.
- `INVALID_INPUTS` — reserved for future use when debt inputs land and
  the calculator receives a non-finite value.

Never `VALUE` today. Never a sentinel (`999`, `Infinity`, `NaN`).
Never a fabricated proxy (e.g. `startupInvestment` treated as "assets"
would produce a 0 D/E ratio that reads as "no leverage" — the wrong
signal — which is the exact class of bug this wave prevents).

## Reconciliation identities (for the future, when values exist)

- `debtToCapital = debt / (debt + equity)` must equal
  `debt / (debt + equity)` — the identity is tautological; the check is
  that all three of `debt`, `equity`, `capital` come from the same
  balance snapshot.
- `debtToEbitda × interestCoverage` has no reconciliation constraint
  (EBITDA and interest expense are independent inputs).

## Golden cases (deferred)

Golden cases are documented as scaffolding but not asserted today —
none of them can produce a `VALUE` result. When inputs land, add:

- Zero-debt company: all ratios except `debtToEbitda` should be `0`
  or `NOT_MEANINGFUL`; `interestCoverage` becomes `NOT_MEANINGFUL/
  ZERO_INTEREST_EXPENSE_DENOMINATOR`.
- Negative EBITDA + positive debt: `debtToEbitda` becomes
  `NOT_MEANINGFUL/NEGATIVE_EBITDA_DENOMINATOR`.
- DSCR = 1.0 exactly (breakeven): should compute as `1.0`, not floor
  to a benchmark minimum.

## Report wording (when a metric has `INSUFFICIENT_INPUTS`)

Never render a numeric card. Optionally render a small disclosure:
"Leverage analysis: not yet collected in this engine — leverage
ratios (D/E, DSCR, interest coverage) will appear here when debt and
interest-expense inputs are added to the analysis form."

## Version + owner

- Formula version: `leverage_ratios.v1`
- Owner: Financial-Diagnostics working group
- Next review: on the first PR that adds debt-schedule inputs to the
  form — that PR must also flip the reason codes from
  `INSUFFICIENT_INPUTS` to real `VALUE` computations.

## Property tests

Applied today:

- Every leverage metric must have `status = 'INSUFFICIENT_INPUTS'` and
  `value = null` regardless of caller inputs.
- The JSON output must never contain the string tokens `999`,
  `Infinity`, or `NaN`.
- The `formulaId` is stable at `leverage_ratios.v1`.

## Files

- `docs/WAVE3_LEVERAGE_RATIOS_FORMULA_CONTRACT_2026-07-12.md` (this file)
- `src/financial/leverage-ratios.ts`
- `supabase/functions/analyze-business/leverage-ratios.ts` (Deno port)
- `src/__tests__/leverage-ratios.test.ts`
- Wired into `financial-calculator.ts` and `index.ts`
