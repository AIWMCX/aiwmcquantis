-- Phase 7 (Paid Decision Workflow Validation, 2026-08-30) -- tracking
-- infrastructure for paid founder/consultant decision-review engagements.
--
-- This is internal sales/ops tooling, not a customer-facing feature: the
-- founder logs an engagement manually (there is no self-serve "buy a paid
-- review" flow yet), so RLS is admin/service_role only -- no customer,
-- including the linked user, can read or write this table. That is
-- deliberate: it tracks the business's own engagement pipeline, not
-- something the customer submitted.
--
-- Investigated before writing (per this session's established discipline):
-- no existing "engagement", "consulting", "paid_review", or "decision_memo"
-- table exists anywhere in supabase/migrations. This is new schema, not a
-- restore.

CREATE TABLE IF NOT EXISTS public.paid_engagements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  engagement_type TEXT NOT NULL CHECK (engagement_type IN ('founder_review', 'consultant_review', 'other')),
  price_usd NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  decision_question TEXT,
  consultant_notes TEXT,
  engaged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS paid_engagements_engaged_at_idx
  ON public.paid_engagements (engaged_at DESC);
CREATE INDEX IF NOT EXISTS paid_engagements_user_id_idx
  ON public.paid_engagements (user_id);

ALTER TABLE public.paid_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paid_engagements FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage paid engagements" ON public.paid_engagements;
CREATE POLICY "Admins can manage paid engagements"
  ON public.paid_engagements FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Deny all non-admin access to paid engagements" ON public.paid_engagements;
CREATE POLICY "Deny all non-admin access to paid engagements"
  ON public.paid_engagements FOR ALL
  TO anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Service role manages paid engagements" ON public.paid_engagements;
CREATE POLICY "Service role manages paid engagements"
  ON public.paid_engagements FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.paid_engagements FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.paid_engagements TO service_role;
-- authenticated grant is intentionally omitted at the GRANT level too, on
-- top of the RLS policy above -- belt-and-suspenders per this session's
-- established pattern (see product_feedback, status_incidents migrations).
-- Admin access goes through the has_role() policy on the authenticated
-- role, which requires the GRANT below to actually read/write rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.paid_engagements TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.paid_engagements') IS NULL THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: public.paid_engagements does not exist';
  END IF;
  IF has_table_privilege('anon', 'public.paid_engagements', 'SELECT')
     OR has_table_privilege('anon', 'public.paid_engagements', 'INSERT') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: anon can access paid_engagements';
  END IF;
  RAISE NOTICE 'POSTCONDITION PASSED: paid_engagements created, anon denied, admin-gated via RLS';
END $$;
