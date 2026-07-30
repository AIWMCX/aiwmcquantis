-- Extend the existing plan_entitlements SSOT (not a parallel entitlement
-- system) with scenario-framework feature keys/quotas per Release 1.
-- Free: view + one unsaved/limited custom preview, no saved sets.
-- Plus: up to 10 saved scenario sets/analysis. Pro: up to 30.
update public.plan_entitlements
set features = features || jsonb_build_object(
  'scenarioView', true,
  'scenarioCustom', true,
  'scenarioSave', false,
  'scenarioCompare', false,
  'scenarioPromote', false,
  'scenarioEvidenceRefresh', false,
  'scenarioDocument', false
),
limits = limits || jsonb_build_object('scenarioSetsPerAnalysis', 0)
where tier = 'free';

update public.plan_entitlements
set features = features || jsonb_build_object(
  'scenarioView', true,
  'scenarioCustom', true,
  'scenarioSave', true,
  'scenarioCompare', true,
  'scenarioPromote', true,
  'scenarioEvidenceRefresh', true,
  'scenarioDocument', true
),
limits = limits || jsonb_build_object('scenarioSetsPerAnalysis', 10)
where tier = 'plus';

update public.plan_entitlements
set features = features || jsonb_build_object(
  'scenarioView', true,
  'scenarioCustom', true,
  'scenarioSave', true,
  'scenarioCompare', true,
  'scenarioPromote', true,
  'scenarioEvidenceRefresh', true,
  'scenarioDocument', true
),
limits = limits || jsonb_build_object('scenarioSetsPerAnalysis', 30)
where tier = 'pro';
