-- My Documents persistence: user-facing RLS on export_jobs + display columns.
-- Before this migration, only the service role could touch export_jobs, and
-- no download-triggered code path was writing rows. Frontend gains:
--   * INSERT own rows (auth.uid() = user_id)
--   * SELECT own rows (auth.uid() = user_id)
--   * UPDATE own rows (auth.uid() = user_id) — needed to transition
--     status: processing → succeeded/failed after the PDF blob is written.
-- Adds two nullable display columns used by the new MyDocuments page:
--   * filename — the filename the user's browser downloaded
--   * kind     — export kind (e.g. 'pdf_report', 'doc_studio') for grouping

alter table public.export_jobs
  add column if not exists filename text,
  add column if not exists kind text;

alter table public.export_jobs enable row level security;

drop policy if exists "export_jobs user select" on public.export_jobs;
create policy "export_jobs user select"
  on public.export_jobs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "export_jobs user insert" on public.export_jobs;
create policy "export_jobs user insert"
  on public.export_jobs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "export_jobs user update" on public.export_jobs;
create policy "export_jobs user update"
  on public.export_jobs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists export_jobs_user_created_idx
  on public.export_jobs (user_id, created_at desc);
