-- Caller guards for four SECURITY DEFINER functions that accept a user id.
--
-- Found 2026-10-18 (security closure): each was executable by any signed-in
-- user and acted on whatever user id it was given, so one account could act
-- as another (credit a referral to any account, read/create another user's
-- referral code, advance another user's invoice counter, write denial logs
-- under another id). Integrity issues, not data reads.
--
-- Rule: when a user is signed in (auth.uid() is not null), the id passed in
-- must be their own. Server-side callers (service role, auth.uid() null) are
-- unchanged. Every client caller already passes its own user.id.
-- Bodies are otherwise identical to the live definitions.

CREATE OR REPLACE FUNCTION public.complete_referral_signup(p_conversion_id uuid, p_referred_user_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_referral_code_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL AND p_referred_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed: can only complete your own referral signup' USING ERRCODE = '42501';
  END IF;
  UPDATE public.referral_conversions
  SET referred_user_id = p_referred_user_id, signed_up_at = NOW(), status = 'qualified'
  WHERE id = p_conversion_id AND referred_user_id IS NULL
  RETURNING referral_code_id INTO v_referral_code_id;
  IF v_referral_code_id IS NULL THEN RETURN false; END IF;
  UPDATE public.referral_codes
  SET total_conversions = total_conversions + 1, updated_at = NOW()
  WHERE id = v_referral_code_id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_code TEXT; v_exists BOOLEAN; v_attempts INTEGER := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed: can only generate your own referral code' USING ERRCODE = '42501';
  END IF;
  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = p_user_id;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;
  LOOP
    v_attempts := v_attempts + 1;
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists OR v_attempts > 10;
  END LOOP;
  IF v_exists THEN RAISE EXCEPTION 'Could not generate unique referral code'; END IF;
  INSERT INTO public.referral_codes (user_id, code) VALUES (p_user_id, v_code);
  RETURN v_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_user_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix TEXT; v_counter INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed: can only number your own invoices' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.user_brand_profiles (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO UPDATE
    SET invoice_counter = user_brand_profiles.invoice_counter + 1, updated_at = now()
  RETURNING invoice_prefix, invoice_counter INTO v_prefix, v_counter;
  RETURN v_prefix || '-' || LPAD(v_counter::TEXT, 6, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_entitlement_denial(p_user_id uuid, p_tier text, p_feature text, p_path text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed: can only log your own entitlement denial' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.entitlement_denials (user_id, tier, feature, path, metadata)
  VALUES (p_user_id, p_tier, p_feature, p_path, COALESCE(p_metadata, '{}'::jsonb));
END;
$function$;

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['complete_referral_signup','generate_referral_code','get_next_invoice_number','log_entitlement_denial'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                   WHERE n.nspname='public' AND p.proname=f AND pg_get_functiondef(p.oid) LIKE '%auth.uid() IS NOT NULL%') THEN
      RAISE EXCEPTION 'POSTCONDITION FAILED: % has no caller guard', f;
    END IF;
  END LOOP;
END $$;
