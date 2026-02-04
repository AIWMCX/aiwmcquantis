-- Update RLS policy for documents table to require Plus subscription for INSERT
-- First drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create documents" ON public.documents;

-- Create new INSERT policy that requires Plus subscription
CREATE POLICY "Plus users can create documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND verify_plus_subscription(auth.uid())
);

-- Update document_exports table similarly
DROP POLICY IF EXISTS "Users can create exports" ON public.document_exports;

CREATE POLICY "Plus users can create exports" 
ON public.document_exports 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND verify_plus_subscription(auth.uid())
);

-- Update document_versions table similarly  
DROP POLICY IF EXISTS "Users can create versions for own documents" ON public.document_versions;

CREATE POLICY "Plus users can create versions for own documents" 
ON public.document_versions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_versions.document_id 
    AND d.user_id = auth.uid()
  )
  AND verify_plus_subscription(auth.uid())
);