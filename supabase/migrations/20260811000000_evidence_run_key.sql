-- Quantis Evidence Service — semantic run identity (PR E6.2).
--
-- Closes the queue-level idempotency gap flagged in this branch's E5.5
-- gate review: the existing PENDING->PROCESSING row claim in
-- evidence-shadow-worker prevents two concurrent workers from
-- double-processing the SAME queue row, but does nothing to stop two
-- DIFFERENT queue rows (a duplicate trigger fire, a retried item after a
-- crash mid-persistence) from producing two independent, fully-persisted
-- evidence_packets rows for the same analysis under the same evidence
-- plan.
--
-- run_key = SHA256(analysisRunId : evidencePlanVersion : evidenceSchemaVersion),
-- computed identically by supabase/functions/_shared/evidence/
-- evidence-run-key.ts. Enforced here as a real unique constraint, not
-- only application-level logic -- per the explicit founder requirement
-- that this be a DB-level guarantee. A plan or schema version upgrade
-- legitimately produces a different run_key (a new run, not a duplicate).

ALTER TABLE public.evidence_packets ADD COLUMN IF NOT EXISTS run_key text;

-- Backfill is not attempted: no evidence_packets rows exist anywhere yet
-- (this table has never been deployed to production, and no isolated CI
-- run has ever persisted a real row outside its own transaction). NOT
-- NULL is safe to add directly rather than via a separate follow-up step.
ALTER TABLE public.evidence_packets ALTER COLUMN run_key SET NOT NULL;

ALTER TABLE public.evidence_packets
  ADD CONSTRAINT evidence_packets_run_key_format CHECK (run_key ~ '^[0-9a-f]{64}$');

CREATE UNIQUE INDEX IF NOT EXISTS evidence_packets_run_key_uidx
  ON public.evidence_packets(run_key);
