-- ============================================
-- AIWMC Quantis: Share Links & Export Queue
-- Per approved production implementation plan
-- ============================================

-- 1. Create shared_reports table for shareable analysis links
CREATE TABLE public.shared_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  view_count INTEGER DEFAULT 0,
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token lookup (only non-revoked tokens)
CREATE INDEX idx_shared_reports_token ON public.shared_reports(token) WHERE NOT is_revoked;

-- Index for user's shares
CREATE INDEX idx_shared_reports_user ON public.shared_reports(user_id);

-- Index for analysis shares
CREATE INDEX idx_shared_reports_analysis ON public.shared_reports(analysis_id);

-- Enable RLS
ALTER TABLE public.shared_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_reports
-- Block anonymous access
CREATE POLICY "Deny anonymous access to shared_reports"
  ON public.shared_reports
  FOR ALL
  TO anon
  USING (false);

-- Users can create shares for their own analyses
CREATE POLICY "Users can create shares for own analyses"
  ON public.shared_reports 
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own shares
CREATE POLICY "Users can view own shares"
  ON public.shared_reports 
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update (revoke) their own shares
CREATE POLICY "Users can revoke own shares"
  ON public.shared_reports 
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own shares
CREATE POLICY "Users can delete own shares"
  ON public.shared_reports 
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can read all (for public token lookups)
CREATE POLICY "Service role can manage shared_reports"
  ON public.shared_reports 
  FOR ALL
  USING (public.is_service_role())
  WITH CHECK (public.is_service_role());

-- 2. Create export_jobs table for PDF export queue
CREATE TABLE public.export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url TEXT,
  error_message TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for user's pending jobs
CREATE INDEX idx_export_jobs_user_pending ON public.export_jobs(user_id, status) WHERE status = 'pending';

-- Index for idempotency lookups
CREATE INDEX idx_export_jobs_idempotency ON public.export_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Enable RLS
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for export_jobs
-- Block anonymous access
CREATE POLICY "Deny anonymous access to export_jobs"
  ON public.export_jobs
  FOR ALL
  TO anon
  USING (false);

-- Users can view their own exports
CREATE POLICY "Users can view own exports"
  ON public.export_jobs 
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create exports for their own analyses
CREATE POLICY "Users can create exports"
  ON public.export_jobs 
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all exports
CREATE POLICY "Service role can manage export_jobs"
  ON public.export_jobs 
  FOR ALL
  USING (public.is_service_role())
  WITH CHECK (public.is_service_role());

-- 3. Create function to clean up expired share links
CREATE OR REPLACE FUNCTION public.cleanup_expired_shares()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.shared_reports 
  WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$;

-- 4. Create function to clean up old export jobs
CREATE OR REPLACE FUNCTION public.cleanup_old_export_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.export_jobs 
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('completed', 'failed');
END;
$$;

-- 5. Update run_scheduled_cleanup to include new cleanup functions
CREATE OR REPLACE FUNCTION public.run_scheduled_cleanup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  -- NEW: Clean up expired shares
  PERFORM public.cleanup_expired_shares();
  v_result := v_result || '{"expired_shares": "cleaned"}'::jsonb;
  
  -- NEW: Clean up old export jobs
  PERFORM public.cleanup_old_export_jobs();
  v_result := v_result || '{"old_export_jobs": "cleaned"}'::jsonb;
  
  RETURN v_result;
END;
$$;