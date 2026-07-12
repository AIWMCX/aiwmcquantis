# Wave 1 — Contribution Margin & CVP Formula Contracts

Status: DESIGN ONLY — no production code implements these yet.
Owner: AIWMC LLC · Drafted: 2026-07-12 · Next review: on Wave 1 kickoff

Per the second 2026-07-12 CTO-verdict document: this is the "single next
implementation action" once P0 report/formula integrity is closed (it now
is — see today's commits through `1e6bbdde`). Contribution margin and CVP
are admitted first among the new Decision & Financial Diagnostics Layer
because they directly support break-even, CAC payback, and cost
classification — all of which the existing engine currently conflates.

One correction already caught and applied: an early reference image showed
`Break-even units = Fixed costs + Contribution margin`, which is wrong.
The correct formula (`FixedCosts / ContributionPerUnit`) is what's
contracted below.

Every formula follows the fixed template from the audit + a
denominator-policy line, since zero/negative denominators are the most
common source of the sentinel-leak class of bug found and fixed today.

---

## Prerequisite — cost classification (blocks everything below)

Every cost line the engine already computes (`cogs`, `salaries`, `rent`,
`utilities`, `marketing`, `other`) must be tagged as exactly one of:
`fixed | variable | step_fixed | semi_variable | one_time | financing | non_cash`.

**Today's engine does not do this** — `calc.expenses.*` has no
classification at all; `cogs` and `marketing` are treated as variable and
everything else as fixed only by convention in the scenarios{} block, not
as an explicit, typed property anyone can query. This contract requires
that classification exist as real, typed data before contribution-per-unit
can be trusted — otherwise "contribution margin" would just be gross
margin renamed, which contradicts the whole point of admitting this metric
family.

---

## Metric 1 — Contribution Per Unit / Total Contribution / Contribution-Margin Ratio

