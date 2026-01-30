-- =============================================
-- User Engagement & Retention System Tables
-- =============================================

-- Table 1: user_engagement - Track engagement metrics per user
CREATE TABLE public.user_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Streak tracking
  current_streak integer DEFAULT 0 NOT NULL,
  longest_streak integer DEFAULT 0 NOT NULL,
  last_active_date date,
  
  -- Milestones (array of achieved milestone IDs)
  milestones_achieved jsonb DEFAULT '[]'::jsonb NOT NULL,
  total_analyses integer DEFAULT 0 NOT NULL,
  total_exports integer DEFAULT 0 NOT NULL,
  
  -- Activity scoring (0-100)
  activity_score integer DEFAULT 0 NOT NULL,
  engagement_tier text DEFAULT 'new' NOT NULL, -- new, active, power, dormant, churned
  
  -- Churn risk (0-100)
  churn_risk_score integer DEFAULT 0 NOT NULL,
  
  -- Email preferences
  email_frequency text DEFAULT 'weekly' NOT NULL, -- daily, weekly, monthly, never
  last_digest_sent timestamptz,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_engagement ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_engagement
CREATE POLICY "Deny anonymous access to user_engagement"
  ON public.user_engagement FOR ALL
  USING (false);

CREATE POLICY "Users can view own engagement"
  ON public.user_engagement FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own engagement"
  ON public.user_engagement FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages user_engagement"
  ON public.user_engagement FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

-- Table 2: user_notifications - In-app notification queue
CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  notification_type text NOT NULL, -- achievement, feature, tip, system, milestone
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  action_label text,
  icon text, -- lucide icon name
  
  is_read boolean DEFAULT false NOT NULL,
  is_dismissed boolean DEFAULT false NOT NULL,
  expires_at timestamptz,
  
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_notifications
CREATE POLICY "Deny anonymous access to user_notifications"
  ON public.user_notifications FOR ALL
  USING (false);

CREATE POLICY "Users can view own notifications"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages user_notifications"
  ON public.user_notifications FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

-- Index for efficient unread notification queries
CREATE INDEX idx_notifications_user_unread 
  ON public.user_notifications(user_id, created_at DESC) 
  WHERE is_read = false AND is_dismissed = false;

-- Table 3: email_sequences - Lifecycle email automation definitions
CREATE TABLE public.email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_name text NOT NULL, -- onboarding, post_analysis, reengagement, digest
  step_number integer NOT NULL,
  delay_hours integer NOT NULL, -- hours after trigger/previous step
  
  subject text NOT NULL,
  template_key text NOT NULL,
  
  trigger_condition jsonb, -- {"event": "signup"} or {"inactive_days": 7}
  skip_if_conditions jsonb, -- {"has_analysis": true}
  
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  UNIQUE(sequence_name, step_number)
);

-- Enable RLS
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_sequences (admin/service only)
CREATE POLICY "Deny anonymous access to email_sequences"
  ON public.email_sequences FOR ALL
  USING (false);

CREATE POLICY "Admins can view email_sequences"
  ON public.email_sequences FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages email_sequences"
  ON public.email_sequences FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

-- Table 4: email_sequence_log - Track sent emails to prevent duplicates
CREATE TABLE public.email_sequence_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sequence_name text NOT NULL,
  step_number integer NOT NULL,
  sent_at timestamptz DEFAULT now() NOT NULL,
  
  -- Prevent duplicate sends
  UNIQUE(user_id, sequence_name, step_number)
);

-- Enable RLS
ALTER TABLE public.email_sequence_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_sequence_log (service only)
CREATE POLICY "Deny anonymous access to email_sequence_log"
  ON public.email_sequence_log FOR ALL
  USING (false);

CREATE POLICY "Deny authenticated access to email_sequence_log"
  ON public.email_sequence_log FOR ALL
  USING (false);

