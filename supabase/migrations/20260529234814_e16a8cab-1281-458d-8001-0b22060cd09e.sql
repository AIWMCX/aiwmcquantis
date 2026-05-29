
-- 1) Extend funnel_events allowed event names
ALTER TABLE public.funnel_events
  DROP CONSTRAINT IF EXISTS funnel_events_canonical_name_chk;

ALTER TABLE public.funnel_events
  ADD CONSTRAINT funnel_events_canonical_name_chk
  CHECK (event_name = ANY (ARRAY[
    'home_view','free_signup_start','free_signup_complete',
    'analysis_start','analysis_complete','pricing_view',
    'paid_checkout_start','paid_checkout_complete',
    'sample_view','sample_cta_click','sample_full_open','sample_pdf_download'
  ]));

-- 2) Sample-report funnel RPC (admin-only)
CREATE OR REPLACE FUNCTION public.get_sample_report_funnel(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since timestamptz := now() - (p_days || ' days')::interval;
  v_views int;
  v_ctas int;
  v_opens int;
  v_pdfs int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT COUNT(DISTINCT session_id) INTO v_views
    FROM public.funnel_events WHERE event_name='sample_view' AND created_at >= v_since;
  SELECT COUNT(DISTINCT session_id) INTO v_ctas
    FROM public.funnel_events WHERE event_name='sample_cta_click' AND created_at >= v_since;
  SELECT COUNT(DISTINCT session_id) INTO v_opens
    FROM public.funnel_events WHERE event_name='sample_full_open' AND created_at >= v_since;
  SELECT COUNT(DISTINCT session_id) INTO v_pdfs
    FROM public.funnel_events WHERE event_name='sample_pdf_download' AND created_at >= v_since;

  RETURN jsonb_build_object(
    'window_days', p_days,
    'generated_at', now(),
    'steps', jsonb_build_array(
      jsonb_build_object('key','sample_view','label','Sample view','sessions',v_views,
        'conv_from_prev_pct', null,
        'conv_from_top_pct', 100.0),
      jsonb_build_object('key','sample_cta_click','label','CTA click','sessions',v_ctas,
        'conv_from_prev_pct', CASE WHEN v_views>0 THEN round((v_ctas::numeric/v_views)*100,2) ELSE null END,
        'conv_from_top_pct',  CASE WHEN v_views>0 THEN round((v_ctas::numeric/v_views)*100,2) ELSE null END),
      jsonb_build_object('key','sample_full_open','label','Full sample open','sessions',v_opens,
        'conv_from_prev_pct', CASE WHEN v_ctas>0 THEN round((v_opens::numeric/v_ctas)*100,2) ELSE null END,
        'conv_from_top_pct',  CASE WHEN v_views>0 THEN round((v_opens::numeric/v_views)*100,2) ELSE null END),
      jsonb_build_object('key','sample_pdf_download','label','PDF download','sessions',v_pdfs,
        'conv_from_prev_pct', CASE WHEN v_opens>0 THEN round((v_pdfs::numeric/v_opens)*100,2) ELSE null END,
        'conv_from_top_pct',  CASE WHEN v_views>0 THEN round((v_pdfs::numeric/v_views)*100,2) ELSE null END)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sample_report_funnel(integer) TO authenticated;

-- 3) Monthly analyses RPC (admin-only)
CREATE OR REPLACE FUNCTION public.get_monthly_analyses_stats(p_months integer DEFAULT 12)
RETURNS TABLE(
  month_start date,
  total_analyses bigint,
  unique_users bigint,
  free_count bigint,
  plus_count bigint,
  pro_count bigint,
  anonymous_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT
    date_trunc('month', a.created_at)::date AS month_start,
    COUNT(*)::bigint AS total_analyses,
    COUNT(DISTINCT a.user_id)::bigint AS unique_users,
    COUNT(*) FILTER (WHERE lower(coalesce(a.tier_at_creation,'free'))='free')::bigint AS free_count,
    COUNT(*) FILTER (WHERE lower(coalesce(a.tier_at_creation,''))='plus')::bigint AS plus_count,
    COUNT(*) FILTER (WHERE lower(coalesce(a.tier_at_creation,''))='pro')::bigint AS pro_count,
    COUNT(*) FILTER (WHERE a.user_id IS NULL)::bigint AS anonymous_count
  FROM public.analyses a
  WHERE a.created_at >= (date_trunc('month', now()) - ((p_months-1) || ' months')::interval)
  GROUP BY 1
  ORDER BY 1 DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_analyses_stats(integer) TO authenticated;
