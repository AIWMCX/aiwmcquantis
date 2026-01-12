-- Create storage bucket for document uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('analysis-documents', 'analysis-documents', false);

-- RLS policy: Users can upload documents to their own folder
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'analysis-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policy: Users can view their own documents
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'analysis-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policy: Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'analysis-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Add documents column to analyses table
ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]';

-- Column stores: [{"name": "file.pdf", "url": "...", "type": "pdf", "size": 1234, "parsed_content": "..."}]