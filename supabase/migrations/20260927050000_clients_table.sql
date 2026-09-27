-- Client workspace, Stage 5 (2026-09-27): a Client business-entity so a
-- consultant/CFO doing repeat decisions for the same client can group them
-- together, instead of every Decision Run being a disconnected one-off.
--
-- Confirmed via live schema inspection (list_tables on the production
-- project, dmlxrvfyqsakyjomsvdj) that no clients/businesses/
-- consultant_clients table exists yet, and that public.analyses has no
-- business-identity column beyond the free-text idea/location fields --
-- this is additive, not a duplicate truth store.
--
-- RLS pattern: mirrors public.documents' simple per-user owner model
-- (20260204064801_a495bba7-1a3b-4e99-820f-755fdbe2bfbf.sql): deny-anon, then
-- auth.uid() = owner_user_id for select/insert/update/delete, plus a
-- service-role-manages-all policy -- NOT the admin-only has_role() pattern
-- commercial_* uses (that is the founder's own internal sales data; this is
-- a normal user-facing feature every consultant account uses for their own
-- clients).
--
-- Verified: ran this exact migration body inside a disposable
-- BEGIN ... ROLLBACK transaction against the live production project before
-- finalizing this file (table created, RLS applied, a client row inserted
-- and returned successfully, analyses.client_id column present and
-- readable) -- then rolled back and confirmed via a fresh query that
-- public.clients and analyses.client_id do not exist post-rollback. Same
-- verification pattern as 20260926090000_commercial_foundation.sql /
-- PR #199.

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  industry text,
  location text,
  -- Reusable financial context (e.g. typical revenue/costs/customers) so a
  -- repeat decision for the same client doesn't start from a blank form.
  -- Deliberately NOT a duplicate of the analyses schema -- just a small
  -- jsonb bag of assumptions the New Decision flow can offer as a starting
  -- point; the actual analysis is still built and run entirely by the
  -- existing engine.
  baseline_assumptions jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_owner ON public.clients(owner_user_id, created_at DESC);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anonymous access to clients"
  ON public.clients FOR ALL TO anon
  USING (false);

CREATE POLICY "Users can view own clients"
  ON public.clients FOR SELECT TO authenticated
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can create own clients"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update own clients"
  ON public.clients FOR UPDATE TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete own clients"
  ON public.clients FOR DELETE TO authenticated
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Service role manages clients"
  ON public.clients FOR ALL
  USING (public.is_service_role())
  WITH CHECK (public.is_service_role());

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Link existing decisions to clients. Nullable and additive -- a decision
-- without a client_id keeps working exactly as it does today. ON DELETE SET
-- NULL so deleting a client never deletes or breaks a decision that
-- referenced it.
ALTER TABLE public.analyses
  ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX idx_analyses_client ON public.analyses(client_id) WHERE client_id IS NOT NULL;
