-- E5.5 remaining REQUIRED_FORWARD_FIX confirmations -- run this whole
-- script once in the Supabase SQL Editor (project dmlxrvfyqsakyjomsvdj),
-- then check the "Messages"/"Notices" pane, not the results grid, since
-- everything here is a read-only RAISE NOTICE, not a query result. Copy
-- the notices back and I'll update MIGRATION_CLASSIFICATION.json and the
-- gate status directly.
--
-- Covers findings #2, #6, #8, #9, #16 from
-- docs/execution/2026-08-10/MIGRATION_CLASSIFICATION.json.

DO $$
DECLARE
  v_text text;
  v_count int;
  v_rec record;
BEGIN
  RAISE NOTICE '=== #2: is_service_role() body ===';
  SELECT prosrc INTO v_text FROM pg_proc WHERE proname = 'is_service_role' AND pronamespace = 'public'::regnamespace;
  IF v_text IS NULL THEN
    RAISE NOTICE 'FUNCTION DOES NOT EXIST';
  ELSIF v_text LIKE '%current_setting(''role''%' THEN
    RAISE NOTICE 'RED FLAG: still contains the exploitable GUC-based OR branch -> %', v_text;
  ELSE
    RAISE NOTICE 'OK (JWT-claims-only body): %', v_text;
  END IF;

  RAISE NOTICE '=== #6: consume_idea_gen_quota return type ===';
  SELECT format_type(prorettype, null) INTO v_text
  FROM pg_proc WHERE proname = 'consume_idea_gen_quota' AND pronamespace = 'public'::regnamespace;
  RAISE NOTICE 'return type: %', COALESCE(v_text, 'FUNCTION DOES NOT EXIST');

  RAISE NOTICE '=== #8: benchmark_master_geo row count (expect 11) ===';
  EXECUTE 'SELECT count(*) FROM public.benchmark_master_geo' INTO v_count;
  RAISE NOTICE 'row count: %', v_count;

  RAISE NOTICE '=== #9: subscriptions unique constraint ===';
  SELECT string_agg(conname, ', ') INTO v_text
  FROM pg_constraint WHERE conrelid = 'public.subscriptions'::regclass AND contype = 'u';
  RAISE NOTICE 'unique constraints: %', COALESCE(v_text, 'NONE FOUND -- RED FLAG');

  RAISE NOTICE '=== #9: admin_fix_subscription existence ===';
  SELECT count(*) INTO v_count FROM pg_proc WHERE proname = 'admin_fix_subscription' AND pronamespace = 'public'::regnamespace;
  RAISE NOTICE 'exists: %', (v_count > 0);

  RAISE NOTICE '=== #16: public.scenarios columns ===';
  FOR v_rec IN
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='scenarios' ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '  % (%)', v_rec.column_name, v_rec.data_type;
  END LOOP;

  RAISE NOTICE '=== #16: scenario_sets / scenario_versions / scenario_runs existence ===';
  SELECT string_agg(table_name, ', ') INTO v_text
  FROM information_schema.tables
  WHERE table_schema='public' AND table_name IN ('scenario_sets','scenario_versions','scenario_runs');
  RAISE NOTICE 'existing: %', COALESCE(v_text, 'NONE -- RED FLAG, matches the presumptive finding');

  RAISE NOTICE '=== DONE ===';
END $$;
