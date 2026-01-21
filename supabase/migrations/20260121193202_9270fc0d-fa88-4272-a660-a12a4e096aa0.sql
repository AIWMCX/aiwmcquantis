-- Function to get recent users with details (admin only)
CREATE OR REPLACE FUNCTION public.get_recent_users(days_back integer DEFAULT 30)
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  plan_id text
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
    p.full_name,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(s.plan_id, 'free')::text as plan_id
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.subscriptions s ON s.user_id = u.id
  WHERE u.created_at > NOW() - (days_back || ' days')::interval
  ORDER BY u.created_at DESC;
END;
$$;

-- Function to get today's activity (signups and logins)
CREATE OR REPLACE FUNCTION public.get_todays_activity()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  is_new_today boolean
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
    p.full_name,
    u.last_sign_in_at,
    u.created_at,
    (u.created_at::date = CURRENT_DATE) as is_new_today
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.last_sign_in_at::date = CURRENT_DATE
     OR u.created_at::date = CURRENT_DATE
  ORDER BY GREATEST(u.last_sign_in_at, u.created_at) DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_recent_users(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_todays_activity() TO authenticated;