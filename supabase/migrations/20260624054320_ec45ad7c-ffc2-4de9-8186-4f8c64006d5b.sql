-- ============================================================================
-- Quantis Orchestration Core (QOC) — audit + idempotency table
-- One row per orchestrated request. This table IS the auditability product.
-- Doubles as idempotency index (fingerprint) and burst counter (user+time).
-- Writes are service-role only; users can read only their own rows.
-- ============================================================================
create table if not exists public.qoc_audit (
  id                uuid primary key default gen_random_uuid(),
  request_id        text not null,
  report_id         text not null,
  fingerprint       text,
  user_id           uuid not null references auth.users(id) on delete cascade,
  overall_verdict   text not null check (
                      overall_verdict in ('PASS','PARTIAL','FAIL','HARD_BLOCK','SKIPPED')),
  total_cost_usd    numeric(12,6) not null default 0,
  total_duration_ms integer not null default 0,
  traces            jsonb not null default '[]'::jsonb,
  short_circuit     jsonb,
  created_at        timestamptz not null default now()
);

-- GRANTS (required for PostgREST visibility through the service role / RLS).
grant select on public.qoc_audit to authenticated;
grant all    on public.qoc_audit to service_role;

-- Idempotency lookups: most-recent PASS by fingerprint.
create index if not exists qoc_audit_fp_idx
  on public.qoc_audit (fingerprint, created_at desc)
  where overall_verdict = 'PASS';

-- Burst counting: user activity in a recent window.
create index if not exists qoc_audit_user_time_idx
  on public.qoc_audit (user_id, created_at desc);

alter table public.qoc_audit enable row level security;

drop policy if exists qoc_audit_select_own on public.qoc_audit;
create policy qoc_audit_select_own
  on public.qoc_audit for select
  to authenticated
  using (auth.uid() = user_id);

-- Belt-and-braces restrictive deny: no future permissive policy can ever let
-- a client write to the audit trail. Only the service role bypasses RLS.
drop policy if exists qoc_audit_deny_client_writes on public.qoc_audit;
create policy qoc_audit_deny_client_writes
  on public.qoc_audit as restrictive
  for all
  to authenticated, anon
  using (false)
  with check (false);

comment on table public.qoc_audit is
  'Quantis Orchestration Core per-request audit envelope. Source of truth for auditability + idempotency + burst control. Writes are service-role only.';
