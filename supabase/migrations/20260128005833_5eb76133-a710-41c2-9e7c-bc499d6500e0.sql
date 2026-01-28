-- Revoke all access from anon and public roles on profiles_secure view
REVOKE ALL ON public.profiles_secure FROM anon;
REVOKE ALL ON public.profiles_secure FROM public;

-- Grant access only to authenticated users (RLS on base table will filter)
GRANT SELECT ON public.profiles_secure TO authenticated;

-- Recreate the view with security_invoker to inherit base table RLS
DROP VIEW IF EXISTS public.profiles_secure;

CREATE VIEW public.profiles_secure
WITH (security_invoker = on)
AS
SELECT 
  id,
  created_at,
  updated_at,
  full_name,
  -- Phone is masked - use get_my_phone() RPC for actual value
  CASE 
    WHEN auth.uid() = id AND phone_encrypted IS NOT NULL THEN '***-***-****'
    ELSE NULL
  END as phone
FROM public.profiles
WHERE auth.uid() = id;  -- Additional filter ensuring users only see their own data

-- Explicitly revoke anon access after recreation
REVOKE ALL ON public.profiles_secure FROM anon;
REVOKE ALL ON public.profiles_secure FROM public;