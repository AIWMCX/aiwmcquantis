
-- =============================================
-- SECURITY HARDENING MIGRATION
-- Fixes all critical vulnerabilities identified
-- =============================================

-- 1. Fix profiles_secure view with security_invoker
DROP VIEW IF EXISTS public.profiles_secure;

CREATE VIEW public.profiles_secure WITH (security_invoker = on) AS
SELECT 
  id,
  full_name,
  CASE 
    WHEN auth.uid() = id THEN public.decrypt_pii(phone_encrypted)
    ELSE NULL
  END AS phone,
  created_at,
  updated_at
FROM public.profiles
WHERE id = auth.uid();

-- Grant appropriate access
GRANT SELECT ON public.profiles_secure TO authenticated;
REVOKE ALL ON public.profiles_secure FROM anon;

-- 2. Fix admin_metrics view with security_invoker and admin check
DROP VIEW IF EXISTS public.admin_metrics;

CREATE VIEW public.admin_metrics WITH (security_invoker = on) AS
SELECT 
  total_users,
  total_analyses,
  plus_subscribers,
  free_users,
  monthly_analyses,
  weekly_signups,
  monthly_signups
FROM (
  SELECT 
    (SELECT COUNT(*)::integer FROM public.profiles) AS total_users,
    (SELECT COUNT(*)::integer FROM public.analyses) AS total_analyses,
    (SELECT COUNT(*)::integer FROM public.subscriptions WHERE status IN ('active', 'trialing') AND plan_id = 'plus') AS plus_subscribers,
    (SELECT COUNT(*)::integer FROM public.subscriptions WHERE status = 'active' AND plan_id = 'free') AS free_users,
    (SELECT COALESCE(SUM(analyses_count), 0)::integer FROM public.usage_tracking WHERE month_year = to_char(NOW(), 'YYYY-MM')) AS monthly_analyses,
    (SELECT COUNT(*)::integer FROM public.profiles WHERE created_at >= NOW() - INTERVAL '7 days') AS weekly_signups,
    (SELECT COUNT(*)::integer FROM public.profiles WHERE created_at >= NOW() - INTERVAL '30 days') AS monthly_signups
) metrics
WHERE public.has_role(auth.uid(), 'admin');

-- Grant access only to authenticated (admin check is in view)
GRANT SELECT ON public.admin_metrics TO authenticated;
REVOKE ALL ON public.admin_metrics FROM anon;

-- 3. Fix subscriptions_public view with security_invoker
DROP VIEW IF EXISTS public.subscriptions_public;

CREATE VIEW public.subscriptions_public WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
FROM public.subscriptions
WHERE user_id = auth.uid();

GRANT SELECT ON public.subscriptions_public TO authenticated;
REVOKE ALL ON public.subscriptions_public FROM anon;

-- 4. Document deprecated phone column
COMMENT ON COLUMN public.profiles.phone IS 'DEPRECATED: Do not use. All phone data is stored in phone_encrypted via encrypt_profile_phone() trigger.';

-- 5. Secure team invitation tokens with hashing
ALTER TABLE public.team_invitations 
ADD COLUMN IF NOT EXISTS token_hash text;

CREATE OR REPLACE FUNCTION public.hash_invitation_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.token IS NOT NULL THEN
    NEW.token_hash := encode(extensions.digest(NEW.token, 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hash_invitation_token_trigger ON public.team_invitations;
CREATE TRIGGER hash_invitation_token_trigger
  BEFORE INSERT ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_invitation_token();

-- Create cleanup function for expired invitations
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.team_invitations 
  WHERE expires_at < NOW() - INTERVAL '7 days'
    AND accepted_at IS NULL;
END;
$$;

-- 6. Secure API keys with constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_prefix_length'
  ) THEN
    ALTER TABLE public.api_keys
    ADD CONSTRAINT api_keys_prefix_length CHECK (length(key_prefix) <= 8);
  END IF;
END $$;

-- 7. Secure Stripe webhook payloads - cleanup old events
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.stripe_webhook_events 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Create function to redact PII from webhook payloads
CREATE OR REPLACE FUNCTION public.redact_webhook_pii()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.payload IS NOT NULL THEN
    -- Remove sensitive fields
    NEW.payload := NEW.payload 
      - 'receipt_email'
      - 'billing_details'
      - 'payment_method_details';
    
    -- Redact nested customer email if present
    IF NEW.payload ? 'customer' AND NEW.payload->'customer' ? 'email' THEN
      NEW.payload := jsonb_set(
        NEW.payload,
        '{customer,email}',
        '"[REDACTED]"'::jsonb,
        false
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS redact_webhook_pii_trigger ON public.stripe_webhook_events;
CREATE TRIGGER redact_webhook_pii_trigger
  BEFORE INSERT ON public.stripe_webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION public.redact_webhook_pii();

-- 8. Create API request log cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_api_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.api_request_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- 9. Create master cleanup function for scheduled execution
CREATE OR REPLACE FUNCTION public.run_scheduled_cleanup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
BEGIN
  -- Run all cleanup functions
  PERFORM public.cleanup_old_security_logs();
  v_result := v_result || '{"security_logs": "cleaned"}'::jsonb;
  
  PERFORM public.cleanup_old_anonymous_usage();
  v_result := v_result || '{"anonymous_usage": "cleaned"}'::jsonb;
  
  PERFORM public.cleanup_old_rate_limits();
  v_result := v_result || '{"rate_limits": "cleaned"}'::jsonb;
  
  PERFORM public.cleanup_old_webhook_events();
  v_result := v_result || '{"webhook_events": "cleaned"}'::jsonb;
  
  PERFORM public.cleanup_old_api_logs();
  v_result := v_result || '{"api_logs": "cleaned"}'::jsonb;
  
  PERFORM public.cleanup_expired_invitations();
  v_result := v_result || '{"expired_invitations": "cleaned"}'::jsonb;
  
  RETURN v_result;
END;
$$;

-- 10. Allow users to view their own rate limits (info-level fix)
DROP POLICY IF EXISTS "Users can view own rate limits" ON public.rate_limits;
CREATE POLICY "Users can view own rate limits"
ON public.rate_limits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
