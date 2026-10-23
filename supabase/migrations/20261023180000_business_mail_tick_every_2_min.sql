-- Founder request 2026-10-23: one outreach send every 2 minutes instead of 5.
-- The sender still sends at most ONE message per tick and still enforces the
-- send window (8-17 America/New_York), the daily cap and min_gap_minutes from
-- mail_settings, so this only lets the existing limits be reached sooner.
-- Only the schedule changes; the job's command is untouched.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'business-mail-tick') THEN
    PERFORM cron.alter_job(
      (SELECT jobid FROM cron.job WHERE jobname = 'business-mail-tick'),
      schedule := '*/2 * * * *'
    );
  END IF;
END $$;