CREATE POLICY "Service role manages email_sequence_log"
  ON public.email_sequence_log FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

-- Index for efficient sequence lookup
CREATE INDEX idx_email_log_user_sequence 
  ON public.email_sequence_log(user_id, sequence_name, step_number);

-- =============================================
-- Functions for engagement tracking
-- =============================================

-- Function to update engagement on analysis completion
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
  -- Get or create engagement record
  INSERT INTO public.user_engagement (user_id, last_active_date, current_streak, total_analyses)
  VALUES (NEW.user_id, v_today, 1, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_analyses = user_engagement.total_analyses + 1,
    updated_at = now();
  
  -- Update streak
  SELECT last_active_date, current_streak, longest_streak
  INTO v_last_active, v_current_streak, v_longest_streak
  FROM public.user_engagement
  WHERE user_id = NEW.user_id;
  
  IF v_last_active IS NULL OR v_last_active < v_today - 1 THEN
    -- Streak broken or first activity
    UPDATE public.user_engagement
    SET current_streak = 1, last_active_date = v_today, updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF v_last_active = v_today - 1 THEN
    -- Continue streak
    UPDATE public.user_engagement
    SET 
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      last_active_date = v_today,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSE
    -- Same day, just update last_active_date
    UPDATE public.user_engagement
    SET last_active_date = v_today, updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to update engagement when analysis is created
CREATE TRIGGER update_engagement_on_analysis_trigger
  AFTER INSERT ON public.analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_engagement_on_analysis();

-- Function to get user engagement stats
CREATE OR REPLACE FUNCTION public.get_user_engagement_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Ensure user can only access their own data
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
  
  -- Return defaults if no engagement record
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

-- Function to increment export count
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

-- Seed email sequences (onboarding, post-analysis, re-engagement)
INSERT INTO public.email_sequences (sequence_name, step_number, delay_hours, subject, template_key, trigger_condition, skip_if_conditions, is_active) VALUES
-- Onboarding sequence (for users who haven't done first analysis)
('onboarding', 1, 48, 'Your first analysis is just 2 minutes away', 'onboarding_step_1', '{"event": "signup"}', '{"has_analysis": true}', true),
('onboarding', 2, 96, '3 things you''re missing without your analysis', 'onboarding_step_2', '{"event": "signup"}', '{"has_analysis": true}', true),
('onboarding', 3, 168, 'See how entrepreneurs like you use Quantis', 'onboarding_step_3', '{"event": "signup"}', '{"has_analysis": true}', true),
('onboarding', 4, 240, 'Your 3 free analyses are waiting', 'onboarding_step_4', '{"event": "signup"}', '{"has_analysis": true}', true),

-- Post-first-analysis sequence
('post_analysis', 1, 24, 'Your analysis is ready to export!', 'post_analysis_step_1', '{"event": "first_analysis"}', null, true),
('post_analysis', 2, 72, '3 ways to use your analysis results', 'post_analysis_step_2', '{"event": "first_analysis"}', null, true),
('post_analysis', 3, 168, 'Try comparing different scenarios', 'post_analysis_step_3', '{"event": "first_analysis"}', '{"analysis_count_gte": 2}', true),
('post_analysis', 4, 336, 'Unlock unlimited analyses', 'post_analysis_step_4', '{"event": "first_analysis"}', '{"is_plus": true}', true),

-- Re-engagement sequence (for dormant users)
('reengagement', 1, 168, 'We noticed you haven''t been back...', 'reengagement_step_1', '{"inactive_days": 7}', null, true),
('reengagement', 2, 336, 'New features you might have missed', 'reengagement_step_2', '{"inactive_days": 14}', null, true),
('reengagement', 3, 720, 'We miss you! Here''s what''s new', 'reengagement_step_3', '{"inactive_days": 30}', null, true),
('reengagement', 4, 1440, 'Your account is waiting for you', 'reengagement_step_4', '{"inactive_days": 60}', null, true);