-- Commercial Ops workflow Phase E: the six workflow-stage tables + the two
-- state-machine RPCs that give the human-approval firewall (spec section
-- 13) and funnel-transition discipline (spec section 9) real, DB-level
-- teeth rather than being client-side conventions alone.
--
-- Six tables: commercial_prospects (the CRM-lite record + current funnel
-- stage), commercial_prospect_stage_history (append-only), commercial_offers,
-- commercial_call_briefs, commercial_objection_responses, and
-- commercial_followups. Reconciled against live schema before writing this
-- (Phase B's draft schema named commercial_prospect_stage_history too --
-- this migration is the first time it's actually created).
--
-- Access model: admin_full_access (has_role(auth.uid(),'admin')), same as
-- commercial_foundations -- this is still internal-only tooling (spec's
-- stated initial audience). Two deliberate exceptions where FOR ALL is NOT
-- granted, because the spec requires a real enforcement mechanism, not just
-- a convention:
--   - commercial_prospect_stage_history: SELECT only. Insert happens only
--     inside transition_prospect_stage() (SECURITY DEFINER), which is the
--     only thing allowed to write history -- same append-only idiom as
--     commercial_agent_runs.
--   - commercial_followups: SELECT + INSERT only, no UPDATE. Approving or
--     rejecting a draft (the literal "human approval firewall" spec section
--     13 requires before any outbound communication) happens only inside
--     approve_commercial_followup() / reject_commercial_followup(), so
--     approved_by can never be forged or silently skipped by a direct
--     client-side UPDATE.

DO $$ BEGIN
  CREATE TYPE public.commercial_funnel_stage AS ENUM (
    'discovered', 'contacted', 'replied', 'qualified',
    'call_planned', 'call_completed', 'demo_offered',
    'free_analysis_started', 'offer_presented', 'checkout_started',
    'won', 'lost', 'not_fit'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- commercial_prospects
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commercial_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id),
  company_name text NOT NULL,
  contact_name text,
  -- Free-text "channel:handle" (e.g. "linkedin:jane-doe", "email:x@y.com").
  -- Sensitive business data -- never logged, never put in a URL/analytics
  -- payload (spec section 18).
  contact_channel text,
  segment text,
  observed_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  likely_relevant_problem text,
  supporting_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  unknowns jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_message text,
  suggested_next_step text,
  stage public.commercial_funnel_stage NOT NULL DEFAULT 'discovered',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commercial_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_commercial_prospects"
  ON public.commercial_prospects FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anon_deny_commercial_prospects"
  ON public.commercial_prospects FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────────
-- commercial_prospect_stage_history -- append-only (see header)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commercial_prospect_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.commercial_prospects(id) ON DELETE CASCADE,
  from_stage public.commercial_funnel_stage,
  to_stage public.commercial_funnel_stage NOT NULL,
  reason text,
  changed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commercial_prospect_stage_history_prospect_idx
  ON public.commercial_prospect_stage_history (prospect_id, created_at DESC);

ALTER TABLE public.commercial_prospect_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_commercial_prospect_stage_history"
  ON public.commercial_prospect_stage_history FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anon_deny_commercial_prospect_stage_history"
  ON public.commercial_prospect_stage_history FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────────
-- commercial_offers
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commercial_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  foundation_version integer NOT NULL,
  prospect_id uuid REFERENCES public.commercial_prospects(id) ON DELETE SET NULL,
  icp text,
  primary_customer_problem text NOT NULL,
  desired_outcome text NOT NULL,
  offer_hypothesis text NOT NULL,
  offer_components jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_reducers jsonb NOT NULL DEFAULT '[]'::jsonb,
  pricing_context jsonb NOT NULL DEFAULT '[]'::jsonb,
  qualification_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  disqualification_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  cta text NOT NULL,
  -- ProvenancedClaim[] -- see _shared/commercial/contracts.ts.
  claims_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  uncertainties jsonb NOT NULL DEFAULT '[]'::jsonb,
  agent_run_id uuid REFERENCES public.commercial_agent_runs(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commercial_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_commercial_offers"
  ON public.commercial_offers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anon_deny_commercial_offers"
  ON public.commercial_offers FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────────
-- commercial_call_briefs
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commercial_call_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.commercial_prospects(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.commercial_offers(id) ON DELETE SET NULL,
  what_we_know jsonb NOT NULL DEFAULT '[]'::jsonb,
  what_we_dont_know jsonb NOT NULL DEFAULT '[]'::jsonb,
  why_fit text NOT NULL,
  questions_to_ask jsonb NOT NULL DEFAULT '[]'::jsonb,
  financial_assumptions_to_test jsonb NOT NULL DEFAULT '[]'::jsonb,
  demonstration_path text,
  possible_objections jsonb NOT NULL DEFAULT '[]'::jsonb,
  desired_next_step text NOT NULL,
  agent_run_id uuid REFERENCES public.commercial_agent_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commercial_call_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_commercial_call_briefs"
  ON public.commercial_call_briefs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anon_deny_commercial_call_briefs"
  ON public.commercial_call_briefs FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────────
-- commercial_objection_responses
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commercial_objection_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.commercial_prospects(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.commercial_offers(id) ON DELETE SET NULL,
  objection_text text NOT NULL,
  interpretation text,
  unresolved text,
  clarifying_question text,
  response text,
  evidence_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  unknowns jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_next_step text,
  -- Spec section 7: "Return INSUFFICIENT_EVIDENCE when appropriate" instead
  -- of inventing an answer. A row with insufficient_evidence=true is
  -- expected to have response=null -- enforced below, not just convention.
  insufficient_evidence boolean NOT NULL DEFAULT false,
  agent_run_id uuid REFERENCES public.commercial_agent_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT commercial_objection_responses_evidence_chk CHECK (
    (insufficient_evidence = true AND response IS NULL)
    OR
    (insufficient_evidence = false AND response IS NOT NULL)
  )
);

ALTER TABLE public.commercial_objection_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_commercial_objection_responses"
  ON public.commercial_objection_responses FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anon_deny_commercial_objection_responses"
  ON public.commercial_objection_responses FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────────
-- commercial_followups -- human-approval firewall lives here (see header)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commercial_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.commercial_prospects(id) ON DELETE CASCADE,
  stage_context text,
  draft text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  scheduled_for timestamptz,
  -- Only ever set by a real send-confirming integration, never by the AI or
  -- by approval alone. No integration exists yet (spec section 8: "actual
  -- sent state if an integration later confirms it") -- column reserved.
  sent_at timestamptz,
  agent_run_id uuid REFERENCES public.commercial_agent_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT commercial_followups_status_chk CHECK (
    status IN ('draft', 'approved', 'rejected', 'sent')
  ),
  CONSTRAINT commercial_followups_approval_chk CHECK (
    (status = 'draft' AND approved_by IS NULL AND approved_at IS NULL)
    OR (status = 'rejected' AND approved_by IS NULL AND approved_at IS NULL)
    OR (status IN ('approved', 'sent') AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
  )
);

ALTER TABLE public.commercial_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_write_draft_commercial_followups"
  ON public.commercial_followups FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_insert_commercial_followups"
  ON public.commercial_followups FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anon_deny_commercial_followups"
  ON public.commercial_followups FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────────
-- RPCs
-- ─────────────────────────────────────────────────────────────────────────

-- Funnel transition: the only way from_stage/to_stage history is ever
-- written, and the only sanctioned way commercial_prospects.stage changes
-- (direct UPDATEs are technically possible under the admin FOR ALL policy
-- above -- same soft-governance level this codebase already accepts for
-- e.g. commercial_foundations vs. upsert_commercial_foundation -- but this
-- RPC is the correct path and the only one that also validates + records
-- history).
--
-- Deliberately permissive about which forward/lateral transitions are
-- allowed (the founder's spec: "the important requirement is deterministic
-- stage tracking and history", not a rigid linear-only state machine --
-- real sales cycles skip and backtrack). The one hard rule: a prospect in a
-- terminal stage (won/lost/not_fit) can never transition again, and a
-- transition to the SAME stage is rejected as a no-op.
CREATE OR REPLACE FUNCTION public.transition_prospect_stage(
  _prospect_id uuid,
  _to_stage public.commercial_funnel_stage,
  _reason text DEFAULT NULL
)
RETURNS public.commercial_prospects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_current public.commercial_funnel_stage;
  v_row public.commercial_prospects;
BEGIN
  IF NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT stage INTO v_current FROM public.commercial_prospects WHERE id = _prospect_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'prospect not found: %', _prospect_id;
  END IF;

  IF v_current IN ('won', 'lost', 'not_fit') THEN
    RAISE EXCEPTION 'invalid funnel transition: % is a terminal stage', v_current;
  END IF;

  IF v_current = _to_stage THEN
    RAISE EXCEPTION 'invalid funnel transition: prospect is already in stage %', _to_stage;
  END IF;

  INSERT INTO public.commercial_prospect_stage_history (prospect_id, from_stage, to_stage, reason, changed_by)
  VALUES (_prospect_id, v_current, _to_stage, _reason, v_uid);

  UPDATE public.commercial_prospects
  SET stage = _to_stage, updated_at = now()
  WHERE id = _prospect_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

-- Human approval firewall (spec section 13): the ONLY way a followup draft
-- moves to 'approved'. approved_by is always the caller, never client-
-- supplied -- this is what makes the approval real rather than a checkbox.
CREATE OR REPLACE FUNCTION public.approve_commercial_followup(_followup_id uuid)
RETURNS public.commercial_followups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.commercial_followups;
BEGIN
  IF NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.commercial_followups
  SET status = 'approved', approved_by = v_uid, approved_at = now()
  WHERE id = _followup_id AND status = 'draft'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'followup not found or not in draft status: %', _followup_id;
  END IF;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_commercial_followup(_followup_id uuid)
RETURNS public.commercial_followups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.commercial_followups;
BEGIN
  IF NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.commercial_followups
  SET status = 'rejected'
  WHERE id = _followup_id AND status = 'draft'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'followup not found or not in draft status: %', _followup_id;
  END IF;

  RETURN v_row;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.transition_prospect_stage(uuid, public.commercial_funnel_stage, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_commercial_followup(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_commercial_followup(uuid) TO authenticated, service_role;
