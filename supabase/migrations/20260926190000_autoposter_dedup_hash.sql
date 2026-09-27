-- Content plan ingestion, v2: adds the dedup_hash column the 2026-09-11
-- Autoposter/Content Studio spec proposed but never actually applied
-- (confirmed via repo audit: grep of every migration shows no dedup_hash
-- column ever existed on autoposter_posts before this).
--
-- Deliberately NOT retrofitted onto existing rows -- legacy/archived rows
-- keep dedup_hash NULL (multiple NULLs are allowed by the partial unique
-- index below, so this is safe). Only new rows inserted through the new
-- content-plan-import edge function populate it going forward.
--
-- This is exact/near-exact duplicate detection (normalized token overlap
-- via _shared/content-dedupe.ts), not semantic similarity -- it catches
-- copy-paste and near-identical rewording, not "same lesson, different
-- words." Documented here so the column's guarantee is never oversold.
--
-- Historical context (why this matters): a prior bulk-import mechanism
-- (the deleted bulk-seed hook, since removed entirely -- see
-- 20260911224116_seed_content_studio_as_archived_posts.sql's own comment)
-- used an UPSERT whose conflict payload included `status`, which silently
-- reset 42 archived rows back to 'draft'. The new content-plan-import
-- function is INSERT-only -- it never touches an existing row's status --
-- so that failure mode cannot recur structurally, not just by convention.

ALTER TABLE public.autoposter_posts
  ADD COLUMN IF NOT EXISTS dedup_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS autoposter_posts_dedup_hash_uidx
  ON public.autoposter_posts (dedup_hash)
  WHERE dedup_hash IS NOT NULL;
