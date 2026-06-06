-- Self-Learning Framework tables
-- Stores aggregated benchmark priors derived from real user analyses
-- and run logs for observability

CREATE TABLE IF NOT EXISTS self_learned_priors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry            TEXT NOT NULL,
  business_model      TEXT NOT NULL,
  metric_priors       JSONB NOT NULL DEFAULT '{}',
  sample_size         INTEGER NOT NULL DEFAULT 0,
  quality_score       NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  data_window_days    INTEGER NOT NULL DEFAULT 90,
  last_updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (industry, business_model)
);

CREATE TABLE IF NOT EXISTS self_learning_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analyses_processed  INTEGER NOT NULL DEFAULT 0,
  groups_found        INTEGER NOT NULL DEFAULT 0,
  groups_updated      INTEGER NOT NULL DEFAULT 0,
  priors_upserted     INTEGER NOT NULL DEFAULT 0,
  latency_ms          INTEGER,
  error_message       TEXT
);

-- Index for fast lookup by industry/model pair
CREATE INDEX IF NOT EXISTS idx_self_learned_priors_industry_model
  ON self_learned_priors (industry, business_model);

-- RLS: self_learned_priors is readable by all authenticated users (public benchmarks)
-- but only writable by service_role (edge function)
ALTER TABLE self_learned_priors ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_learning_runs   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self_learned_priors_read_authenticated"
  ON self_learned_priors FOR SELECT
  TO authenticated
  USING (true);

-- self_learning_runs is admin-only (service_role bypasses RLS automatically)
-- No policy needed for authenticated reads — this is internal telemetry
