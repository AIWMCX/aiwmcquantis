-- Daily automatic LinkedIn comment drafts (li-growth-draft action "auto_daily").
-- TRAXY becomes an allowed source of targets and signals. pg_cron calls the
-- function twice each weekday morning (5 drafts per call, inside the edge time
-- limit) so the founder finds up to 10 drafts in /admin/linkedin-growth.
-- Nothing is posted: the founder still posts every comment by hand.

ALTER TABLE public.li_engagement_targets DROP CONSTRAINT IF EXISTS li_engagement_targets_source_check;
ALTER TABLE public.li_engagement_targets ADD CONSTRAINT li_engagement_targets_source_check
  CHECK (source = ANY (ARRAY['manual','csv','crm','zoho','vibe_prospecting','apollo','own_post_engager','watchlist_engager','own_network','traxy']));

ALTER TABLE public.li_engagement_signals DROP CONSTRAINT IF EXISTS li_engagement_signals_capture_method_check;
ALTER TABLE public.li_engagement_signals ADD CONSTRAINT li_engagement_signals_capture_method_check
  CHECK (capture_method = ANY (ARRAY['manual_paste','explorium','apollo','zoho','traxy']));

-- 11:40 and 12:10 UTC, Mon-Fri = 06:40 / 07:10 New York, 04:40 / 05:10 Denver.
DO $$
DECLARE
  j text;
BEGIN
  FOREACH j IN ARRAY ARRAY['li-auto-comments-a', 'li-auto-comments-b'] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
    END IF;
  END LOOP;

  PERFORM cron.schedule(
    'li-auto-comments-a',
    '40 11 * * 1-5',
    $cron$
    select net.http_post(
      url := 'https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/li-growth-draft',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'quantis_shared_cron_secret')
      ),
      body := '{"action":"auto_daily","max":5,"source":"pg_cron"}'::jsonb,
      timeout_milliseconds := 150000
    ) as request_id;
    $cron$
  );

  PERFORM cron.schedule(
    'li-auto-comments-b',
    '10 12 * * 1-5',
    $cron$
    select net.http_post(
      url := 'https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/li-growth-draft',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'quantis_shared_cron_secret')
      ),
      body := '{"action":"auto_daily","max":5,"source":"pg_cron"}'::jsonb,
      timeout_milliseconds := 150000
    ) as request_id;
    $cron$
  );
END $$;
