-- Commercial Ops workflow Phase D: shared agent-runtime audit log.
--
-- One row per stage invocation (success OR failure) of runCommercialAgent()
-- (supabase/functions/_shared/commercial/agent-runtime.ts). Distinct from
-- public.ai_calls (raw LLM telemetry, written by _shared/llm-call.ts for
-- EVERY provider call across the whole app, tier/task-agnostic) -- this
-- table is the commercial-workflow-specific stage audit trail: which stage
-- ran, against which foundation version, with what validated (or rejected)
-- structured output. Append-only from the runtime's perspective: one INSERT
-- per invocation, never updated afterward.
--
-- Six workflow stages exist in the founder's spec (offer, prospecting, call
-- preparation, objection handling, follow-up, funnel, outcome, learning),
-- but only the AI-generative ones are agent-runtime stages -- funnel/outcome
-- are plain state transitions (their own tables land in Phase E alongside
-- the logic that uses them, per this feature's phase discipline: no unused
-- schema ahead of real code). The stage CHECK list below is intentionally
-- short and will be extended by a future migration (same pattern already
-- used for funnel_events_canonical_name_chk) as Phase E adds stages.

CREATE TABLE IF NOT EXISTS public.commercial_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage text NOT NULL,
  -- Soft reference (no FK): commercial_foundations.version has no unique
  -- constraint of its own today, and this column only needs to record which
  -- version was current AT CALL TIME for traceability -- not enforce it.
  foundation_version integer NOT NULL,
  -- Caller-supplied context (evidence refs, prior stage outputs, prospect
  -- id, etc.) persisted for traceability. Callers must never put secrets or
  -- raw credentials here -- this table is admin-readable, not encrypted.
  input_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  ok boolean NOT NULL,
  rejection_reason text,
  raw_preview text,
  output jsonb,
  model text,
  latency_ms integer,
  repaired boolean NOT NULL DEFAULT false,
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT commercial_agent_runs_stage_chk CHECK (
    stage IN ('offer', 'prospecting', 'call_preparation', 'objection_handling', 'follow_up')
  ),
  CONSTRAINT commercial_agent_runs_rejection_reason_chk CHECK (
    rejection_reason IS NULL OR rejection_reason IN ('schema', 'reconcile', 'empty', 'provider_error')
  ),
  -- A run is either a validated success (output present, no rejection) or a
  -- typed rejection (reason present, output absent) -- never both, never
  -- neither. Mirrors r3Validate's own R3Result discriminated union.
  CONSTRAINT commercial_agent_runs_ok_consistency_chk CHECK (
    (ok = true AND rejection_reason IS NULL AND output IS NOT NULL)
    OR
    (ok = false AND rejection_reason IS NOT NULL AND output IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS commercial_agent_runs_stage_created_at_idx
  ON public.commercial_agent_runs (stage, created_at DESC);

ALTER TABLE public.commercial_agent_runs ENABLE ROW LEVEL SECURITY;

-- Read-only for admins: this is an audit trail, not something admins should
-- hand-edit through the client. All writes happen server-side via the
-- service-role key inside runCommercialAgent(), which bypasses RLS entirely
-- -- so no INSERT/UPDATE/DELETE policy exists here (same enforcement idiom
-- as commercial_prospect_stage_history's append-only design in the Phase B
-- draft schema: the absence of a policy IS the guarantee).
CREATE POLICY "admin_read_commercial_agent_runs"
  ON public.commercial_agent_runs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anon_deny_commercial_agent_runs"
  ON public.commercial_agent_runs
  FOR ALL
  USING (false)
  WITH CHECK (false);
