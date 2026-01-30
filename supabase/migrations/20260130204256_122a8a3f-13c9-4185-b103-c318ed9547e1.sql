-- ============================================
-- SECURITY HARDENING: Fix RLS Policy Conflicts
-- ============================================

-- Fix user_notifications: Drop overly broad policy, add restrictive anon-only
DROP POLICY IF EXISTS "Deny anonymous access to user_notifications" 
  ON public.user_notifications;
CREATE POLICY "Deny anon access to user_notifications"
  ON public.user_notifications
  AS RESTRICTIVE
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

-- Fix user_engagement: Same pattern
DROP POLICY IF EXISTS "Deny anonymous access to user_engagement" 
  ON public.user_engagement;
CREATE POLICY "Deny anon access to user_engagement"
  ON public.user_engagement
  AS RESTRICTIVE
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

-- Fix email_sequence_log: Remove conflicting policies, service role only
DROP POLICY IF EXISTS "Deny anonymous access to email_sequence_log" 
  ON public.email_sequence_log;
DROP POLICY IF EXISTS "Deny authenticated access to email_sequence_log" 
  ON public.email_sequence_log;

-- Fix subscription_audit_log  
DROP POLICY IF EXISTS "Deny anonymous access to audit logs" 
  ON public.subscription_audit_log;
CREATE POLICY "Deny anon access to subscription_audit_log"
  ON public.subscription_audit_log
  AS RESTRICTIVE
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

-- Remove orphaned Pro policies (Pro tier removed, now use Plus)
DROP POLICY IF EXISTS "Pro users can insert branding" 
  ON public.branding_settings;
DROP POLICY IF EXISTS "Pro users can insert api keys" 
  ON public.api_keys;