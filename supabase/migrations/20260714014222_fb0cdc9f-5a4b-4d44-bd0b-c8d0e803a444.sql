
-- 1. Table
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('new_user','new_analysis','activity')),
  title TEXT NOT NULL,
  message TEXT,
  actor_user_id UUID,
  actor_email TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications (created_at DESC);
CREATE INDEX idx_admin_notifications_unread ON public.admin_notifications (read_at) WHERE read_at IS NULL;

-- 2. Grants (admin-only via RLS; service_role for triggers)
GRANT SELECT, UPDATE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;

-- 3. RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admin notifications"
ON public.admin_notifications FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update admin notifications"
ON public.admin_notifications FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Trigger: new user signup (fires on profile insert)
CREATE OR REPLACE FUNCTION public.notify_admin_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;
  INSERT INTO public.admin_notifications (event_type, title, message, actor_user_id, actor_email, metadata)
  VALUES (
    'new_user',
    'New user signed up',
    COALESCE(v_email, 'unknown') || ' just created an account',
    NEW.id,
    v_email,
    jsonb_build_object('profile_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_notify_new_user ON public.profiles;
CREATE TRIGGER trg_admin_notify_new_user
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_user();

-- 5. Trigger: new analysis
CREATE OR REPLACE FUNCTION public.notify_admin_new_analysis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;
  END IF;
  INSERT INTO public.admin_notifications (event_type, title, message, actor_user_id, actor_email, metadata)
  VALUES (
    'new_analysis',
    'New analysis run',
    COALESCE(v_email, 'anonymous') || ' ran an analysis',
    NEW.user_id,
    v_email,
    jsonb_build_object('analysis_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_notify_new_analysis ON public.analyses;
CREATE TRIGGER trg_admin_notify_new_analysis
AFTER INSERT ON public.analyses
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_analysis();
