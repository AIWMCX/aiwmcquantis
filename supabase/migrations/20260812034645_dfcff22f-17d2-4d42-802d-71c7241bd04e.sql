-- 1) Remove duplicate permissive INSERT policy that bypassed the tier gate on exports.
DROP POLICY IF EXISTS "Users can create exports for own documents" ON public.document_exports;

-- 2) Explicit, owner-scoped UPDATE policy for the analysis-documents bucket,
--    mirroring the paid-tier gate used for uploads.
DROP POLICY IF EXISTS "Users can update own analysis documents" ON storage.objects;
CREATE POLICY "Users can update own analysis documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'analysis-documents'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND public.verify_paid_subscription(auth.uid()) = ANY (ARRAY['plus','pro'])
)
WITH CHECK (
  bucket_id = 'analysis-documents'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND public.verify_paid_subscription(auth.uid()) = ANY (ARRAY['plus','pro'])
);