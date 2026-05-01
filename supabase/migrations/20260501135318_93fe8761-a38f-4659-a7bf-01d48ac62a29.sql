
-- 1. Storage: ensure document-exports bucket exists & is PRIVATE
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-exports', 'document-exports', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Owner-scoped storage policies (path: docs/{user_id}/{job_id}.json)
DROP POLICY IF EXISTS "Users read own document exports" ON storage.objects;
CREATE POLICY "Users read own document exports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'document-exports'
  AND (storage.foldername(name))[1] = 'docs'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Service role manages document exports" ON storage.objects;
CREATE POLICY "Service role manages document exports"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'document-exports' AND public.is_service_role())
WITH CHECK (bucket_id = 'document-exports' AND public.is_service_role());

-- 2. user_roles: remove self-insert/update privilege escalation vector
DROP POLICY IF EXISTS "Authenticated users can insert own non-admin roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can update own non-admin roles" ON public.user_roles;
-- Service role policy already exists and covers all writes server-side.

-- 3. email_send_log: replace blanket-deny ALL with explicit service-role allow
DROP POLICY IF EXISTS "Service role only" ON public.email_send_log;
CREATE POLICY "Service role full access on email_send_log"
ON public.email_send_log FOR ALL
TO public
USING (public.is_service_role())
WITH CHECK (public.is_service_role());

-- 4. analysis_jobs: add UPDATE policy (owner + service role)
DROP POLICY IF EXISTS "Users update own analysis jobs" ON public.analysis_jobs;
CREATE POLICY "Users update own analysis jobs"
ON public.analysis_jobs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_service_role())
WITH CHECK (auth.uid() = user_id OR public.is_service_role());

-- 5. Realtime: remove doc_generation_jobs from postgres_changes publication.
-- Workers already broadcast completion via supabase.channel(`doc_jobs:{job_id}`).send()
ALTER PUBLICATION supabase_realtime DROP TABLE public.doc_generation_jobs;
