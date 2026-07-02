-- Fixes a silent production gap: public.get_user_brand_profile(),
-- public.upsert_user_brand_profile(jsonb), public.encrypt_pii(text) and
-- public.decrypt_pii(bytea) are called from src/hooks/useBrandProfile.ts but
-- were never actually present in production. supabase_migrations.schema_migrations
-- shows 20260120164310 (defines encrypt_pii/decrypt_pii) and 20260308094534
-- (creates public.user_brand_profiles) as "applied", but the live schema had
-- none of their objects -- the tracking table does not reflect reality for a
-- broad range of historical migrations. This migration re-creates only the
-- objects needed for the brand-profile PII round trip; it does not touch the
-- separately-broken invoices/doc_generation_jobs/doc_performance_signals
-- objects from 20260308094534, which are out of scope here.
--
-- Key-management change vs. the original (never-applied) 20260120164310:
-- that migration hardcoded the PII symmetric key as a literal string in the
-- migration file ('quantis_pii_encryption_key_v1'), committed to git history.
-- Since none of it had ever actually run in prod, there was no encrypted data
-- to migrate off that key. This version sources the key from Supabase Vault
-- (secret name 'quantis_pii_encryption_key_v2', created via
-- vault.create_secret with a freshly generated 256-bit random key) instead of
-- a literal in the migration source.

-- 1. PII encryption functions, keyed from Vault (not a literal in this file)
CREATE OR REPLACE FUNCTION public.encrypt_pii(plain_text text)
RETURNS bytea
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN
    RETURN NULL;
  END IF;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'quantis_pii_encryption_key_v2';
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'PII encryption key not found in vault';
  END IF;
  RETURN extensions.pgp_sym_encrypt(plain_text, v_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_pii(encrypted_data bytea)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  IF encrypted_data IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'quantis_pii_encryption_key_v2';
  IF v_key IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN extensions.pgp_sym_decrypt(encrypted_data, v_key);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.encrypt_pii(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrypt_pii(bytea) FROM PUBLIC, anon, authenticated;

-- 2. user_brand_profiles table (final target schema -- created fresh with
--    only encrypted PII columns, since the table never previously existed
--    there is no plaintext data to backfill/drop as the original
--    20260613003105 migration assumed)
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

-- 3. SECURITY DEFINER read RPC -- returns the caller's profile with decrypted PII
CREATE OR REPLACE FUNCTION public.get_user_brand_profile()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  company_name text,
  logo_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  font_preference text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  phone text,
  email text,
  website text,
  tax_id text,
  invoice_prefix text,
  invoice_counter integer,
  created_at timestamptz,
  updated_at timestamptz
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

-- 4. SECURITY DEFINER write RPC -- accepts plaintext JSON, encrypts PII, upserts
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
