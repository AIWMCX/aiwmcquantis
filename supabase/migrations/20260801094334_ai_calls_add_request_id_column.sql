-- Fix: _shared/llm-call.ts's recordAiCall() has always included `request_id`
-- in its INSERT payload, but this column never existed. PostgREST rejects
-- any insert with an unrecognized JSON key (PGRST204), and recordAiCall's
-- fetch() call never checks response.ok -- so every single AI-call telemetry
-- write via aiCall()/callTierLlm() (analyze-business, analyze-plus,
-- analyze-pro-extension, ai-narrator, generate-idea, etc.) has silently
-- failed since this code shipped. Adding the column is the fix -- no code
-- change needed once it exists.
ALTER TABLE public.ai_calls ADD COLUMN IF NOT EXISTS request_id text;
CREATE INDEX IF NOT EXISTS ai_calls_request_id_idx ON public.ai_calls(request_id) WHERE request_id IS NOT NULL;
