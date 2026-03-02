
-- Phase 1: Add RESTRICTIVE anon deny policies to all tables missing them
-- These tables were flagged by the security scan as having policies accessible to anonymous users

-- 1. profiles
CREATE POLICY "Deny anon access to profiles"
ON public.profiles AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- 2. branding_settings
CREATE POLICY "Deny anon access to branding_settings"
ON public.branding_settings AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- 3. document_exports
CREATE POLICY "Deny anon access to document_exports"
ON public.document_exports AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- 4. email_send_log
CREATE POLICY "Deny anon access to email_send_log"
ON public.email_send_log AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- 5. email_sequence_log
CREATE POLICY "Deny anon access to email_sequence_log"
ON public.email_sequence_log AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- 6. newsletter_sends
CREATE POLICY "Deny anon access to newsletter_sends"
ON public.newsletter_sends AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- 7. shared_reports
CREATE POLICY "Deny anon access to shared_reports"
ON public.shared_reports AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- 8. teams
CREATE POLICY "Deny anon access to teams"
ON public.teams AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- 9. usage_tracking
CREATE POLICY "Deny anon access to usage_tracking"
ON public.usage_tracking AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- 10. anonymous_usage (rate limit functions use SECURITY DEFINER, so RLS is bypassed)
CREATE POLICY "Deny anon access to anonymous_usage"
ON public.anonymous_usage AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
