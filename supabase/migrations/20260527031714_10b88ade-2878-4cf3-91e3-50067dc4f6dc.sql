-- Fix 1: Remove the RESTRICTIVE policy on doc_templates that ANDs with all other
-- policies and blocks access to every free-tier template whose template_id is not
-- in a hardcoded allowlist. The tier-based PERMISSIVE policies already enforce
-- correct access (free, plus, service_role; anon explicitly denied).
DROP POLICY IF EXISTS "Authenticated users can view free-tier templates" ON public.doc_templates;

-- Fix 2: Pin search_path on touch_quote_gen_usage to prevent search_path hijacking.
ALTER FUNCTION public.touch_quote_gen_usage() SET search_path = public;