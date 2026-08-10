-- Fixed 2026-08-10: increment_idea_generation_usage(), decrement_idea_generation_usage(),
-- and get_idea_generation_status() are referenced here but never created by any
-- migration in this repo's tracked history (confirmed by grep) -- they exist in
-- production only via out-of-band creation. Unlike the missing-table case fixed
-- earlier in this same isolated-CI investigation, these are function BODIES with
-- no ground truth available anywhere in this repo (generated TS types only capture
-- table/view shapes, not function logic), so reconstructing their implementation
-- would be pure guesswork on real business logic -- too risky to invent.
--
-- Instead, guarded every REVOKE/GRANT in this file with this repo's own
-- established idiom for exactly this situation (see the "Maintenance / cleanup"
-- block in 20260613022816_...sql): a FOREACH loop with EXCEPTION WHEN
-- undefined_function, so a REVOKE/GRANT on a not-yet-existing function is
-- skipped with a NOTICE instead of aborting the whole migration replay.
-- consume_idea_gen_quota and get_user_plan_tier already exist by this point in
-- the chain (confirmed -- the isolated CI test got past them), but they're
-- included in the same guarded pattern for consistency and future safety.

DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'consume_idea_gen_quota(uuid,integer,text)'
  ] LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Skipped missing function %', fn;
    END;
  END LOOP;
END$$;

DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'get_user_plan_tier(uuid)',
    'increment_idea_generation_usage()',
    'decrement_idea_generation_usage()',
    'get_idea_generation_status()'
  ] LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Skipped missing function %', fn;
    END;
  END LOOP;
END$$;
