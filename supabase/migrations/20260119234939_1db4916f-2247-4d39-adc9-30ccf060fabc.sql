
-- Drop the old constraint and add a new one that includes 'plus'
ALTER TABLE public.subscriptions DROP CONSTRAINT valid_plan;

ALTER TABLE public.subscriptions 
ADD CONSTRAINT valid_plan CHECK (plan_id = ANY (ARRAY['free'::text, 'plus'::text, 'pro'::text, 'enterprise'::text]));
