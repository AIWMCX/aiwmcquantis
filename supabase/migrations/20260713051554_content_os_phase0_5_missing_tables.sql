-- Content OS Phase 0.5 — apply the autoposter + content-studio schema that
-- was written across three prior migrations (20260516001548, 20260621020649,
-- 20260622001436) but never actually reached production. Root cause matches
-- 20260702234500_restore_missing_rpc_functions.sql's own diagnosis: CI never
-- had SUPABASE_DB_PASSWORD configured, and a later migration-history repair
-- stamped versions as applied without executing them. schema_migrations is
-- not trustworthy ground truth on this project; verified directly against
-- live pg_class/information_schema before writing this file.
--
-- Deviation from the original 20260516001548 design: autoposter_credentials
-- is created here with access_token_secret_id / refresh_token_secret_id
-- (uuid, Vault-backed via the already-live autoposter_store_token /
-- autoposter_read_token RPCs) instead of the original plaintext
-- access_token/refresh_token text columns. No ALTER is needed because the
-- table has never existed in this database — there is no plaintext data to
-- migrate away from. This matches what oauth-linkedin-callback/index.ts and
-- publish-due-posts/index.ts already expect (they were written against the
-- Vault-column shape, not the original plaintext one).

-- ============================================================
-- 1. autoposter_posts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.autoposter_posts (
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_autoposter_posts_week_day ON public.autoposter_posts(week_number, day_number);
CREATE INDEX IF NOT EXISTS idx_autoposter_posts_date ON public.autoposter_posts(post_date);
CREATE INDEX IF NOT EXISTS idx_autoposter_posts_status ON public.autoposter_posts(status);

-- ============================================================
-- 2. autoposter_post_platforms
-- ============================================================
CREATE TABLE IF NOT EXISTS public.autoposter_post_platforms (
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
CREATE INDEX IF NOT EXISTS idx_autoposter_pp_post ON public.autoposter_post_platforms(post_id);
CREATE INDEX IF NOT EXISTS idx_autoposter_pp_status_sched ON public.autoposter_post_platforms(status, scheduled_at);

-- ============================================================
-- 3. autoposter_credentials — Vault-backed from birth (see header note)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.autoposter_credentials (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform                 TEXT UNIQUE NOT NULL,
  access_token_secret_id   UUID,
  refresh_token_secret_id  UUID,
  token_expires            TIMESTAMPTZ,
  page_id                  TEXT,
  account_id               TEXT,
  is_active                BOOLEAN NOT NULL DEFAULT true,
  last_tested              TIMESTAMPTZ,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. autoposter_publishing_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.autoposter_publishing_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_platform_id UUID REFERENCES public.autoposter_post_platforms(id) ON DELETE CASCADE,
  action           TEXT NOT NULL,
  status           TEXT NOT NULL,
  request_payload  JSONB,
  response_payload JSONB,
  duration_ms      INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_autoposter_logs_pp ON public.autoposter_publishing_logs(post_platform_id);
CREATE INDEX IF NOT EXISTS idx_autoposter_logs_created ON public.autoposter_publishing_logs(created_at DESC);

-- ============================================================
-- 5. autoposter_analytics_weekly
-- ============================================================
CREATE TABLE IF NOT EXISTS public.autoposter_analytics_weekly (
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
CREATE INDEX IF NOT EXISTS idx_autoposter_aw_period ON public.autoposter_analytics_weekly(period_start DESC);

-- ============================================================
-- 6. autoposter_post_analytics (per-post snapshot over time)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.autoposter_post_analytics (
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
CREATE INDEX IF NOT EXISTS idx_autoposter_pa_pp ON public.autoposter_post_analytics(post_platform_id);

-- ============================================================
-- 7. content_studio_generations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_studio_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  angle text,
  tone text,
  audience text,
  cta text,
  platforms text[] NOT NULL DEFAULT '{}',
  length text,
  hashtags_enabled boolean NOT NULL DEFAULT true,
  emoji_enabled boolean NOT NULL DEFAULT true,
  language text NOT NULL DEFAULT 'en',
  model text,
  variants jsonb NOT NULL DEFAULT '{}'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_content_studio_generations_created_by_at
  ON public.content_studio_generations (created_by, created_at DESC);

-- ============================================================
-- updated_at triggers (function already exists — used elsewhere in repo)
-- ============================================================
DROP TRIGGER IF EXISTS trg_autoposter_posts_updated ON public.autoposter_posts;
CREATE TRIGGER trg_autoposter_posts_updated
BEFORE UPDATE ON public.autoposter_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_autoposter_pp_updated ON public.autoposter_post_platforms;
CREATE TRIGGER trg_autoposter_pp_updated
BEFORE UPDATE ON public.autoposter_post_platforms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS: admin-only via has_role() — matches the pattern already
-- confirmed live on autoposter_oauth_state / content_studio_generations
-- policy design in the source migrations.
-- ============================================================
ALTER TABLE public.autoposter_posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autoposter_post_platforms    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autoposter_credentials       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autoposter_publishing_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autoposter_analytics_weekly  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autoposter_post_analytics    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_studio_generations   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all" ON public.autoposter_posts;
CREATE POLICY "admin_all" ON public.autoposter_posts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_all" ON public.autoposter_post_platforms;
CREATE POLICY "admin_all" ON public.autoposter_post_platforms
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_all" ON public.autoposter_credentials;
CREATE POLICY "admin_all" ON public.autoposter_credentials
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Service role (edge functions) must also read/write credentials directly —
-- publish-due-posts and oauth callbacks run as service_role, not a user JWT.
DROP POLICY IF EXISTS "service_role_all" ON public.autoposter_credentials;
CREATE POLICY "service_role_all" ON public.autoposter_credentials
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_all" ON public.autoposter_publishing_logs;
CREATE POLICY "admin_all" ON public.autoposter_publishing_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "service_role_all" ON public.autoposter_publishing_logs;
CREATE POLICY "service_role_all" ON public.autoposter_publishing_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_all" ON public.autoposter_analytics_weekly;
CREATE POLICY "admin_all" ON public.autoposter_analytics_weekly
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_all" ON public.autoposter_post_analytics;
CREATE POLICY "admin_all" ON public.autoposter_post_analytics
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins read content studio" ON public.content_studio_generations;
CREATE POLICY "admins read content studio" ON public.content_studio_generations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "admins write content studio" ON public.content_studio_generations;
CREATE POLICY "admins write content studio" ON public.content_studio_generations
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND created_by = auth.uid());
DROP POLICY IF EXISTS "admins update content studio" ON public.content_studio_generations;
CREATE POLICY "admins update content studio" ON public.content_studio_generations
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "admins delete content studio" ON public.content_studio_generations;
CREATE POLICY "admins delete content studio" ON public.content_studio_generations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
-- Defense-in-depth RESTRICTIVE deny, matching 20260622001436's intent.
DROP POLICY IF EXISTS "Deny non-admin access to content_studio_generations" ON public.content_studio_generations;
CREATE POLICY "Deny non-admin access to content_studio_generations"
ON public.content_studio_generations
AS RESTRICTIVE FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

NOTIFY pgrst, 'reload schema';
