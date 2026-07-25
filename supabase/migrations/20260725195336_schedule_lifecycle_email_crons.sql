-- Domain 15/18 accuracy audit (2026-07-25): check-lifecycle-emails and
-- send-weekly-insights are deployed, ACTIVE edge functions with real,
-- correct logic, but no pg_cron job has ever referenced either one --
-- confirmed via `select * from cron.job` (only process-subscription-
-- downgrades, publish-due-posts, warm-functions exist) and 24h of edge
-- logs showing zero real invocations of either function. They are
-- orphaned scaffolding, not a behavioral bug: nothing schedules them.
--
-- Both functions authenticate scheduled calls via an `x-cron-secret`
-- header checked against the `CRON_SECRET` edge-function env var (see
-- warm-functions/index.ts and send-weekly-insights/index.ts for the
-- identical pattern). Reusing the exact same literal already live in
-- this project's warm-functions-every-5min cron job (confirmed
-- currently authenticating successfully every 5 minutes), rather than
-- introducing a second secret-handling convention.
--
-- Cadence: check-lifecycle-emails's own docblock says "Runs every hour"
-- -- scheduled hourly. send-weekly-insights is weekly content -- scheduled
-- Monday 13:00 UTC (a reasonable business-hours slot, matching the
-- existing project's use of plain UTC cron times elsewhere).

select cron.schedule(
  'check-lifecycle-emails-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/check-lifecycle-emails',
    headers := '{"Content-Type":"application/json","x-cron-secret":"fbfa43cf0894fa91c8f2e09fdd3508702e25584ad13634853404be3e4410c0e3"}'::jsonb,
    body := '{"source":"pg_cron"}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'send-weekly-insights-mondays',
  '0 13 * * 1',
  $$
  select net.http_post(
    url := 'https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/send-weekly-insights',
    headers := '{"Content-Type":"application/json","x-cron-secret":"fbfa43cf0894fa91c8f2e09fdd3508702e25584ad13634853404be3e4410c0e3"}'::jsonb,
    body := '{"source":"pg_cron"}'::jsonb
  ) as request_id;
  $$
);
