-- 1. Add the columns planned in the 2026-09-11 spec but never actually
--    applied (only the archive-specific columns from the first migration
--    were created). Needed now to link seeded posts back to their source
--    Content Studio generation.
alter table public.autoposter_posts
  add column source text not null default 'manual'
    check (source in ('manual', 'content_studio', 'external_seed')),
  add column content_studio_generation_id uuid references public.content_studio_generations(id);

-- 2. Repair the status drift found live: useSeedContentPlan's upsert
-- (onConflict week_number,day_number) includes `status: 'draft'` in its
-- payload, which silently overwrote all 42 archived rows' status back to
-- 'draft' -- archived_at was untouched (not in that payload), which is why
-- the archive filter still worked correctly, but `status` itself drifted.
update public.autoposter_posts
set status = 'archived'
where archived_at is not null and status != 'archived';

-- 3. Lock the status vocabulary the founder asked for: draft, scheduled
-- (queued, not yet due), posted (published), archived (superseded/retired),
-- not_published (confirmed it never went out). Current data only uses
-- 'draft' and 'archived', so this constraint doesn't break anything live.
alter table public.autoposter_posts
  add constraint autoposter_posts_status_check
  check (status in ('draft', 'scheduled', 'posted', 'archived', 'not_published'));

-- 4. Seed every existing Content Studio generation as an already-posted,
-- already-archived autoposter_posts row -- these represent real content
-- already written and posted to LinkedIn (Bogdan personal + AIWMC page)
-- via Content Studio, per the founder's explicit instruction: do NOT
-- create new posts, seed what already exists and mark it posted+archived.
insert into public.autoposter_posts (
  post_date, hook, content_brief, cta, hashtags,
  status, source, content_studio_generation_id,
  archived_at, archived_by, archive_reason, legacy_batch_id, historical_publication_state,
  notes
)
select
  g.created_at::date,
  coalesce(
    g.variants->'linkedin'->>'hook',
    g.variants->'instagram'->>'hook',
    g.variants->'twitter'->>'hook',
    (select v->>'hook' from jsonb_each(g.variants) as t(k, v) limit 1),
    left(g.topic, 140)
  ),
  g.topic,
  g.cta,
  coalesce(
    (select array(select jsonb_array_elements_text(v->'hashtags')) from jsonb_each(g.variants) as t(k, v) where v ? 'hashtags' limit 1),
    '{}'
  ),
  'archived',
  'content_studio',
  g.id,
  now(),
  '39c39ad3-ca59-4ce1-96b0-4c82c68da47a',
  'legacy_plan_outdated',
  'quantis-content-studio-seed-2026-09',
  'founder_reported_published',
  'Seeded from content_studio_generations ' || g.id || '; platforms: ' || array_to_string(g.platforms, ', ')
from public.content_studio_generations g
where not exists (
  select 1 from public.autoposter_posts p where p.content_studio_generation_id = g.id
);
