-- Where a platform post actually lives once published.
--
-- Filled either by the founder ("Record published URL" — for manual posts and
-- for reconciling a publish whose outcome was 'unknown') or derived in the UI
-- from platform_post_id for LinkedIn. Additive and nullable: no existing row
-- changes. https-only so a pasted javascript:/http: value can never be stored
-- and later rendered as a link.
ALTER TABLE public.autoposter_post_platforms
  ADD COLUMN IF NOT EXISTS published_url text;

ALTER TABLE public.autoposter_post_platforms
  DROP CONSTRAINT IF EXISTS autoposter_post_platforms_published_url_https_chk;
ALTER TABLE public.autoposter_post_platforms
  ADD CONSTRAINT autoposter_post_platforms_published_url_https_chk
  CHECK (published_url IS NULL OR published_url ~ '^https://[^\s]+$');
