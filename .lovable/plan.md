

# Open Financial Data Integration for AIWMC Quantis — Implementation Plan

## Current State
- **39 benchmarks** in `industry_benchmarks` table, all sourced from `kerry_dataset`
- Embedded fallback benchmarks in edge function cover ~50 industries
- `benchmark-calibrator.ts` has percentile distributions (p10–p90) for 10 sectors × 12 parameters
- No `data_provenance` table exists yet
- No external dataset ingestion pipeline

## What Needs to Be Built

### 1. Create `data_provenance` table (migration)
Tracks every external dataset's license, allowed uses, and freshness:

```sql
CREATE TABLE public.data_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text,
  license_type text NOT NULL,        -- 'public_domain', 'cc_by', 'cc0', 'government_open', 'academic'
  allowed_uses text[] DEFAULT '{}',   -- ['internal_training', 'commercial_analytics', 'benchmark_derivation']
  restricted_uses text[] DEFAULT '{}', -- ['raw_redistribution']
  dataset_type text NOT NULL,         -- 'financial_statements', 'sme_survey', 'industry_benchmark', 'case_study'
  coverage_description text,
  record_count integer,
  date_range_start date,
  date_range_end date,
  last_ingested_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

RLS: admin-only write, authenticated read.

### 2. Create `benchmark_sources` table (migration)
Links individual benchmark rows to their provenance sources with weights:

```sql
CREATE TABLE public.benchmark_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_id uuid REFERENCES public.industry_benchmarks(id) ON DELETE CASCADE,
  provenance_id uuid REFERENCES public.data_provenance(id) ON DELETE CASCADE,
  weight numeric DEFAULT 1.0,  -- blending weight for multi-source benchmarks
  metric_name text,            -- which specific metric this source contributes to
  created_at timestamptz DEFAULT now()
);
```

### 3. Create edge function `ingest-benchmark-data`
Admin-only endpoint that:
- Accepts CSV/JSON payloads of aggregated benchmark data
- Validates against the `industry_benchmarks` schema
- Upserts into `industry_benchmarks` with proper `source` tagging
- Links to `data_provenance` via `benchmark_sources`
- Updates `confidence_score` based on sample size + source count

### 4. Seed provenance records for 5 open data sources

Insert into `data_provenance`:

| Source | License | Type | Allowed Uses |
|--------|---------|------|--------------|
| SEC XBRL Financial Statement Dataset | public_domain | financial_statements | internal_training, commercial_analytics, benchmark_derivation |
| World Bank Enterprise Surveys | cc_by_4.0 | sme_survey | internal_training, commercial_analytics, benchmark_derivation |
| ProjectionHub SMB Benchmarks | public_reference | industry_benchmark | benchmark_derivation (aggregated ratios only) |
| Kaggle Coffee Shop Financials (CC0) | cc0 | case_study | internal_training, commercial_analytics |
| JPMorgan Institute SME Cash Flow | academic_reference | sme_survey | benchmark_derivation (derived stats only) |

### 5. Expand `industry_benchmarks` with new fields (migration)
Add percentile columns to support richer calibration:

```sql
ALTER TABLE public.industry_benchmarks
  ADD COLUMN IF NOT EXISTS gross_margin_p10 numeric,
  ADD COLUMN IF NOT EXISTS gross_margin_p25 numeric,
  ADD COLUMN IF NOT EXISTS gross_margin_p75 numeric,
  ADD COLUMN IF NOT EXISTS gross_margin_p90 numeric,
  ADD COLUMN IF NOT EXISTS net_margin_p10 numeric,
  ADD COLUMN IF NOT EXISTS net_margin_p25 numeric,
  ADD COLUMN IF NOT EXISTS net_margin_p75 numeric,
  ADD COLUMN IF NOT EXISTS net_margin_p90 numeric,
  ADD COLUMN IF NOT EXISTS revenue_volatility_pct numeric,
  ADD COLUMN IF NOT EXISTS survival_rate_1yr numeric,
  ADD COLUMN IF NOT EXISTS survival_rate_3yr numeric,
  ADD COLUMN IF NOT EXISTS source_count integer DEFAULT 1;
```

### 6. Create `training_cases` table (migration)
Stores curated Excel-style business cases for engine validation:

```sql
CREATE TABLE public.training_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_name text NOT NULL,
  industry_id text NOT NULL,
  provenance_id uuid REFERENCES public.data_provenance(id),
  input_params jsonb NOT NULL,       -- the business inputs
  expected_outputs jsonb NOT NULL,   -- known financial outcomes
  actual_quantis_outputs jsonb,      -- what Quantis predicted (for accuracy tracking)
  accuracy_score numeric,            -- computed deviation
  tags text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_tested_at timestamptz
);
```

RLS: admin write, service_role read (for edge function testing).

### 7. Create admin page `/admin/data-sources`
Simple dashboard showing:
- All `data_provenance` records with license status
- Per-source benchmark count (via `benchmark_sources` join)
- "Last Ingested" freshness indicator
- Upload button triggering `ingest-benchmark-data` edge function

### 8. Update Methodology page
Add the provenance sources to the existing "Data Sources" table, pulling from `data_provenance` dynamically instead of hardcoded.

## Files to Create/Edit

| Action | File |
|--------|------|
| Create | `supabase/functions/ingest-benchmark-data/index.ts` |
| Create | `src/pages/admin/DataSources.tsx` |
| Migration | `data_provenance`, `benchmark_sources`, `training_cases` tables + percentile columns |
| Edit | `src/pages/Methodology.tsx` — dynamic data sources from DB |
| Edit | `src/App.tsx` — add `/admin/data-sources` route |
| Seed | 5 provenance records for the open datasets |

## Implementation Order
1. Database migration (3 tables + ALTER)
2. Seed provenance records
3. Edge function for data ingestion
4. Admin data sources page
5. Methodology page dynamic sources

## Safe Licensing Summary

All five sources are commercially safe for Quantis:
- **SEC XBRL**: Public domain — compute any aggregates freely
- **World Bank**: CC BY 4.0 — attribute source, use commercially
- **ProjectionHub**: Public reference — encode ratios as numbers in internal DB
- **Kaggle CC0**: No restrictions — use for training/calibration
- **JPMorgan Institute**: Published research — derive statistics, cite source

The `data_provenance` table creates an auditable license trail that satisfies both internal governance and future compliance requirements.

