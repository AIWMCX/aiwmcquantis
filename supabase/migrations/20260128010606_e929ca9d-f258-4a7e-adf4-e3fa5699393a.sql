-- Step 1: Backfill missing profiles for all users who don't have one
INSERT INTO public.profiles (id, full_name, phone_encrypted, created_at)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', 'User'),
  CASE 
    WHEN u.raw_user_meta_data->>'phone' IS NOT NULL 
     AND u.raw_user_meta_data->>'phone' != ''
    THEN public.encrypt_pii(u.raw_user_meta_data->>'phone')
    ELSE NULL
  END,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Step 2: Backfill missing subscriptions for all users who don't have one
INSERT INTO public.subscriptions (user_id, plan_id, status, created_at)
SELECT 
  u.id,
  'free',
  'active',
  u.created_at
FROM auth.users u
LEFT JOIN public.subscriptions s ON s.user_id = u.id
WHERE s.user_id IS NULL;

-- Step 3: Create robust handle_new_user() function with error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone_raw text;
  v_error_message text;
  v_error_detail text;
BEGIN
  -- Get phone from metadata if provided
  v_phone_raw := NEW.raw_user_meta_data ->> 'phone';
  
  -- Insert profile with encrypted phone (or NULL if no phone provided)
  BEGIN
    INSERT INTO public.profiles (id, full_name, phone_encrypted)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
      CASE 
        WHEN v_phone_raw IS NOT NULL AND v_phone_raw != '' 
        THEN public.encrypt_pii(v_phone_raw)
        ELSE NULL
      END
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT, v_error_detail = PG_EXCEPTION_DETAIL;
    -- Log the error but don't fail the signup
    INSERT INTO public.security_logs (user_id, event_type, event_data)
    VALUES (
      NEW.id,
      'profile_creation_failed',
      jsonb_build_object(
        'error', v_error_message,
        'detail', v_error_detail,
        'timestamp', NOW()
      )
    );
  END;
  
  -- Create free subscription for new user
  BEGIN
    INSERT INTO public.subscriptions (user_id, plan_id, status)
    VALUES (NEW.id, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT, v_error_detail = PG_EXCEPTION_DETAIL;
    -- Log the error but don't fail the signup
    INSERT INTO public.security_logs (user_id, event_type, event_data)
    VALUES (
      NEW.id,
      'subscription_creation_failed',
      jsonb_build_object(
        'error', v_error_message,
        'detail', v_error_detail,
        'timestamp', NOW()
      )
    );
  END;
  
  RETURN NEW;
END;
$$;

-- Step 4: Create monitoring function to detect orphaned users
CREATE OR REPLACE FUNCTION public.detect_orphaned_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  created_at timestamptz,
  has_profile boolean,
  has_subscription boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::text,
    u.created_at,
    (p.id IS NOT NULL) as has_profile,
    (s.user_id IS NOT NULL) as has_subscription
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.subscriptions s ON s.user_id = u.id
  WHERE p.id IS NULL OR s.user_id IS NULL
  ORDER BY u.created_at DESC;
END;
$$;