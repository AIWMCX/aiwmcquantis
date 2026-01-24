-- Fix the audit log function to handle DELETE without FK constraint violation
CREATE OR REPLACE FUNCTION public.log_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- For deletes, insert without subscription_id to avoid FK constraint violation
    INSERT INTO public.subscription_audit_log (
      subscription_id,
      user_id,
      event_source,
      event_type,
      previous_state,
      new_state,
      reason
    ) VALUES (
      NULL,
      OLD.user_id,
      'database_trigger',
      'deleted',
      to_jsonb(OLD),
      to_jsonb(OLD),
      'Subscription deleted'
    );
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.subscription_audit_log (
      subscription_id,
      user_id,
      event_source,
      event_type,
      previous_state,
      new_state,
      reason
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'database_trigger',
      'created',
      NULL,
      to_jsonb(NEW),
      'Subscription created'
    );
    RETURN NEW;
  ELSE
    INSERT INTO public.subscription_audit_log (
      subscription_id,
      user_id,
      event_source,
      event_type,
      previous_state,
      new_state,
      reason
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'database_trigger',
      CASE
        WHEN OLD.status != NEW.status AND NEW.status = 'canceled' THEN 'canceled'
        WHEN OLD.plan_id != NEW.plan_id AND NEW.plan_id = 'plus' THEN 'upgraded'
        WHEN OLD.plan_id != NEW.plan_id AND NEW.plan_id = 'free' THEN 'downgraded'
        ELSE 'updated'
      END,
      to_jsonb(OLD),
      to_jsonb(NEW),
      CASE
        WHEN OLD.status != NEW.status THEN 'Status changed from ' || OLD.status || ' to ' || NEW.status
        WHEN OLD.plan_id != NEW.plan_id THEN 'Plan changed from ' || OLD.plan_id || ' to ' || NEW.plan_id
        ELSE 'Subscription updated'
      END
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS log_subscription_trigger ON public.subscriptions;
CREATE TRIGGER log_subscription_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_subscription_change();

-- Delete subscriptions for test users
DELETE FROM public.subscriptions WHERE user_id IN (
  '0f0841a7-22b5-44df-bc8b-f9d7ff27cd81',
  '236eaf39-886a-46f9-bceb-38ab71a8679a',
  '3974cb3c-a1b8-47e7-9ef3-316b0420cb24',
  'b6e08d86-4547-4ac1-b0fe-7fcead518c79',
  'c5ab7824-a534-4e44-ae00-8445438203f8',
  '2f27f879-e750-4b0c-9a51-4a901e5e7b21',
  '72111441-a0e1-4897-85f2-defb640e9691',
  '50e7dc25-1810-4b28-bab0-fa25657bd27e'
);