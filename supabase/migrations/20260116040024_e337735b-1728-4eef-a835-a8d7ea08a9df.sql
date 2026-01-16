-- Table to track anonymous usage with device and IP fingerprinting
CREATE TABLE public.anonymous_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  ip_hash text NOT NULL,
  idea_hash text NOT NULL,
  location_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.anonymous_usage ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/read (edge function uses service role)
CREATE POLICY "Service role can manage anonymous_usage"
ON public.anonymous_usage
FOR ALL
USING (public.is_service_role())
WITH CHECK (public.is_service_role());

-- Indexes for efficient lookups
CREATE INDEX idx_anonymous_usage_device ON public.anonymous_usage(device_id, created_at DESC);
CREATE INDEX idx_anonymous_usage_ip ON public.anonymous_usage(ip_hash, created_at DESC);
CREATE INDEX idx_anonymous_usage_cleanup ON public.anonymous_usage(created_at);
CREATE INDEX idx_anonymous_usage_duplicate ON public.anonymous_usage(idea_hash, location_hash, created_at DESC);

-- Function to check anonymous rate limit with device + IP tracking
CREATE OR REPLACE FUNCTION public.check_anonymous_rate_limit(
  p_device_id text,
  p_ip_hash text,
  p_idea_hash text,
  p_location_hash text,
  p_window_minutes integer DEFAULT 60,
  p_device_limit integer DEFAULT 1,
  p_ip_limit integer DEFAULT 3
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
  v_duplicate_exists boolean;
  v_allowed boolean;
  v_reason text;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::interval;
  
  -- Check for duplicate submission (same idea + location in last hour)
  SELECT EXISTS(
    SELECT 1 FROM public.anonymous_usage
    WHERE idea_hash = p_idea_hash
      AND location_hash = p_location_hash
      AND created_at > v_window_start
  ) INTO v_duplicate_exists;
  
  IF v_duplicate_exists THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'duplicate_submission',
      'message', 'This exact analysis was already performed recently',
      'reset_at', NOW() + (p_window_minutes || ' minutes')::interval
    );
  END IF;
  
  -- Count requests from this device
  SELECT COUNT(*) INTO v_device_count
  FROM public.anonymous_usage
  WHERE device_id = p_device_id
    AND created_at > v_window_start;
  
  IF v_device_count >= p_device_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'device_limit',
      'message', 'Free analysis limit reached. Sign in for more.',
      'current_count', v_device_count,
      'limit', p_device_limit,
      'reset_at', (
        SELECT created_at + (p_window_minutes || ' minutes')::interval
        FROM public.anonymous_usage
        WHERE device_id = p_device_id
        ORDER BY created_at ASC
        LIMIT 1
      )
    );
  END IF;
  
  -- Count requests from this IP (anti-incognito measure)
  SELECT COUNT(*) INTO v_ip_count
  FROM public.anonymous_usage
  WHERE ip_hash = p_ip_hash
    AND created_at > v_window_start;
  
  IF v_ip_count >= p_ip_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'ip_limit',
      'message', 'Too many requests from your network. Sign in to continue.',
      'current_count', v_ip_count,
      'limit', p_ip_limit,
      'reset_at', (
        SELECT created_at + (p_window_minutes || ' minutes')::interval
        FROM public.anonymous_usage
        WHERE ip_hash = p_ip_hash
        ORDER BY created_at ASC
        LIMIT 1
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'device_remaining', p_device_limit - v_device_count,
    'ip_remaining', p_ip_limit - v_ip_count
  );
END;
$$;

-- Function to record anonymous usage
CREATE OR REPLACE FUNCTION public.record_anonymous_usage(
  p_device_id text,
  p_ip_hash text,
  p_idea_hash text,
  p_location_hash text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.anonymous_usage (device_id, ip_hash, idea_hash, location_hash)
  VALUES (p_device_id, p_ip_hash, p_idea_hash, p_location_hash);
END;
$$;

-- Cleanup function for old anonymous usage records (keep 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_anonymous_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.anonymous_usage 
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;