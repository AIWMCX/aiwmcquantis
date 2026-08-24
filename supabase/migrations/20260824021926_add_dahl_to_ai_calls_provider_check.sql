-- Add 'dahl' to the ai_calls.provider CHECK constraint.
--
-- CodeRabbit catch on the Dahl adapter PR: recordAiCall() in
-- _shared/llm-call.ts writes provider='dahl' for any Dahl-served call, but
-- the existing constraint only allows 'anthropic', 'lovable_gateway', and
-- 'deepseek'. Every Dahl telemetry insert would be silently rejected by
-- PostgREST (recordAiCall only logs a console.warn on failure, never
-- throws) -- meaning Dahl usage would be completely invisible in
-- cost/abuse monitoring the moment DAHL_ENABLED=true, with no visible
-- error anywhere. Widen the constraint before that flag is ever flipped.

ALTER TABLE public.ai_calls DROP CONSTRAINT IF EXISTS ai_calls_provider_check;

ALTER TABLE public.ai_calls
  ADD CONSTRAINT ai_calls_provider_check
  CHECK (provider = ANY (ARRAY['anthropic'::text, 'lovable_gateway'::text, 'deepseek'::text, 'dahl'::text]));
