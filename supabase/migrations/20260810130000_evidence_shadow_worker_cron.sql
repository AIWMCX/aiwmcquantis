-- Quantis Evidence Service — cron schedule for evidence-shadow-worker (PR E6.5).
--
-- Same net.http_post + x-cron-secret pattern already proven live in this
-- project for doc-queue-worker/publish-due-posts/check-lifecycle-emails/
-- send-weekly-insights (see 20260727012329_fix_publish_due_posts_cron_auth.sql
-- for why x-cron-secret, not the anon key, is this repo's correct
-- convention for cron->edge-function auth). Reuses the SAME CRON_SECRET
-- literal already live and working for those jobs -- introducing a second,
-- parallel secret for one more cron job would be a new mechanism where an
-- existing one already works, which is exactly the kind of unnecessary
-- parallel convention this project's own history warns against.
--
-- Every 10 minutes is deliberately conservative for a first cron cadence
-- on a brand-new worker: the worker itself is a no-op until
-- EVIDENCE_SERVICE_SHADOW_ENABLED=true is set (see evidence-shadow-worker/
-- index.ts), so this schedule firing on a fresh deploy costs nothing but
-- one cheap, always-200, always-fast HTTP round trip every 10 minutes
-- until the flag is deliberately turned on.
DO $$
BEGIN
  PERFORM cron.unschedule('evidence-shadow-worker-poll');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'evidence-shadow-worker-poll',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/evidence-shadow-worker',
    headers := '{"Content-Type":"application/json","x-cron-secret":"fbfa43cf0894fa91c8f2e09fdd3508702e25584ad13634853404be3e4410c0e3"}'::jsonb,
    body := jsonb_build_object('source', 'pg_cron', 'fired_at', now())
  ) AS request_id;
  $$
);
