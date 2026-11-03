-- LinkedIn Growth Agent (admin-only): fit-scored queue, linted drafts,
-- every LinkedIn action sent by the founder by hand.
-- Design: LinkedIn Growth Agent PRD 2026-11-03 (sections 3.4 to 3.10).
--
-- Compliance (LinkedIn User Agreement 8.2, API Terms): nothing in this schema
-- or its RPCs talks to LinkedIn. Rows are what the founder typed or pasted:
-- people he chose to add, post text he pasted, touches he says he sent.
--
-- People are NOT duplicated: li_engagement_targets is a 1:1 extension of
-- public.commercial_prospects (same id), holding only the LinkedIn-specific
-- fields. Do-not-contact reuses commercial_prospects.suppression_status, so a
-- "stop" on LinkedIn also stops email outreach. Stage changes go through the
-- existing transition_prospect_stage(); outcomes also land in
-- commercial_outcomes.
--
-- Access: admin only, public.has_role(auth.uid(), 'admin'::app_role), same as
-- the commercial_* tables. Drafts and touches are SELECT-only for clients:
--   - a draft becomes 'approved' only through the li-growth-draft edge
--     function after the server-side lint passes (service role),
--   - 'sent' / 'skipped' and every touch go through the SECURITY DEFINER RPCs
--     below, which enforce the daily caps, the pause switches, the author
--     cool-down and the one-follow-up rule.

-- ─────────────────────────────────────────────────────────────────────────
-- Targets: the LinkedIn side of a commercial_prospects row
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.li_engagement_targets (
  prospect_id uuid PRIMARY KEY REFERENCES public.commercial_prospects(id) ON DELETE CASCADE,
  -- normalized https://www.linkedin.com/in/<slug>; only URL "Copy & open" opens
  linkedin_url text NOT NULL UNIQUE CHECK (linkedin_url ~ '^https://www\.linkedin\.com/in/[^/?#[:space:]]+$'),
  headline text CHECK (headline IS NULL OR char_length(headline) <= 300),
  country text,
  business_type text CHECK (business_type IS NULL OR business_type IN
    ('service', 'cfo_practice', 'saas', 'enterprise', 'ecommerce', 'other')),
  employees integer CHECK (employees IS NULL OR employees >= 0),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN
    ('manual', 'csv', 'crm', 'zoho', 'vibe_prospecting', 'apollo', 'own_post_engager', 'watchlist_engager', 'own_network')),
  warmth text NOT NULL DEFAULT 'cold' CHECK (warmth IN
    ('engaged_my_post', 'replied_my_comment', 'watchlist_comment', 'mutual_connection', 'cold')),
  connection_degree smallint CHECK (connection_degree IS NULL OR connection_degree IN (1, 2, 3)),
  posts_weekly boolean NOT NULL DEFAULT false,
  has_verified_email boolean NOT NULL DEFAULT false,
  persona text CHECK (persona IS NULL OR persona IN
    ('fractional_cfo', 'fpa_consultant', 'advisory_cpa', 'owner_operator', 'other')),
  fit_score smallint CHECK (fit_score IS NULL OR fit_score BETWEEN 0 AND 100),
  fit_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  fit_version text,
  fit_scored_at timestamptz,
  nurture_until date,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS li_targets_fit_idx ON public.li_engagement_targets (fit_score DESC);

