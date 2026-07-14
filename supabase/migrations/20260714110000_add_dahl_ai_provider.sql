-- Allow telemetry emitted by the Dahl primary inference provider.
-- Recreate only the provider constraint; all existing rows and indexes remain.
ALTER TABLE public.ai_calls
  DROP CONSTRAINT IF EXISTS ai_calls_provider_check;

ALTER TABLE public.ai_calls
  ADD CONSTRAINT ai_calls_provider_check
  CHECK (provider IN ('dahl', 'deepseek', 'anthropic', 'lovable_gateway'));
