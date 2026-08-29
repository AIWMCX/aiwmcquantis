-- Phase 3 — 8 policy-less RLS tables — regression suite.
-- docs/execution/2026-08-27-phase3-policyless-tables.md
--
-- golden_test_vectors, metric_formula_registry, self_learning_runs,
-- pending_plan_grants, rvce_observations, calibration_metrics,
-- accuracy_runs, dataset_releases -- all created with RLS enabled and
-- deliberately zero policies (service-role/SECURITY DEFINER-only access
-- by design, per the creating migrations' own comments). This suite
-- exists so a future developer who sees "no policies" and assumes it's
-- an oversight cannot silently "fix" it by adding a broad policy without
-- a test catching the regression (charter 3.7's explicit purpose).
--
-- Live-verified passing (pgtap installed in a rolled-back transaction
-- against production) before this file was committed -- no CI workflow
-- runs `supabase test db` for this repo yet, same gap already noted for
-- the Phase 1 suite.
--
-- Run via: npx supabase test db (after `supabase start` + `supabase db
-- reset`). Requires pgTAP.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

-- Plan count: 8 tables (anon) + 8 tables (authenticated) + 3 mutation
-- throws_ok + 1 service_role lives_ok = 20.
SELECT plan(20);

-- ============================================================
-- Part 1 — anon SELECT sees zero rows on all 8 (RLS-filtered, not a
-- permission error -- the table-level grant exists, but zero policies
-- means zero visible rows for any non-service role).
-- ============================================================
SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::int FROM public.golden_test_vectors), 0, 'anon: golden_test_vectors sees zero rows');
SELECT is((SELECT count(*)::int FROM public.metric_formula_registry), 0, 'anon: metric_formula_registry sees zero rows');
SELECT is((SELECT count(*)::int FROM public.self_learning_runs), 0, 'anon: self_learning_runs sees zero rows');
SELECT is((SELECT count(*)::int FROM public.pending_plan_grants), 0, 'anon: pending_plan_grants sees zero rows');
SELECT is((SELECT count(*)::int FROM public.rvce_observations), 0, 'anon: rvce_observations sees zero rows');
SELECT is((SELECT count(*)::int FROM public.calibration_metrics), 0, 'anon: calibration_metrics sees zero rows');
SELECT is((SELECT count(*)::int FROM public.accuracy_runs), 0, 'anon: accuracy_runs sees zero rows');
SELECT is((SELECT count(*)::int FROM public.dataset_releases), 0, 'anon: dataset_releases sees zero rows');
RESET ROLE;

-- ============================================================
-- Part 2 — authenticated (real JWT, arbitrary user) SELECT also sees
-- zero rows on all 8 -- these are not user-owned data, so there is no
-- "your own rows" case to allow.
-- ============================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"39c39ad3-ca59-4ce1-96b0-4c82c68da47a","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.golden_test_vectors), 0, 'authenticated: golden_test_vectors sees zero rows');
SELECT is((SELECT count(*)::int FROM public.metric_formula_registry), 0, 'authenticated: metric_formula_registry sees zero rows');
SELECT is((SELECT count(*)::int FROM public.self_learning_runs), 0, 'authenticated: self_learning_runs sees zero rows');
SELECT is((SELECT count(*)::int FROM public.pending_plan_grants), 0, 'authenticated: pending_plan_grants sees zero rows');
SELECT is((SELECT count(*)::int FROM public.rvce_observations), 0, 'authenticated: rvce_observations sees zero rows');
SELECT is((SELECT count(*)::int FROM public.calibration_metrics), 0, 'authenticated: calibration_metrics sees zero rows');
SELECT is((SELECT count(*)::int FROM public.accuracy_runs), 0, 'authenticated: accuracy_runs sees zero rows');
SELECT is((SELECT count(*)::int FROM public.dataset_releases), 0, 'authenticated: dataset_releases sees zero rows');
RESET ROLE;

-- ============================================================
-- Part 3 — real mutation attempts, run for real (not just a privilege
-- lookup), across three representative caller patterns: a plain
-- service-role edge function target (golden_test_vectors), a
-- service-role target whose file also has a sibling anon/user client
-- for an unrelated purpose (rvce_observations -- the highest-risk
-- pattern, since a future refactor could accidentally reuse the wrong
-- client), and a trigger-only table with literally no application
-- caller at all (pending_plan_grants).
-- ============================================================
SELECT throws_ok(
  $q$SET LOCAL ROLE anon;
     INSERT INTO public.golden_test_vectors (vector_code, archetype, input_data, expected_ranges, oracle_method, oracle_version)
     VALUES ('p3-test','test','{}','{}','test','v1');$q$,
  '42501', NULL,
  'anon cannot INSERT into golden_test_vectors'
);

SELECT throws_ok(
  $q$SET LOCAL ROLE authenticated;
     SET LOCAL "request.jwt.claims" = '{"sub":"39c39ad3-ca59-4ce1-96b0-4c82c68da47a","role":"authenticated"}';
     INSERT INTO public.rvce_observations (correlation_id, metric_code, unit, source_url, extraction_method, source_quality, comparability_score, accepted)
     VALUES (gen_random_uuid(), 'p3-test', 'usd', 'https://test.invalid', 'manual', 0.5, 0.5, true);$q$,
  '42501', NULL,
  'authenticated cannot INSERT into rvce_observations (no client should ever write here directly)'
);

SELECT throws_ok(
  $q$SET LOCAL ROLE authenticated;
     SET LOCAL "request.jwt.claims" = '{"sub":"39c39ad3-ca59-4ce1-96b0-4c82c68da47a","role":"authenticated"}';
     INSERT INTO public.pending_plan_grants (email, plan_id) VALUES ('p3-test@test.invalid', 'pro');$q$,
  '42501', NULL,
  'authenticated cannot INSERT into pending_plan_grants (trigger-only table, zero legitimate client callers)'
);

-- ============================================================
-- Part 4 — service_role must retain full, unfiltered access (the real
-- callers -- run-accuracy-harness, rvce-validate, self-learning-update,
-- and the apply_pending_plan_grant() trigger -- all depend on this).
-- ============================================================
SELECT lives_ok(
  $q$SET LOCAL ROLE service_role;
     SELECT count(*) FROM public.rvce_observations;$q$,
  'service_role can query rvce_observations without error'
);

SELECT * FROM finish();
ROLLBACK;
