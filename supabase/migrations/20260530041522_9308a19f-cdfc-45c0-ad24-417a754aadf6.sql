-- Drilldown RPC: for a given UTM source + tier, return the journey timeline
-- across canonical funnel stages with unique sessions, median time-to-stage
-- from first touch, and drop-off vs previous stage.

CREATE OR REPLACE FUNCTION public.get_journey_drilldown(
  _source text,
  _tier text DEFAULT NULL,
  _days int DEFAULT 30
)
RETURNS TABLE (
  step_order int,
  step_name text,
  unique_sessions bigint,
  median_ms_from_first numeric,
  median_ms_from_prev numeric,
  dropoff_from_prev numeric,
  dropoff_from_top numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
BEGIN
  SELECT public.has_role(auth.uid(), 'admin') INTO _is_admin;
  IF NOT COALESCE(_is_admin, false) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  WITH stages(step_order, step_name) AS (
    VALUES
      (1, 'home_view'),
      (2, 'pricing_view'),
      (3, 'analysis_view'),
      (4, 'analysis_start'),
      (5, 'analysis_step_view'),
      (6, 'analysis_step_complete'),
      (7, 'analysis_complete'),
      (8, 'free_signup_start'),
      (9, 'free_signup_complete'),
      (10, 'paid_checkout_start'),
      (11, 'paid_checkout_complete')
  ),
  scoped AS (
    SELECT
      fe.session_id,
      fe.event_name,
      fe.created_at,
      COALESCE(NULLIF(fe.metadata->>'tier',''), 'anonymous') AS tier
    FROM public.funnel_events fe
    WHERE fe.created_at > now() - make_interval(days => _days)
      AND COALESCE(NULLIF(fe.utm_source,''), 'direct') = _source
      AND (_tier IS NULL OR COALESCE(NULLIF(fe.metadata->>'tier',''), 'anonymous') = _tier)
  ),
  first_touch AS (
    SELECT session_id, min(created_at) AS t0
    FROM scoped
    GROUP BY session_id
  ),
  per_session_stage AS (
    SELECT
      s.session_id,
      s.event_name,
      min(s.created_at) AS t_stage,
      EXTRACT(EPOCH FROM (min(s.created_at) - ft.t0)) * 1000 AS ms_from_first
    FROM scoped s
    JOIN first_touch ft ON ft.session_id = s.session_id
    GROUP BY s.session_id, s.event_name, ft.t0
  )
  SELECT
    st.step_order,
    st.step_name,
    COUNT(DISTINCT pss.session_id)::bigint AS unique_sessions,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY pss.ms_from_first)::numeric AS median_ms_from_first,
    NULL::numeric AS median_ms_from_prev,    -- filled in client-side from successive medians
    NULL::numeric AS dropoff_from_prev,      -- filled in client-side
    NULL::numeric AS dropoff_from_top        -- filled in client-side
  FROM stages st
  LEFT JOIN per_session_stage pss ON pss.event_name = st.step_name
  GROUP BY st.step_order, st.step_name
  ORDER BY st.step_order;
END;
$$;

REVOKE ALL ON FUNCTION public.get_journey_drilldown(text, text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.get_journey_drilldown(text, text, int) TO authenticated;

-- List available (source, tier) pairs with traffic to populate filters.
CREATE OR REPLACE FUNCTION public.get_journey_drilldown_filters(_days int DEFAULT 30)
RETURNS TABLE (utm_source text, tier text, sessions bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE(public.has_role(auth.uid(), 'admin'), false) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(NULLIF(fe.utm_source,''), 'direct') AS utm_source,
    COALESCE(NULLIF(fe.metadata->>'tier',''), 'anonymous') AS tier,
    COUNT(DISTINCT fe.session_id)::bigint AS sessions
  FROM public.funnel_events fe
  WHERE fe.created_at > now() - make_interval(days => _days)
  GROUP BY 1, 2
  HAVING COUNT(DISTINCT fe.session_id) > 0
  ORDER BY sessions DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_journey_drilldown_filters(int) FROM public;
GRANT EXECUTE ON FUNCTION public.get_journey_drilldown_filters(int) TO authenticated;