
REVOKE EXECUTE ON FUNCTION public.record_engine_learning_signal(UUID,UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,NUMERIC,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_engine_learning_signal(UUID,UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,NUMERIC,TEXT) TO service_role;
