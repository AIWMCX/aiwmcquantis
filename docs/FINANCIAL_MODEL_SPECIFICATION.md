# FINANCIAL MODEL SPECIFICATION

**Status:** DRAFT SPEC — not yet fully implemented. Sections marked ✅ LIVE are verified against the current engine. Sections marked 🔲 PROPOSED are queued, MP4-gated (hard-blocked on first paying user per standing account discipline), not started as code.
**Source:** Synthesizes formula definitions from an external CTO-style technical review (2026-07-11) with what's actually verified live in `supabase/functions/analyze-business/`. Per this account's evidence-hierarchy rule, nothing below is marked ✅ LIVE without having been traced to a specific file and line tonight.

---

## 0. Why this document exists

`docs/STABILIZATION_FREEZE.md` bans new forecast metrics without a formula spec existing first. This is that spec — for the metrics the product already claims to compute, plus the ones a rigorous version of the product would need. It does not commit to building the 🔲 PROPOSED sections now; MP4 remains hard-gated on first paying user regardless of how well-specified the work is.

---

## 1. Core accounting identities — 🔲 PROPOSED (partially implicit in engine, not enforced as explicit gates)

```
GrossProfit_t = Revenue_t - COGS_t
EBITDA_t = GrossProfit_t - OperatingExpenses_t
EBIT_t = EBITDA_t - Depreciation_t - Amortization_t
EBT_t = EBIT_t - InterestExpense_t
NetIncome_t = EBT_t - Taxes_t
FCF_t = NetIncome_t + Depreciation_t + Amortization_t - CapEx_t - ΔWorkingCapital_t - DebtPrincipal_t + NewDebt_t + NewEquity_t
Cash_t = Cash_{t-1} + FCF_t
```

These identities are not currently enforced as automated reconciliation gates anywhere in the codebase (no `Gate 3`-style check found in tonight's audit). Adding them as property-based tests is 🔲 PROPOSED, MP4-gated.

---

## 2. Payback period — ✅ LIVE, verified correct

**File:** `supabase/functions/analyze-business/index.ts:1366-1399`

The live engine already implements a ramp-aware cumulative-cash-flow simulation, NOT a naive `cost ÷ profit` divisor:

```
RAMP = [0.30, 0.45, 0.60, 0.75, 0.90, 1.00]   // months 1-6 revenue ramp
fixedCostPortion = totalExpenses * 0.6
variableCostPortion = totalExpenses * 0.4

for month m = 1 to 60:
  if m <= 6:
    monthRevenue = mrr * RAMP[m-1]
    monthCosts   = fixedCostPortion + variableCostPortion * RAMP[m-1]
  else:
    growth = 1.05^(m-6)
    monthRevenue = mrr * growth
    monthCosts   = totalExpenses * 1.025^(m-6)

  cumulative += monthRevenue - monthCosts
  if cumulative >= startupInvestment:
    paybackMonths = m; break

if never reached within 60 months: paybackMonths = 999 (rendered as "N/A")
```

This is a defensible implementation of `PaybackMonth = min t : CumulativeFCF_t ≥ 0`, correctly distinct from operating break-even. The code's own comment confirms it was written specifically to fix "the '1 month payback' template artifact" — meaning a cruder version existed previously and was already replaced.

**What's NOT live**: this formula is not exposed as a standalone, independently-testable function (`QMath.paybackMonths` is referenced in `financial-engine.ts:341` and appears to be a different, simpler implementation than the inline loop in `index.ts` — these two should be reconciled to confirm they're not diverging silently). Flagging this as a real follow-up, not resolving it tonight.

**What's confirmed broken**: static example content (`src/pages/examples/exampleData.ts`) was not regenerated from this engine after it was fixed. One instance corrected 2026-07-11 (`mobile-app-startup-san-francisco`, commit `fbf3654d`). Full audit of remaining ~50 examples: 🔲 PROPOSED, not MP4-gated (this is a content-integrity task, not engine R&D — safe to do during the freeze).

---

## 3. Operating break-even vs. cash break-even vs. payback — 🔲 PROPOSED, terminology not currently distinguished

```
OperatingBreakEvenMonth = min t : EBITDA_t ≥ 0        // first profitable operating month
CashBreakEvenMonth      = min t : FCF_t ≥ 0            // first month of positive free cash flow
PaybackMonth            = min t : CumulativeFCF_t ≥ 0  // investment recovered (see §2, this one IS live)
```

