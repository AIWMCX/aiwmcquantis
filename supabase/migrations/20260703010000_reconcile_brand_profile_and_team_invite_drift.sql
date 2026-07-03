-- Two independent fixes found during the 2026-07-02 schema-drift audit
-- (follow-up to PR #22 / migration 20260702234500).

-- ============================================================
-- 1. Reconcile public.user_brand_profiles: this table plus
--    get_user_brand_profile()/upsert_user_brand_profile(jsonb) are already
--    LIVE in production -- applied directly via the Supabase Management
--    API from the never-merged branch fix/encrypt-pii-brand-profile-rpcs
--    (commit deef98c6), which is how the orphaned schema_migrations row
--    "20260702233000 fix_encrypt_pii_and_brand_profile_rpcs" (no matching
--    file in main) came to exist. That branch's own encrypt_pii/decrypt_pii
--    definitions (keyed off vault secret 'quantis_pii_encryption_key_v2')
--    were superseded when PR #22 ran CREATE OR REPLACE on the same two
--    function names using vault secret 'pii_encryption_key_v2' -- verified
--    live: both get_user_brand_profile/upsert_user_brand_profile bodies
--    only ever call public.encrypt_pii/decrypt_pii by name, so they
--    transparently picked up the winning key. This migration just brings
--    git in sync with what is already running; every statement below is
--    idempotent and a no-op against the current live schema.
CREATE TABLE IF NOT EXISTS public.user_brand_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE,
  company_name    TEXT,
  logo_url        TEXT,
  primary_color   TEXT DEFAULT '#0F172A',
  secondary_color TEXT DEFAULT '#6366F1',
  accent_color    TEXT DEFAULT '#10B981',
  font_preference TEXT DEFAULT 'inter',
  address_line1   TEXT,
  address_line2   TEXT,
  city            TEXT,
  state           TEXT,
  zip             TEXT,
  website         TEXT,
  invoice_prefix  TEXT DEFAULT 'INV',
  invoice_counter INTEGER DEFAULT 1000,
  email_encrypted  bytea,
  phone_encrypted  bytea,
  tax_id_encrypted bytea,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_brand_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_deny_user_brand_profiles" ON public.user_brand_profiles;
CREATE POLICY "anon_deny_user_brand_profiles" ON public.user_brand_profiles
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "users_crud_own_brand_profile" ON public.user_brand_profiles;
CREATE POLICY "users_crud_own_brand_profile" ON public.user_brand_profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_user_brand_profile()
RETURNS TABLE (
  id uuid, user_id uuid, company_name text, logo_url text,
  primary_color text, secondary_color text, accent_color text, font_preference text,
  address_line1 text, address_line2 text, city text, state text, zip text,
  phone text, email text, website text, tax_id text,
  invoice_prefix text, invoice_counter integer,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.user_id, p.company_name, p.logo_url,
    p.primary_color, p.secondary_color, p.accent_color, p.font_preference,
    p.address_line1, p.address_line2, p.city, p.state, p.zip,
    CASE WHEN p.phone_encrypted  IS NULL THEN NULL ELSE public.decrypt_pii(p.phone_encrypted)  END AS phone,
    CASE WHEN p.email_encrypted  IS NULL THEN NULL ELSE public.decrypt_pii(p.email_encrypted)  END AS email,
    p.website,
    CASE WHEN p.tax_id_encrypted IS NULL THEN NULL ELSE public.decrypt_pii(p.tax_id_encrypted) END AS tax_id,
    p.invoice_prefix, p.invoice_counter, p.created_at, p.updated_at
  FROM public.user_brand_profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_brand_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_brand_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_user_brand_profile(p jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.user_brand_profiles (
    user_id, company_name, logo_url,
    primary_color, secondary_color, accent_color, font_preference,
    address_line1, address_line2, city, state, zip,
    website, invoice_prefix, invoice_counter,
    email_encrypted, phone_encrypted, tax_id_encrypted,
    updated_at
  ) VALUES (
    v_uid,
    NULLIF(p->>'company_name',''),
    NULLIF(p->>'logo_url',''),
    COALESCE(NULLIF(p->>'primary_color',''),   '#0F172A'),
    COALESCE(NULLIF(p->>'secondary_color',''), '#6366F1'),
    COALESCE(NULLIF(p->>'accent_color',''),    '#10B981'),
    COALESCE(NULLIF(p->>'font_preference',''), 'inter'),
    NULLIF(p->>'address_line1',''),
    NULLIF(p->>'address_line2',''),
    NULLIF(p->>'city',''),
    NULLIF(p->>'state',''),
    NULLIF(p->>'zip',''),
    NULLIF(p->>'website',''),
    COALESCE(NULLIF(p->>'invoice_prefix',''), 'INV'),
    COALESCE((p->>'invoice_counter')::int, 1000),
    CASE WHEN NULLIF(p->>'email','')  IS NULL THEN NULL ELSE public.encrypt_pii(p->>'email')  END,
    CASE WHEN NULLIF(p->>'phone','')  IS NULL THEN NULL ELSE public.encrypt_pii(p->>'phone')  END,
    CASE WHEN NULLIF(p->>'tax_id','') IS NULL THEN NULL ELSE public.encrypt_pii(p->>'tax_id') END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    company_name     = COALESCE(EXCLUDED.company_name,     public.user_brand_profiles.company_name),
    logo_url         = COALESCE(EXCLUDED.logo_url,         public.user_brand_profiles.logo_url),
    primary_color    = COALESCE(EXCLUDED.primary_color,    public.user_brand_profiles.primary_color),
    secondary_color  = COALESCE(EXCLUDED.secondary_color,  public.user_brand_profiles.secondary_color),
    accent_color     = COALESCE(EXCLUDED.accent_color,     public.user_brand_profiles.accent_color),
    font_preference  = COALESCE(EXCLUDED.font_preference,  public.user_brand_profiles.font_preference),
    address_line1    = COALESCE(EXCLUDED.address_line1,    public.user_brand_profiles.address_line1),
    address_line2    = COALESCE(EXCLUDED.address_line2,    public.user_brand_profiles.address_line2),
    city             = COALESCE(EXCLUDED.city,             public.user_brand_profiles.city),
    state            = COALESCE(EXCLUDED.state,            public.user_brand_profiles.state),
    zip              = COALESCE(EXCLUDED.zip,              public.user_brand_profiles.zip),
    website          = COALESCE(EXCLUDED.website,          public.user_brand_profiles.website),
    invoice_prefix   = COALESCE(EXCLUDED.invoice_prefix,   public.user_brand_profiles.invoice_prefix),
    invoice_counter  = COALESCE(EXCLUDED.invoice_counter,  public.user_brand_profiles.invoice_counter),
    email_encrypted  = COALESCE(EXCLUDED.email_encrypted,  public.user_brand_profiles.email_encrypted),
    phone_encrypted  = COALESCE(EXCLUDED.phone_encrypted,  public.user_brand_profiles.phone_encrypted),
    tax_id_encrypted = COALESCE(EXCLUDED.tax_id_encrypted, public.user_brand_profiles.tax_id_encrypted),
    updated_at       = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_user_brand_profile(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_user_brand_profile(jsonb) TO authenticated;

-- Orphaned Vault secret from the superseded key-naming scheme in the
-- unmerged branch -- confirmed unused (neither live function references
-- it; both call public.encrypt_pii/decrypt_pii which resolve to
-- 'pii_encryption_key_v2').
DELETE FROM vault.secrets WHERE name = 'quantis_pii_encryption_key_v2';

-- ============================================================
-- 2. Team-invite RLS policy fix (20260702044447, never applied -- same
--    SUPABASE_DB_PASSWORD root cause). Without this, an invited user who
--    is not already a team admin cannot accept their invitation: the INSERT
--    into team_members is rejected by the old, narrower policy. Confirmed
--    live: only the superseded "Team admins can add members" policy exists.
-- ============================================================
DROP POLICY IF EXISTS "Team admins can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins or invited users can add members" ON public.team_members;

CREATE POLICY "Team admins or invited users can add members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_team_admin(auth.uid(), team_id)
  OR (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.team_invitations ti
      WHERE ti.team_id = team_members.team_id
        AND lower(ti.email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
        AND ti.accepted_at IS NULL
        AND ti.expires_at > now()
        AND ti.role = team_members.role
    )
  )
);

NOTIFY pgrst, 'reload schema';
