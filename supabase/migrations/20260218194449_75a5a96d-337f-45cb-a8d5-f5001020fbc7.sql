
-- Fix 1: Add unique constraint to email_sequence_log to prevent duplicate sends at DB level
-- This makes duplicate inserts fail silently (ON CONFLICT DO NOTHING)
ALTER TABLE public.email_sequence_log 
  ADD CONSTRAINT email_sequence_log_unique_send 
  UNIQUE (user_id, sequence_name, step_number);

-- Fix 2: Add a global_email_cooldown table to track last email sent per user
-- This prevents more than 1 email per 48 hours per user
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  template_key TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resend_id TEXT
);

-- Enable RLS
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

-- Admins only can read (no user-facing reads needed)
CREATE POLICY "Service role only" ON public.email_send_log
  FOR ALL USING (false);

-- Index for fast cooldown lookups
CREATE INDEX idx_email_send_log_user_sent ON public.email_send_log(user_id, sent_at DESC);
CREATE INDEX idx_email_send_log_email_sent ON public.email_send_log(email, sent_at DESC);
