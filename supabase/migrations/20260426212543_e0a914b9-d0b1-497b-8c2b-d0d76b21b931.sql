-- Background job table for Pro depth analyses
CREATE TABLE public.analysis_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued | running | completed | failed | timeout
  depth_requested TEXT NOT NULL,         -- 'pro'
  depth_used TEXT,                       -- actual depth that produced the result (pro | full | quick)
  fell_back_from TEXT,                   -- e.g. 'pro' if we silently downgraded
  input_snapshot JSONB NOT NULL,         -- full request body for retry
  current_step TEXT,                     -- 'industry_detection' | 'benchmarks' | 'monte_carlo' | 'llm_narrative' | 'reconciliation'
  step_timings JSONB NOT NULL DEFAULT '{}'::jsonb, -- { step_name: elapsed_ms }
  failed_step TEXT,                      -- which step timed out / errored
  result JSONB,                          -- BusinessAnalysisResult on success
  error_message TEXT,
  error_code TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analysis_jobs_user_id ON public.analysis_jobs(user_id, created_at DESC);
CREATE INDEX idx_analysis_jobs_status ON public.analysis_jobs(status) WHERE status IN ('queued','running');
CREATE INDEX idx_analysis_jobs_request_id ON public.analysis_jobs(request_id);

ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs (for polling)
CREATE POLICY "Users view own analysis jobs"
ON public.analysis_jobs FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own jobs (router enqueues on their behalf using service role,
-- but we still allow direct user inserts for resilience)
CREATE POLICY "Users insert own analysis jobs"
ON public.analysis_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role only writes results (no user UPDATE policy = users cannot tamper with results)
-- Admin can view all jobs for diagnostics
CREATE POLICY "Admins view all analysis jobs"
ON public.analysis_jobs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER update_analysis_jobs_updated_at
BEFORE UPDATE ON public.analysis_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Cleanup function for completed jobs older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_old_analysis_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.analysis_jobs
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('completed', 'failed', 'timeout');
END;
$$;