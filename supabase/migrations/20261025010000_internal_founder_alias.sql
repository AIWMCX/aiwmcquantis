-- Founder alias beltovbogdan@gmail.com counted as an outside user.
--
-- The internal-account pattern (jeltov|aiwmc|jjbalaganvasya) missed the
-- founder's own admin-allowlisted alias, so its 67 test analyses showed as
-- "external" in admin_users_overview and in any email-joined count. Confirmed
-- founder-owned 2026-10-24. Both objects are redefined exactly as live, with
-- only the pattern extended to (jeltov|beltov|aiwmc|jjbalaganvasya).

CREATE OR REPLACE VIEW public.funnel_events_clean
WITH (security_invoker = true) AS
WITH granted AS (
  SELECT DISTINCT subscriptions.user_id
  FROM public.subscriptions
  WHERE subscriptions.user_id IS NOT NULL
    AND (subscriptions.stripe_subscription_id LIKE 'founder\_%' OR subscriptions.stripe_subscription_id LIKE 'sub\_plus\_%')
), base AS (
  SELECT fe.id, fe.event_name, fe.session_id, fe.user_id, fe.path, fe.referrer,
    fe.utm_source, fe.utm_medium, fe.utm_campaign, fe.metadata, fe.created_at,
    CASE fe.event_name
      WHEN 'analysis_started'   THEN 'analysis_start'
      WHEN 'analysis_completed' THEN 'analysis_complete'
      WHEN 'result_rendered'    THEN 'result_viewed'
      ELSE fe.event_name
    END AS canonical_event,
    (
      COALESCE(fe.metadata ->> 'internal_qa', '') = 'true'
      OR COALESCE(u.email, '')::text ~* '(jeltov|beltov|aiwmc|jjbalaganvasya)'
      OR COALESCE(fe.metadata ->> 'host', '') ~* '(localhost|127\.0\.0\.1|vercel\.app)'
      OR COALESCE(fe.referrer, '') ~* '(localhost|127\.0\.0\.1|\.chatgpt\.site)'
      OR lower(COALESCE(fe.utm_medium, '')) = 'internal'
      OR lower(COALESCE(fe.utm_source, '')) ~ '^(qa_test|internal|test)$'
      OR g.user_id IS NOT NULL
    ) AS row_internal,
    (fe.created_at AT TIME ZONE 'America/Denver')::date AS denver_day
  FROM public.funnel_events fe
  LEFT JOIN auth.users u ON u.id = fe.user_id
  LEFT JOIN granted g ON g.user_id = fe.user_id
)
SELECT id, event_name, session_id, user_id, path, referrer, utm_source, utm_medium,
  utm_campaign, metadata, created_at, canonical_event,
  bool_or(row_internal) OVER (PARTITION BY COALESCE(session_id, id::text)) AS is_internal,
  denver_day,
  row_number() OVER (PARTITION BY session_id, canonical_event ORDER BY created_at, id) = 1 AS is_first_in_session
FROM base b;

REVOKE ALL ON public.funnel_events_clean FROM anon, authenticated;
GRANT SELECT ON public.funnel_events_clean TO service_role;

CREATE OR REPLACE FUNCTION public.admin_users_overview()
 RETURNS TABLE(user_id uuid, email text, full_name text, signed_up_at timestamp with time zone, last_sign_in_at timestamp with time zone, email_confirmed boolean, sign_in_provider text, is_admin boolean, is_internal boolean, plan_id text, subscription_status text, trial_ends_at timestamp with time zone, current_period_end timestamp with time zone, has_stripe_customer boolean, analyses_count integer, first_analysis_at timestamp with time zone, last_analysis_at timestamp with time zone, marketing_opt_in boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    (u.email ~* '(jeltov|beltov|aiwmc|jjbalaganvasya)' OR g.user_id IS NOT NULL),
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
$function$;
