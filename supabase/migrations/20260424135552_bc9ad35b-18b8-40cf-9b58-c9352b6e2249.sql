ALTER TABLE public.ai_calls
  ADD COLUMN IF NOT EXISTS request_id text;

CREATE INDEX IF NOT EXISTS ai_calls_request_id_idx
  ON public.ai_calls (request_id)
  WHERE request_id IS NOT NULL;