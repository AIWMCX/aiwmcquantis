-- Daily production check follow-up (2026-07-26/27): publish-due-posts has
-- been rejecting every cron-triggered call with 401 (confirmed in edge
-- logs, once-a-minute for as far back as logs retain). Root cause: the
-- cron job (autoposter-publish-due) authenticates with the Supabase anon
-- API key, but publish-due-posts/index.ts explicitly requires an
-- `x-cron-secret` header matching the CRON_SECRET env var (a different,
-- stricter auth pattern than the anon-key jobs use) -- the job's headers
-- were never updated to match. Reusing the exact same CRON_SECRET literal
-- already confirmed live and working (warm-functions, check-lifecycle-
-- emails, send-weekly-insights all authenticate successfully with it).
--
-- Verified fixed in production: the call at 01:24:00 UTC (right after
-- this landed) returned 200; every call before it, going back through
-- the full retained log history, returned 401.
select cron.alter_job(
  job_id := 2,
  command := $$
  SELECT net.http_post(
    url := 'https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/publish-due-posts',
    headers := '{"Content-Type":"application/json","x-cron-secret":"fbfa43cf0894fa91c8f2e09fdd3508702e25584ad13634853404be3e4410c0e3"}'::jsonb,
    body := jsonb_build_object('source', 'pg_cron', 'fired_at', now())
  ) AS request_id;
  $$
);
