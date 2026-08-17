-- Email engagement tracking for open/click analytics
-- Task #26: Lead→email→upgrade conversion pipeline
--
-- BROKEN CI MIGRATION PIPELINE FIX (2026-08-17): this file's ALTER TABLE
-- public.email_send_log below has been failing on every single production
-- deploy since it was written -- "relation public.email_send_log does not
-- exist" (SQLSTATE 42P01) -- because the earlier migration that was
-- supposed to create it, 20260218194449_75a5a96d-337f-45cb-a8d5-
-- f5001020fbc7.sql, is marked "applied" in Supabase's tracked migration
-- ledger (supabase_migrations.schema_migrations) but never actually ran
-- against production: confirmed live via to_regclass('public.email_send_log')
-- returning null, and to_regclass('public.email_sequence_log') -- the OTHER
-- table that same migration touches -- also returning null. Because
-- `supabase db push` applies migrations strictly in order and aborts the
-- whole batch at the first failure, this one broken link has silently
-- blocked every migration after it from ever reaching production via CI --
-- not just this file, everything queued behind it, since 2026-06-22.
--
-- Fixed by recreating email_send_log here, idempotently, from its original
-- definition (20260218194449's CREATE TABLE IF NOT EXISTS block, replayed
-- verbatim) before this file's ALTER touches it -- so this migration no
-- longer depends on an earlier migration's ledger entry actually reflecting
-- reality. email_sequence_log's own missing-constraint gap from that same
-- broken migration is a separate, narrower issue (that table doesn't exist
-- either) tracked outside this fix; nothing in this file's chain depends on
-- it.
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  template_key TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resend_id TEXT
);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only" ON public.email_send_log;
CREATE POLICY "Service role only" ON public.email_send_log
  FOR ALL USING (false);

CREATE INDEX IF NOT EXISTS idx_email_send_log_user_sent ON public.email_send_log(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_email_sent ON public.email_send_log(email, sent_at DESC);

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

DROP POLICY IF EXISTS "Service role manages email_engagement" ON public.email_engagement;
CREATE POLICY "Service role manages email_engagement"
  ON public.email_engagement FOR ALL TO service_role USING (true);
DROP POLICY IF EXISTS "Admins can view email_engagement" ON public.email_engagement;
CREATE POLICY "Admins can view email_engagement"
  ON public.email_engagement FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Add lead_id to email_send_log for attribution (if column doesn't exist)
ALTER TABLE public.email_send_log
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id);

-- 3. Email funnel summary view (admin-only, last 30 days)
--
-- BROKEN CI MIGRATION PIPELINE FIX (2026-08-17): the original lead_stats CTE
-- referenced public.leads.converted_at and .conversion_type, neither of
-- which exist on the real live leads table (confirmed via
-- information_schema.columns -- leads only has id/email/source/offer/
-- status/metadata/created_at/updated_at/email_encrypted/email_hash/
-- confirmation_token/confirmed_at/marketing_opt_in/unsubscribed_at). This
-- view has never successfully applied to production because of it -- one
-- more link in the same broken chain this file's header documents.
-- Lead-to-user/paid conversion isn't tracked on this table at all right
-- now, so those two columns are dropped rather than faked with a
-- placeholder; the view now reports only what leads actually records
-- (volume/confirmation/unsubscribe), plus the real email/engagement stats
-- below.
CREATE OR REPLACE VIEW public.email_funnel_30d AS
WITH lead_stats AS (
  SELECT
    COUNT(*) AS total_leads,
    COUNT(*) FILTER (WHERE status = 'pending_confirmation') AS pending_confirmation,
    COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL) AS confirmed,
    COUNT(*) FILTER (WHERE unsubscribed_at IS NOT NULL) AS unsubscribed
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
