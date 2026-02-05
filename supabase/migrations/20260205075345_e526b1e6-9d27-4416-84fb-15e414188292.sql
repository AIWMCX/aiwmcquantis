-- Phase 4: Audit Log Enhancement
-- Add regular composite indexes for faster log queries

-- Index for recent API request logs (used for rate limiting and debugging)
CREATE INDEX IF NOT EXISTS idx_api_logs_user_created 
ON api_request_logs (user_id, created_at DESC);

-- Index for security logs (admin audit trail)
CREATE INDEX IF NOT EXISTS idx_security_logs_user_created
ON security_logs (user_id, created_at DESC);

-- Index for subscription audit log (billing debugging)
CREATE INDEX IF NOT EXISTS idx_subscription_audit_user_created
ON subscription_audit_log (user_id, created_at DESC);

-- Index for faster lookup of recent analyses by user
CREATE INDEX IF NOT EXISTS idx_analyses_user_created
ON analyses (user_id, created_at DESC);