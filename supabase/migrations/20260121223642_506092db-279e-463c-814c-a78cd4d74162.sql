-- Fix profiles_secure view to properly inherit RLS from base profiles table
-- Drop and recreate with SECURITY INVOKER = on

DROP VIEW IF EXISTS public.profiles_secure;

CREATE VIEW public.profiles_secure
WITH (security_invoker = on)
AS
SELECT 
  id,
  created_at,
  updated_at,
  full_name,
  -- Only show phone to the user themselves via the secure decrypt function
  CASE 
    WHEN auth.uid() = id THEN public.get_my_phone()
    ELSE NULL 
  END as phone
FROM public.profiles;

-- Add comment explaining security model
COMMENT ON VIEW public.profiles_secure IS 'Secure view of profiles that inherits RLS from base table. Phone numbers are only visible to the profile owner.';

-- Grant appropriate permissions
GRANT SELECT ON public.profiles_secure TO authenticated;