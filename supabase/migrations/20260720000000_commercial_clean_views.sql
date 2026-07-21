-- external_commercial_users: auth.users excluding test-email patterns AND admin-role
-- (founder/internal) accounts. Narrower column set than clean_users -- no auth
-- secrets (encrypted_password, tokens) exposed, only what analytics queries need.
CREATE OR REPLACE VIEW public.external_commercial_users AS
SELECT
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  u.email_confirmed_at
FROM auth.users u
WHERE u.email !~~ '%@quantis-e2e.test'
  AND u.email !~~ '%@quantis-test.com'
  AND u.email !~~ '%glasswing%'
  AND u.email !~~ '%audit-test%'
  AND u.email !~~ '%@mailnull.com'
  AND u.email <> 'ci-test-probe@aiwmcquantis.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = u.id AND ur.role = 'admin'
  );

COMMENT ON VIEW public.external_commercial_users IS
  'Canonical "real customer" filter for commercial metrics (Handbook §19, 2026-07-20 profitability audit, Domain 11 Q82/Q109). Excludes known test-email patterns AND any user_roles.role=admin account (founder/internal). Supersedes clean_users for commercial reporting -- clean_users is left in place but should not be used for revenue-quality metrics going forward.';

REVOKE ALL ON public.external_commercial_users FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.external_commercial_users TO service_role;

-- commercial_subscriptions: subscriptions belonging only to external_commercial_users,
-- with an explicit is_founder_grant flag for any row that still slips through via a
-- literal "founder_%" Stripe ID sentinel (belt-and-suspenders on top of the admin-role
-- filter, in case a future comp grant is issued to a non-admin-flagged account).
CREATE OR REPLACE VIEW public.commercial_subscriptions AS
SELECT
  s.*,
  (s.stripe_customer_id LIKE 'founder_%' OR s.stripe_subscription_id LIKE 'founder_%') AS is_founder_grant,
  (s.stripe_customer_id IS NULL OR s.stripe_subscription_id IS NULL) AS is_unbacked_by_stripe
FROM public.subscriptions s
WHERE s.user_id IN (SELECT id FROM public.external_commercial_users);

COMMENT ON VIEW public.commercial_subscriptions IS
  'subscriptions rows for real (non-test, non-founder) users only, with is_founder_grant and is_unbacked_by_stripe flags surfaced explicitly rather than requiring manual pattern-matching every time (2026-07-20 profitability audit, Domain 11).';

REVOKE ALL ON public.commercial_subscriptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.commercial_subscriptions TO service_role;

-- commercial_analyses: same filter applied to analyses, for "real usage" metrics
-- (clean analyses/day, repeat-use rate) instead of ad hoc filtering per query.
CREATE OR REPLACE VIEW public.commercial_analyses AS
SELECT a.*
FROM public.analyses a
WHERE a.user_id IN (SELECT id FROM public.external_commercial_users);

COMMENT ON VIEW public.commercial_analyses IS
  'analyses rows for real (non-test, non-founder) users only (2026-07-20 profitability audit, Domain 11/15).';

REVOKE ALL ON public.commercial_analyses FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.commercial_analyses TO service_role;
