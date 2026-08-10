-- Quantis Evidence Service — shadow-mode queue (PR E6.1).
--
-- Purpose: give the Evidence Service exactly one hook point into real
-- analyses, without touching any of the code paths that create them.
-- `public.analyses` rows are inserted from at least four different
-- places -- src/services/analysisDb.ts's saveAnalysis() and
-- saveAnonymousAnalysis() (client-side, user's own JWT),
-- migrateLocalStorageToDb() (client-side), and
-- promote-scenario-to-analysis/index.ts (server-side, service_role) --
-- and there is no single existing server-side function that all of them
-- pass through. A table-level AFTER INSERT trigger on public.analyses is
-- the only hook that covers all of them without modifying any of that
-- code, and it is a pure, fast, local INSERT with zero external I/O, so
-- it cannot add latency or a new failure mode to any of those existing
-- save paths.
--
-- This migration does NOT call an evidence provider, does NOT make any
-- network request, and does NOT write to any evidence_* table from
-- 20260810090000_evidence_service_schema.sql. It only queues a row for a
-- later worker (evidence-shadow-worker, PR E6.4) to pick up -- and that
-- worker is itself gated behind EVIDENCE_SERVICE_SHADOW_ENABLED, default
-- unset/false, so even once deployed this queue can fill up harmlessly
-- with zero processing until explicitly turned on.
--
-- Scope limitation, deliberate: only queues when NEW.user_id IS NOT
-- NULL. Anonymous analyses (saveAnonymousAnalysis) have no owner to
-- scope evidence rows to under the E5 RLS design (every evidence_* table
-- requires user_id NOT NULL), so v1 shadow coverage starts with
-- authenticated analyses only. Revisit if anonymous-flow evidence
-- coverage is ever wanted.

CREATE TABLE IF NOT EXISTS public.evidence_shadow_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea text NOT NULL,
  location text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'DONE', 'FAILED', 'SKIPPED')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS evidence_shadow_queue_status_created_idx
  ON public.evidence_shadow_queue(status, created_at)
  WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS evidence_shadow_queue_analysis_id_idx ON public.evidence_shadow_queue(analysis_id);

-- Fully closed except service_role -- this is an internal work queue, not
-- something any user needs to read via the REST API. Deliberately no
-- policy at all for anon/authenticated (not even a SELECT), which is a
-- stronger guarantee than a USING(false) policy: no grant means the role
-- cannot even attempt the query.
ALTER TABLE public.evidence_shadow_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_shadow_queue FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.evidence_shadow_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.evidence_shadow_queue TO service_role;

DROP POLICY IF EXISTS evidence_shadow_queue_service_all ON public.evidence_shadow_queue;
CREATE POLICY evidence_shadow_queue_service_all ON public.evidence_shadow_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.enqueue_evidence_shadow_run()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.evidence_shadow_queue (analysis_id, user_id, idea, location)
    VALUES (NEW.id, NEW.user_id, NEW.idea, NEW.location);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analyses_enqueue_evidence_shadow ON public.analyses;
CREATE TRIGGER analyses_enqueue_evidence_shadow
  AFTER INSERT ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_evidence_shadow_run();

-- No EXECUTE grants -- enqueue_evidence_shadow_run is a trigger function,
-- invoked internally by the executor, never callable directly via SQL by
-- any role.
