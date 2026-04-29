-- Session 2: Funnel Events Sink (SOW canonical 8-event pipeline)
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name    text NOT NULL,
  session_id    text NOT NULL,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  path          text,
  referrer      text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_event_created
  ON public.funnel_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_session
  ON public.funnel_events (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_user
  ON public.funnel_events (user_id, created_at DESC) WHERE user_id IS NOT NULL;

ALTER TABLE public.funnel_events
  ADD CONSTRAINT funnel_events_canonical_name_chk
  CHECK (event_name IN (
    'home_view',
    'free_signup_start',
    'free_signup_complete',
    'analysis_start',
    'analysis_complete',
    'pricing_view',
    'paid_checkout_start',
    'paid_checkout_complete'
  ));

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read funnel events"
  ON public.funnel_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages funnel events"
  ON public.funnel_events FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

CREATE OR REPLACE FUNCTION public.record_funnel_event(
  _event_name   text,
  _session_id   text,
  _path         text DEFAULT NULL,
  _referrer     text DEFAULT NULL,
  _utm_source   text DEFAULT NULL,
  _utm_medium   text DEFAULT NULL,
  _utm_campaign text DEFAULT NULL,
  _metadata     jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _recent_count int;
BEGIN
  SELECT COUNT(*) INTO _recent_count
  FROM public.funnel_events
  WHERE session_id = _session_id
    AND created_at > now() - interval '1 minute';
  IF _recent_count > 60 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.funnel_events (
    event_name, session_id, user_id, path, referrer,
    utm_source, utm_medium, utm_campaign, metadata
  ) VALUES (
    _event_name,
    _session_id,
    auth.uid(),
    _path,
    _referrer,
    _utm_source,
    _utm_medium,
    _utm_campaign,
    COALESCE(_metadata, '{}'::jsonb)
  ) RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_funnel_event(
  text, text, text, text, text, text, text, jsonb
) TO anon, authenticated;

CREATE OR REPLACE VIEW public.funnel_summary_30d AS
SELECT
  event_name,
  COUNT(*) AS total_events,
  COUNT(DISTINCT session_id) AS unique_sessions,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS unique_users,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen
FROM public.funnel_events
WHERE created_at > now() - interval '30 days'
GROUP BY event_name;

GRANT SELECT ON public.funnel_summary_30d TO authenticated;

CREATE OR REPLACE VIEW public.funnel_daily_30d AS
SELECT
  date_trunc('day', created_at)::date AS day,
  event_name,
  COUNT(DISTINCT session_id) AS unique_sessions
FROM public.funnel_events
WHERE created_at > now() - interval '30 days'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

GRANT SELECT ON public.funnel_daily_30d TO authenticated;

COMMENT ON TABLE public.funnel_events IS
  'SOW Section 6.1 canonical 8-event funnel sink. Powers /admin/funnel dashboard.';