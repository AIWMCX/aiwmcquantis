-- Admin users overview (founder request 2026-10-23): one row per account so
-- the admin panel can show who signed up, how they signed in, what plan they
-- are on and whether they actually used the product.
--
-- Admin only (has_role check), read-only, SECURITY DEFINER because it reads
-- auth.users. "internal" uses the same rules as funnel_events_clean and the
-- data rules in CLAUDE.md: internal emails (jeltov|aiwmc|jjbalaganvasya) and
-- founder-granted subscriptions ('founder_%' / 'sub_plus_%'). Invite grants
-- stay external: they are real invited people.

CREATE OR REPLACE FUNCTION public.admin_users_overview()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  signed_up_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed boolean,
  sign_in_provider text,
  is_admin boolean,
  is_internal boolean,
  plan_id text,
  subscription_status text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  has_stripe_customer boolean,
  analyses_count integer,
  first_analysis_at timestamptz,
  last_analysis_at timestamptz,
  marketing_opt_in boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH sub AS (
    SELECT DISTINCT ON (s.user_id) s.user_id, s.plan_id, s.status, s.trial_ends_at,
      s.current_period_end, s.stripe_customer_id, s.stripe_subscription_id
    FROM public.subscriptions s
    ORDER BY s.user_id, s.updated_at DESC NULLS LAST
  ),
  granted AS (
    SELECT DISTINCT s.user_id FROM public.subscriptions s
    WHERE s.stripe_subscription_id LIKE 'founder_%' OR s.stripe_subscription_id LIKE 'sub_plus_%'
  ),
  an AS (
    SELECT a.user_id, count(*)::int AS n, min(a.created_at) AS first_at, max(a.created_at) AS last_at
    FROM public.analyses a GROUP BY a.user_id
  )
  SELECT
    u.id,
    u.email::text,
    p.full_name,
    u.created_at,
    u.last_sign_in_at,
    (u.email_confirmed_at IS NOT NULL),
    COALESCE(u.raw_app_meta_data->>'provider', 'email'),
    EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin'::app_role),
    (u.email ~* '(jeltov|aiwmc|jjbalaganvasya)' OR g.user_id IS NOT NULL),
    COALESCE(sub.plan_id, 'free'),
    sub.status,
    sub.trial_ends_at,
    sub.current_period_end,
    (sub.stripe_customer_id IS NOT NULL AND sub.stripe_customer_id NOT LIKE 'founder_%'),
    COALESCE(an.n, 0),
    an.first_at,
    an.last_at,
    p.email_marketing_opt_in
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN sub ON sub.user_id = u.id
  LEFT JOIN granted g ON g.user_id = u.id
  LEFT JOIN an ON an.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_users_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_users_overview() TO authenticated;
