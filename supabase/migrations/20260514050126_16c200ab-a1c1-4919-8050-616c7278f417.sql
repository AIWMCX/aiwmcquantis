
-- 1. Remove sensitive tables from realtime publication
-- Fixed 2026-08-10: unconditional DROP assumed both tables were already
-- publication members. On a fresh database replay that isn't always true by
-- this point in the chain, and DROP TABLE on a non-member relation raises
-- 42704 (undefined_object), unlike ADD which has no such failure mode.
-- Guarded with the same idempotent pg_publication_tables check this repo
-- already uses for the ADD case (see 20260502215738_...sql).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.subscriptions;
  END IF;
END $$;

-- 2. Whitelist team invitation roles at the DB layer
ALTER TABLE public.team_invitations
  DROP CONSTRAINT IF EXISTS team_invitations_role_check;
ALTER TABLE public.team_invitations
  ADD CONSTRAINT team_invitations_role_check
  CHECK (role IN ('member', 'admin'));

-- 3. Hide raw invitation token from clients (service role only)
REVOKE SELECT (token) ON public.team_invitations FROM authenticated, anon;

-- 4. Explicitly deny anon/authenticated INSERT on funnel_events
DROP POLICY IF EXISTS "Block client inserts on funnel events" ON public.funnel_events;
CREATE POLICY "Block client inserts on funnel events"
  ON public.funnel_events
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);