-- ─────────────────────────────────────────────────────────────────────────
-- Signals: a reason to engage (a post the founder pasted, or an event)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.li_engagement_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.li_engagement_targets(prospect_id) ON DELETE CASCADE,
  signal_type text NOT NULL CHECK (signal_type IN
    ('their_post', 'their_comment', 'engaged_my_post', 'job_posting', 'hiring_event',
     'new_location', 'role_change', 'funding', 'other')),
  capture_method text NOT NULL DEFAULT 'manual_paste' CHECK (capture_method IN
    ('manual_paste', 'explorium', 'apollo', 'zoho')),
  post_url text CHECK (post_url IS NULL OR post_url ~ '^https://www\.linkedin\.com/'),
  -- pasted by the founder, never fetched; nulled 30 days later (cron below)
  excerpt text CHECK (excerpt IS NULL OR char_length(excerpt) <= 1200),
  observed_at timestamptz NOT NULL DEFAULT now(),
  evidence_state text NOT NULL DEFAULT 'observed' CHECK (evidence_state IN ('observed', 'inferred')),
  excerpt_purge_after date NOT NULL DEFAULT (current_date + 30),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS li_signals_prospect_idx
  ON public.li_engagement_signals (prospect_id, observed_at DESC);

-- ─────────────────────────────────────────────────────────────────────────
-- Fact bank: the only numbers a draft may use besides the prospect's own
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.li_fact_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fact text NOT NULL CHECK (char_length(fact) BETWEEN 5 AND 500),
  numbers text[] NOT NULL DEFAULT '{}',
  source_url text NOT NULL CHECK (source_url ~ '^https?://'),
  verified_at date NOT NULL,
  topic text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Drafts: one comment or DM for one person, draft -> approved -> sent|skipped
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.li_engagement_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.li_engagement_targets(prospect_id) ON DELETE CASCADE,
  signal_id uuid REFERENCES public.li_engagement_signals(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('comment', 'dm_first', 'dm_followup')),
  target_url text NOT NULL CHECK (target_url ~ '^https://www\.linkedin\.com/'),
  rationale text NOT NULL,
  draft_text text NOT NULL,
  lint_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent', 'skipped')),
  final_text text,
  skip_reason text CHECK (skip_reason IS NULL OR char_length(skip_reason) <= 300),
  attempts smallint NOT NULL DEFAULT 1,
  generator_model text,
  rules_version text,
  approved_at timestamptz,
  sent_at timestamptz,
  skipped_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT li_drafts_approved_has_text CHECK (status NOT IN ('approved', 'sent') OR final_text IS NOT NULL),
  CONSTRAINT li_drafts_sent_has_time CHECK (status <> 'sent' OR sent_at IS NOT NULL)
);

-- At most one open draft per person and action (Regenerate overwrites it).
CREATE UNIQUE INDEX IF NOT EXISTS li_drafts_one_open_idx
  ON public.li_engagement_drafts (prospect_id, action_type) WHERE status IN ('draft', 'approved');
