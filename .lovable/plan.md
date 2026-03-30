

# Integrate 97K Benchmark Master Dataset into Quantis Engine

## What This Is

The Excel file contains **97,500+ benchmark data points** across 6 sheets, covering 46 sector niches, 15 geographies, 5 company stages, and 5 size buckets. This plan makes it the **primary source of truth** for all Quantis financial analysis, replacing the current hardcoded 120-benchmark embedded database.

## Current State

- **`src/lib/benchmark-calibrator.ts`**: 120 hardcoded benchmarks (10 industries x 12 params), flat structure, no geo/stage/size awareness
- **`supabase/functions/analyze-business/embedded-benchmarks.ts`**: ~50 embedded benchmarks with basic margins/CAC/LTV, used as fallback in edge function
- **`src/lib/geo-calibrator.ts`**: 16 US cities with rent/salary/demand multipliers — will be superseded by benchmarks_geo sheet
- **`src/services/benchmark-store.ts`**: Reads from `benchmark_store` table with geo fallback — good pattern but wrong schema for the new data
- **`supabase/functions/analyze-business/financial-engine.ts`**: Uses `IndustryBenchmarks` interface with flat fields (cogs_percent, salaries_fixed, etc.)

## Excel File Structure (Confirmed)

| Sheet | ~Rows | Columns (after 8 PK cols) |
|-------|-------|---------------------------|
| config | 52 | Sector/geo/stage/size reference tables with modifier multipliers |
| benchmarks_core | 19,500 | gm_margin_p25/p50/p75, op_margin_p50, ebitda_margin_p50, revenue_growth_yoy_p50, revenue_volatility, rent_pct_rev_p50, payroll_pct_rev_p50, marketing_pct_rev_p50, days_receivable, days_payable, inventory_turnover |
| benchmarks_unit_econ | 19,500 | cac_p25/p50/p75, ltv_p25/p50/p75, ltv_cac_ratio_p25/p50/p75, payback_months_p25/p50/p75, churn_monthly_p25/p50/p75, retention_annual, arpu_p50 |
| benchmarks_geo | 19,500 | col_index, wage_mult, rent_mult, consumer_spend_idx |
| benchmarks_risk | 19,500 | market_risk(1-5), regulatory_risk, operational_risk, concentration_risk, median_survival_years, failure_mode_1/2/3 |
| benchmarks_invoice | 19,500 | payment_terms_days, late_payment_rate, bad_debt_pct, safe_dscr, max_invoice_to_rev_ratio |

**Composite primary key** (all sheets): sector_level1 + sector_level2 + business_model + geo_region + country + city_tier + company_stage + size_bucket

---

## Implementation Plan (7 Steps)

### Step 1: Create 5 Database Tables via Migration

Create one table per data sheet (excluding config, which becomes edge-function-side code). Each table shares the 8-column composite PK plus sheet-specific metric columns.

```text
benchmarks_v2_core
benchmarks_v2_unit_econ
benchmarks_v2_geo
benchmarks_v2_risk
benchmarks_v2_invoice
```

Each table gets:
- Composite index on (sector_level1, sector_level2, geo_region, country, city_tier, company_stage, size_bucket)
- RLS: public read (anon SELECT), admin write via service role
- `created_at` timestamp

### Step 2: Build Ingestion Edge Function

**New file: `supabase/functions/ingest-benchmark-v2/index.ts`**

An admin-only edge function that:
1. Accepts the Excel file as a multipart upload (or accepts pre-parsed JSON batches)
2. Parses each sheet using the known column positions
3. Validates rows against expected types (percentages as decimals, dollar amounts, risk scores 1-5)
4. Upserts into the 5 tables in batches of 100
5. Returns ingestion summary: rows inserted/updated/errors per sheet
6. Logs to `data_provenance` table with source = "AIWMC_Quantis_Benchmark_Master_v2.xlsx"

Since the Excel is 97K rows and Edge Functions have a 60s timeout, the function will accept **pre-parsed JSON** (one call per sheet, ~19,500 rows per call). A local script parses the Excel into 5 JSON files first.

### Step 3: Create the Benchmark Engine API

**New file: `supabase/functions/analyze-business/benchmark-engine-v2.ts`**

This is the core API module used by the DFE. It provides 5 functions:

```typescript
interface BenchmarkQuery {
  sector_level1: string;
  sector_level2?: string;
  business_model?: string;
  geo_region?: string;
  country?: string;
  city_tier?: string;
  company_stage?: string;
  size_bucket?: string;
}

// Returns: margins, cost structure, working capital
getCoreBenchmarks(query: BenchmarkQuery): Promise<CoreBenchmarkResult>

// Returns: CAC/LTV/payback/churn distributions (p25/p50/p75)
getUnitEconBenchmarks(query: BenchmarkQuery): Promise<UnitEconBenchmarkResult>

// Returns: wage/rent/cost multipliers
getGeoAdjustments(query: BenchmarkQuery): Promise<GeoBenchmarkResult>

// Returns: risk scores (1-5) + failure modes + median survival
getRiskProfile(query: BenchmarkQuery): Promise<RiskBenchmarkResult>

// Returns: invoice terms, late payment rate, DSCR, max invoice ratio
getInvoiceBenchmarks(query: BenchmarkQuery): Promise<InvoiceBenchmarkResult>
```

