
-- Defense-in-depth: RESTRICTIVE deny policies for admin-only tables.
-- RESTRICTIVE policies AND with all permissive ones, so even if someone later
-- adds an over-broad permissive policy, non-admins still cannot read these.

-- content_studio_generations: admin-only table
CREATE POLICY "Deny non-admin access to content_studio_generations"
ON public.content_studio_generations
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- subscription_audit_log: admin/service_role only table
CREATE POLICY "Deny non-admin access to subscription_audit_log"
ON public.subscription_audit_log
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
