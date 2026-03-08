

# Phase 11 — Bottom-Up Financial Model Engine

## Overview

Create a new client-side bottom-up financial engine (`src/lib/financial-engine.ts`) that builds projections from first principles: customers × price × retention → revenue, minus itemized costs. This complements the server-side deterministic engine in `supabase/functions/analyze-business/financial-engine.ts`.

## Implementation

### File 1: `src/lib/financial-engine.ts` (New)

**BottomUpEngine namespace** with all arithmetic via `QuantisMath` from `src/lib/quantis-math.ts`.

**A) `calculateUnitEconomics(params: UnitEconomicsParams): UnitEconomicsResult`**
- ARPU = avgTicketSize × (1 + upsellRevenuePct)
- marginPerCustomer = ARPU × grossMarginPct
- lifetimeMonths = 1 / churnRateMonthly
- LTV = marginPerCustomer × lifetimeMonths
- LTV NPV = discounted LTV using monthly discount rate
- LTV:CAC ratio + health label (excellent >3x, good 2–3x, marginal 1–2x, poor <1x)
- CAC payback = CAC / marginPerCustomer
- Benchmark comparison ranges from FormulaRegistry

**B) `generate3YearPL(params: FinancialModelParams): PLStatement[]`**
- 36-month loop building `PLStatement` per month
- Growth: newCustomers = activeCustomers × growthRateMoM, capped at marketSaturationPct × addressableMarket
- Churn: churnedCustomers = activeCustomers × churnRateMonthly
- Revenue: activeCustomers × avgTicketSize × (1 + upsellPct) minus discounts/refunds
- COGS: netRevenue × cogsPct
- OpEx itemized: rent, salaries (geo-calibrated via `applyGeoCalibration`), marketing, software, other
- EBITDA, net income, margins calculated per month
- Each row has `reconciled` flag

**C) `generateCashFlow(plStatements, capitalParams): CashFlowStatement[]`**
- Derives operating cash flow from net income
- Applies capex schedule, loan repayment, owner draws, external funding
- Tracks cumulativeCash (starting from -initialInvestment + any funding)
- cashRunwayMonths = cumulativeCash / avg monthly burn (trailing 3mo)
- Sets breakEvenReached when cumulativeCash first turns positive after being negative
- Reconciliation: if operatingCashFlow diverges from netIncome by >$1, flags reconciled=false

**D) Helper exports:**
- `findBreakEvenMonth(cashFlows)` — first month where cumulativeCash ≥ 0
- `calculateCashRunway(cashFlows, currentMonth)` — months of cash remaining
- `calculateROI(cashFlows, initialInvestment)` — (totalCashFlow - investment) / investment
- `calculatePaybackPeriod(cashFlows)` — month where cumulative operating CF ≥ initial investment

### Interfaces

All interfaces (`UnitEconomicsParams`, `UnitEconomicsResult`, `FinancialModelParams`, `PLStatement`, `CapitalParams`, `CashFlowStatement`) defined as specified in the prompt, exported from the file.

`FinancialModelParams` combines unit economics params + growth/market params + geo + cost structure:
```
initialCustomers, growthRateMoM, marketSaturationPct, addressableMarket,
avgTicketSize, grossMarginPct, churnRateMonthly, upsellRevenuePct,
cogsPct, rent, salaries, marketingSpend, softwareAndTools, otherOpex,
discountRefundPct, geoSlug?, industry?
```

### Integration Notes

- Imports `QuantisMath` from `src/lib/quantis-math.ts` for all arithmetic
- Imports `applyGeoCalibration` from `src/lib/geo-calibrator.ts` for rent/salary adjustments
- No UI changes in this phase — the engine is consumed by future phases (Reconciliation Engine, Report Schema)
- No database changes needed

### Files Summary

| File | Action |
|------|--------|
| `src/lib/financial-engine.ts` | New — BottomUpEngine with P&L, cash flow, unit economics |

