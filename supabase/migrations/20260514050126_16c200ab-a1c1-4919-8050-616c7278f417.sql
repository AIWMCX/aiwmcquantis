
-- 1. Remove sensitive tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.subscriptions;

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
