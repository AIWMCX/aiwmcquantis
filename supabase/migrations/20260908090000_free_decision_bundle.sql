BEGIN;

UPDATE public.plan_entitlements
SET
  monthly_analyses = 5,
  features = features || '{
    "depthFull": true,
    "preMortem": true,
    "actionPlan": true,
    "scenarioView": true,
    "scenarioCustom": true,
    "scenarioSave": true,
    "scenarioCompare": true
  }'::jsonb,
  limits = limits || '{
    "analysesPerMonth": 5,
    "projectionMonths": 36,
    "monteCarloScenarios": 1000,
    "scenarioSetsPerAnalysis": 1,
    "templates": 3
  }'::jsonb,
  updated_at = now()
WHERE tier = 'free';

DO $$
DECLARE
  free_row public.plan_entitlements%ROWTYPE;
BEGIN
  SELECT * INTO free_row
  FROM public.plan_entitlements
  WHERE tier = 'free';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'free plan entitlement row is missing';
  END IF;

  IF free_row.monthly_analyses <> 5
     OR free_row.features ->> 'depthFull' <> 'true'
     OR free_row.features ->> 'preMortem' <> 'true'
     OR free_row.features ->> 'scenarioSave' <> 'true'
     OR (free_row.limits ->> 'projectionMonths')::integer <> 36
     OR (free_row.limits ->> 'scenarioSetsPerAnalysis')::integer <> 1
     OR (free_row.limits ->> 'templates')::integer <> 3 THEN
    RAISE EXCEPTION 'free Decision Run entitlement migration did not apply completely';
  END IF;
END $$;

COMMIT;
