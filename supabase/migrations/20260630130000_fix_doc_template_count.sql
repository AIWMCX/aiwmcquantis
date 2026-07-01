-- ============================================================================
-- Fix plan_entitlements.limits.templates: seeded as 12, but only 10 Doc
-- Studio templates have ever existed (see src/components/docs/forms/index.ts
-- and src/config/canonical-facts.ts DOC_TEMPLATE_COUNT).
-- ============================================================================
-- Trust-critical accuracy bug: this table is public-readable (anon SELECT
-- grant, see 20260616050959_1d892f46-....sql) so the wrong "12" was directly
-- queryable via the REST API, not just baked into marketing copy. Corrects
-- prod data seeded by that migration without editing an already-applied file.

UPDATE public.plan_entitlements
SET limits = jsonb_set(limits, '{templates}', '10'::jsonb),
    updated_at = now()
WHERE tier IN ('plus', 'pro')
  AND (limits->>'templates')::int = 12;
