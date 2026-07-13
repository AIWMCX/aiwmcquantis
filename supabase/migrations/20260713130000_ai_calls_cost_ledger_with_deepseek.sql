-- AI Call Cost Ledger. Same schema as the original (never-applied)
-- 20260423005049 migration, with 'deepseek' added to the provider CHECK
-- since it is now the primary provider (llm-call.ts's aiCall() prioritizes
-- DEEPSEEK_API_KEY over the Lovable gateway).
CREATE TABLE IF NOT EXISTS public.ai_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  task text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('anthropic', 'lovable_gateway', 'deepseek')),
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

DROP POLICY IF EXISTS "Admins can read all ai_calls" ON public.ai_calls;
CREATE POLICY "Admins can read all ai_calls"
  ON public.ai_calls FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can read own ai_calls" ON public.ai_calls;
CREATE POLICY "Users can read own ai_calls"
  ON public.ai_calls FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role inserts ai_calls" ON public.ai_calls;
CREATE POLICY "Service role inserts ai_calls"
  ON public.ai_calls FOR INSERT
  TO service_role
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
