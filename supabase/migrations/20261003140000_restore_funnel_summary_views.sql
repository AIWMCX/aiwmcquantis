-- JEV decision-intelligence Phase F — restore the missing funnel views.
--
-- Root-cause finding: `src/pages/admin/Funnel.tsx` (the activation-ladder
-- dashboard the contract's §19 asks for) already existed in the repo and
-- reads from `public.funnel_summary_30d` / `funnel_daily_30d` -- but
-- neither view exists in production (confirmed via information_schema.tables
-- before writing this; the originating migration
-- 20260429035558_103513bc-41b7-4394-b746-ccab720994da.sql defines them, but
-- they are not live). The page was also never routed in App.tsx. Both are
-- fixed here and in the accompanying frontend change: this migration
-- restores the views (with one correction, below); the frontend change
-- wires the route/sidebar link and extends the ladder with the JEV events.
--
-- Correction from the original definition: the original view had no
-- `security_invoker`, so `GRANT SELECT ... TO authenticated` let ANY
-- authenticated user read aggregate counts for every canonical event,
-- regardless of `funnel_events`' own RLS (admin-only SELECT). Since this
-- view is being made reachable for the first time via a real admin page,
-- it's fixed now rather than carried forward: `security_invoker = true`
-- makes the view evaluate under the querying user's own row-level
-- permissions, so a non-admin authenticated user gets zero rows through
-- it (the same guarantee the base table already gives), not a quieter way
-- to read the admin-only aggregate funnel from the REST API directly.
--
-- Added: unique_analyses, counted from `metadata->>'analysis_id'` where
-- present -- a real, additional denominator the contract's §19 explicitly
-- wants kept distinct from users/sessions, not mixed. Not every event
-- stamps an analysis_id (e.g. home_view predates any analysis), so this
-- column is honestly lower for those rows rather than invented.

CREATE OR REPLACE VIEW public.funnel_summary_30d
WITH (security_invoker = true) AS
SELECT
  event_name,
  COUNT(*) AS total_events,
  COUNT(DISTINCT session_id) AS unique_sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS unique_users,
  COUNT(DISTINCT (metadata->>'analysis_id')) FILTER (WHERE metadata->>'analysis_id' IS NOT NULL) AS unique_analyses,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen
FROM public.funnel_events
WHERE created_at > now() - interval '30 days'
GROUP BY event_name;

GRANT SELECT ON public.funnel_summary_30d TO authenticated;

CREATE OR REPLACE VIEW public.funnel_daily_30d
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', created_at)::date AS day,
  event_name,
  COUNT(DISTINCT session_id) AS unique_sessions
FROM public.funnel_events
WHERE created_at > now() - interval '30 days'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

GRANT SELECT ON public.funnel_daily_30d TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'funnel_summary_30d'
  ) THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: funnel_summary_30d still missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'funnel_daily_30d'
  ) THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: funnel_daily_30d still missing';
  END IF;
END $$;
