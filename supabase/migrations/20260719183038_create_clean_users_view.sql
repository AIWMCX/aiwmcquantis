-- Reconciliation file (2026-07-21): applied via the Supabase Management
-- API earlier this session under exactly this version/name, but no
-- matching local .sql file was ever committed -- confirmed via a
-- `supabase db push` failure flagging this version as "remote, no local
-- file". Content below is the exact current live definition (verified via
-- direct query 2026-07-21). CREATE OR REPLACE is idempotent -- safe to run
-- against the current database with no effective change.
--
-- Superseded 2026-07-20 by external_commercial_users (see
-- 20260721051509_commercial_clean_views.sql), which additionally excludes
-- founder/admin accounts via user_roles.role='admin'. This view is left in
-- place for backward compatibility but should not be used for commercial
-- metrics going forward.

CREATE OR REPLACE VIEW public.clean_users AS
SELECT
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at,
  recovery_token, recovery_sent_at, email_change_token_new, email_change,
  email_change_sent_at, last_sign_in_at, raw_app_meta_data,
  raw_user_meta_data, is_super_admin, created_at, updated_at, phone,
  phone_confirmed_at, phone_change, phone_change_token,
  phone_change_sent_at, confirmed_at, email_change_token_current,
  email_change_confirm_status, banned_until, reauthentication_token,
  reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous
FROM auth.users u
WHERE email !~~ '%@quantis-e2e.test'
  AND email !~~ '%@quantis-test.com'
  AND email !~~ '%glasswing%'
  AND email !~~ '%audit-test%'
  AND email !~~ '%@mailnull.com'
  AND email <> 'ci-test-probe@aiwmcquantis.com';
