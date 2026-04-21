CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove any prior schedule with this name (idempotent)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'process-subscription-downgrades-hourly';

SELECT cron.schedule(
  'process-subscription-downgrades-hourly',
  '7 * * * *',  -- minute 7 of every hour
  $$
  SELECT net.http_post(
    url := 'https://gafxacjhkqsdzwwzhbor.supabase.co/functions/v1/process-subscription-downgrades',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhZnhhY2poa3FzZHp3d3poYm9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNjUwMTUsImV4cCI6MjA3OTg0MTAxNX0.d7lRtUFSzVdeq4oiX2JC_iogXeP4J5G_WXkT3tgVTew"}'::jsonb,
    body := '{"trigger":"cron"}'::jsonb
  );
  $$
);