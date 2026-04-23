-- AI Call Cost Ledger
-- Tracks every Anthropic / Lovable-Gateway invocation for cost monitoring,
-- abuse detection, and per-user accounting.
CREATE TABLE IF NOT EXISTS public.ai_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  task text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('anthropic', 'lovable_gateway')),
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(10, 6) NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  ok boolean NOT NULL DEFAULT true,
  error text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_calls_user_id_created_at_idx
  ON public.ai_calls (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_calls_created_at_idx
  ON public.ai_calls (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_calls_model_created_at_idx
  ON public.ai_calls (model, created_at DESC);

ALTER TABLE public.ai_calls ENABLE ROW LEVEL SECURITY;

-- Admins can read everything (for cost dashboards / abuse detection).
CREATE POLICY "Admins can read all ai_calls"
  ON public.ai_calls FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can read their own AI call history (transparency).
CREATE POLICY "Users can read own ai_calls"
  ON public.ai_calls FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Inserts only via service role (edge functions). No client-side writes.
CREATE POLICY "Service role inserts ai_calls"
  ON public.ai_calls FOR INSERT
  TO service_role
  WITH CHECK (true);