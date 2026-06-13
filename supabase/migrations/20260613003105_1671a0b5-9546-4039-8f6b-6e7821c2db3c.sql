
-- 1. Add encrypted columns
ALTER TABLE public.user_brand_profiles
  ADD COLUMN IF NOT EXISTS email_encrypted bytea,
  ADD COLUMN IF NOT EXISTS phone_encrypted bytea,
  ADD COLUMN IF NOT EXISTS tax_id_encrypted bytea;

-- 2. Backfill from plaintext
UPDATE public.user_brand_profiles
SET email_encrypted  = CASE WHEN email  IS NOT NULL AND email  <> '' THEN public.encrypt_pii(email)  END,
    phone_encrypted  = CASE WHEN phone  IS NOT NULL AND phone  <> '' THEN public.encrypt_pii(phone)  END,
    tax_id_encrypted = CASE WHEN tax_id IS NOT NULL AND tax_id <> '' THEN public.encrypt_pii(tax_id) END
WHERE email IS NOT NULL OR phone IS NOT NULL OR tax_id IS NOT NULL;

-- 3. Drop plaintext columns
ALTER TABLE public.user_brand_profiles
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS tax_id;

-- 4. SECURITY DEFINER read RPC — returns the caller's profile with decrypted PII
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

-- 5. SECURITY DEFINER write RPC — accepts plaintext JSON, encrypts PII, upserts
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
