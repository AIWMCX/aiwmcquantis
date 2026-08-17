-- ============================================================================
-- QOC Audit Envelope Store
-- ----------------------------------------------------------------------------
-- Persists every AuditEnvelope produced by qoc-orchestrate. Serves three
-- runtime roles:
--   1. Idempotency  — getByFingerprint() returns prior report_id on cache hit
--   2. Burst guard  — recentCountForUser() counts rows in a sliding window
--   3. Audit trail  — every request is durably logged with full stage traces
-- ============================================================================

create table if not exists public.qoc_audit_envelopes (
  id                uuid primary key default gen_random_uuid(),
  request_id        text not null,
  user_id           text not null,
  fingerprint       text not null,
  qoc_version       text not null,
  overall_verdict   text not null,
  traces            jsonb not null default '[]',
  total_cost_usd    numeric(12, 6) not null default 0,
  total_duration_ms integer not null default 0,
  report            jsonb,
  short_circuit     jsonb,
  created_at        timestamptz not null default now()
);

-- Unique request_id per user (idempotency at the application level)
create unique index if not exists qoc_audit_request_id_idx
  on public.qoc_audit_envelopes (request_id);

-- Fingerprint lookup for dedup cache hits
create index if not exists qoc_audit_fingerprint_idx
  on public.qoc_audit_envelopes (fingerprint);

-- Burst-window query: (user_id, created_at) for sliding-window count
create index if not exists qoc_audit_user_time_idx
  on public.qoc_audit_envelopes (user_id, created_at desc);

-- RLS: users can only read their own audit envelopes
alter table public.qoc_audit_envelopes enable row level security;

-- IDEMPOTENCY FIX (2026-08-17, broken CI migration pipeline): this table
-- and policy were already live in production (created directly, outside
-- this tracked migration -- confirmed via pg_policies before this fix), so
-- a bare CREATE POLICY here would abort with "policy already exists" the
-- first time this file's batch actually got a chance to run. DROP IF
-- EXISTS + CREATE makes it safe to replay regardless of how it got there.
drop policy if exists "users read own envelopes" on public.qoc_audit_envelopes;
create policy "users read own envelopes"
  on public.qoc_audit_envelopes for select
  using (auth.uid()::text = user_id);

-- Edge function (service role) writes all rows — no insert policy needed for
-- authenticated users; the function uses the service role key.
