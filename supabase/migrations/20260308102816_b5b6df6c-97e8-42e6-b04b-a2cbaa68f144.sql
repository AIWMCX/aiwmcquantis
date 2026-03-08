INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for brand assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'brand-assets');

CREATE POLICY "Users can upload own brand assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets'
  AND (storage.foldername(name))[1] = 'logos'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

CREATE POLICY "Users can update own brand assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND (storage.foldername(name))[1] = 'logos'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

CREATE POLICY "Users can delete own brand assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND (storage.foldername(name))[1] = 'logos'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);