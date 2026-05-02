-- Enable REPLICA IDENTITY FULL so realtime gets old + new row data
ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;

-- Add to supabase_realtime publication (idempotent guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'subscriptions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions';
  END IF;
END $$;