-- Performance indexes for optimizing common queries

-- Analyses table - most queried table
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_user_created ON public.analyses(user_id, created_at DESC);

-- Subscriptions - frequently checked for auth/permissions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);

-- Security logs - for admin queries and auditing
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON public.security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at DESC);

-- Anonymous usage - for duplicate detection and rate limiting
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_device_id ON public.anonymous_usage(device_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_fingerprint ON public.anonymous_usage(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_created_at ON public.anonymous_usage(created_at DESC);

-- Industry benchmarks - for matching and lookup
CREATE INDEX IF NOT EXISTS idx_benchmarks_industry_id ON public.industry_benchmarks(industry_id);
CREATE INDEX IF NOT EXISTS idx_benchmarks_region ON public.industry_benchmarks(region);
CREATE INDEX IF NOT EXISTS idx_benchmarks_keywords ON public.industry_benchmarks USING gin(keywords);

-- Usage tracking - for analytics
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_month ON public.usage_tracking(month_year);

-- API keys - for authentication lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);

-- Rate limits - for rate limiting checks
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint ON public.rate_limits(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start DESC);