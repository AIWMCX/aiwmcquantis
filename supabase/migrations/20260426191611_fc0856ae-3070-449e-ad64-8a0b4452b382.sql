-- Quantis Master Spec v1.0: tier set is FREE | PLUS | PRO (+ enterprise reserved).
-- Legacy `valid_plan` excludes 'pro'. Drop it; the canonical
-- `subscriptions_plan_id_check` already permits free|plus|pro|enterprise.

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS valid_plan;

-- Tighten: ensure the canonical check exists with the spec's full set.
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_id_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_id_check
  CHECK (plan_id = ANY (ARRAY['free'::text, 'plus'::text, 'pro'::text, 'enterprise'::text]));

COMMENT ON COLUMN public.subscriptions.plan_id IS
  'Quantis tier: free | plus | pro | enterprise. See Master Prompt & Tier Spec v1.0 §1.2.';