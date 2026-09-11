-- Phase 0 (freeze/snapshot) + Phase 2 (archive) of the 13-week Content
-- Operations reset. Full canonical schema (content_items, social_accounts,
-- publication_receipts, etc.) is deliberately NOT built here -- that's a
-- separate, larger pass once the founder's real content and image-gen
-- provider are in hand. This migration only makes the 42-post legacy plan
-- safely archivable: nothing is deleted or rewritten, only marked.

-- ---------- 1. Immutable snapshot table ----------
create table public.autoposter_legacy_snapshot (
  id uuid primary key default gen_random_uuid(),
  legacy_batch_id text not null,
  source_table text not null,
  source_row_id uuid not null,
  row_snapshot jsonb not null,
  content_hash text not null,
  captured_at timestamptz not null default now()
);

alter table public.autoposter_legacy_snapshot enable row level security;
alter table public.autoposter_legacy_snapshot force row level security;

create policy "admin_can_read_legacy_snapshot"
  on public.autoposter_legacy_snapshot for select
  using (has_role(auth.uid(), 'admin'));

create policy "service_role_full_access_legacy_snapshot"
  on public.autoposter_legacy_snapshot for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

revoke all on public.autoposter_legacy_snapshot from anon, authenticated;
grant select on public.autoposter_legacy_snapshot to authenticated;

-- ---------- 2. Lifecycle columns on autoposter_posts (additive) ----------
alter table public.autoposter_posts
  add column archived_at timestamptz,
  add column archived_by uuid references auth.users(id),
  add column archive_reason text
    check (archive_reason in ('legacy_plan_outdated', 'duplicate', 'claim_unsupported', 'manual_review')),
  add column legacy_batch_id text,
  add column historical_publication_state text
    check (historical_publication_state in (
      'founder_reported_published', 'publicly_observed', 'verified_published',
      'publication_unknown', 'not_published'
    ));

create index autoposter_posts_archived_at_idx on public.autoposter_posts (archived_at);

-- ---------- 3. Snapshot every current row + its platform variants BEFORE any mutation ----------
insert into public.autoposter_legacy_snapshot (legacy_batch_id, source_table, source_row_id, row_snapshot, content_hash)
select
  'quantis-legacy-90d-2026-09',
  'autoposter_posts',
  p.id,
  jsonb_build_object(
    'post', to_jsonb(p.*),
    'platforms', coalesce((
      select jsonb_agg(to_jsonb(pp.*))
      from public.autoposter_post_platforms pp
      where pp.post_id = p.id
    ), '[]'::jsonb)
  ),
  encode(extensions.digest(lower(trim(coalesce(p.hook, '') || ' ' || coalesce(p.content_brief, ''))), 'sha256'), 'hex')
from public.autoposter_posts p
where p.archived_at is null;

-- ---------- 4. Archive all current (pre-reset) posts ----------
-- Bulk state is explicitly 'founder_reported_published' only -- the founder's
-- own assertion that these went out, NOT a verified platform receipt. Any
-- upgrade to publicly_observed/verified_published happens later per-row, once
-- real evidence (a public URL/URN) is reconciled against each post.
update public.autoposter_posts
set
  status = 'archived',
  archived_at = now(),
  archived_by = '39c39ad3-ca59-4ce1-96b0-4c82c68da47a',
  archive_reason = 'legacy_plan_outdated',
  legacy_batch_id = 'quantis-legacy-90d-2026-09',
  historical_publication_state = 'founder_reported_published'
where archived_at is null;
