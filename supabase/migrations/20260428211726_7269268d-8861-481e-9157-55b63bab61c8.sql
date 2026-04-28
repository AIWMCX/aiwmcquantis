
CREATE TABLE public.benchmark_ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provenance_id UUID REFERENCES public.data_provenance(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','running','succeeded','failed','partial')),
  rows_fetched INTEGER DEFAULT 0,
  rows_inserted INTEGER DEFAULT 0,
  rows_updated INTEGER DEFAULT 0,
  rows_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'cron',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX idx_ingestion_runs_provenance ON public.benchmark_ingestion_runs(provenance_id, started_at DESC);
CREATE INDEX idx_ingestion_runs_status ON public.benchmark_ingestion_runs(status, started_at DESC);
ALTER TABLE public.benchmark_ingestion_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read ingestion runs" ON public.benchmark_ingestion_runs FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE POLICY "service role manages ingestion runs" ON public.benchmark_ingestion_runs FOR ALL USING (is_service_role()) WITH CHECK (is_service_role());

CREATE TABLE public.benchmark_calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_level1 TEXT NOT NULL,
  sector_level2 TEXT NOT NULL DEFAULT '',
  geo_region TEXT NOT NULL DEFAULT '',
  metric_name TEXT NOT NULL,
  sample_size INTEGER NOT NULL DEFAULT 0,
  mean_predicted NUMERIC,
  mean_actual NUMERIC,
  bias_pct NUMERIC,
  mape NUMERIC,
  confidence_adjustment NUMERIC NOT NULL DEFAULT 1.0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_calibration_slice ON public.benchmark_calibration(sector_level1, sector_level2, geo_region, metric_name);
CREATE INDEX idx_calibration_lookup ON public.benchmark_calibration(sector_level1, geo_region, metric_name);
ALTER TABLE public.benchmark_calibration ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read calibration" ON public.benchmark_calibration FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE POLICY "service role manages calibration" ON public.benchmark_calibration FOR ALL USING (is_service_role()) WITH CHECK (is_service_role());

CREATE TABLE public.engine_learning_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  analysis_id UUID,
  sector_level1 TEXT NOT NULL,
  sector_level2 TEXT,
  geo_region TEXT,
  metric_name TEXT NOT NULL,
  predicted_value NUMERIC NOT NULL,
  actual_value NUMERIC NOT NULL,
  source TEXT NOT NULL DEFAULT 'invoice_reality',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_signals_sector ON public.engine_learning_signals(sector_level1, geo_region, metric_name, created_at DESC);
ALTER TABLE public.engine_learning_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read signals" ON public.engine_learning_signals FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE POLICY "service role writes signals" ON public.engine_learning_signals FOR ALL USING (is_service_role()) WITH CHECK (is_service_role());

CREATE OR REPLACE FUNCTION public.record_engine_learning_signal(
  p_user_id UUID,
  p_analysis_id UUID,
  p_sector_level1 TEXT,
  p_sector_level2 TEXT,
  p_geo_region TEXT,
  p_metric_name TEXT,
  p_predicted NUMERIC,
  p_actual NUMERIC,
  p_source TEXT DEFAULT 'invoice_reality'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n INT;
  v_sum_pred NUMERIC;
  v_sum_act NUMERIC;
  v_sum_abs_err NUMERIC;
  v_mean_pred NUMERIC;
  v_mean_act NUMERIC;
  v_bias NUMERIC;
  v_mape NUMERIC;
  v_conf_adj NUMERIC;
  v_l2 TEXT := COALESCE(p_sector_level2,'');
  v_geo TEXT := COALESCE(p_geo_region,'');
BEGIN
  IF p_predicted IS NULL OR p_actual IS NULL OR p_sector_level1 IS NULL OR p_metric_name IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.engine_learning_signals(
    user_id, analysis_id, sector_level1, sector_level2, geo_region,
    metric_name, predicted_value, actual_value, source
  ) VALUES (
    p_user_id, p_analysis_id, p_sector_level1, p_sector_level2, p_geo_region,
    p_metric_name, p_predicted, p_actual, p_source
  );

  SELECT COUNT(*), SUM(predicted_value), SUM(actual_value),
         SUM(ABS(predicted_value - actual_value))
    INTO v_n, v_sum_pred, v_sum_act, v_sum_abs_err
  FROM (
    SELECT predicted_value, actual_value
    FROM public.engine_learning_signals
    WHERE sector_level1 = p_sector_level1
      AND COALESCE(sector_level2,'') = v_l2
      AND COALESCE(geo_region,'') = v_geo
      AND metric_name = p_metric_name
    ORDER BY created_at DESC
    LIMIT 200
  ) s;

  IF v_n IS NULL OR v_n = 0 THEN RETURN; END IF;
  v_mean_pred := v_sum_pred / v_n;
  v_mean_act := v_sum_act / v_n;
  v_bias := CASE WHEN v_mean_act <> 0 THEN ((v_mean_pred - v_mean_act) / ABS(v_mean_act)) * 100 ELSE 0 END;
  v_mape := CASE WHEN v_mean_act <> 0 THEN (v_sum_abs_err / v_n) / ABS(v_mean_act) * 100 ELSE 0 END;
  v_conf_adj := GREATEST(0.5, LEAST(1.0, 1.0 - ((v_mape - 10) / 80.0)));

  INSERT INTO public.benchmark_calibration(
    sector_level1, sector_level2, geo_region, metric_name,
    sample_size, mean_predicted, mean_actual, bias_pct, mape,
    confidence_adjustment, last_updated
  ) VALUES (
    p_sector_level1, v_l2, v_geo, p_metric_name,
    v_n, v_mean_pred, v_mean_act, v_bias, v_mape, v_conf_adj, now()
  )
  ON CONFLICT (sector_level1, sector_level2, geo_region, metric_name)
  DO UPDATE SET
    sample_size = EXCLUDED.sample_size,
    mean_predicted = EXCLUDED.mean_predicted,
    mean_actual = EXCLUDED.mean_actual,
    bias_pct = EXCLUDED.bias_pct,
    mape = EXCLUDED.mape,
    confidence_adjustment = EXCLUDED.confidence_adjustment,
    last_updated = now();
END;
$$;
