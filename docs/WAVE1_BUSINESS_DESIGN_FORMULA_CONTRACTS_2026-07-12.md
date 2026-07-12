# Wave 1 — Business Design & GTM Feasibility Layer: Formula Contracts

Status: DESIGN ONLY — no production code implements these yet.
Owner: AIWMC LLC · Drafted: 2026-07-12 · Next review: on Wave 1 kickoff

Per the 2026-07-12 CTO-verdict audit: "No formula enters production without
that contract." This document is that contract for the 3 highest-priority
Wave 1 primitives — `pricingTiers`, `tierMix`, `deliveryCapacity` — using
the fixed review template from that audit. P0 report/formula integrity
(§19 items 1-10, plus the 2026-07-12 audit's 7-item follow-up list) is
fully closed as of this document's date — this is what comes next, not a
substitute for it.

---

## Metric 1 — Tiered Revenue (`pricingTiers` + `tierMix`)

- **Metric ID:** `revenue.tiered.v1`
- **Business question:** Given N pricing tiers with different prices, billing frequencies, and expected mix, what is total monthly revenue — and how does it differ from a single-ARPA model?
- **Applicable archetypes:** subscription SaaS, retainer/professional services, any multi-tier consumer or B2B offer. Not applicable to pure usage-based/transaction models until a per-transaction variant is contracted separately.
- **Definition:** Revenue is the sum, across tiers, of active-customers-in-that-tier times that tier's price — never a single blended ARPA multiplied by total customers, because margin, churn, and support cost legitimately differ by tier.
- **Input variables:**
  - `pricingTiers: Array<{ id, name, price: DecimalString, billingFrequency: 'one_time'|'monthly'|'annual', expectedMixPct: DecimalString, deliveryHours: DecimalString, variableCost: DecimalString }>`
  - `activeCustomersTotal_t: number` (from the acquisition funnel, Wave 1 item 4)
- **Input precedence:** USER_VERIFIED tier definition > SOURCE_OBSERVED (e.g. extracted from a pricing page) > MODELED (single-tier fallback, must be flagged).
- **Unit:** USD (or the analysis's stated currency). **Currency:** must match `financial_analysis` currency exactly — no silent conversion. **Frequency:** normalized to monthly before use in any downstream monthly formula; annual/one-time tiers converted explicitly, never divided by 12 implicitly inside a display formatter.
- **Formula:**
  ```
  Σ(tierMix_i) must == 100% (validated, not assumed)
  ActiveCustomers_i,t = ActiveCustomersTotal_t × TierMix_i,t
  Revenue_t = Σ_i ActiveCustomers_i,t × NormalizedMonthlyPrice_i,t
  ```
- **Timing convention:** evaluated per model-month `t`, same monthly grid as the existing 60-month engine horizon — not a separate timeline.
- **Invalid states:** `tierMix` doesn't sum to 100% (±0.01% tolerance) → `INVALID_INPUTS`. Negative price or negative mix → `INVALID_INPUTS`.
- **Unavailable states:** zero tiers defined → `INSUFFICIENT_INPUTS`, reasonCode `NO_PRICING_TIERS_DEFINED`.
- **Fallback policy:** if the user provides only a single blended price (today's default flow), model as one implicit tier at 100% mix — never silently invent a second tier.
- **Benchmark compatibility:** each tier's price and mix can be benchmarked against sector ARPA distributions independently; the blended total should NOT be benchmarked as if it were a single-tier ARPA (a mismatched comparison).
- **Reconciliation identities:** `Σ_i ActiveCustomers_i,t == ActiveCustomersTotal_t` must hold exactly every month — a hard reconciliation check, BLOCK on failure.
- **Capacity constraints:** feeds directly into `deliveryCapacity` (Metric 3) via `deliveryHours` per tier — a tier's revenue is only real if `RequiredDeliveryHours_t <= DeliveryCapacityHours_t`.
- **Sensitivity drivers:** tier mix shift, price change per tier, churn differential by tier.
- **Golden cases:** (a) single-tier baseline (must equal today's existing engine output, zero regression); (b) 3-tier SaaS with 50/30/20 mix; (c) tier mix summing to 99.5% → must reject.
- **Property tests:** tier revenue sum always equals total revenue exactly; tierMix always sums to 100% after validation; monotonic — increasing any tier's price with fixed mix cannot decrease total revenue.
- **Mutation tests:** swap `Σ tierMix` check for `>= 99%` (should fail the "must be exact" golden case); use blended ARPA instead of per-tier calc (should fail the 3-tier golden case).
- **Report wording:** "Revenue model: N pricing tiers" with a per-tier breakdown table, never a single blended "average price" once >1 tier is defined.
- **Formula version:** `v1` (2026-07-12, not yet implemented).
- **Owner:** engineering. **Last reviewed:** 2026-07-12. **Next quarterly review:** on Wave 1 implementation, then per the standing Q4 2026 cadence.

---

## Metric 2 — Delivery Capacity Constraint (`deliveryCapacity`)

- **Metric ID:** `capacity.delivery.v1`
- **Business question:** Can the business's actual staff/hours physically serve the number of customers the revenue model implies — or is the engine forecasting more clients than the team can deliver to?
- **Applicable archetypes:** professional services, consulting, any service-delivery or capacity-constrained business (also generalizes to physical capacity — seats, appointment slots — with a relabeled `deliveryHoursPerClient` → `slotsPerClient`).
- **Definition:** The maximum number of clients that can be served in a given month given available billable hours and per-client delivery hours; served clients are the lesser of demanded and maximum, never demanded alone.
- **Input variables:** `teamFte: DecimalString`, `availableHoursPerFteMonth: DecimalString`, `targetUtilizationPct: DecimalString`, `deliveryHoursPerClient: DecimalString` (per tier, from Metric 1), `onboardingHoursPerClient: DecimalString`.
- **Input precedence:** USER_VERIFIED (founder states actual team/hours) > BENCHMARK_DERIVED (sector-typical utilization %) > MODELED (default 70% utilization, must be flagged as modeled).
- **Unit:** hours/month (intermediate), customers (final). **Currency:** n/a. **Frequency:** monthly, same grid as Metric 1.
- **Formula:**
  ```
  DeliveryCapacityHours_t = FTE_t × AvailableHoursPerFTE_t × Utilization_t
  RequiredDeliveryHours_t = Σ_i ActiveClients_i,t × (HoursPerClient_i,t + OnboardingHours_i,t × IsNewClient_i,t)
  MaximumClients_t = floor(DeliveryCapacityHours_t / WeightedHoursPerClient_t)
  ServedClients_t = min(DemandedClients_t, MaximumClients_t)
  ```
- **Timing convention:** evaluated per model-month; onboarding hours apply only in a new client's first month.
- **Invalid states:** negative FTE, utilization outside [0%, 100%], negative hours-per-client → `INVALID_INPUTS`.
- **Unavailable states:** no FTE/hours data provided at all → `INSUFFICIENT_INPUTS`; do not silently assume unlimited capacity (today's engine's implicit behavior — this is the exact gap Metric 2 closes).
- **Fallback policy:** if capacity inputs are absent, the report must explicitly disclose "delivery capacity not modeled — demand assumed fully served" rather than silently omitting the constraint.
- **Benchmark compatibility:** utilization % and hours-per-client are benchmarkable against sector norms; capacity itself (FTE × hours) is user-specific and not benchmarked.
- **Reconciliation identities:** `RequiredDeliveryHours_t <= DeliveryCapacityHours_t` whenever `ServedClients_t == DemandedClients_t` (i.e. if capacity wasn't binding, hours must actually have fit) — BLOCK on violation, since it would mean the served-client count is internally inconsistent with the capacity math.
- **Capacity constraints:** this IS the capacity constraint for other metrics (Metric 1's revenue, the acquisition funnel's `NewCustomers_t`).
- **Sensitivity drivers:** utilization %, hours-per-client, FTE count, onboarding overhead.
- **Golden cases:** (a) demand below capacity (no binding constraint, `Served == Demanded`); (b) demand exceeds capacity (constraint binds, `Served == Maximum < Demanded`, and the report must flag this as the binding constraint); (c) zero FTE provided → `INSUFFICIENT_INPUTS`, not a silent zero-capacity result.
- **Property tests:** `ServedClients_t <= MaximumClients_t` always; `ServedClients_t <= DemandedClients_t` always; increasing FTE with fixed hours/client cannot decrease `MaximumClients_t`.
- **Mutation tests:** replace `min(Demanded, Maximum)` with `Demanded` alone (must fail the capacity-exceeded golden case — this is exactly "forecasting 30 clients when the team can serve 8").
- **Report wording:** when capacity binds, state explicitly: "Capacity constraint: team can serve a maximum of N clients/month at current staffing; demand model projected M. Revenue below reflects the capacity-limited figure." Never silently substitute the capacity-limited number without saying so.
- **Formula version:** `v1` (2026-07-12, not yet implemented).
- **Owner:** engineering. **Last reviewed:** 2026-07-12. **Next quarterly review:** on Wave 1 implementation.

---

## Cross-metric note

Metrics 1 and 2 are deliberately coupled (Metric 1's `deliveryHours` per tier feeds Metric 2's `RequiredDeliveryHours`), consistent with the audit's own point that these primitives should not be built as isolated calculators — they share the same monthly grid and the same `ActiveClients` state as the existing acquisition-funnel model (Wave 1 item 4, not contracted in this document). Implementation order should respect that dependency: `pricingTiers`/`tierMix` first (Metric 1), `deliveryCapacity` second (Metric 2, consumes Metric 1's per-tier hours), acquisition funnel third.
