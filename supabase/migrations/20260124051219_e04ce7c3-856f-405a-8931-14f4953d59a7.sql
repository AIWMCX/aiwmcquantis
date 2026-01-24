-- Fix the handle_new_user trigger to use phone_encrypted instead of phone
-- This was causing "column 'phone' of relation 'profiles' does not exist" errors during signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phone_raw text;
BEGIN
  -- Get phone from metadata if provided
  v_phone_raw := NEW.raw_user_meta_data ->> 'phone';
  
  -- Insert profile with encrypted phone (or NULL if no phone provided)
  INSERT INTO public.profiles (id, full_name, phone_encrypted)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    CASE 
      WHEN v_phone_raw IS NOT NULL AND v_phone_raw != '' 
      THEN public.encrypt_pii(v_phone_raw)
      ELSE NULL
    END
  );
  
  -- Create free subscription for new user
  INSERT INTO public.subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;