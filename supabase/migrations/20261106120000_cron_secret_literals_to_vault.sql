-- 2026-11-06 security: no pg_cron job may carry the x-cron-secret value as a
-- literal. Every cron job must read it from Supabase Vault
-- (quantis_shared_cron_secret), the pattern already used by
-- 20260911210235, 20260928100000 and 20261105120000.
--
-- Why: two older migrations (20260725195336, 20260727012329) embed the value
-- in plaintext and are append-only, so they stay as they are. That value was
-- rotated on 2026-08-18 (PR #48) with direct cron.alter_job() calls outside
-- git, so per docs/execution/2026-08-27-canonical-register.md at least
-- warm-functions-every-5min (and probably job 2, autoposter-publish-due)
-- still carries the current value as a literal in cron.job. Once every job reads
-- from Vault, a rotation means updating 3 stores (Vault, the CRON_SECRET edge
-- secret, the CRON_SECRET GitHub secret) and no cron job definitions.
-- Runbook: docs/execution/2026-11-06-cron-secret-rotation-runbook.md.
--
-- This migration contains no secret value and never prints one. It changes a
-- job only when:
--   * the Vault secret exists (otherwise the jobs would start sending an
--     empty header and 401; it changes nothing and says so), and
--   * the job's command uses one of the two literal forms this repo has
--     written, and
--   * the rewritten command still plans (EXPLAIN, which does not run
--     net.http_post).
-- Every other job is left exactly as it is, with a NOTICE naming it.
-- The job's schedule and the value it sends both stay the same.

DO $mig$
DECLARE
  vault_ref CONSTANT text :=
    '(select decrypted_secret from vault.decrypted_secrets where name = ''quantis_shared_cron_secret'')';
  j record;
  new_cmd text;
  lit text;
  stmt text;
  i int;
  changed int := 0;
  skipped int := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'quantis_shared_cron_secret') THEN
    RAISE NOTICE 'cron-secret-to-vault: Vault secret quantis_shared_cron_secret is missing; no job changed';
    RETURN;
  END IF;

  FOR j IN
    SELECT jobid, jobname, command
    FROM cron.job
    WHERE command ILIKE '%x-cron-secret%'
      AND command NOT ILIKE '%vault.decrypted_secrets%'
    ORDER BY jobid
  LOOP
    new_cmd := j.command;

    -- Form 1: headers := '{"Content-Type":"application/json","x-cron-secret":"<value>"}'::jsonb
    -- Keep the other headers as a literal and add the Vault lookup.
    FOR i IN 1..5 LOOP
      lit := substring(new_cmd FROM '''(\{[^'']*"x-cron-secret"[^'']*\})''::jsonb');
      EXIT WHEN lit IS NULL;
      new_cmd := replace(
        new_cmd,
        '''' || lit || '''::jsonb',
        quote_literal((lit::jsonb - 'x-cron-secret')::text)
          || '::jsonb || jsonb_build_object(''x-cron-secret'', ' || vault_ref || ')'
      );
    END LOOP;

    -- Form 2: jsonb_build_object(..., 'x-cron-secret', '<value>', ...)
    new_cmd := regexp_replace(
      new_cmd,
      '''x-cron-secret''\s*,\s*''[^'']*''',
      '''x-cron-secret'', ' || vault_ref,
      'g'
    );

    IF new_cmd = j.command
       OR new_cmd NOT ILIKE '%vault.decrypted_secrets%'
       OR new_cmd ~ '"x-cron-secret"\s*:'
       OR new_cmd ~ '''x-cron-secret''\s*,\s*''' THEN
      RAISE NOTICE 'cron-secret-to-vault: job % (%) uses an x-cron-secret form this migration does not know; left unchanged',
        j.jobid, j.jobname;
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    -- Dry-run: the new command must still parse and plan. EXPLAIN does not
    -- execute net.http_post, so no request is sent.
    stmt := regexp_replace(regexp_replace(new_cmd, '^\s+', ''), '[;\s]+$', '');
    BEGIN
      IF stmt !~* '^select\s' OR position(';' IN stmt) > 0 THEN
        RAISE EXCEPTION 'not a single SELECT';
      END IF;
      EXECUTE 'EXPLAIN ' || stmt;
      PERFORM cron.alter_job(job_id := j.jobid, command := new_cmd);
      RAISE NOTICE 'cron-secret-to-vault: job % (%) now reads x-cron-secret from Vault', j.jobid, j.jobname;
      changed := changed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'cron-secret-to-vault: job % (%) left unchanged (%)', j.jobid, j.jobname, SQLERRM;
      skipped := skipped + 1;
    END;
  END LOOP;

  RAISE NOTICE 'cron-secret-to-vault: % job(s) moved to Vault, % left unchanged', changed, skipped;
END
$mig$;
