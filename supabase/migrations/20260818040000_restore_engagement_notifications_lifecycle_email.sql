-- Migration-ledger drift recovery, Slice 3 (lifecycle/retention) — 2026-08-18
--
-- PR #41 found 26 tables that live code queries but which don't exist in
-- production. This restores the 4 defined together in 20260130032834:
-- public.user_engagement, public.user_notifications, public.email_sequences,
-- public.email_sequence_log -- plus the trigger and 3 functions the same
-- file defines on top of them. Confirmed via pg_trigger/pg_proc/to_regclass
-- that NONE of it is live today (consistent with the whole-transaction-
-- rollback theory documented in PR #41 and #42: this file's CREATE TABLE
-- statements have no IF NOT EXISTS guards, so if any single statement in it
-- ever failed against the live database, Postgres would roll back the
-- entire migration -- tables, trigger, functions, and seed rows together --
-- while the ledger still recorded the whole thing as applied).
--
-- This is prioritized ahead of Slice 2 (document/report delivery, which
-- investigation showed is fully DEFER_FEATURE / REMOVE_DEAD_CODE with zero
-- live impact) because fresh evidence surfaced a genuine, currently-active
-- production bug, not just missing observability:
--
-- 1. check-lifecycle-emails (Supabase Edge Function, confirmed ACTIVE, and
--    confirmed live-scheduled via cron.job "check-lifecycle-emails-hourly",
--    schedule '0 * * * *' -- fires every hour in production) calls
--    alreadySent() before sending onboarding_step_1/2 and post_analysis_
--    step_1 emails. alreadySent() SELECTs from email_sequence_log; against
--    a missing table that query errors, `data` comes back null/undefined,
--    and the function's `(data && data.length > 0) || false` collapses to
--    `false` -- "not sent yet" -- every single time. send-lifecycle-email
--    (also ACTIVE) tries to INSERT the sent-record into the same missing
--    table afterward and silently swallows the failure (comment: "Ignore
--    duplicate constraint errors"). Neither side of the dedupe mechanism
--    can work: any user who qualifies for one of these three lifecycle
--    emails is a candidate to receive it again on every subsequent hourly
--    cron run for as long as they keep qualifying. This is live email spam
--    risk to real users, not a dormant/unreachable code path.
-- 2. check-lifecycle-emails' reengagement (7-30 day inactivity) and weekly-
--    pulse sequences SELECT from user_engagement; against a missing table
--    this also errors, `inactiveUsers`/`activeUsers` come back undefined,
--    and the `if (data)` guards make these two sequences a silent no-op --
--    the safe direction, but it means the entire re-engagement/win-back
--    email feature has been doing nothing since it shipped.
-- 3. src/components/notifications/NotificationCenter.tsx is mounted in
--    src/components/layout/Header.tsx (confirmed via grep for the JSX tag,
--    not just the import) -- i.e. rendered on effectively every
--    authenticated page load, not a dormant UI like Slice 1's referral
--    banner. Its useNotifications() hook SELECTs from user_notifications
--    directly client-side; every render of every logged-in page has been
--    issuing a failing query for this.
-- 4. check-churn-signals (also ACTIVE) both reads and INSERTs across all
--    three of user_engagement / user_notifications / email_sequence_log.
--
-- Current-pattern check: unlike Slice 1 (referral), this table's ORIGINAL
-- policies already match the live pattern still in use today -- direct
-- client-side owner SELECT/UPDATE on user_engagement (useEngagement.ts's
-- updateEmailPreference calls .update() directly) and on user_notifications
-- (useNotifications.ts's markAsRead/markAllAsRead/dismissNotification), with
-- service_role ALL and anon denied throughout. No RLS redesign needed here,
-- just the addition of explicit table-level GRANTs (RLS bypass does not
-- confer table-level privilege, the same gap class fixed in the 10-table
-- exposure pass and in Slice 1) and IF NOT EXISTS / DROP POLICY IF EXISTS
-- idempotency guards this session has used throughout.
--
-- email_sequences/email_sequence_log stay service-role-only (plus an
-- admin SELECT policy on email_sequences), matching the original design --
-- no client ever reads or writes either table directly.
--
-- Additive and idempotent. No existing table, column, or row is altered.

-- ── Table 1: user_engagement ──
CREATE TABLE IF NOT EXISTS public.user_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,

  current_streak integer DEFAULT 0 NOT NULL,
  longest_streak integer DEFAULT 0 NOT NULL,
  last_active_date date,

  milestones_achieved jsonb DEFAULT '[]'::jsonb NOT NULL,
  total_analyses integer DEFAULT 0 NOT NULL,
  total_exports integer DEFAULT 0 NOT NULL,

  activity_score integer DEFAULT 0 NOT NULL,
  engagement_tier text DEFAULT 'new' NOT NULL,

  churn_risk_score integer DEFAULT 0 NOT NULL,

  email_frequency text DEFAULT 'weekly' NOT NULL,
  last_digest_sent timestamptz,

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.user_engagement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny anonymous access to user_engagement" ON public.user_engagement;
CREATE POLICY "Deny anonymous access to user_engagement"
  ON public.user_engagement FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Users can view own engagement" ON public.user_engagement;
CREATE POLICY "Users can view own engagement"
  ON public.user_engagement FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own engagement" ON public.user_engagement;
CREATE POLICY "Users can update own engagement"
  ON public.user_engagement FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages user_engagement" ON public.user_engagement;
CREATE POLICY "Service role manages user_engagement"
  ON public.user_engagement FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.user_engagement FROM anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.user_engagement TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_engagement TO service_role;

-- ── Table 2: user_notifications ──
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  action_label text,
  icon text,

  is_read boolean DEFAULT false NOT NULL,
  is_dismissed boolean DEFAULT false NOT NULL,
  expires_at timestamptz,

  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny anonymous access to user_notifications" ON public.user_notifications;
CREATE POLICY "Deny anonymous access to user_notifications"
  ON public.user_notifications FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
CREATE POLICY "Users can view own notifications"
  ON public.user_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications"
  ON public.user_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages user_notifications" ON public.user_notifications;
CREATE POLICY "Service role manages user_notifications"
  ON public.user_notifications FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.user_notifications(user_id, created_at DESC)
  WHERE is_read = false AND is_dismissed = false;

REVOKE ALL ON TABLE public.user_notifications FROM anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.user_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_notifications TO service_role;

-- ── Table 3: email_sequences (admin/service only) ──
CREATE TABLE IF NOT EXISTS public.email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_name text NOT NULL,
  step_number integer NOT NULL,
  delay_hours integer NOT NULL,

  subject text NOT NULL,
  template_key text NOT NULL,

  trigger_condition jsonb,
  skip_if_conditions jsonb,

  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE(sequence_name, step_number)
);

ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny anonymous access to email_sequences" ON public.email_sequences;
CREATE POLICY "Deny anonymous access to email_sequences"
  ON public.email_sequences FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Admins can view email_sequences" ON public.email_sequences;
CREATE POLICY "Admins can view email_sequences"
  ON public.email_sequences FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages email_sequences" ON public.email_sequences;
CREATE POLICY "Service role manages email_sequences"
  ON public.email_sequences FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.email_sequences FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.email_sequences TO service_role;

-- ── Table 4: email_sequence_log (service only) ──
CREATE TABLE IF NOT EXISTS public.email_sequence_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sequence_name text NOT NULL,
  step_number integer NOT NULL,
  sent_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE(user_id, sequence_name, step_number)
);

