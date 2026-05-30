
ALTER TABLE public.funnel_events DROP CONSTRAINT IF EXISTS funnel_events_canonical_name_chk;
ALTER TABLE public.funnel_events ADD CONSTRAINT funnel_events_canonical_name_chk CHECK (
  event_name = ANY (ARRAY[
    'home_view','free_signup_start','free_signup_complete',
    'analysis_view','analysis_start','analysis_step_view','analysis_step_complete','analysis_abandon','analysis_complete',
    'pricing_view','paid_checkout_start','paid_checkout_complete',
    'sample_view','sample_cta_click','sample_full_open','sample_pdf_download'
  ])
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_utm_event
  ON public.funnel_events (utm_source, event_name, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_conversion_by_source(_days integer DEFAULT 30)
RETURNS TABLE (
  utm_source text,
  utm_medium text,
  utm_campaign text,
  event_name text,
  tier text,
  unique_sessions bigint,
  unique_users bigint,
  total_events bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ev AS (
    SELECT
      COALESCE(NULLIF(fe.utm_source, ''), 'direct') AS utm_source,
      COALESCE(NULLIF(fe.utm_medium, ''), '(none)') AS utm_medium,
      COALESCE(NULLIF(fe.utm_campaign, ''), '(none)') AS utm_campaign,
      fe.event_name,
      fe.session_id,
      fe.user_id,
      COALESCE(
        (SELECT s.plan_id FROM public.subscriptions s
          WHERE s.user_id = fe.user_id AND s.status IN ('active','trialing')
          ORDER BY s.updated_at DESC NULLS LAST LIMIT 1),
        CASE WHEN fe.user_id IS NULL THEN 'anonymous' ELSE 'free' END
      ) AS tier
    FROM public.funnel_events fe
    WHERE fe.created_at >= now() - (_days || ' days')::interval
      AND has_role(auth.uid(), 'admin'::app_role)
  )
  SELECT
    utm_source, utm_medium, utm_campaign, event_name, tier,
    COUNT(DISTINCT session_id) AS unique_sessions,
    COUNT(DISTINCT user_id) AS unique_users,
    COUNT(*) AS total_events
  FROM ev
  GROUP BY utm_source, utm_medium, utm_campaign, event_name, tier
  ORDER BY unique_sessions DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_conversion_by_source(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_analysis_step_funnel(_days integer DEFAULT 30)
RETURNS TABLE (
  step_name text,
  unique_sessions bigint,
  total_events bigint,
  median_ms_from_prev numeric,
  abandon_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH steps AS (
    SELECT
      session_id,
      event_name,
      created_at,
      COALESCE(NULLIF(metadata->>'step',''), event_name) AS step_name,
      LAG(created_at) OVER (PARTITION BY session_id ORDER BY created_at) AS prev_at
    FROM public.funnel_events
    WHERE created_at >= now() - (_days || ' days')::interval
      AND event_name IN ('analysis_view','analysis_start','analysis_step_view','analysis_step_complete','analysis_complete','analysis_abandon')
      AND has_role(auth.uid(), 'admin'::app_role)
  ),
  agg AS (
    SELECT
      step_name,
      COUNT(DISTINCT session_id) AS unique_sessions,
      COUNT(*) AS total_events,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (created_at - prev_at)) * 1000)
        FILTER (WHERE prev_at IS NOT NULL) AS median_ms_from_prev
    FROM steps
    GROUP BY step_name
  ),
  total AS (
    SELECT COUNT(DISTINCT session_id)::numeric AS n
    FROM public.funnel_events
    WHERE created_at >= now() - (_days || ' days')::interval
      AND event_name = 'analysis_view'
  )
  SELECT
    a.step_name,
    a.unique_sessions,
    a.total_events,
    ROUND(a.median_ms_from_prev::numeric, 0) AS median_ms_from_prev,
    CASE WHEN (SELECT n FROM total) > 0
      THEN ROUND(1 - (a.unique_sessions::numeric / (SELECT n FROM total)), 4)
      ELSE NULL END AS abandon_rate
  FROM agg a
  ORDER BY a.unique_sessions DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_analysis_step_funnel(integer) TO authenticated;