CREATE INDEX IF NOT EXISTS li_drafts_status_idx ON public.li_engagement_drafts (status, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────
-- Touches: append-only log of what the founder did and what came back
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.li_engagement_touches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.li_engagement_targets(prospect_id) ON DELETE CASCADE,
  draft_id uuid REFERENCES public.li_engagement_drafts(id) ON DELETE SET NULL,
  touch_type text NOT NULL CHECK (touch_type IN
    ('comment', 'dm_first', 'dm_followup', 'connect_no_note', 'connect_accepted',
     'reply_received', 'call_booked', 'call_done', 'paid')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  reply_class text CHECK (reply_class IS NULL OR reply_class IN
    ('positive', 'neutral', 'negative', 'objection', 'not_now')),
  revenue_cents integer CHECK (revenue_cents IS NULL OR revenue_cents >= 0),
  note text CHECK (note IS NULL OR char_length(note) <= 2000),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT li_touches_reply_has_class CHECK (touch_type <> 'reply_received' OR reply_class IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS li_touches_prospect_idx ON public.li_engagement_touches (prospect_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS li_touches_type_idx ON public.li_engagement_touches (touch_type, occurred_at DESC);
-- One DM sequence per person: one first touch, one follow-up, never a second.
CREATE UNIQUE INDEX IF NOT EXISTS li_touches_one_dm_first_idx
  ON public.li_engagement_touches (prospect_id) WHERE touch_type = 'dm_first';
CREATE UNIQUE INDEX IF NOT EXISTS li_touches_one_followup_idx
  ON public.li_engagement_touches (prospect_id) WHERE touch_type = 'dm_followup';

-- ─────────────────────────────────────────────────────────────────────────
-- Settings: caps, ramp week, pause switches (single row)
-- The CHECK upper bounds are the PRD 3.8 week-3 ceilings (src/lib/li-growth/
-- caps.ts CEILING); the founder can lower caps, never raise them past these.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.li_engagement_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  ramp_week smallint NOT NULL DEFAULT 1 CHECK (ramp_week BETWEEN 1 AND 3),
  max_comments_day smallint NOT NULL DEFAULT 5 CHECK (max_comments_day BETWEEN 0 AND 10),
  max_dm_first_day smallint NOT NULL DEFAULT 3 CHECK (max_dm_first_day BETWEEN 0 AND 10),
  max_dm_followup_day smallint NOT NULL DEFAULT 5 CHECK (max_dm_followup_day BETWEEN 0 AND 5),
  max_connects_day smallint NOT NULL DEFAULT 5 CHECK (max_connects_day BETWEEN 0 AND 10),
  max_connects_week smallint NOT NULL DEFAULT 50 CHECK (max_connects_week BETWEEN 0 AND 50),
  max_comments_per_author smallint NOT NULL DEFAULT 2 CHECK (max_comments_per_author BETWEEN 1 AND 2),
  author_cooldown_days smallint NOT NULL DEFAULT 7 CHECK (author_cooldown_days BETWEEN 7 AND 30),
  followup_min_business_days smallint NOT NULL DEFAULT 5 CHECK (followup_min_business_days BETWEEN 5 AND 15),
  fit_threshold_dm smallint NOT NULL DEFAULT 70 CHECK (fit_threshold_dm BETWEEN 50 AND 100),
  fit_threshold_comment smallint NOT NULL DEFAULT 50 CHECK (fit_threshold_comment BETWEEN 30 AND 100),
  paused_until date,
  warning_paused_until date,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.li_engagement_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.li_engagement_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.li_engagement_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.li_fact_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.li_engagement_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.li_engagement_touches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.li_engagement_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_li_engagement_targets"
  ON public.li_engagement_targets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "anon_deny_li_engagement_targets"
  ON public.li_engagement_targets FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "admin_full_access_li_engagement_signals"
  ON public.li_engagement_signals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "anon_deny_li_engagement_signals"
  ON public.li_engagement_signals FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "admin_full_access_li_fact_bank"
  ON public.li_fact_bank FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "anon_deny_li_fact_bank"
  ON public.li_fact_bank FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "admin_read_li_engagement_drafts"
  ON public.li_engagement_drafts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "anon_deny_li_engagement_drafts"
  ON public.li_engagement_drafts FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "admin_read_li_engagement_touches"
  ON public.li_engagement_touches FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "anon_deny_li_engagement_touches"
  ON public.li_engagement_touches FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "admin_read_li_engagement_settings"
  ON public.li_engagement_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin_update_li_engagement_settings"
  ON public.li_engagement_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "anon_deny_li_engagement_settings"
  ON public.li_engagement_settings FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────────────────

-- Weekdays in (_from, _to]. Mirrors businessDaysBetween() in caps.ts.
CREATE OR REPLACE FUNCTION public.li_business_days_between(_from date, _to date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $function$
  SELECT count(*)::integer
  FROM generate_series((_from + 1)::timestamp, _to::timestamp, interval '1 day') AS d
  WHERE extract(isodow FROM d) < 6;
$function$;

-- Moves a prospect forward only (enum order), never out of a terminal stage,
-- through the existing transition_prospect_stage() so history is recorded.
CREATE OR REPLACE FUNCTION public.li_advance_stage(
  _prospect_id uuid,
  _to public.commercial_funnel_stage,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_cur public.commercial_funnel_stage;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  SELECT stage INTO v_cur FROM public.commercial_prospects WHERE id = _prospect_id;
  IF v_cur IS NULL OR v_cur IN ('won', 'lost', 'not_fit') OR v_cur >= _to THEN
    RETURN;
  END IF;
  PERFORM public.transition_prospect_stage(_prospect_id, _to, _reason);
END;
$function$;

-- Daily cap check shared by both write RPCs.
CREATE OR REPLACE FUNCTION public.li_assert_capacity(_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_s public.li_engagement_settings;
  v_today date := (now() AT TIME ZONE 'America/Denver')::date;
  v_warning boolean;
  v_cap integer;
  v_used integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_s FROM public.li_engagement_settings WHERE id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'li_engagement_settings row missing';
  END IF;
  IF v_s.paused_until IS NOT NULL AND v_s.paused_until >= v_today THEN
    RAISE EXCEPTION 'outreach is paused through %', v_s.paused_until;
  END IF;
  v_warning := v_s.warning_paused_until IS NOT NULL AND v_s.warning_paused_until >= v_today;
  IF v_warning AND _action <> 'comment' THEN
    RAISE EXCEPTION 'DMs and connection requests are paused through % after a LinkedIn warning', v_s.warning_paused_until;
  END IF;

  v_cap := CASE _action
    WHEN 'comment' THEN CASE WHEN v_warning THEN v_s.max_comments_day / 2 ELSE v_s.max_comments_day END
    WHEN 'dm_first' THEN v_s.max_dm_first_day
    WHEN 'dm_followup' THEN v_s.max_dm_followup_day
    WHEN 'connect_no_note' THEN v_s.max_connects_day
  END;
  IF v_cap IS NULL THEN
    RAISE EXCEPTION 'unknown action %', _action;
  END IF;

  SELECT count(*) INTO v_used FROM public.li_engagement_touches
  WHERE touch_type = _action AND (occurred_at AT TIME ZONE 'America/Denver')::date = v_today;
  IF v_used >= v_cap THEN
    RAISE EXCEPTION 'daily cap reached for % (% of %)', _action, v_used, v_cap;
  END IF;

  IF _action = 'connect_no_note' THEN
    SELECT count(*) INTO v_used FROM public.li_engagement_touches
    WHERE touch_type = 'connect_no_note' AND occurred_at > now() - interval '7 days';
    IF v_used >= v_s.max_connects_week THEN
      RAISE EXCEPTION 'weekly connection cap reached (% of %)', v_used, v_s.max_connects_week;
    END IF;
  END IF;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- RPC: the founder sent an approved draft by hand in LinkedIn
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.li_mark_draft_sent(_draft_id uuid)
RETURNS public.li_engagement_drafts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_draft public.li_engagement_drafts;
  v_target public.li_engagement_targets;
  v_s public.li_engagement_settings;
  v_suppression text;
  v_today date := (now() AT TIME ZONE 'America/Denver')::date;
  v_first timestamptz;
  v_count integer;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_draft FROM public.li_engagement_drafts WHERE id = _draft_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'draft not found';
  END IF;
  IF v_draft.status <> 'approved' OR v_draft.final_text IS NULL THEN
    RAISE EXCEPTION 'use Copy & open first: only an approved, lint-clean draft can be marked sent';
  END IF;

  SELECT * INTO v_target FROM public.li_engagement_targets WHERE prospect_id = v_draft.prospect_id;
  SELECT suppression_status INTO v_suppression FROM public.commercial_prospects WHERE id = v_draft.prospect_id;
  IF v_suppression IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'prospect is suppressed (%)', v_suppression;
  END IF;

  PERFORM public.li_assert_capacity(v_draft.action_type);
  SELECT * INTO v_s FROM public.li_engagement_settings WHERE id;

  IF v_draft.action_type = 'comment' THEN
    SELECT count(*) INTO v_count FROM public.li_engagement_touches
    WHERE prospect_id = v_draft.prospect_id AND touch_type = 'comment'
      AND occurred_at > now() - make_interval(days => v_s.author_cooldown_days);
    IF v_count >= v_s.max_comments_per_author THEN
      RAISE EXCEPTION 'author cool-down: % comments on this person in the last % days', v_count, v_s.author_cooldown_days;
    END IF;
  ELSE
    IF v_target.connection_degree IS DISTINCT FROM 1 THEN
      RAISE EXCEPTION 'DMs go to 1st-degree connections only';
    END IF;
  END IF;

  IF v_draft.action_type = 'dm_first' THEN
    IF v_target.nurture_until IS NOT NULL AND v_target.nurture_until >= v_today THEN
      RAISE EXCEPTION 'prospect is in nurture until %: no DMs', v_target.nurture_until;
    END IF;
  END IF;

  IF v_draft.action_type = 'dm_followup' THEN
    SELECT occurred_at INTO v_first FROM public.li_engagement_touches
    WHERE prospect_id = v_draft.prospect_id AND touch_type = 'dm_first';
    IF v_first IS NULL THEN
      RAISE EXCEPTION 'no first DM to follow up on';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.li_engagement_touches
      WHERE prospect_id = v_draft.prospect_id AND touch_type = 'reply_received' AND occurred_at >= v_first
    ) THEN
      RAISE EXCEPTION 'they replied: answer the reply instead of a follow-up';
    END IF;
    IF public.li_business_days_between((v_first AT TIME ZONE 'America/Denver')::date, v_today) < v_s.followup_min_business_days THEN
      RAISE EXCEPTION 'follow-up allowed only % business days after the first DM', v_s.followup_min_business_days;
    END IF;
  END IF;

  -- The unique indexes on touches block a second first DM or follow-up.
  INSERT INTO public.li_engagement_touches (prospect_id, draft_id, touch_type, created_by)
  VALUES (v_draft.prospect_id, v_draft.id, v_draft.action_type, v_uid);

  UPDATE public.li_engagement_drafts
  SET status = 'sent', sent_at = now(), updated_at = now()
  WHERE id = _draft_id
  RETURNING * INTO v_draft;

  IF v_draft.action_type = 'dm_first' THEN
    PERFORM public.li_advance_stage(v_draft.prospect_id, 'contacted', 'LinkedIn first DM sent by the founder');
  END IF;

  RETURN v_draft;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- RPC: skip a draft (with a reason)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.li_skip_draft(_draft_id uuid, _reason text)
RETURNS public.li_engagement_drafts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_draft public.li_engagement_drafts;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN
    RAISE EXCEPTION 'a skip reason is required';
  END IF;
  UPDATE public.li_engagement_drafts
  SET status = 'skipped', skip_reason = left(btrim(_reason), 300), skipped_at = now(), updated_at = now()
  WHERE id = _draft_id AND status IN ('draft', 'approved')
  RETURNING * INTO v_draft;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'draft not found or already sent/skipped';
  END IF;
  RETURN v_draft;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- RPC: log something that happened in LinkedIn (connection request sent,
-- accepted, reply, call, paid). Writes a touch, mirrors outcomes into
-- commercial_outcomes and moves the funnel stage forward.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.li_record_outcome(
  _prospect_id uuid,
  _kind text,
  _reply_class text DEFAULT NULL,
  _note text DEFAULT NULL,
  _revenue_cents integer DEFAULT NULL
)
RETURNS public.li_engagement_touches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_touch public.li_engagement_touches;
  v_today date := (now() AT TIME ZONE 'America/Denver')::date;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  IF _kind NOT IN ('connect_no_note', 'connect_accepted', 'reply_received', 'call_booked', 'call_done', 'paid') THEN
    RAISE EXCEPTION 'unknown outcome %', _kind;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.li_engagement_targets WHERE prospect_id = _prospect_id) THEN
    RAISE EXCEPTION 'not a LinkedIn target';
  END IF;
  IF _kind = 'reply_received' AND _reply_class IS NULL THEN
    RAISE EXCEPTION 'a reply needs a class';
  END IF;
  IF _kind = 'connect_no_note' THEN
    IF (SELECT suppression_status FROM public.commercial_prospects WHERE id = _prospect_id) IS DISTINCT FROM 'active' THEN
      RAISE EXCEPTION 'prospect is suppressed';
    END IF;
    PERFORM public.li_assert_capacity('connect_no_note');
  END IF;

  INSERT INTO public.li_engagement_touches (prospect_id, touch_type, reply_class, note, revenue_cents, created_by)
  VALUES (
    _prospect_id, _kind,
    CASE WHEN _kind = 'reply_received' THEN _reply_class END,
    NULLIF(btrim(coalesce(_note, '')), ''),
    CASE WHEN _kind = 'paid' THEN _revenue_cents END,
    v_uid
  )
  RETURNING * INTO v_touch;

  IF _kind = 'connect_no_note' THEN
    PERFORM public.li_advance_stage(_prospect_id, 'contacted', 'LinkedIn connection request sent by the founder');
  ELSIF _kind = 'connect_accepted' THEN
    UPDATE public.li_engagement_targets SET connection_degree = 1, updated_at = now() WHERE prospect_id = _prospect_id;
  ELSIF _kind = 'reply_received' THEN
    INSERT INTO public.commercial_outcomes (prospect_id, segment, reply_class)
    VALUES (_prospect_id, 'linkedin', CASE WHEN _reply_class = 'not_now' THEN 'neutral' ELSE _reply_class END);
    PERFORM public.li_advance_stage(_prospect_id, 'replied', 'LinkedIn reply: ' || _reply_class);
    IF _reply_class = 'negative' THEN
      UPDATE public.commercial_prospects SET suppression_status = 'do_not_contact', updated_at = now() WHERE id = _prospect_id;
    ELSIF _reply_class = 'not_now' THEN
      UPDATE public.li_engagement_targets SET nurture_until = v_today + 90, updated_at = now() WHERE prospect_id = _prospect_id;
    END IF;
  ELSIF _kind = 'call_booked' THEN
    INSERT INTO public.commercial_outcomes (prospect_id, segment, meeting_booked) VALUES (_prospect_id, 'linkedin', true);
    PERFORM public.li_advance_stage(_prospect_id, 'call_planned', 'Call booked from LinkedIn');
  ELSIF _kind = 'call_done' THEN
    PERFORM public.li_advance_stage(_prospect_id, 'call_completed', 'Call held from LinkedIn');
  ELSIF _kind = 'paid' THEN
    INSERT INTO public.commercial_outcomes (prospect_id, segment, subscription_activated, revenue_cents)
    VALUES (_prospect_id, 'linkedin', true, _revenue_cents);
    PERFORM public.li_advance_stage(_prospect_id, 'won', 'Paid after LinkedIn outreach');
  END IF;

  RETURN v_touch;
END;
$function$;

REVOKE ALL ON FUNCTION public.li_business_days_between(date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.li_advance_stage(uuid, public.commercial_funnel_stage, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.li_assert_capacity(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.li_mark_draft_sent(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.li_skip_draft(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.li_record_outcome(uuid, text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.li_business_days_between(date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.li_mark_draft_sent(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.li_skip_draft(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.li_record_outcome(uuid, text, text, text, integer) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Data minimization: pasted post text is kept 30 days, then nulled.
-- Pure SQL job, no HTTP, no Actions minutes.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'li-engagement-excerpt-purge') THEN
      PERFORM cron.unschedule('li-engagement-excerpt-purge');
    END IF;
    PERFORM cron.schedule(
      'li-engagement-excerpt-purge',
      '20 9 * * *',
      $cron$
      UPDATE public.li_engagement_signals
      SET excerpt = NULL
      WHERE excerpt IS NOT NULL AND excerpt_purge_after < current_date;
      $cron$
    );
  END IF;
END $$;
