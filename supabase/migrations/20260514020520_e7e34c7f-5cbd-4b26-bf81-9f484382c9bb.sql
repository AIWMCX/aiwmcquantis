-- ============================================================
-- WAVE 1: Conversion overhaul foundation
-- Additive schema changes; no data destruction.
-- ============================================================

-- ============= 1. analyses table: public teardowns + anonymous =============
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_slug text,
  ADD COLUMN IF NOT EXISTS founder_display_name text,
  ADD COLUMN IF NOT EXISTS idea_summary text,
  ADD COLUMN IF NOT EXISTS made_public_at timestamptz,
  ADD COLUMN IF NOT EXISTS anonymous_session_id text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'analyses_public_slug_unique') THEN
    CREATE UNIQUE INDEX analyses_public_slug_unique ON public.analyses(public_slug) WHERE public_slug IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_analyses_is_public_made
  ON public.analyses(is_public, made_public_at DESC NULLS LAST)
  WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_analyses_anon_session
  ON public.analyses(anonymous_session_id)
  WHERE anonymous_session_id IS NOT NULL;

-- ============= 2. shared_reports: teardown kind + caption + og image =============
ALTER TABLE public.shared_reports
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS caption text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS headline_verdict text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shared_reports_kind_check'
  ) THEN
    ALTER TABLE public.shared_reports
      ADD CONSTRAINT shared_reports_kind_check CHECK (kind IN ('private','teardown'));
  END IF;
END $$;

-- ============= 3. user_settings: bio + pinned + profile slug =============
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS bio_text text,
  ADD COLUMN IF NOT EXISTS pinned_post_text text,
  ADD COLUMN IF NOT EXISTS public_profile_slug text,
  ADD COLUMN IF NOT EXISTS show_in_teardowns boolean NOT NULL DEFAULT true;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_settings_profile_slug_unique') THEN
    CREATE UNIQUE INDEX user_settings_profile_slug_unique ON public.user_settings(public_profile_slug) WHERE public_profile_slug IS NOT NULL;
  END IF;
END $$;

-- ============= 4. RLS: anonymous read of public teardowns =============
DROP POLICY IF EXISTS "Public teardowns are readable by all" ON public.analyses;
CREATE POLICY "Public teardowns are readable by all"
  ON public.analyses
  FOR SELECT
  USING (is_public = true);

-- ============= 5. RLS: anonymous INSERT of analyses =============
-- Allows user_id IS NULL inserts as long as anonymous_session_id is provided.
DROP POLICY IF EXISTS "Anyone can create anonymous analysis" ON public.analyses;
CREATE POLICY "Anyone can create anonymous analysis"
  ON public.analyses
  FOR INSERT
  WITH CHECK (
    user_id IS NULL AND anonymous_session_id IS NOT NULL AND length(anonymous_session_id) BETWEEN 8 AND 128
  );

-- ============= 6. RPC: get_public_teardowns =============
CREATE OR REPLACE FUNCTION public.get_public_teardowns(
  p_limit int DEFAULT 24,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  public_slug text,
  founder_display_name text,
  idea_summary text,
  industry text,
  location text,
  headline_verdict text,
  confidence_score int,
  made_public_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.public_slug,
    COALESCE(NULLIF(a.founder_display_name, ''), 'Anonymous founder') AS founder_display_name,
    COALESCE(NULLIF(a.idea_summary, ''), LEFT(COALESCE(a.idea,''), 140)) AS idea_summary,
    COALESCE(a.result->>'industry_detected', 'Business') AS industry,
    a.location,
    COALESCE(
      a.result->'verdict'->>'headline',
      a.result->>'verdict_headline',
      a.result->>'verdict'
    ) AS headline_verdict,
    a.confidence_score,
    a.made_public_at
  FROM public.analyses a
  WHERE a.is_public = true
    AND a.public_slug IS NOT NULL
  ORDER BY a.made_public_at DESC NULLS LAST, a.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100))
  OFFSET GREATEST(0, p_offset)
$$;

GRANT EXECUTE ON FUNCTION public.get_public_teardowns(int, int) TO anon, authenticated;

-- ============= 7. RPC: get_public_teardown_by_slug (detail page) =============
CREATE OR REPLACE FUNCTION public.get_public_teardown_by_slug(p_slug text)
RETURNS TABLE (
  id uuid,
  public_slug text,
  founder_display_name text,
  idea_summary text,
  idea text,
  location text,
  industry text,
  result jsonb,
  confidence_score int,
  made_public_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.public_slug,
    COALESCE(NULLIF(a.founder_display_name, ''), 'Anonymous founder'),
    COALESCE(NULLIF(a.idea_summary, ''), LEFT(COALESCE(a.idea,''), 140)),
    a.idea,
    a.location,
    COALESCE(a.result->>'industry_detected', 'Business'),
    a.result,
    a.confidence_score,
    a.made_public_at
  FROM public.analyses a
  WHERE a.is_public = true AND a.public_slug = p_slug
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_public_teardown_by_slug(text) TO anon, authenticated;

-- ============= 8. RPC: set_analysis_public (owner toggles public + slug) =============
CREATE OR REPLACE FUNCTION public.set_analysis_public(
  p_analysis_id uuid,
  p_is_public boolean,
  p_founder_name text DEFAULT NULL,
  p_idea_summary text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_idea text;
  v_slug text;
  v_base text;
  v_n int := 0;
  v_existing_slug text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT user_id, idea, public_slug INTO v_owner, v_idea, v_existing_slug
  FROM public.analyses WHERE id = p_analysis_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Analysis not found';
  END IF;

  IF v_owner <> v_user THEN
    RAISE EXCEPTION 'Not authorized to modify this analysis';
  END IF;

  IF p_is_public THEN
    -- Reuse existing slug if already set
    IF v_existing_slug IS NOT NULL THEN
      v_slug := v_existing_slug;
    ELSE
      v_base := lower(regexp_replace(
        COALESCE(NULLIF(p_founder_name,''), 'founder') || '-' ||
        COALESCE(NULLIF(p_idea_summary,''), LEFT(COALESCE(v_idea,'teardown'), 40)),
        '[^a-z0-9]+', '-', 'gi'
      ));
      v_base := trim(both '-' from substring(v_base, 1, 60));
      IF v_base = '' OR v_base IS NULL THEN v_base := 'teardown'; END IF;
      v_slug := v_base;
      WHILE EXISTS (SELECT 1 FROM public.analyses WHERE public_slug = v_slug) LOOP
        v_n := v_n + 1;
        v_slug := v_base || '-' || v_n;
        IF v_n > 200 THEN
          v_slug := v_base || '-' || substr(md5(random()::text), 1, 6);
          EXIT;
        END IF;
      END LOOP;
    END IF;

    UPDATE public.analyses
    SET is_public = true,
        public_slug = v_slug,
        founder_display_name = NULLIF(p_founder_name, ''),
        idea_summary = NULLIF(p_idea_summary, ''),
        made_public_at = COALESCE(made_public_at, now())
    WHERE id = p_analysis_id;
  ELSE
    UPDATE public.analyses
    SET is_public = false,
        made_public_at = NULL
    WHERE id = p_analysis_id;
    v_slug := NULL;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'slug', v_slug,
    'is_public', p_is_public,
    'public_url', CASE WHEN p_is_public THEN '/teardowns/' || v_slug ELSE NULL END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_analysis_public(uuid, boolean, text, text) TO authenticated;

-- ============= 9. RPC: claim_anonymous_analysis (when anon user signs up) =============
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

GRANT EXECUTE ON FUNCTION public.claim_anonymous_analysis(uuid, text) TO authenticated;