ALTER TABLE public.email_sequence_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny anonymous access to email_sequence_log" ON public.email_sequence_log;
CREATE POLICY "Deny anonymous access to email_sequence_log"
  ON public.email_sequence_log FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny authenticated access to email_sequence_log" ON public.email_sequence_log;
CREATE POLICY "Deny authenticated access to email_sequence_log"
  ON public.email_sequence_log FOR ALL TO authenticated USING (false);

DROP POLICY IF EXISTS "Service role manages email_sequence_log" ON public.email_sequence_log;
CREATE POLICY "Service role manages email_sequence_log"
  ON public.email_sequence_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_email_log_user_sequence
  ON public.email_sequence_log(user_id, sequence_name, step_number);

REVOKE ALL ON TABLE public.email_sequence_log FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.email_sequence_log TO service_role;

-- =============================================
-- Functions for engagement tracking
-- =============================================

CREATE OR REPLACE FUNCTION public.update_engagement_on_analysis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_last_active date;
  v_current_streak integer;
  v_longest_streak integer;
BEGIN
  INSERT INTO public.user_engagement (user_id, last_active_date, current_streak, total_analyses)
  VALUES (NEW.user_id, v_today, 1, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_analyses = user_engagement.total_analyses + 1,
    updated_at = now();

  SELECT last_active_date, current_streak, longest_streak
  INTO v_last_active, v_current_streak, v_longest_streak
  FROM public.user_engagement
  WHERE user_id = NEW.user_id;

  IF v_last_active IS NULL OR v_last_active < v_today - 1 THEN
    UPDATE public.user_engagement
    SET current_streak = 1, last_active_date = v_today, updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF v_last_active = v_today - 1 THEN
    UPDATE public.user_engagement
    SET
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      last_active_date = v_today,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSE
    UPDATE public.user_engagement
    SET last_active_date = v_today, updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_engagement_on_analysis_trigger ON public.analyses;
CREATE TRIGGER update_engagement_on_analysis_trigger
  AFTER INSERT ON public.analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_engagement_on_analysis();

CREATE OR REPLACE FUNCTION public.get_user_engagement_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() != p_user_id AND NOT is_service_role() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'current_streak', COALESCE(ue.current_streak, 0),
    'longest_streak', COALESCE(ue.longest_streak, 0),
    'total_analyses', COALESCE(ue.total_analyses, 0),
    'total_exports', COALESCE(ue.total_exports, 0),
    'activity_score', COALESCE(ue.activity_score, 0),
    'engagement_tier', COALESCE(ue.engagement_tier, 'new'),
    'milestones_achieved', COALESCE(ue.milestones_achieved, '[]'::jsonb),
    'email_frequency', COALESCE(ue.email_frequency, 'weekly'),
    'last_active_date', ue.last_active_date
  )
  INTO v_result
  FROM public.user_engagement ue
  WHERE ue.user_id = p_user_id;

  IF v_result IS NULL THEN
    v_result := jsonb_build_object(
      'current_streak', 0,
      'longest_streak', 0,
      'total_analyses', 0,
      'total_exports', 0,
      'activity_score', 0,
      'engagement_tier', 'new',
      'milestones_achieved', '[]'::jsonb,
      'email_frequency', 'weekly',
      'last_active_date', null
    );
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_export_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_engagement (user_id, total_exports)
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_exports = user_engagement.total_exports + 1,
    updated_at = now();
