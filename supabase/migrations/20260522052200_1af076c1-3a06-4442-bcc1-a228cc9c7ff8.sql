
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Make plan seeding idempotent: same (week, day) = same row.
CREATE UNIQUE INDEX IF NOT EXISTS autoposter_posts_week_day_uniq
  ON public.autoposter_posts (week_number, day_number)
  WHERE week_number IS NOT NULL AND day_number IS NOT NULL;

-- Make per-platform content upsertable on (post_id, platform).
CREATE UNIQUE INDEX IF NOT EXISTS autoposter_post_platforms_post_platform_uniq
  ON public.autoposter_post_platforms (post_id, platform);

-- Drop the cron job if it already exists, then (re)create.
DO $$
BEGIN
  PERFORM cron.unschedule('autoposter-publish-due');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'autoposter-publish-due',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gafxacjhkqsdzwwzhbor.supabase.co/functions/v1/publish-due-posts',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhZnhhY2poa3FzZHp3d3poYm9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNjUwMTUsImV4cCI6MjA3OTg0MTAxNX0.d7lRtUFSzVdeq4oiX2JC_iogXeP4J5G_WXkT3tgVTew"}'::jsonb,
    body := jsonb_build_object('source', 'pg_cron', 'fired_at', now())
  ) AS request_id;
  $$
);
