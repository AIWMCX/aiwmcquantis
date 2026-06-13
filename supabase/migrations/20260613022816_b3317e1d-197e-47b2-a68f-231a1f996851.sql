
-- =========================================================================
-- SECURITY DEFINER FUNCTION HARDENING
-- Pattern: REVOKE ALL FROM PUBLIC, anon, then GRANT EXECUTE to required roles.
-- =========================================================================

-- ---- Trigger-only (never called directly; invoked by triggers) ----
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'auto_grant_admin_on_signup()',
    'enforce_team_seat_cap()',
    'enforce_white_label_pro()',
    'handle_new_team()',
    'handle_new_user()',
    'hash_invitation_token()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
  END LOOP;
END$$;

-- ---- Maintenance / cleanup / audit (cron + service_role only) ----
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'cleanup_expired_invitations()',
    'cleanup_expired_shares()',
    'cleanup_old_analysis_jobs()',
    'cleanup_old_anonymous_usage()',
    'cleanup_old_api_logs()',
    'cleanup_old_export_jobs()',
    'cleanup_old_rate_limits()',
    'cleanup_old_security_logs()',
    'cleanup_old_webhook_events()',
    'detect_orphaned_users()',
    'audit_rls_security()',
    'admin_force_sync_subscription(uuid)'
  ] LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Skipped missing function %', fn;
    END;
  END LOOP;
END$$;

-- ---- Admin dashboard RPCs (authenticated + role check inside) ----
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'get_admin_metrics()',
    'get_ai_learning_metrics()',
    'get_activation_funnel()',
    'get_activation_kpis()',
    'get_analysis_step_funnel()',
    'get_conversion_by_source()',
    'get_daily_signups()',
    'get_journey_drilldown(text,text,text)',
    'get_journey_drilldown_filters()',
    'get_monthly_analyses_stats()',
    'get_recent_users(integer)',
    'get_sample_report_funnel()',
    'get_subscription_summary()',
    'get_todays_activity()',
    'get_unique_users_with_analysis()',
    'get_user_engagement_stats()',
    'get_latest_audit_timestamp()'
  ] LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Skipped missing function %', fn;
    END;
  END LOOP;
END$$;

-- ---- PII / referral / lead helpers (authenticated + service_role) ----
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'can_access_pii(uuid)',
    'check_pii_access_rate(uuid)',
    'get_lead_email(uuid)',
    'complete_referral_signup(text,uuid)',
    'generate_referral_code(uuid)'
  ] LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Skipped missing function %', fn;
    END;
  END LOOP;
END$$;

-- ---- Authenticated-only user helpers (quota, branding, tier) ----
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'consume_analysis_quota(uuid)',
    'consume_download_quota(uuid,text)',
    'decrement_quote_gen_usage(uuid)',
    'increment_quote_gen_usage(uuid)',
    'increment_api_key_usage(uuid)',
    'increment_export_count(uuid)',
    'increment_template_usage(uuid)',
    'increment_usage(uuid,text)',
    'check_rate_limit(uuid,text,integer,integer)',
    'get_referral_stats(uuid)',
    'get_user_activation_score(uuid)',
    'get_next_invoice_number(uuid)',
    'is_team_admin(uuid,uuid)',
    'is_team_member(uuid,uuid)'
  ] LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Skipped missing function %', fn;
    END;
  END LOOP;
END$$;

-- ---- Already-locked / intentionally public: explicit no-op for clarity ----
-- Anon-callable (left open, but normalized to remove duplicate PUBLIC grant):
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'get_public_teardowns()',
    'get_public_teardown_by_slug(text)',
    'get_weekly_leaderboard()',
    'get_analysis_case_grid(text)',
    'check_anonymous_rate_limit(text,text,integer,integer)',
    'claim_anonymous_analysis(uuid,uuid)',
    'capture_lead(text,text,text,text,jsonb)',
    'benchmark_lookup(text,text)',
    'has_role(uuid,app_role)',
    'is_service_role()',
    'is_in_readonly_window()',
    'charge_free_analysis(text)'
  ] LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO anon, authenticated, service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Skipped missing function %', fn;
    END;
  END LOOP;
END$$;
