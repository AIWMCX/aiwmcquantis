-- ================================================
-- SECURITY HARDENING: Server-Side Subscription Verification
-- ================================================

-- 1. Create function to verify Pro subscription (for API, Teams, Branding)
CREATE OR REPLACE FUNCTION public.verify_pro_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_subscription RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT plan_id, status, current_period_end
  INTO v_subscription
  FROM public.subscriptions
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check for Pro plan with active or trialing status
  IF v_subscription.plan_id = 'pro' 
     AND (v_subscription.status = 'active' OR v_subscription.status = 'trialing')
     AND (v_subscription.current_period_end IS NULL OR v_subscription.current_period_end > NOW())
  THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 2. Create function to verify Plus/Pro subscription (for Documents)
CREATE OR REPLACE FUNCTION public.verify_paid_subscription(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_subscription RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 'free';
  END IF;

  SELECT plan_id, status, current_period_end
  INTO v_subscription
  FROM public.subscriptions
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 'free';
  END IF;
  
  IF (v_subscription.status = 'active' OR v_subscription.status = 'trialing')
     AND (v_subscription.current_period_end IS NULL OR v_subscription.current_period_end > NOW())
  THEN
    RETURN v_subscription.plan_id;
  END IF;
  
  RETURN 'free';
END;
$$;

-- 3. Update API Keys RLS: Only Pro users can INSERT
DROP POLICY IF EXISTS "Users can insert own api keys" ON api_keys;
CREATE POLICY "Pro users can insert api keys" ON api_keys
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND verify_pro_subscription(auth.uid())
  );

-- 4. Update Teams RLS: Only Pro users can create teams
DROP POLICY IF EXISTS "Users can create teams" ON teams;
CREATE POLICY "Pro users can create teams" ON teams
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id 
    AND verify_pro_subscription(auth.uid())
  );

-- 5. Update Branding Settings RLS: Only Pro users can INSERT
DROP POLICY IF EXISTS "Users can insert own branding" ON branding_settings;
CREATE POLICY "Pro users can insert branding" ON branding_settings
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND verify_pro_subscription(auth.uid())
  );

-- 6. Add fingerprint_hash column for enhanced anti-abuse
ALTER TABLE public.anonymous_usage 
ADD COLUMN IF NOT EXISTS fingerprint_hash text;

-- Create index for fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_fingerprint 
ON public.anonymous_usage(fingerprint_hash);

-- 7. Update check_anonymous_rate_limit to include fingerprint check
CREATE OR REPLACE FUNCTION public.check_anonymous_rate_limit(
  p_device_id text,
  p_ip_hash text,
  p_idea_hash text,
  p_location_hash text,
  p_fingerprint_hash text DEFAULT NULL,
  p_window_minutes integer DEFAULT 60,
  p_device_limit integer DEFAULT 1,
  p_ip_limit integer DEFAULT 3,
  p_fingerprint_limit integer DEFAULT 2
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window_start timestamptz;
  v_device_count integer;
  v_ip_count integer;
  v_fingerprint_count integer;
  v_duplicate_count integer;
  v_result jsonb;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::interval;
  
  -- Check device-based limit
  SELECT COUNT(*) INTO v_device_count
  FROM public.anonymous_usage
  WHERE device_id = p_device_id
    AND created_at > v_window_start;
  
  IF v_device_count >= p_device_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'device_limit_exceeded',
      'message', 'You have reached your free analysis limit. Create an account for more.',
      'count', v_device_count
    );
  END IF;
  
  -- Check IP-based limit
  SELECT COUNT(*) INTO v_ip_count
  FROM public.anonymous_usage
  WHERE ip_hash = p_ip_hash
    AND created_at > v_window_start;
  
  IF v_ip_count >= p_ip_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'ip_limit_exceeded',
      'message', 'Too many requests from this network. Please try again later.',
      'count', v_ip_count
    );
  END IF;
  
  -- Check fingerprint-based limit (if provided)
  IF p_fingerprint_hash IS NOT NULL AND p_fingerprint_hash != '' THEN
    SELECT COUNT(*) INTO v_fingerprint_count
    FROM public.anonymous_usage
    WHERE fingerprint_hash = p_fingerprint_hash
      AND created_at > v_window_start;
    
    IF v_fingerprint_count >= p_fingerprint_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'fingerprint_limit_exceeded',
        'message', 'You have reached your free analysis limit. Create an account for more.',
        'count', v_fingerprint_count
      );
    END IF;
  END IF;
  
  -- Check for duplicate requests (same idea+location combination)
  SELECT COUNT(*) INTO v_duplicate_count
  FROM public.anonymous_usage
  WHERE idea_hash = p_idea_hash
    AND location_hash = p_location_hash
    AND created_at > v_window_start;
  
  IF v_duplicate_count > 0 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'duplicate_request',
      'message', 'This analysis was already performed recently.',
      'count', v_duplicate_count
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'device_count', v_device_count,
    'ip_count', v_ip_count,
    'fingerprint_count', COALESCE(v_fingerprint_count, 0)
  );
END;
$$;

-- 8. Update record_anonymous_usage to include fingerprint
CREATE OR REPLACE FUNCTION public.record_anonymous_usage(
  p_device_id text,
  p_ip_hash text,
  p_idea_hash text,
  p_location_hash text,
  p_fingerprint_hash text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.anonymous_usage (device_id, ip_hash, idea_hash, location_hash, fingerprint_hash)
  VALUES (p_device_id, p_ip_hash, p_idea_hash, p_location_hash, p_fingerprint_hash);
END;
$$;

-- 9. Create webhook event logging table for Stripe reliability
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  customer_id text,
  user_id uuid,
  status text DEFAULT 'received',
  error_message text,
  payload jsonb,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on webhook events
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events FORCE ROW LEVEL SECURITY;

-- Only service role can access webhook events
CREATE POLICY "Service role only for webhook events" ON public.stripe_webhook_events
  FOR ALL USING (is_service_role());

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to webhook events" ON public.stripe_webhook_events
  FOR ALL TO anon USING (false);

-- Create index for event lookup
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id ON public.stripe_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_user_id ON public.stripe_webhook_events(user_id);

-- 10. Create storage bucket for analysis documents if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'analysis-documents',
  'analysis-documents',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv', 'text/plain'];

-- 11. Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Plus Pro users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can access own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;

-- 12. Create storage policies: Only Plus/Pro users can upload documents
CREATE POLICY "Plus Pro users can upload documents" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'analysis-documents' 
    AND auth.role() = 'authenticated'
    AND verify_paid_subscription(auth.uid()) IN ('plus', 'pro')
  );

-- Users can only access their own documents
CREATE POLICY "Users can access own documents" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'analysis-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'analysis-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );