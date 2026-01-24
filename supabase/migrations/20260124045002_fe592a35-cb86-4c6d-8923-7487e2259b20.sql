-- Create subscription audit log for tracking all changes
CREATE TABLE IF NOT EXISTS public.subscription_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  event_source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB NOT NULL,
  stripe_event_id TEXT,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.subscription_audit_log ENABLE ROW LEVEL SECURITY;

-- Security policies - admins only can view, service role manages
CREATE POLICY "Admins can view audit logs"
  ON public.subscription_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages audit logs"
  ON public.subscription_audit_log FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

CREATE POLICY "Deny anonymous access to audit logs"
  ON public.subscription_audit_log FOR ALL
  USING (false);

-- Create index for efficient lookups
CREATE INDEX idx_subscription_audit_user_id ON public.subscription_audit_log(user_id);
CREATE INDEX idx_subscription_audit_created_at ON public.subscription_audit_log(created_at DESC);
CREATE INDEX idx_subscription_audit_event_type ON public.subscription_audit_log(event_type);

-- Create function to log subscription changes automatically
CREATE OR REPLACE FUNCTION log_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscription_audit_log (
    subscription_id,
    user_id,
    event_source,
    event_type,
    previous_state,
    new_state,
    reason
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.user_id, OLD.user_id),
    'database_trigger',
    CASE
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'DELETE' THEN 'deleted'
      WHEN OLD.status != NEW.status AND NEW.status = 'canceled' THEN 'canceled'
      WHEN OLD.plan_id != NEW.plan_id AND NEW.plan_id = 'plus' THEN 'upgraded'
      WHEN OLD.plan_id != NEW.plan_id AND NEW.plan_id = 'free' THEN 'downgraded'
      ELSE 'updated'
    END,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'Subscription created'
      WHEN TG_OP = 'DELETE' THEN 'Subscription deleted'
      WHEN OLD.status != NEW.status THEN 'Status changed from ' || OLD.status || ' to ' || NEW.status
      WHEN OLD.plan_id != NEW.plan_id THEN 'Plan changed from ' || OLD.plan_id || ' to ' || NEW.plan_id
      ELSE 'Subscription updated'
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic audit logging
DROP TRIGGER IF EXISTS subscription_audit_trigger ON public.subscriptions;
CREATE TRIGGER subscription_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION log_subscription_change();

-- Create admin function to force-sync subscription from current state
CREATE OR REPLACE FUNCTION admin_force_sync_subscription(
  p_user_email TEXT,
  p_plan_id TEXT,
  p_status TEXT,
  p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_old_state JSONB;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_user_email;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  SELECT to_jsonb(s) INTO v_old_state
  FROM subscriptions s
  WHERE s.user_id = v_user_id;

  UPDATE subscriptions
  SET 
    plan_id = p_plan_id,
    status = p_status,
    updated_at = now()
  WHERE user_id = v_user_id;

  INSERT INTO subscription_audit_log (
    user_id,
    event_source,
    event_type,
    previous_state,
    new_state,
    reason
  ) VALUES (
    v_user_id,
    'admin_override',
    CASE WHEN p_plan_id = 'plus' AND p_status = 'active' THEN 'reactivated' ELSE 'updated' END,
    v_old_state,
    jsonb_build_object('plan_id', p_plan_id, 'status', p_status),
    p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'old_plan', v_old_state->>'plan_id',
    'new_plan', p_plan_id,
    'old_status', v_old_state->>'status',
    'new_status', p_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;