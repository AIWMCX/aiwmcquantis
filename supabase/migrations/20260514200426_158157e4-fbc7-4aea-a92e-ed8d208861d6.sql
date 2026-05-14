-- Google Search Console verification record (admin-managed singleton).
CREATE TABLE IF NOT EXISTS public.gsc_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url text NOT NULL UNIQUE,
  verification_token text,
  verification_method text NOT NULL DEFAULT 'META',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','failed')),
  verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.gsc_verification ENABLE ROW LEVEL SECURITY;

-- Admin-only access (reuse existing has_role pattern).
DROP POLICY IF EXISTS "gsc_admin_select" ON public.gsc_verification;
CREATE POLICY "gsc_admin_select" ON public.gsc_verification
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "gsc_admin_insert" ON public.gsc_verification;
CREATE POLICY "gsc_admin_insert" ON public.gsc_verification
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "gsc_admin_update" ON public.gsc_verification;
CREATE POLICY "gsc_admin_update" ON public.gsc_verification
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.tg_gsc_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS gsc_touch_updated_at ON public.gsc_verification;
CREATE TRIGGER gsc_touch_updated_at BEFORE UPDATE ON public.gsc_verification
  FOR EACH ROW EXECUTE FUNCTION public.tg_gsc_touch_updated_at();