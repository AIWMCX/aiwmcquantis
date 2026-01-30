-- Phase 1 Performance Indexes
-- These indexes optimize the most common query patterns for 10K+ daily users

-- Index for fetching user's analyses ordered by date (most common query)
CREATE INDEX IF NOT EXISTS idx_analyses_user_created 
  ON analyses(user_id, created_at DESC);

-- Index for team-based analysis lookups
CREATE INDEX IF NOT EXISTS idx_analyses_team 
  ON analyses(team_id) 
  WHERE team_id IS NOT NULL;

-- GIN index for industry benchmark keyword searching
CREATE INDEX IF NOT EXISTS idx_benchmarks_industry_keywords 
  ON industry_benchmarks USING gin(keywords);

-- Index for industry_id lookups (used in benchmark matching)
CREATE INDEX IF NOT EXISTS idx_benchmarks_industry_id 
  ON industry_benchmarks(industry_id);

-- Index for anonymous rate limiting queries
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_device_time 
  ON anonymous_usage(device_id, created_at DESC);

-- Index for IP-based rate limiting
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_ip_time 
  ON anonymous_usage(ip_hash, created_at DESC);

-- Index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_idea_location 
  ON anonymous_usage(idea_hash, location_hash, created_at DESC);

-- Index for subscription lookups by user
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
  ON subscriptions(user_id, status);

-- Index for usage tracking queries
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month 
  ON usage_tracking(user_id, month_year);

-- Index for location data lookups
CREATE INDEX IF NOT EXISTS idx_location_data_city_id 
  ON location_data(city_id);

-- GIN index for location keyword searching
CREATE INDEX IF NOT EXISTS idx_location_data_keywords 
  ON location_data USING gin(keywords);

-- Index for export jobs by user and status
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_status 
  ON export_jobs(user_id, status);

-- Index for shared reports token lookups
CREATE INDEX IF NOT EXISTS idx_shared_reports_token 
  ON shared_reports(token) 
  WHERE is_revoked = false;

-- Index for webhook events by customer
CREATE INDEX IF NOT EXISTS idx_webhook_events_customer 
  ON stripe_webhook_events(customer_id, created_at DESC);

-- Index for security logs by user and type
CREATE INDEX IF NOT EXISTS idx_security_logs_user_type 
  ON security_logs(user_id, event_type, created_at DESC);

-- Add comment for documentation
COMMENT ON INDEX idx_analyses_user_created IS 'Primary query pattern: fetching user analyses in chronological order';
COMMENT ON INDEX idx_benchmarks_industry_keywords IS 'Enables fast industry matching via GIN-indexed keyword search';
COMMENT ON INDEX idx_anonymous_usage_device_time IS 'Rate limiting: fast device-based usage lookups';