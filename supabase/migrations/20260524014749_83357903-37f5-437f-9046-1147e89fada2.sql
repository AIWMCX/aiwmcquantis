-- Backfill: forces the AFTER UPDATE trigger by setting result to itself.
-- Trigger guards on `result IS DISTINCT FROM` so we use a tiny round-trip.
UPDATE public.analyses
SET result = result || jsonb_build_object('_backfill_touch', extract(epoch from now())::text)
WHERE created_at >= '2026-01-18'::timestamptz
  AND id NOT IN (SELECT analysis_id::uuid FROM public.analysis_run_logs WHERE analysis_id ~ '^[0-9a-f-]{36}$');

-- Strip the touch marker
UPDATE public.analyses
SET result = result - '_backfill_touch'
WHERE result ? '_backfill_touch';