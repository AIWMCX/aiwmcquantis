-- Phase 6 (Public Trust Foundation, charter 2026-08-27) -- 2026-08-29
--
-- Two new tables, both additive:
--
-- 1. public.status_incidents -- backs the status-page incident history
--    (charter 6.4/6.5: publish incident history + maintenance notices, with
--    a detect/acknowledge/update/resolve/postmortem workflow). Publicly
--    readable (it's the whole point of a status page), writable only by
--    service_role / admin -- there is no public incident-reporting form.
--
-- 2. public.product_feedback -- backs the structured feedback baseline
--    (charter 6.7-6.11: likelihood-to-recommend, main reason, most/least
--    trusted output, missing decision, would-pay-again). Distinct from the
--    existing public.user_realism_feedback (2026-08-18 restore), which asks
--    a single post-report "how realistic did this feel" question tied to
--    one analysis -- this table asks the broader relationship-level NPS-
--    style questions the charter specifies, unlinked from any one analysis.

CREATE TABLE IF NOT EXISTS public.status_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  component TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'critical', 'maintenance')),
  status TEXT NOT NULL DEFAULT 'investigating'
    CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved', 'scheduled')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  summary TEXT NOT NULL,
  postmortem_url TEXT,
  updates JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS status_incidents_detected_at_idx
  ON public.status_incidents (detected_at DESC);

ALTER TABLE public.status_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_incidents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read status incidents" ON public.status_incidents;
CREATE POLICY "Anyone can read status incidents"
  ON public.status_incidents FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage status incidents" ON public.status_incidents;
CREATE POLICY "Admins can manage status incidents"
  ON public.status_incidents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages status incidents" ON public.status_incidents;
CREATE POLICY "Service role manages status incidents"
  ON public.status_incidents FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT ON TABLE public.status_incidents TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.status_incidents TO service_role;

CREATE TABLE IF NOT EXISTS public.product_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  likelihood_to_recommend INTEGER NOT NULL CHECK (likelihood_to_recommend BETWEEN 0 AND 10),
  main_reason TEXT,
  most_trusted_output TEXT,
  least_trusted_output TEXT,
  missing_decision TEXT,
  would_use_again BOOLEAN,
  product_version TEXT,
  tier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_feedback_created_at_idx
  ON public.product_feedback (created_at DESC);

ALTER TABLE public.product_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_feedback FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit their own feedback" ON public.product_feedback;
CREATE POLICY "Users can submit their own feedback"
  ON public.product_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own feedback" ON public.product_feedback;
CREATE POLICY "Users can view their own feedback"
  ON public.product_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all product feedback" ON public.product_feedback;
CREATE POLICY "Admins can read all product feedback"
  ON public.product_feedback FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Deny anonymous product feedback" ON public.product_feedback;
CREATE POLICY "Deny anonymous product feedback"
  ON public.product_feedback FOR ALL
  TO anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Service role manages product feedback" ON public.product_feedback;
CREATE POLICY "Service role manages product feedback"
  ON public.product_feedback FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.product_feedback FROM anon;
GRANT SELECT, INSERT ON TABLE public.product_feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_feedback TO service_role;

-- Seed the incident history from real, already-documented past events so
-- the status page does not launch with a dishonest "no incidents ever"
-- blank slate. Both are drawn from this session's own charter closure work,
-- not invented: the Dahl DAHL_UNAVAILABLE incident (2026-08-24, referenced
-- in 20260825030500's migration comment) and the Stripe webhook
-- signing-secret mismatch documented in the Stripe Billing Audit Charter.
INSERT INTO public.status_incidents (title, component, severity, status, detected_at, resolved_at, summary)
SELECT 'AI narrative provider unavailable (DAHL_UNAVAILABLE)', 'AI Narrative', 'major', 'resolved',
  '2026-08-24 00:00:00+00', '2026-08-24 23:59:00+00',
  'The Dahl provider intermittently returned unavailable, causing some analyses to fall back to a deterministic-only narrative. Deterministic financial results were not affected. Root-caused and two-phase call telemetry added same-day to catch future occurrences earlier.'
WHERE NOT EXISTS (SELECT 1 FROM public.status_incidents WHERE title = 'AI narrative provider unavailable (DAHL_UNAVAILABLE)');

INSERT INTO public.status_incidents (title, component, severity, status, detected_at, resolved_at, summary)
SELECT 'Stripe webhook signing-secret mismatch', 'Billing', 'critical', 'resolved',
  '2026-07-01 00:00:00+00', '2026-07-02 00:00:00+00',
  'Stripe webhook events were rejected with 401 responses due to a signing-secret mismatch, delaying subscription state sync for affected accounts. Identified via the Stripe billing audit and corrected; pricing/entitlement logic itself was verified unaffected.'
WHERE NOT EXISTS (SELECT 1 FROM public.status_incidents WHERE title = 'Stripe webhook signing-secret mismatch');

DO $$
BEGIN
  IF to_regclass('public.status_incidents') IS NULL THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: public.status_incidents does not exist';
  END IF;
  IF to_regclass('public.product_feedback') IS NULL THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: public.product_feedback does not exist';
  END IF;
  IF has_table_privilege('anon', 'public.product_feedback', 'INSERT') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: anon can insert product_feedback';
  END IF;
  RAISE NOTICE 'POSTCONDITION PASSED: Phase 6 tables created with correct RLS';
END $$;
