-- Email engagement tracking for open/click analytics
-- Task #26: Lead→email→upgrade conversion pipeline

-- 1. Email engagement events (opens, clicks)
CREATE TABLE IF NOT EXISTS public.email_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_send_log_id text,
  event_type text NOT NULL CHECK (event_type IN ('open', 'click')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_engagement_send_log
  ON public.email_engagement(email_send_log_id);
CREATE INDEX IF NOT EXISTS idx_email_engagement_type
  ON public.email_engagement(event_type, created_at DESC);

ALTER TABLE public.email_engagement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages email_engagement"
  ON public.email_engagement FOR ALL TO service_role USING (true);
CREATE POLICY "Admins can view email_engagement"
  ON public.email_engagement FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Add lead_id to email_send_log for attribution (if column doesn't exist)
ALTER TABLE public.email_send_log
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id);

-- 3. Email funnel summary view (admin-only, last 30 days)
CREATE OR REPLACE VIEW public.email_funnel_30d AS
WITH lead_stats AS (
  SELECT
    COUNT(*) AS total_leads,
    COUNT(*) FILTER (WHERE status = 'pending_confirmation') AS pending_confirmation,
    COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL) AS confirmed,
    COUNT(*) FILTER (WHERE unsubscribed_at IS NOT NULL) AS unsubscribed,
    COUNT(*) FILTER (WHERE converted_at IS NOT NULL) AS converted_to_user,
    COUNT(*) FILTER (WHERE conversion_type = 'paid') AS converted_to_paid
  FROM public.leads
  WHERE created_at >= now() - interval '30 days'
),
email_stats AS (
  SELECT
    COUNT(*) AS total_emails_sent,
    COUNT(DISTINCT email) AS unique_recipients
  FROM public.email_send_log
  WHERE sent_at >= now() - interval '30 days'
),
engagement_stats AS (
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'open') AS total_opens,
    COUNT(DISTINCT email_send_log_id) FILTER (WHERE event_type = 'open') AS unique_opens,
    COUNT(*) FILTER (WHERE event_type = 'click') AS total_clicks,
    COUNT(DISTINCT email_send_log_id) FILTER (WHERE event_type = 'click') AS unique_clicks
  FROM public.email_engagement
  WHERE created_at >= now() - interval '30 days'
),
template_stats AS (
  SELECT
    template_key,
    COUNT(*) AS send_count,
    COUNT(DISTINCT email) AS unique_recipients
  FROM public.email_send_log
  WHERE sent_at >= now() - interval '30 days'
  GROUP BY template_key
  ORDER BY send_count DESC
)
SELECT
  ls.total_leads,
  ls.pending_confirmation,
  ls.confirmed,
  ls.unsubscribed,
  ls.converted_to_user,
  ls.converted_to_paid,
  es.total_emails_sent,
  es.unique_recipients,
  eg.total_opens,
  eg.unique_opens,
  eg.total_clicks,
  eg.unique_clicks,
  CASE WHEN es.total_emails_sent > 0
    THEN round((eg.unique_opens::numeric / es.total_emails_sent) * 100, 2)
    ELSE 0
  END AS open_rate_pct,
  CASE WHEN eg.unique_opens > 0
    THEN round((eg.unique_clicks::numeric / eg.unique_opens) * 100, 2)
    ELSE 0
  END AS click_to_open_rate_pct,
  (SELECT json_agg(row_to_json(t)) FROM template_stats t) AS by_template
FROM lead_stats ls, email_stats es, engagement_stats eg;

-- Grant access to admin-only view
GRANT SELECT ON public.email_funnel_30d TO authenticated;
