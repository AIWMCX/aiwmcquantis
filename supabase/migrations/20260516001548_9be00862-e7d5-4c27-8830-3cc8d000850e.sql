
-- ============================================================
-- AUTOPOSTER v1: master tables
-- ============================================================

CREATE TABLE public.autoposter_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number     INT,
  day_number      INT,
  post_date       DATE NOT NULL,
  hook            TEXT NOT NULL,
  content_brief   TEXT NOT NULL,
  post_type       TEXT,
  visual_type     TEXT,
  cta             TEXT,
  hashtags        TEXT[] DEFAULT '{}'::text[],
  expected_reach  TEXT,
  status          TEXT NOT NULL DEFAULT 'draft',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_autoposter_posts_date ON public.autoposter_posts(post_date);
CREATE INDEX idx_autoposter_posts_week ON public.autoposter_posts(week_number);
CREATE INDEX idx_autoposter_posts_status ON public.autoposter_posts(status);

CREATE TABLE public.autoposter_post_platforms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id          UUID NOT NULL REFERENCES public.autoposter_posts(id) ON DELETE CASCADE,
  platform         TEXT NOT NULL CHECK (platform IN ('linkedin','facebook','instagram','threads','reddit','twitter')),
  content          TEXT NOT NULL DEFAULT '',
  best_time_mt     TIME,
  scheduled_at     TIMESTAMPTZ,
  published_at     TIMESTAMPTZ,
  platform_post_id TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, platform)
);

CREATE INDEX idx_autoposter_pp_post ON public.autoposter_post_platforms(post_id);
CREATE INDEX idx_autoposter_pp_status_sched ON public.autoposter_post_platforms(status, scheduled_at);

CREATE TABLE public.autoposter_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform        TEXT UNIQUE NOT NULL,
  access_token    TEXT,
  refresh_token   TEXT,
  token_expires   TIMESTAMPTZ,
  page_id         TEXT,
  account_id      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_tested     TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.autoposter_publishing_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_platform_id UUID REFERENCES public.autoposter_post_platforms(id) ON DELETE CASCADE,
  action           TEXT NOT NULL,
  status           TEXT NOT NULL,
  request_payload  JSONB,
  response_payload JSONB,
  duration_ms      INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_autoposter_logs_pp ON public.autoposter_publishing_logs(post_platform_id);
CREATE INDEX idx_autoposter_logs_created ON public.autoposter_publishing_logs(created_at DESC);

CREATE TABLE public.autoposter_analytics_weekly (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number          INT,
  period_start         DATE NOT NULL,
  period_end           DATE NOT NULL,
  linkedin_impressions INT DEFAULT 0,
  li_engagement_pct    NUMERIC(5,2) DEFAULT 0,
  fb_ig_reach          INT DEFAULT 0,
  fb_ig_engagements    INT DEFAULT 0,
  reddit_upvotes       INT DEFAULT 0,
  website_visitors     INT DEFAULT 0,
  social_traffic_pct   NUMERIC(5,2) DEFAULT 0,
  app_visits           INT DEFAULT 0,
  signups              INT DEFAULT 0,
  paid_conversions     INT DEFAULT 0,
  mrr_usd              NUMERIC(12,2) DEFAULT 0,
  top_post_id          UUID REFERENCES public.autoposter_posts(id) ON DELETE SET NULL,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (period_start, period_end)
);

CREATE INDEX idx_autoposter_aw_period ON public.autoposter_analytics_weekly(period_start DESC);

CREATE TABLE public.autoposter_post_analytics (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_platform_id UUID NOT NULL REFERENCES public.autoposter_post_platforms(id) ON DELETE CASCADE,
  platform         TEXT NOT NULL,
  impressions      INT DEFAULT 0,
  reach            INT DEFAULT 0,
  likes            INT DEFAULT 0,
  comments         INT DEFAULT 0,
  shares           INT DEFAULT 0,
  saves            INT DEFAULT 0,
  clicks           INT DEFAULT 0,
  engagement_rate  NUMERIC(6,4) DEFAULT 0,
  fetched_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_autoposter_pa_pp ON public.autoposter_post_analytics(post_platform_id);

-- Triggers: updated_at
CREATE TRIGGER trg_autoposter_posts_updated
BEFORE UPDATE ON public.autoposter_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_autoposter_pp_updated
BEFORE UPDATE ON public.autoposter_post_platforms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS: admin-only (beltovbogdan@gmail.com via has_role)
-- ============================================================
ALTER TABLE public.autoposter_posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autoposter_post_platforms    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autoposter_credentials       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autoposter_publishing_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autoposter_analytics_weekly  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autoposter_post_analytics    ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_all" ON public.autoposter_posts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_all" ON public.autoposter_post_platforms
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_all" ON public.autoposter_credentials
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_all" ON public.autoposter_publishing_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_all" ON public.autoposter_analytics_weekly
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_all" ON public.autoposter_post_analytics
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
