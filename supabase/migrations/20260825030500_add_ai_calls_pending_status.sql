-- Two-phase ai_calls telemetry: a 'status' column so a call can be recorded
-- BEFORE it executes and finalized in a `finally` block after.
--
-- Root-caused during the 2026-08-24 Dahl DAHL_UNAVAILABLE incident
-- investigation: recordAiCall() was only ever invoked once, post-hoc, after
-- dahlChatCompletion() already returned. If the edge function's own process
-- is killed mid-request (platform wall-clock limit, OOM, uncaught exception
-- upstream of the write) there is NO row at all for that call -- exactly the
-- catastrophic-failure case telemetry most needs to catch. `ok boolean not
-- null` has no way to represent "started, not yet finished", so a real
-- status column is required rather than overloading `ok`.
--
-- 'pending' rows are written synchronously before the provider call; the
-- caller then UPDATEs the same row to 'completed' or 'failed' in a finally
-- block. A 'pending' row that's never finalized (the crash case) is itself
-- diagnostic signal -- previously that case produced silence.

-- Nullable-then-backfill-then-lock, not a blanket DEFAULT 'completed': every
-- pre-existing row already has an accurate `ok` value, so backfilling status
-- from it (CodeRabbit catch on PR #85) keeps status/ok consistent for EVERY
-- row, past and future -- a blanket default would have mislabeled every
-- historical failed call (ok=false) as status='completed'.
ALTER TABLE public.ai_calls
  ADD COLUMN status text;

UPDATE public.ai_calls
  SET status = CASE WHEN ok THEN 'completed' ELSE 'failed' END
  WHERE status IS NULL;

ALTER TABLE public.ai_calls
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'completed';

ALTER TABLE public.ai_calls
  ADD CONSTRAINT ai_calls_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text]));

-- Retry/repair counters, populated only for Dahl calls (dahl-adapter.ts is
-- the only caller with internal retry/repair logic). Nullable: legacy
-- providers never had this concept and should stay NULL, not 0, so
-- "0 retries happened" and "this provider doesn't track retries" remain
-- distinguishable.
ALTER TABLE public.ai_calls
  ADD COLUMN retry_count integer,
  ADD COLUMN repair_attempted boolean;

CREATE INDEX IF NOT EXISTS ai_calls_pending_idx
  ON public.ai_calls (created_at)
  WHERE status = 'pending';

COMMENT ON COLUMN public.ai_calls.status IS
  'pending = row written before the provider call started; completed/failed = finalized after the call returned. A pending row with no matching completed/failed row for the same request_id means the process died mid-call.';