END;
$$;

-- Seed email sequences (onboarding, post-analysis, re-engagement) --
-- ON CONFLICT DO NOTHING makes this replay-safe against the file's own
-- UNIQUE(sequence_name, step_number) constraint.
INSERT INTO public.email_sequences (sequence_name, step_number, delay_hours, subject, template_key, trigger_condition, skip_if_conditions, is_active) VALUES
('onboarding', 1, 48, 'Your first analysis is just 2 minutes away', 'onboarding_step_1', '{"event": "signup"}', '{"has_analysis": true}', true),
('onboarding', 2, 96, '3 things you''re missing without your analysis', 'onboarding_step_2', '{"event": "signup"}', '{"has_analysis": true}', true),
('onboarding', 3, 168, 'See how entrepreneurs like you use Quantis', 'onboarding_step_3', '{"event": "signup"}', '{"has_analysis": true}', true),
('onboarding', 4, 240, 'Your 3 free analyses are waiting', 'onboarding_step_4', '{"event": "signup"}', '{"has_analysis": true}', true),
('post_analysis', 1, 24, 'Your analysis is ready to export!', 'post_analysis_step_1', '{"event": "first_analysis"}', null, true),
('post_analysis', 2, 72, '3 ways to use your analysis results', 'post_analysis_step_2', '{"event": "first_analysis"}', null, true),
('post_analysis', 3, 168, 'Try comparing different scenarios', 'post_analysis_step_3', '{"event": "first_analysis"}', '{"analysis_count_gte": 2}', true),
('post_analysis', 4, 336, 'Unlock unlimited analyses', 'post_analysis_step_4', '{"event": "first_analysis"}', '{"is_plus": true}', true),
('reengagement', 1, 168, 'We noticed you haven''t been back...', 'reengagement_step_1', '{"inactive_days": 7}', null, true),
('reengagement', 2, 336, 'New features you might have missed', 'reengagement_step_2', '{"inactive_days": 14}', null, true),
('reengagement', 3, 720, 'We miss you! Here''s what''s new', 'reengagement_step_3', '{"inactive_days": 30}', null, true),
('reengagement', 4, 1440, 'Your account is waiting for you', 'reengagement_step_4', '{"inactive_days": 60}', null, true)
ON CONFLICT (sequence_name, step_number) DO NOTHING;

-- POSTCONDITION -- fail loudly rather than silently no-op.
DO $$
BEGIN
  IF to_regclass('public.user_engagement') IS NULL THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: public.user_engagement still does not exist';
  END IF;
  IF to_regclass('public.user_notifications') IS NULL THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: public.user_notifications still does not exist';
  END IF;
  IF to_regclass('public.email_sequences') IS NULL THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: public.email_sequences still does not exist';
  END IF;
  IF to_regclass('public.email_sequence_log') IS NULL THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: public.email_sequence_log still does not exist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_engagement_on_analysis_trigger') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: update_engagement_on_analysis_trigger was not created';
  END IF;
  IF has_table_privilege('anon', 'public.user_engagement', 'SELECT')
     OR has_table_privilege('anon', 'public.user_notifications', 'SELECT')
     OR has_table_privilege('anon', 'public.email_sequences', 'SELECT')
     OR has_table_privilege('anon', 'public.email_sequence_log', 'SELECT') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: anon can read a lifecycle/retention table';
  END IF;
  RAISE NOTICE 'POSTCONDITION PASSED: engagement/notifications/lifecycle-email schema restored, anon denied';
END $$;
