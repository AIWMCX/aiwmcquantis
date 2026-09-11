-- Private storage bucket for Content Studio's generated images (Hugging
-- Face FLUX.1-schnell output). Read via signed URL only, same pattern as
-- the existing analysis-documents bucket -- never public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('content-assets', 'content-assets', false, 10485760, array['image/png', 'image/jpeg', 'image/webp']);

-- Only admin/content_admin roles may read or write generated creative assets.
create policy "content_admins_can_read_content_assets"
  on storage.objects for select
  using (
    bucket_id = 'content-assets'
    and (has_role(auth.uid(), 'admin') or has_role(auth.uid(), 'content_admin'))
  );

create policy "service_role_full_access_content_assets"
  on storage.objects for all
  using (bucket_id = 'content-assets' and auth.role() = 'service_role')
  with check (bucket_id = 'content-assets' and auth.role() = 'service_role');