Tonight's audit did not find evidence these three are currently distinguished in any user-facing copy or report field — "break-even" and "payback" risk being used interchangeably. Auditing existing report templates for this conflation: 🔲 PROPOSED, safe during freeze (content/copy work, not engine work).

---

## 4. Multi-horizon outputs (12/24/36/48/60mo) — GAP, not a formula problem

Verified tonight (`src/config/tiers.ts`): only `projectionMonths: 36` (Plus) and `projectionMonths: 60` (Pro) exist. Free has `0`. **12, 24, and 48-month horizons don't exist as selectable outputs anywhere.**

Important nuance: the underlying simulation loop already runs monthly out to 60 months (§2's loop is `for m = 1 to 60`), so the *computation* isn't the blocker — exposing intermediate horizons is a reporting/aggregation change, not a new engine capability:

```
CumulativeRevenue_H   = Σ(t=1 to H) Revenue_t
CumulativeNetIncome_H = Σ(t=1 to H) NetIncome_t
CumulativeFCF_H       = -I_0 + Σ(t=1 to H) FCF_t
ROI_H                 = CumulativeFCF_H / I_0
```

for `H ∈ {12, 24, 36, 48, 60}`, reading from the same monthly series already computed internally. Building this: 🔲 PROPOSED. Not urgent tonight — flagged in `MP-ACCURACY-AUDIT-AND-TODO-v1.0.md` as a Month 2-3 item, not MP4-gated (it's exposing existing computation, not new modeling).

---

## 5. Archetype-specific revenue formulas — 🔲 PROPOSED, MP4-gated

Recurring subscription, capacity-based service, professional services, retail/e-commerce, restaurant, marketplace — each needs its own driver-based revenue formula (subscriber cohort math, capacity constraints, billable-hours-with-collection-lag, GMV vs. take-rate, etc.) rather than one universal formula. This is real, valuable engine work. It is also unambiguously MP4 territory (technical R&D on the deterministic engine itself) — hard-gated on first paying user. Not started. The full formula set from the external review is preserved as reference material for whoever picks this up post-gate, available in the original pasted document, not duplicated here to avoid two sources of truth for unbuilt formulas.

---

## 6. Monte Carlo distribution/correlation modeling — 🔲 PROPOSED, MP4-gated

Current state (verified via `src/config/canonical-facts.ts`): `MONTE_CARLO_ITERATIONS = 1_000`, confirmed as a real, distinct constant from the benchmark corpus count. Whether the 1,000 iterations use archetype-appropriate distributions (beta, lognormal, Poisson, empirical bootstrap vs. defaulting everything to normal) and whether variables are correlated (vs. independently sampled) was NOT verified tonight — would require reading the actual Monte Carlo implementation, not done in this pass. This is real, valuable work and is MP4-gated regardless of the answer.

---

## 7. Ingestion architecture (source registry, immutable raw layer, normalized benchmarks, transformations, analysis snapshots) — 🔲 PROPOSED, MP4-gated

The six-layer architecture from the external review (source registry → raw immutable ingestion → normalized benchmarks → transformations → analysis snapshots → presentation) is sound, standard data-engineering practice. Verified tonight: no evidence of this structure existing in `supabase/functions/analyze-business/benchmark-engine-v2.ts` or `benchmark-records.ts` — those read a static, pre-loaded corpus (percentile bands per sector), with no visible provenance/versioning metadata per-row. Building the full registry is real, substantial, MP4-gated work — not started.

---

## 8. Validation gates (accounting reconciliation, capacity feasibility, payback integrity, source lineage, etc.) — 🔲 PROPOSED, partially achievable during freeze

Most of the 12 proposed gates require the analysis-snapshot infrastructure (§7) to be meaningful — MP4-gated. Two exceptions that don't require new infrastructure and ARE safe during the freeze:
- **Payback integrity gate** — a script that regenerates every static example's payback figure from its stored cost/profit/revenue inputs and flags mismatches. This is the exact check that found tonight's bug; formalizing it as a repeatable script (not a one-off manual scan) is 🔲 PROPOSED, freeze-safe, recommended as the next concrete step.
- **Claim-consistency gate** — a script that greps all public-facing components for numeric claims (percentages, dollar figures, time claims) not sourced from `canonical-facts.ts`, similar to the existing `verify-env-refs.ts`-style CI guards. 🔲 PROPOSED, freeze-safe.

---
*This document will be extended as MP4 gates lift. Until then, it is the single reference for "what formula does Quantis actually claim to use," replacing scattered formula mentions across marketing copy, prior audits, and this session's pasted external reviews.*
