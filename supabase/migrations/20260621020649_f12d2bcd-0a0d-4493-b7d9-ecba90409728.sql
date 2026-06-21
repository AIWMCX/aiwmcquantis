
-- Allowlist function
CREATE OR REPLACE FUNCTION public.is_admin_allowlisted(_email text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT lower(_email) = ANY (ARRAY[
    'beltovbogdan@gmail.com',
    'jeltovbogdan@gmail.com',
    'legal@aiwmcquantis.com'
  ]);
$$;

-- Replace protective trigger to honor allowlist
CREATE OR REPLACE FUNCTION public.protect_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_email text;
BEGIN
  IF NEW.role = 'admin'::public.app_role THEN
    SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;
    IF v_email IS NULL OR NOT public.is_admin_allowlisted(v_email) THEN
      RAISE EXCEPTION 'Admin role assignment is restricted. Contact system administrator.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Auto-claim on login
CREATE OR REPLACE FUNCTION public.claim_admin_if_allowlisted()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL OR NOT public.is_admin_allowlisted(v_email) THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_admin_if_allowlisted() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_allowlisted() TO authenticated;

-- Backfill existing allowlisted users
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE public.is_admin_allowlisted(u.email)
ON CONFLICT (user_id, role) DO NOTHING;

-- Content Studio history
CREATE TABLE IF NOT EXISTS public.content_studio_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  angle text,
  tone text,
  audience text,
  cta text,
  platforms text[] NOT NULL DEFAULT '{}',
  length text,
  hashtags_enabled boolean NOT NULL DEFAULT true,
  emoji_enabled boolean NOT NULL DEFAULT true,
  language text NOT NULL DEFAULT 'en',
  model text,
  variants jsonb NOT NULL DEFAULT '{}'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_studio_generations TO authenticated;
GRANT ALL ON public.content_studio_generations TO service_role;
ALTER TABLE public.content_studio_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read content studio" ON public.content_studio_generations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admins write content studio" ON public.content_studio_generations
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND created_by = auth.uid());
CREATE POLICY "admins update content studio" ON public.content_studio_generations
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admins delete content studio" ON public.content_studio_generations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_content_studio_generations_created_by_at
  ON public.content_studio_generations (created_by, created_at DESC);
