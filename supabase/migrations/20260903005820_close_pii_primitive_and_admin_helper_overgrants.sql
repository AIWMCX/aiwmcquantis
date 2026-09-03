-- P0 security hardening, fifth wave -- follow-up to the 2026-08-27
-- fourth-wave sweep (20260827092000_close_remaining_low_severity_anon_grants),
-- found during a 2026-09-03 fresh get_advisors sweep that surfaced
-- 139 anon/authenticated-security-definer-executable WARNs the prior
-- audit had not individually reviewed by name.
--
-- Each function below was read in full (pg_get_functiondef) before this
-- migration was written. Two classes:
--
-- 1. REAL GAP: decrypt_pii(bytea) / encrypt_pii(text) are the raw PII
--    crypto primitives (pgp_sym_decrypt/encrypt against the Vault-held
--    key) and had ZERO internal authorization check -- any authenticated
--    user could call them directly via RPC, bypassing the admin-role +
--    rate-limit gating that the correct wrapper (get_lead_email) enforces.
--    Confirmed via prosrc search that every legitimate caller
--    (capture_lead, get_lead_email, get_user_brand_profile,
--    upsert_user_brand_profile) invokes them as internal SQL-to-SQL calls
--    under SECURITY DEFINER, which execute under the *definer's* own
--    privileges and do not require the caller to hold EXECUTE directly --
--    so revoking authenticated's direct grant cannot break any of them.
--    No anon grant existed on either function to begin with.
--
-- 2. EXCESS BUT NOT EXPLOITABLE, closed anyway for defense-in-depth:
--    admin_force_sync_subscription(...) and get_admin_metrics() both
--    correctly gate on has_role(auth.uid(), 'admin'), and has_role() is
--    built on EXISTS(...) which is NULL-safe by construction (a NULL
--    auth.uid() from an anonymous caller correctly resolves has_role to
--    false, not NULL -- verified by reading has_role's own source, since
--    this project has previously shipped a real vulnerability of exactly
--    this NULL-comparison shape in get_referral_stats, fixed
--    2026-08-14). Anon has no legitimate reason to call either function;
--    the grant is revoked, not the logic.
--
-- Explicitly NOT touched, all individually reviewed and confirmed safe:
--   - get_lead_email(uuid): already authenticated-only, same NULL-safe
--     has_role() gate plus a rate limit.
--   - apply_pending_plan_grant() / protect_admin_role(): both RETURNS
--     trigger -- Postgres refuses to invoke a trigger function outside
--     trigger context regardless of EXECUTE grant, so the broad grant on
--     these two is inert as a direct-call vector.
--   - claim_admin_if_allowlisted() / claim_content_admin_if_allowlisted()
--     / claim_pending_plan_grant(): each is NULL-safe and scoped
--     exclusively to auth.uid()'s own identity (a caller can only claim a
--     role/grant addressed to their own account's email) -- no
--     cross-account escalation path.
--   - is_service_role(): reads only the caller's own current_setting();
--     no data access, harmless if callable by anyone.
--
-- The remaining ~68 functions this sweep flagged were not individually
-- reviewed in this pass (most are routine getters/cleanup jobs per the
-- sweep's own characterization) -- tracked as an open follow-up in the
-- canonical register, not silently claimed clean.

DO $$
BEGIN
  RAISE NOTICE 'PRECONDITION -- authenticated can execute decrypt_pii(bytea): %',
    has_function_privilege('authenticated', 'public.decrypt_pii(bytea)', 'EXECUTE');
  RAISE NOTICE 'PRECONDITION -- authenticated can execute encrypt_pii(text): %',
    has_function_privilege('authenticated', 'public.encrypt_pii(text)', 'EXECUTE');
  RAISE NOTICE 'PRECONDITION -- anon can execute admin_force_sync_subscription(text,text,text,text): %',
    has_function_privilege('anon', 'public.admin_force_sync_subscription(text,text,text,text)', 'EXECUTE');
  RAISE NOTICE 'PRECONDITION -- anon can execute get_admin_metrics(): %',
    has_function_privilege('anon', 'public.get_admin_metrics()', 'EXECUTE');
END $$;

REVOKE EXECUTE ON FUNCTION public.decrypt_pii(bytea) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.encrypt_pii(text) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_force_sync_subscription(text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_metrics() FROM PUBLIC, anon;

DO $$
BEGIN
  IF has_function_privilege('authenticated', 'public.decrypt_pii(bytea)', 'EXECUTE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: authenticated can still execute decrypt_pii(bytea)';
  END IF;
  IF has_function_privilege('authenticated', 'public.encrypt_pii(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: authenticated can still execute encrypt_pii(text)';
  END IF;
  IF has_function_privilege('anon', 'public.admin_force_sync_subscription(text,text,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: anon can still execute admin_force_sync_subscription(...)';
  END IF;
  IF has_function_privilege('anon', 'public.get_admin_metrics()', 'EXECUTE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: anon can still execute get_admin_metrics()';
  END IF;

  -- Legitimate callers must be unaffected: service_role always retains
  -- EXECUTE independent of these grants, and get_lead_email /
  -- capture_lead / get_user_brand_profile / upsert_user_brand_profile
  -- call decrypt_pii/encrypt_pii via internal SQL, not RPC, so they need
  -- no direct grant at all.
  IF NOT has_function_privilege('service_role', 'public.decrypt_pii(bytea)', 'EXECUTE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: service_role lost EXECUTE on decrypt_pii(bytea) -- would break send-weekly-insights edge function';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.get_lead_email(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: authenticated lost EXECUTE on get_lead_email(uuid) -- unrelated grant, should be untouched';
  END IF;

  RAISE NOTICE 'POSTCONDITION PASSED: PII crypto primitives no longer directly callable by authenticated; admin helpers no longer anon-callable';
END $$;
