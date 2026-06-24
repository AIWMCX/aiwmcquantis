-- ============================================================================
-- QOC audit + idempotency table
-- ----------------------------------------------------------------------------
-- One row per orchestrated request. This table IS the auditability product:
-- every analysis, every short-circuit, every per-stage trace, durably stored.
-- Doubles as the idempotency index (fingerprint) and burst counter (user+time).
-- ============================================================================

create table if not exists public.qoc_audit (
  id              uuid primary key default gen_random_uuid(),
  request_id      text not null,
  report_id       text not null,
  fingerprint     text,
  user_id         uuid not null references auth.users(id) on delete cascade,
  overall_verdict text not null check (
                    overall_verdict in ('PASS','PARTIAL','FAIL','HARD_BLOCK','SKIPPED')),
  total_cost_usd  numeric(12,6) not null default 0,
  total_duration_ms integer not null default 0,
  traces          jsonb not null default '[]'::jsonb,
  short_circuit   jsonb,
  created_at      timestamptz not null default now()
);

-- Idempotency lookups: most-recent PASS by fingerprint.
create index if not exists qoc_audit_fp_idx
  on public.qoc_audit (fingerprint, created_at desc)
  where overall_verdict = 'PASS';

-- Burst counting: user activity in a recent window.
create index if not exists qoc_audit_user_time_idx
  on public.qoc_audit (user_id, created_at desc);

-- RLS: users see only their own audit rows; the edge function uses the service
-- role to insert. No client writes.
alter table public.qoc_audit enable row level security;

drop policy if exists qoc_audit_select_own on public.qoc_audit;
create policy qoc_audit_select_own
  on public.qoc_audit for select
  using (auth.uid() = user_id);

-- No insert/update/delete policy for clients => only service role can write.

comment on table public.qoc_audit is
  'Quantis Orchestration Core per-request audit envelope. Source of truth for auditability + idempotency + burst control.';
