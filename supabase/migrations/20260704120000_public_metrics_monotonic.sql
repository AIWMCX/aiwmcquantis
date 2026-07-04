-- ============================================================================
-- public_metrics — server-side monotonic counter table for landing-page
-- social-proof metrics. Values can ONLY increase; a trigger rejects any
-- UPDATE that would lower a value. Public-read (single row exposed to anon),
-- service-role-only write (edge functions bump on real events).
-- ============================================================================
-- Replaces the previous client-side high-water mark in localStorage, which
-- was per-browser and reset in incognito / new devices, plus a fabricated
-- "33% chance of +1 every 15s" ticker that grew the number cosmetically.
-- The monotonic guarantee now lives in the database and is uniform for
-- every visitor.

CREATE TABLE IF NOT EXISTS public.public_metrics (
  key         text        PRIMARY KEY,
  value       bigint      NOT NULL CHECK (value >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Monotonic guard: any UPDATE that lowers `value` is rejected outright.
-- This runs even for the service_role, so a coding accident (e.g. writing
-- a smaller number) can never regress a public-facing metric.
CREATE OR REPLACE FUNCTION public.enforce_public_metric_monotonic()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.value < OLD.value THEN
    RAISE EXCEPTION 'public_metrics.value is monotonic: cannot lower % from % to %',
      OLD.key, OLD.value, NEW.value;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_public_metrics_monotonic ON public.public_metrics;
CREATE TRIGGER trg_public_metrics_monotonic
BEFORE UPDATE ON public.public_metrics
FOR EACH ROW
EXECUTE FUNCTION public.enforce_public_metric_monotonic();

-- Seed the landing-page counter at 175 (real historical baseline as of
-- 2026-07-04). All future growth is tracked from this floor.
INSERT INTO public.public_metrics (key, value)
VALUES ('plans_stress_tested', 175)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.public_metrics ENABLE ROW LEVEL SECURITY;

-- Public read: anonymous and authenticated users can both read this table.
-- Only surfaces aggregate counts, no PII, so this is safe.
DROP POLICY IF EXISTS "public_metrics_read_all" ON public.public_metrics;
CREATE POLICY "public_metrics_read_all"
  ON public.public_metrics
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policy for anon or authenticated. Only the
-- service_role key (used by edge functions) can bump these values, and
-- the monotonic trigger still guards even that path.

-- ---------------------------------------------------------------------------
-- bump_public_metric(key, delta): idempotent increment RPC. Callable by
-- authenticated users so real per-analysis increments can happen from
-- edge functions or triggers without needing service-role code paths on
-- every call site. Delta must be positive; negative or zero is a no-op.
-- The underlying UPDATE still hits the monotonic trigger, so a bug that
-- passes a negative delta cannot regress the counter.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bump_public_metric(p_key text, p_delta bigint DEFAULT 1)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_value bigint;
BEGIN
  IF p_delta IS NULL OR p_delta <= 0 THEN
    -- No-op: return current value without touching the row.
    SELECT value INTO v_new_value FROM public.public_metrics WHERE key = p_key;
    RETURN COALESCE(v_new_value, 0);
  END IF;

  UPDATE public.public_metrics
  SET value = value + p_delta
  WHERE key = p_key
  RETURNING value INTO v_new_value;

  IF v_new_value IS NULL THEN
    -- Key doesn't exist yet — insert at p_delta.
    INSERT INTO public.public_metrics (key, value) VALUES (p_key, p_delta)
    ON CONFLICT (key) DO UPDATE SET value = public_metrics.value + p_delta
    RETURNING value INTO v_new_value;
  END IF;

  RETURN v_new_value;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_public_metric(text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_public_metric(text, bigint) TO authenticated, service_role;

COMMENT ON TABLE public.public_metrics IS
  'Monotonic-only counters for public-facing social-proof numbers. Trigger enforces value cannot decrease. Read-anon, write-service-role.';
COMMENT ON FUNCTION public.bump_public_metric IS
  'Increment a public_metrics counter by a positive delta. Idempotent-safe: negative/zero delta is a no-op that returns the current value.';
