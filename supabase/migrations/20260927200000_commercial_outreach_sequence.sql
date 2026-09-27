-- Commercial Ops: outbound sequence layer (2026-09-27).
--
-- Additive only. Adds what the first real cold-outreach batch needs on top
-- of the existing followup/approval firewall:
--   * commercial_followups: kind (first_touch | followup), sequence_step,
--     subject, campaign_id, batch_id, contact snapshot at draft time
--   * commercial_prospects: contact_role, website (research inputs)
--   * commercial_agent_runs: 'first_touch' as an audited stage
--   * mark_commercial_followup_sent(): the founder's own confirmation that
--     an APPROVED message was sent by hand. Status 'sent' still requires
--     approved_by/approved_at (commercial_followups_approval_chk), so nothing
--     unapproved can ever be marked sent. Moves a 'discovered' prospect to
--     'contacted' with history, which is what the 30-day recent-contact
--     suppression rule reads.

ALTER TABLE public.commercial_followups
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'followup',
  ADD COLUMN IF NOT EXISTS sequence_step integer,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.commercial_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.commercial_batches(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commercial_followups_kind_chk') THEN
    ALTER TABLE public.commercial_followups
      ADD CONSTRAINT commercial_followups_kind_chk CHECK (kind IN ('first_touch', 'followup'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commercial_followups_sequence_step_chk') THEN
    ALTER TABLE public.commercial_followups
      ADD CONSTRAINT commercial_followups_sequence_step_chk CHECK (sequence_step IS NULL OR sequence_step BETWEEN 1 AND 10);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS commercial_followups_prospect_idx
  ON public.commercial_followups (prospect_id, created_at DESC);
CREATE INDEX IF NOT EXISTS commercial_followups_batch_idx
  ON public.commercial_followups (batch_id);

ALTER TABLE public.commercial_prospects
  ADD COLUMN IF NOT EXISTS contact_role text,
  ADD COLUMN IF NOT EXISTS website text;

ALTER TABLE public.commercial_agent_runs DROP CONSTRAINT IF EXISTS commercial_agent_runs_stage_chk;
ALTER TABLE public.commercial_agent_runs
  ADD CONSTRAINT commercial_agent_runs_stage_chk CHECK (
    stage IN ('offer', 'prospecting', 'call_preparation', 'objection_handling', 'follow_up', 'first_touch')
  );

CREATE OR REPLACE FUNCTION public.mark_commercial_followup_sent(_followup_id uuid)
RETURNS public.commercial_followups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.commercial_followups;
  v_stage public.commercial_funnel_stage;
BEGIN
  IF NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.commercial_followups
  SET status = 'sent', sent_at = now()
  WHERE id = _followup_id AND status = 'approved'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'followup not found or not approved: %', _followup_id;
  END IF;

  SELECT stage INTO v_stage FROM public.commercial_prospects WHERE id = v_row.prospect_id FOR UPDATE;
  IF v_stage = 'discovered' THEN
    INSERT INTO public.commercial_prospect_stage_history (prospect_id, from_stage, to_stage, reason, changed_by)
    VALUES (v_row.prospect_id, 'discovered', 'contacted', 'first message sent by founder', v_uid);
    UPDATE public.commercial_prospects SET stage = 'contacted', updated_at = now() WHERE id = v_row.prospect_id;
  END IF;

  IF v_row.batch_id IS NOT NULL THEN
    UPDATE public.commercial_batches SET sent_count = sent_count + 1 WHERE id = v_row.batch_id;
  END IF;

  RETURN v_row;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.mark_commercial_followup_sent(uuid) TO authenticated, service_role;
