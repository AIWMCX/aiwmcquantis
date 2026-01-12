-- Create rate_limits table for hourly rate limiting
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  window_start timestamp with time zone NOT NULL,
  request_count integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, endpoint, window_start)
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits (edge function uses service role)
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits FOR ALL
USING (public.is_service_role())
WITH CHECK (public.is_service_role());

-- Index for fast lookups
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits(user_id, endpoint, window_start);

-- Index for cleanup of old entries
CREATE INDEX idx_rate_limits_cleanup ON public.rate_limits(window_start);

-- Function to check and increment rate limit atomically
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_window_minutes integer,
  p_max_requests integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window_start timestamp with time zone;
  v_current_count integer;
  v_allowed boolean;
BEGIN
  -- Calculate window start (truncate to window boundary)
  v_window_start := date_trunc('hour', NOW()) + 
    (EXTRACT(minute FROM NOW())::integer / p_window_minutes) * (p_window_minutes || ' minutes')::interval;
  
  -- Try to insert or increment atomically
  INSERT INTO public.rate_limits (user_id, endpoint, window_start, request_count)
  VALUES (p_user_id, p_endpoint, v_window_start, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;
  
  v_allowed := v_current_count <= p_max_requests;
  
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'current_count', v_current_count,
    'limit', p_max_requests,
    'remaining', GREATEST(0, p_max_requests - v_current_count),
    'reset_at', v_window_start + (p_window_minutes || ' minutes')::interval
  );
END;
$$;

-- Function to clean up old rate limit entries (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$;