- **Metric ID:** `contribution_margin.v1`
- **Business question:** How much does each additional unit of revenue actually contribute toward covering fixed costs, before any fixed-cost allocation?
- **Applicable archetypes:** all archetypes with a defined unit of sale (SaaS seat/customer, retail order, restaurant cover, consulting billable hour). Not meaningful without a per-unit price and per-unit variable cost.
- **Definition:** Price minus variable cost per unit; at the portfolio level, revenue minus total variable costs.
- **Input variables:** `pricePerUnit: DecimalString`, `variableCostPerUnit: DecimalString`, `revenue: DecimalString`, `totalVariableCosts: DecimalString` (= Σ of every cost line classified `variable` or `step_fixed`-triggered-variable-portion).
- **Input precedence:** USER_VERIFIED per-unit pricing/cost > SOURCE_OBSERVED (extracted from user's own cost breakdown) > BENCHMARK_DERIVED (sector-typical variable-cost ratio, must be flagged MODELED).
- **Unit:** USD/unit (per-unit); USD (total); ratio (margin ratio, 0.0–1.0). **Currency:** must match `financial_analysis` currency. **Frequency:** per the same unit period the revenue is measured in (monthly for SaaS, per-order for retail, aggregated to monthly for reporting).
- **Formula:**
  ```
  ContributionPerUnit = PricePerUnit - VariableCostPerUnit
  TotalContribution = Revenue - TotalVariableCosts
  ContributionMarginRatio = TotalContribution / Revenue   [Revenue > 0]
  ```
- **Timing convention:** evaluated per model-month, same grid as the existing engine.
- **Invalid states:** `VariableCostPerUnit > PricePerUnit` when the business model doesn't support loss-leader units → `WARN` (not silently allowed to produce a negative contribution without surfacing it); negative revenue or negative variable costs → `INVALID_INPUTS`.
- **Unavailable states:** revenue == 0 → `status: NOT_MEANINGFUL`, reasonCode `ZERO_REVENUE_DENOMINATOR` (never divide by zero, never return `999`/`Infinity`/`NaN`).
- **Fallback policy:** if per-unit price/cost aren't separable (e.g. bundled pricing), fall back to the portfolio-level ratio only, and disclose that per-unit figures are unavailable — do not fabricate a per-unit split.
- **Benchmark compatibility:** `ContributionMarginRatio` is benchmarkable against sector norms; `ContributionPerUnit` in absolute dollars is not (price levels vary too much across comparably-classified businesses to be a fair comparison).
- **Reconciliation identities:** `TotalContribution == Σ_units ContributionPerUnit_i` when a real per-unit breakdown exists (multi-tier case, see Metric 4). `GrossProfit >= TotalContribution` always (gross profit nets out only COGS; contribution nets out all variable costs, which is COGS plus variable OPEX like marketing-per-acquisition) — a BLOCK-level reconciliation check if violated, since it would mean variable costs were misclassified as larger than COGS+variable-OPEX allows.
- **Capacity constraints:** none directly: capacity affects volume, not per-unit contribution.
- **Sensitivity drivers:** price, variable cost per unit, cost-classification changes (a cost reclassified from fixed to variable changes this metric without any real economic change — must be visible in the revision log per Metric 8 below).
- **Golden cases:** (a) simple SaaS, single tier, `ContributionPerUnit` matches hand-calc; (b) revenue == 0 → `NOT_MEANINGFUL`, not a crash or a 999; (c) variable cost > price (a genuine loss-leader case) → `WARN`, value still computed (negative), not hidden.
- **Property tests:** `ContributionMarginRatio` always in `[-∞, 1]` (never > 100% — that would mean negative variable costs, an invalid state); `TotalContribution <= Revenue` always when variable costs are non-negative.
- **Mutation tests:** swap `Revenue - TotalVariableCosts` for `Revenue - TotalExpenses` (must fail the reconciliation identity — this is exactly "gross margin renamed," the failure mode this contract exists to prevent).
- **Report wording:** "Contribution margin: $X/unit (Y% of revenue) — the amount each additional unit contributes toward fixed costs before fixed-cost allocation." Never label this "profit margin."
- **Formula version:** `v1` (2026-07-12, not yet implemented).

---

## Metric 2 — Break-Even (Units, Revenue, Target-Profit)

- **Metric ID:** `breakeven.cvp.v1`
- **Business question:** How many units (or how much revenue) must be sold before fixed costs are fully covered — and what's required to hit a specific target profit?
- **Applicable archetypes:** same as Metric 1; requires Metric 1 to be computed first (hard dependency).
- **Definition:** The unit volume (or revenue) at which total contribution exactly equals fixed costs (zero operating profit), and the volume required to also clear a stated target profit.
- **Input variables:** `FixedCosts: DecimalString` (Σ of cost lines classified `fixed` + the fixed portion of `step_fixed`), `ContributionPerUnit`, `ContributionMarginRatio` (both from Metric 1), `TargetOperatingProfit?: DecimalString`.
- **Input precedence:** inherits Metric 1's.
- **Unit:** units (break-even units); USD (break-even revenue). **Frequency:** monthly, consistent with Metric 1.
- **Formula:**
  ```
  BreakEvenUnits = FixedCosts / ContributionPerUnit        [ContributionPerUnit > 0]
  BreakEvenRevenue = FixedCosts / ContributionMarginRatio   [ContributionMarginRatio > 0]
  TargetProfitUnits = (FixedCosts + TargetOperatingProfit) / ContributionPerUnit
  ```
  (Corrected from the reference image's `FixedCosts + ContributionMargin`, which is dimensionally wrong — adding a per-unit dollar figure to a total-dollar figure.)
- **Timing convention:** a steady-state calculation at a given month's cost/price structure — not itself a cumulative/ramp calculation (that's what the existing `paybackMonths` ramp model is for; break-even and payback are different questions and must not be conflated, matching the audit's own explicit warning).
- **Invalid states:** `ContributionPerUnit <= 0` → cannot break even at any volume at the current price/cost structure → `status: NOT_ACHIEVABLE`, reasonCode `NON_POSITIVE_CONTRIBUTION_PER_UNIT` (a real, important, typed answer — not a crash, not `Infinity`).
- **Unavailable states:** `FixedCosts` not classified/unavailable → `INSUFFICIENT_INPUTS`.
- **Fallback policy:** none — this metric either computes cleanly from Metric 1's outputs or returns a typed unavailable/not-achievable state.
- **Benchmark compatibility:** break-even units/revenue are business-specific (depend on the business's own fixed-cost structure) and should not be benchmarked directly; break-even AS A PERCENTAGE OF CURRENT REVENUE is benchmarkable (a sector-typical "how far above break-even" figure).
- **Reconciliation identities:** at `BreakEvenUnits`, `TotalContribution == FixedCosts` exactly (by construction) — a direct algebraic identity, useful as a unit test more than a runtime check.
- **Capacity constraints:** `BreakEvenUnits` must be checked against `deliveryCapacity`'s `MaximumClients_t` (Wave 1's other contract) — if break-even volume exceeds physical capacity, the business cannot break even even at full demand, a materially different and more severe finding than "break-even is far away."
- **Sensitivity drivers:** fixed-cost level, contribution per unit (therefore price and variable cost), capacity ceiling.
- **Golden cases:** (a) standard case, hand-computed; (b) `ContributionPerUnit <= 0` → `NOT_ACHIEVABLE`; (c) break-even volume exceeds capacity → flagged distinctly from "far from break-even."
- **Property tests:** `BreakEvenRevenue == BreakEvenUnits × PricePerUnit` (internal consistency between the two break-even expressions); increasing fixed costs cannot decrease break-even volume; increasing contribution per unit cannot increase break-even volume.
- **Mutation tests:** reintroduce the fixed-costs-plus-contribution-margin error (must fail unit tests); swap `>` for `>=` on the contribution-per-unit guard (should not change behavior at the exact boundary but must not silently pass through a zero denominator).
- **Report wording:** "Break-even: N units/month ($X revenue) — currently at M units, N% below/above break-even." If capacity-constrained: "Break-even volume (N units) exceeds current delivery capacity (M units) — this business cannot reach break-even without expanding capacity first."
- **Formula version:** `v1` (2026-07-12, not yet implemented).

---

## Metric 3 — Margin of Safety & Degree of Operating Leverage

- **Metric ID:** `cvp_risk.v1`
- **Business question:** How far above break-even is the business currently operating, and how sensitive is operating profit to a change in sales volume?
- **Applicable archetypes:** same as Metrics 1-2.
- **Definition:** Margin of safety is the cushion between current/expected sales and break-even sales. Operating leverage is the ratio of operating-income sensitivity to sales-volume sensitivity.
- **Input variables:** `ExpectedSales: DecimalString`, `BreakEvenSales` (Metric 2), `OperatingIncome: DecimalString`, `TotalContribution` (Metric 1).
- **Formula:**
  ```
  MarginOfSafetyAmount = ExpectedSales - BreakEvenSales
  MarginOfSafetyPct = MarginOfSafetyAmount / ExpectedSales      [ExpectedSales > 0]
  DegreeOfOperatingLeverage = TotalContribution / OperatingIncome   [OperatingIncome != 0]
  ```
- **Invalid states:** `ExpectedSales < 0` → `INVALID_INPUTS`.
- **Unavailable states:** `OperatingIncome` at or very near zero → DOL is mathematically unstable (approaches ±∞ as operating income approaches zero from either side) → `status: NOT_MEANINGFUL`, reasonCode `OPERATING_INCOME_NEAR_ZERO`, with an explicit numeric guard band (e.g. `|OperatingIncome| < 0.5% of Revenue` triggers this), never a raw huge or infinite number.
- **Fallback policy:** none.
- **Reconciliation identities:** `MarginOfSafetyPct` and `BreakEvenUnits` (Metric 2) must move consistently — if break-even volume rises, margin of safety must fall for constant expected sales; a divergence is a BLOCK-level bug signal.
- **Sensitivity drivers:** proximity to break-even (the closer to break-even, the more unstable DOL becomes — this must be surfaced as a risk flag, not just a number).
- **Golden cases:** (a) healthy business well above break-even, stable DOL; (b) business operating very close to break-even → `NOT_MEANINGFUL` DOL, not a wild number.
- **Property tests:** `MarginOfSafetyPct` is always < 100% when `ExpectedSales > 0` and `BreakEvenSales > 0`; DOL's sign matches the sign of `OperatingIncome`.
- **Report wording:** "Margin of safety: N% above break-even. Operating leverage: a 1% change in sales moves operating income by ~X%" — with an explicit caveat near the `NOT_MEANINGFUL` boundary rather than a misleadingly precise multiple.

---

## Metric 4 — Multi-Product / Multi-Tier Weighted Contribution Margin

- **Metric ID:** `contribution_margin.weighted.v1`
- **Business question:** When a business sells more than one product/tier, what is the blended contribution margin, and how sensitive is break-even to a mix shift?
- **Depends on:** Wave 1's `pricingTiers`/`tierMix` contract (already drafted) + Metric 1 above, applied per tier.
- **Formula:**
  ```
  WeightedContributionPerUnit = Σ_i TierMix_i × ContributionPerUnit_i
  ```
- **Invalid states:** `Σ TierMix_i != 100%` → inherits Metric 1's (the pricing-tiers contract) `INVALID_INPUTS` state; do not compute a weighted average against an invalid mix.
- **Reconciliation identities:** `WeightedContributionPerUnit` must fall within `[min(ContributionPerUnit_i), max(ContributionPerUnit_i)]` — a weighted average can never exceed its extremes; violation is a BLOCK-level arithmetic bug.
- **Report wording:** explicitly disclose that break-even changes if tier mix changes — "Break-even assumes the current tier mix (X% Tier A / Y% Tier B). A shift toward [higher/lower]-margin tiers would [raise/lower] break-even volume."

---

## Implementation order within this contract

1. Cost classification (prerequisite, blocks everything — real, typed data, not convention).
2. Metric 1 (contribution margin) — single-tier case first, matching today's engine's actual single-blended-price default.
3. Metric 2 (break-even) — depends on Metric 1.
4. Metric 3 (margin of safety / DOL) — depends on Metric 2.
5. Metric 4 (weighted/multi-tier) — depends on the separately-drafted `pricingTiers` contract plus Metrics 1-3, only once multi-tier support itself ships.

Every metric ships behind a feature flag per the audit's own instruction — visible in reports only after unit, property, mutation, golden-case, and PDF-artifact tests all pass, matching exactly how today's P0 fixes were verified before being surfaced.
