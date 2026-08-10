-- Release 1 — scenario foundation (Phase C of the Unified Decision Framework).
-- Reuses analyses/analysis_snapshots as the source of truth; adds the
-- minimum lineage tables needed for typed-delta scenario modeling.
-- analysis_snapshots.id is bigint (not uuid) — FK columns below match that.

create table public.scenario_sets (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  base_snapshot_id bigint references public.analysis_snapshots(id) on delete set null,
  name text not null default 'Scenario Set',
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index scenario_sets_analysis_id_idx on public.scenario_sets(analysis_id);
create index scenario_sets_user_id_idx on public.scenario_sets(user_id);

alter table public.scenario_sets enable row level security;

create policy scenario_sets_owner_select on public.scenario_sets
  for select using (user_id = auth.uid());
create policy scenario_sets_owner_insert on public.scenario_sets
  for insert with check (user_id = auth.uid());
create policy scenario_sets_owner_update on public.scenario_sets
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy scenario_sets_owner_delete on public.scenario_sets
  for delete using (user_id = auth.uid());

-- ============================================================================
-- CRITICAL FINDING 2026-08-10: public.scenarios already existed before this
-- migration (created unconditionally by 20260308082036_...sql, a flat,
-- single-row-per-scenario Monte-Carlo design: analysis_id/params/output/
-- monte_carlo_result/confidence_score/scenario_type -- completely different
-- from the ledger design below). This CREATE TABLE (no IF NOT EXISTS)
-- collided with it.
--
-- Confirmed against the real live schema (generated types,
-- src/integrations/supabase/types.ts): production's scenarios table STILL
-- has the OLD March shape today. Also confirmed scenario_sets/
-- scenario_versions/scenario_runs -- the other three tables this exact
-- migration file creates -- do NOT exist in production at all. Since a
-- migration file runs as one transaction by default, this table-name
-- collision on the SECOND create table statement rolled back the ENTIRE
-- file, including scenario_sets (the first, otherwise-uncontested
-- statement). This means the whole Phase D scenario-ledger foundation --
-- despite being reported complete through "Phase D-14: live verification"
-- -- never actually applied to production. Every feature depending on it
-- (create-scenario-set/run-scenario/promote-scenario edge functions, the
-- ScenarioWorkspace UI) has had nothing to write to.
--
-- Fix: rename the pre-existing legacy table out of the way (non-destructive
-- -- preserves whatever data it has) rather than drop anything, so the new
-- ledger table can be created cleanly. This is written as a real candidate
-- fix for production, not just a CI-replay patch -- but renaming a live
-- production table is exactly the kind of action that needs explicit
-- founder review before this migration is ever applied there. Flagged
-- prominently; not a decision made unilaterally.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scenarios' AND column_name = 'params'
  ) THEN
    ALTER TABLE public.scenarios RENAME TO scenarios_legacy_monte_carlo;
    RAISE NOTICE 'Renamed pre-existing legacy scenarios table (flat Monte-Carlo design) to scenarios_legacy_monte_carlo to make way for the Phase D ledger design -- data preserved, not dropped.';
  END IF;
END $$;

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  scenario_set_id uuid not null references public.scenario_sets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  starting_case text not null default 'custom'
    check (starting_case in ('baseline','demand_downside','cost_shock','pricing_change','capacity_constraint','custom')),
  locked boolean not null default false,
  created_at timestamptz not null default now()
);

create index scenarios_scenario_set_id_idx on public.scenarios(scenario_set_id);
create index scenarios_user_id_idx on public.scenarios(user_id);

alter table public.scenarios enable row level security;

create policy scenarios_owner_select on public.scenarios
  for select using (user_id = auth.uid());
create policy scenarios_owner_insert on public.scenarios
  for insert with check (user_id = auth.uid());
create policy scenarios_owner_update on public.scenarios
  for update using (user_id = auth.uid() and locked = false) with check (user_id = auth.uid());
create policy scenarios_owner_delete on public.scenarios
  for delete using (user_id = auth.uid() and locked = false);

-- scenario_versions: an append-only ledger of typed deltas applied to a
-- scenario. Never mutated once written (immutability enforced by having no
-- UPDATE policy at all, matching analysis_snapshots's INSERT-only pattern).
create table public.scenario_versions (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_number int not null,
  -- ScenarioDelta: {schema_version, base_snapshot_id, changes:[{assumption_key,
  -- operation: replace|increase_pct|decrease_pct, value, unit, reason?, evidence_id?}]}
  delta jsonb not null,
  author text,
  created_at timestamptz not null default now(),
  unique(scenario_id, version_number)
);

create index scenario_versions_scenario_id_idx on public.scenario_versions(scenario_id);

alter table public.scenario_versions enable row level security;

create policy scenario_versions_owner_select on public.scenario_versions
  for select using (user_id = auth.uid());
create policy scenario_versions_owner_insert on public.scenario_versions
  for insert with check (user_id = auth.uid());
-- No update/delete policy: versions are immutable once written.

-- scenario_runs: the canonical, idempotent, hashed output of applying one
-- scenario_version's delta to a base snapshot through the shared
-- deterministic engine. Idempotency key = canonical_run_key.
create table public.scenario_runs (
  id uuid primary key default gen_random_uuid(),
  scenario_version_id uuid not null references public.scenario_versions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  base_snapshot_id bigint not null references public.analysis_snapshots(id),
  -- SHA-256(base_snapshot_hash + normalized_delta + engine_version +
  -- formula_version + dataset_version + research_snapshot_id)
  canonical_run_key text not null unique,
  normalized_delta jsonb not null,
  engine_version text not null,
  formula_version text not null,
  dataset_version text not null,
  research_snapshot_id uuid,
  input_hash text not null,
  output_hash text not null,
  output jsonb not null,
  reconciliation_status text not null default 'unknown'
    check (reconciliation_status in ('passed','failed','unknown')),
  reconciliation_issues jsonb,
  latency_ms int,
  correlation_id uuid,
  created_at timestamptz not null default now()
);

create index scenario_runs_scenario_version_id_idx on public.scenario_runs(scenario_version_id);
create index scenario_runs_user_id_idx on public.scenario_runs(user_id);

alter table public.scenario_runs enable row level security;

create policy scenario_runs_owner_select on public.scenario_runs
  for select using (user_id = auth.uid());
create policy scenario_runs_owner_insert on public.scenario_runs
  for insert with check (user_id = auth.uid());
-- No update/delete policy: runs are immutable once written (canonical_run_key
-- reuse is achieved by SELECTing an existing row, never by mutating one).