**Hierarchical fallback logic** (most specific to least):
1. Exact match on all 8 keys
2. Drop `size_bucket` (use any)
3. Drop `company_stage` + `size_bucket`
4. Drop `city_tier` (country-level)
5. Drop `country` (region-level)
6. Sector-level1 only (broadest fallback)

Each result includes a `match_quality` field: "exact" | "partial" | "sector_fallback" for transparency in reports.

### Step 4: Wire Into the DFE (Financial Engine)

**Modified file: `supabase/functions/analyze-business/financial-engine.ts`**

Update the `IndustryBenchmarks` interface and the engine's calculation pipeline:

1. **Extend `IndustryBenchmarks`** to include the new v2 fields (p25/p50/p75 distributions, risk scores, invoice metrics) while maintaining backward compatibility with existing flat fields
2. **Input reconciliation**: For each user input (margin, CAC, churn, rent%, payroll%, marketing%), compute z-score against benchmark p25/p50/p75 and label as "within_band" / "optimistic" / "extreme"
3. **Scenario generation**: Use p25 for pessimistic, p50 for base, p75 for optimistic scenarios instead of arbitrary +/- offsets
4. **Invoice capacity check**: New calculation using `safe_dscr` and `max_invoice_to_rev_ratio` from benchmarks_invoice
5. **Risk composite score**: Combine benchmark risk scores (market/regulatory/operational/concentration) with model outputs (burn rate, runway)

### Step 5: Expose BenchmarkSummaryForCase to the PRE (Narrator)

**Modified file: `supabase/functions/analyze-business/narrator-prompt.ts`**

Define and populate `BenchmarkSummaryForCase` that gets injected into the LLM context:

```typescript
type BenchmarkSummaryForCase = {
  margins: { gm_p25, gm_p50, gm_p75, op_margin_p50, user_percentile }
  unit_econ: { cac_p25, cac_p50, cac_p75, ltv_p50, ltv_cac_ratio_p50, user_cac_percentile }
  geo_adjustments: { col_index, wage_mult, rent_mult, spend_idx }
  risk_profile: { market_risk, regulatory_risk, operational_risk, concentration_risk, median_survival_years, top_failure_modes: string[] }
  invoice_profile: { payment_terms, late_payment_rate, bad_debt_pct, safe_dscr, max_inv_rev_ratio }
  match_quality: string
  sector_label: string
  geo_label: string
}
```

The narrator prompt will include this as structured data, allowing it to write things like: "Your planned CAC of $120 sits at the 72nd percentile for B2B SMB SaaS in US Tier-1 cities at early stage (benchmark range: $85-$190)."

### Step 6: Update Client-Side Benchmark Calibrator

**Modified file: `src/lib/benchmark-calibrator.ts`**

- Keep `BENCHMARK_DATABASE` as a local fallback for offline/fast path
- Add new function `fetchV2Benchmarks(query)` that calls the engine via Supabase RPC or the analyze-business function
- Update `validateInput()` to use p25/p50/p75 from v2 data when available
- Update `autofillFromBenchmarks()` to use v2 p50 values

**Modified file: `src/lib/geo-calibrator.ts`**

- Replace hardcoded `GEO_COEFFICIENTS` with data from `benchmarks_v2_geo` table
- Keep hardcoded data as fallback if DB query fails

### Step 7: Seed Data via Script + Edge Function

Since 97K rows cannot be loaded in one Edge Function call:
1. Parse the Excel locally into 5 JSON files (one per sheet)
2. Call `ingest-benchmark-v2` edge function 5 times (one per sheet), each with ~19,500 rows in batches
3. Verify row counts match expected totals
4. Link to `data_provenance` with source metadata

---

## Files Created

| File | Purpose |
|------|---------|
| `supabase/functions/ingest-benchmark-v2/index.ts` | Admin ingestion endpoint |
| `supabase/functions/analyze-business/benchmark-engine-v2.ts` | Core Benchmark Engine API (5 query functions + fallback) |

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/analyze-business/financial-engine.ts` | Extended IndustryBenchmarks, input reconciliation, scenario gen, invoice capacity, risk composite |
| `supabase/functions/analyze-business/narrator-prompt.ts` | BenchmarkSummaryForCase injection into LLM context |
| `supabase/functions/analyze-business/index.ts` | Wire benchmark-engine-v2 into the analysis pipeline |
| `src/lib/benchmark-calibrator.ts` | Add fetchV2Benchmarks(), update validation to use distributions |
| `src/lib/geo-calibrator.ts` | Replace hardcoded geo data with DB-backed lookup + fallback |

## Database Migration

5 new tables with composite indexes and public read RLS. No changes to existing tables.

## Implementation Order

1. Database migration (5 tables)
2. Ingest edge function + run data load
3. Benchmark Engine API module
4. Wire into DFE (financial-engine.ts)
5. Wire into PRE (narrator-prompt.ts)
6. Update client-side calibrator + geo
7. Verify end-to-end with a test analysis

