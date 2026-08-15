-- TRACK A -- SQL-LEVEL VERIFICATION -- 2026-08-14
-- Run this in the Supabase SQL editor (or psql) BEFORE and AFTER applying
-- 20260814120000_p0_track_a_referral_function_access.sql. It is read-only --
-- has_function_privilege() and aclexplode() inspect grants, they do not change
-- anything. Safe to run directly against production at any time.
--
-- This checks EFFECTIVE privilege (direct grant OR via PUBLIC), which is the
-- correct check -- information_schema.routine_privileges misses implicit
-- PUBLIC grants (this exact gap was found and fixed in PR #26's own pgTAP
-- suite, commit 6ad4182c).

-- ============================================================
-- PART 1 -- effective-privilege matrix for all 5 Track A functions.
-- Expected AFTER the fix: anon = false everywhere, authenticated = true
-- everywhere, service_role = false everywhere (no genuine caller needs it --
-- see the migration's own header for the grep evidence).
-- ============================================================
SELECT
  fn,
  has_function_privilege('anon', fn, 'EXECUTE')          AS anon_can_execute,
  has_function_privilege('authenticated', fn, 'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('service_role', fn, 'EXECUTE')  AS service_role_can_execute
FROM unnest(ARRAY[
  'public.get_referral_stats(uuid)',
  'public.complete_referral_signup(uuid,uuid)',
  'public.generate_referral_code(uuid)',
  'public.get_next_invoice_number(uuid)',
  'public.decrement_quote_gen_usage()'
]) AS fn;

-- ============================================================
-- PART 2 -- raw ACL dump, for when you want to see literal grantees (including
-- whether the grant is via a direct role entry vs. the implicit PUBLIC entry,
-- grantee oid 0). Useful for confirming the exact shape of a still-open grant
-- before deciding this migration is even needed on a given environment.
-- ============================================================
SELECT
  p.oid::regprocedure AS function_signature,
  (aclexplode(p.proacl)).grantee::regrole AS grantee,
  (aclexplode(p.proacl)).privilege_type AS privilege
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_referral_stats', 'complete_referral_signup',
    'generate_referral_code', 'get_next_invoice_number',
    'decrement_quote_gen_usage'
  )
ORDER BY function_signature, grantee;

-- ============================================================
-- PART 3 -- the actual bug, proven in-session rather than asserted. Simulates
-- an anonymous caller's view by setting role to anon within THIS transaction
-- only (rolled back immediately after), then attempts the real exploit: read
-- an arbitrary other user's referral stats with no ownership. Run this BEFORE
-- applying the migration to see it succeed (bad), and AFTER to see it raise
-- "Access denied" / "permission denied" (good).
--
-- Replace <ANY_REAL_USER_ID> with any real auth.users.id -- as anon, the
-- pre-fix bug lets you read ANY user's stats, which is the whole point.
-- ============================================================
BEGIN;
  SET LOCAL ROLE anon;
  SELECT public.get_referral_stats('<ANY_REAL_USER_ID>'::uuid) AS anon_exploit_attempt;
ROLLBACK;

-- ============================================================
-- PART 4 -- cross-user check as an authenticated role (still SQL-level, not a
-- real JWT/PostgREST round trip -- see the companion HTTP-level check in this
-- same directory's README for the genuine end-to-end version using two real
-- Supabase-issued JWTs, which is the stronger form of evidence and matches
-- how PR #26's own cross-identity matrix is built).
-- ============================================================
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"<USER_A_ID>","role":"authenticated"}';
  -- Attempting to read USER_B's stats while authenticated as USER_A should
  -- still raise "Access denied" post-fix (get_referral_stats' guard checks
  -- p_user_id against auth.uid(), which reads request.jwt.claims->>sub --
  -- this is the correct behavior both before and after Track A; Track A only
  -- fixes the anon/NULL case, not this one, which was never broken).
  SELECT public.get_referral_stats('<USER_B_ID>'::uuid) AS cross_user_attempt;
ROLLBACK;
