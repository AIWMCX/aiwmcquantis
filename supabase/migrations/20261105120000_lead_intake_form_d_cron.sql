-- Daily free lead intake from SEC Form D filings (supabase/functions/lead-intake).
-- 11:30 UTC = 6:30 ET, before the 8:00 ET send window. Inserts discovered
-- prospects without email; it never drafts, approves or sends anything.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lead-intake-form-d') THEN
    PERFORM cron.unschedule('lead-intake-form-d');
  END IF;
  PERFORM cron.schedule(
    'lead-intake-form-d',
    '30 11 * * *',
    $cron$
    select net.http_post(
      url := 'https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/lead-intake',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'quantis_shared_cron_secret')
      ),
      body := '{"action":"form_d","source":"pg_cron"}'::jsonb,
      timeout_milliseconds := 150000
    ) as request_id;
    $cron$
  );
END $$;
