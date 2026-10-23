-- Repair: anonymous analyses have never been saved in production.
--
-- Found 2026-10-23: migration 20260514020520 (Wave 1 conversion foundation)
-- never applied -- it ALTERs public.user_settings, which does not exist in
-- production, so analyses.anonymous_session_id (and the teardown columns) are
-- missing. Every anonymous insert failed with PGRST204, the client fell back
-- to a browser-only id, and 0 of 223 analyses have user_id IS NULL. That also
-- broke claim_anonymous_analysis (42703), so a visitor who signed up from
-- their report never got it in their account.
--
-- This applies ONLY what the anonymous save + claim path needs. Idempotent.
-- The teardown/profile parts of 20260514020520 stay unapplied (separate).

ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS anonymous_session_id text;

CREATE INDEX IF NOT EXISTS idx_analyses_anon_session
  ON public.analyses(anonymous_session_id)
  WHERE anonymous_session_id IS NOT NULL;

DROP POLICY IF EXISTS "Anyone can create anonymous analysis" ON public.analyses;
CREATE POLICY "Anyone can create anonymous analysis"
  ON public.analyses
  FOR INSERT
  WITH CHECK (
    user_id IS NULL AND anonymous_session_id IS NOT NULL AND length(anonymous_session_id) BETWEEN 8 AND 128
  );

CREATE OR REPLACE FUNCTION public.claim_anonymous_analysis(p_analysis_id uuid, p_anonymous_session_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_updated int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.analyses
  SET user_id = v_user
  WHERE id = p_analysis_id
    AND user_id IS NULL
    AND anonymous_session_id = p_anonymous_session_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN jsonb_build_object('claimed', v_updated > 0);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_anonymous_analysis(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_anonymous_analysis(uuid, text) TO authenticated;
