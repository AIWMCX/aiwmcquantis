

# Phase 12 — Reconciliation Engine

## Overview

Create `src/lib/reconciliation-engine.ts` — an automatic consistency checker that validates all financial outputs before they reach the user. Also create a `reconciliation_log` table to persist audit trails.

## Database

**New table: `reconciliation_log`**
- `id` UUID PK, `analysis_id` UUID nullable, `user_id` UUID nullable, `run_id` TEXT, `reconciled` BOOLEAN, `checks_json` JSONB, `summary` TEXT, `created_at` TIMESTAMPTZ
- RLS: authenticated users can insert/select their own rows; admins can select all

## File: `src/lib/reconciliation-engine.ts` (New)

**Interfaces:** `ReconciliationCheck` and `ReconciliationReport` as specified.

**Core export: `reconcileFinancialOutput(plStatements, cashFlows, unitEconomics)`**

Runs 4 check categories across all 36 months + cash flow + unit economics:

1. **Sum Integrity** — For each PLStatement month:
   - `cogs + grossProfit === netRevenue` (±$0.01)
   - `rent + salaries + marketing + software + other === totalOpex` (±$0.01)
   - `grossProfit - totalOpex === ebitda` (±$0.01)
   - Auto-resolve: use itemized sum, mutate the total field, log as resolved

2. **Sign Consistency** — Revenue ≥ 0, costs ≥ 0, cashRunwayMonths ≥ 0. Severity: critical, no auto-resolve.

3. **Logical Constraints** — activeCustomers ≥ 0, grossMarginPct ∈ [-1, 1], ltvCacRatio > 0. Special rules:
   - netMarginPct < -50% → flag "high loss"
   - netMarginPct > 60% in year 1 → flag "unusually high"
   - **Critical rule**: netMarginPct < -10% AND risk = "Low" → block, force "Moderate"

4. **Benchmark Boundary** — Compare metrics to p10/p90 from benchmark-store (async variant). Log as minor warnings.

**Helper export: `generateReconciliationSummary(report)`** — produces plain English summary string.

**Persistence: `saveReconciliationLog(report, analysisId?, userId?)`** — inserts into `reconciliation_log` table.

All arithmetic uses `QuantisMath`. Imports `PLStatement`, `CashFlowStatement`, `UnitEconomicsResult` from `src/lib/financial-engine.ts`.

## Files Summary

| File | Action |
|------|--------|
| `src/lib/reconciliation-engine.ts` | New — reconciliation checks + summary + persistence |
| Migration | New — `reconciliation_log` table with RLS |

