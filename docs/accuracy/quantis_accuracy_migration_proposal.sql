-- AIWMC Quantis accuracy-control schema proposal v1.0
-- REVIEW IN STAGING. This file has not been applied to production.

create table if not exists public.golden_test_vectors (
  id uuid primary key default gen_random_uuid(),
  vector_code text not null unique,
  archetype text not null,
  promotion_status text not null default 'candidate'
    check (promotion_status in ('candidate','silver','gold','retired')),
  input_data jsonb not null,
  expected_ranges jsonb not null,
  expected_statuses jsonb not null default '{}'::jsonb,
  expected_invariants jsonb not null default '[]'::jsonb,
  tolerance_pct numeric not null default 0.01 check (tolerance_pct >= 0),
  oracle_method text not null,
  oracle_version text not null,
  reviewer_finance text,
  reviewer_engineering text,
  evidence_urls jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accuracy_runs (
  id bigint generated always as identity primary key,
  run_id uuid not null default gen_random_uuid(),
  run_date timestamptz not null default now(),
  vector_id uuid not null references public.golden_test_vectors(id),
  engine_version text not null,
  formula_registry_version text not null,
  dataset_version text not null,
  commit_sha text not null,
  seed text,
  passed boolean not null,
  metric_results jsonb not null,
  invariant_results jsonb not null,
  worst_deviation_pct numeric,
  duration_ms integer,
  error_code text,
  output_hash text,
  created_at timestamptz not null default now()
);

create index if not exists accuracy_runs_vector_date_idx
  on public.accuracy_runs(vector_id, run_date desc);
create index if not exists accuracy_runs_release_idx
  on public.accuracy_runs(commit_sha, dataset_version, engine_version);

create table if not exists public.metric_formula_registry (
  formula_id text primary key,
  metric_code text not null,
  version text not null,
  definition text not null,
  expression text not null,
  input_contract jsonb not null,
  output_contract jsonb not null,
  units jsonb not null,
  rounding_policy jsonb not null,
  invalid_state_policy jsonb not null,
  source_standard text,
  implementation_path text not null,
  implementation_sha text not null,
  active boolean not null default false,
  reviewed_at timestamptz,
  unique(metric_code, version)
);

create table if not exists public.dataset_releases (
  dataset_version text primary key,
  released_at timestamptz not null,
  row_count bigint not null,
  observation_count bigint not null,
  modeled_cell_count bigint not null,
  source_manifest_hash text not null,
  transform_code_sha text not null,
  temporal_cutoff date not null,
  geography_coverage jsonb not null,
  license_manifest jsonb not null,
  quality_report jsonb not null,
  approved_by text not null
);

create table if not exists public.rvce_observations (
  id bigint generated always as identity primary key,
  analysis_id uuid,
  correlation_id uuid not null,
  metric_code text not null,
  raw_value numeric,
  normalized_value numeric,
  unit text not null,
  currency text,
  period_start date,
  period_end date,
  geography text,
  source_url text not null,
  source_title text,
  publisher text,
  published_at date,
  retrieved_at timestamptz not null default now(),
  extraction_method text not null,
  extraction_quote_hash text,
  source_quality numeric not null check (source_quality between 0 and 1),
  comparability_score numeric not null check (comparability_score between 0 and 1),
  accepted boolean not null,
  rejection_reason text
);

create table if not exists public.calibration_metrics (
  id bigint generated always as identity primary key,
  evaluated_at timestamptz not null default now(),
  cohort_start date not null,
  cohort_end date not null,
  archetype text not null,
  horizon_months integer not null,
  metric_code text not null,
  sample_size integer not null,
  mae numeric,
  mape numeric,
  wape numeric,
  bias numeric,
  interval_coverage_p80 numeric,
  interval_coverage_p90 numeric,
  brier_score numeric,
  baseline_comparison jsonb not null,
  engine_version text not null,
  dataset_version text not null
);

-- Production access should be service-role/admin only. Enable RLS before use.
alter table public.golden_test_vectors enable row level security;
alter table public.accuracy_runs enable row level security;
alter table public.metric_formula_registry enable row level security;
alter table public.dataset_releases enable row level security;
alter table public.rvce_observations enable row level security;
alter table public.calibration_metrics enable row level security;
