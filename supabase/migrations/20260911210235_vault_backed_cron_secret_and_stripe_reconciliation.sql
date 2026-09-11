-- 2026-09-11: moves the shared x-cron-secret value out of git-tracked
-- migration literals and into Supabase Vault. The value itself was
-- inserted live via vault.create_secret() through a direct SQL execution,
-- NOT through this migration file -- this file only ever references it by
-- name via vault.decrypted_secrets, so no secret literal enters git here.
-- (An earlier attempt this session to schedule reconcile-stripe-subscriptions
-- with the literal hardcoded a second time was correctly blocked by the
-- auto-mode classifier; this is the Vault-backed fix that was deferred at
-- the time.)
--
-- Reschedules the two existing lifecycle-email crons (jobid 4, 5) to stop
-- referencing the literal, and adds a new daily job for
-- reconcile-stripe-subscriptions (deployed since today's Production Deploy
-- fix but never scheduled -- confirmed via `select * from cron.job` showing
-- no entry for it before this migration).
--
-- This does NOT rotate the secret's value -- the same value already live
-- as the CRON_SECRET edge-function env var is reused so the existing,
-- working lifecycle-email crons are not put at risk of a coordination
-- failure. Rotating to a fresh value (updating both Vault and the edge
-- function secret together) remains a separate, still-open follow-up.

select cron.alter_job(
  4,
  command := $$
  select net.http_post(
    url := 'https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/check-lifecycle-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'quantis_shared_cron_secret')
    ),
    body := '{"source":"pg_cron"}'::jsonb
  ) as request_id;
  $$
);

select cron.alter_job(
  5,
  command := $$
  select net.http_post(
    url := 'https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/send-weekly-insights',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'quantis_shared_cron_secret')
    ),
    body := '{"source":"pg_cron"}'::jsonb
  ) as request_id;
  $$
);

-- Daily at 06:00 UTC -- low-traffic hour, well after the last webhook of
-- the prior day would have settled, matching the reconciliation job's own
-- "report-only, never guess" design (see reconcile-stripe-subscriptions/index.ts).
select cron.schedule(
  'reconcile-stripe-subscriptions-daily',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/reconcile-stripe-subscriptions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'quantis_shared_cron_secret')
    ),
    body := '{"source":"pg_cron"}'::jsonb
  ) as request_id;
  $$
);
