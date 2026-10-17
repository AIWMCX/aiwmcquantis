-- Autoposter post workspace (2026-10-15): one image asset per post.
--
-- Images live in the existing private `content-assets` bucket under
-- posts/<post_id>/..., read via signed URLs. Until now only the service
-- role could write that bucket (Content Studio's server-side renderer);
-- admins/content admins now may upload, replace and remove files under
-- posts/ from the Autoposter editor. Reads keep the existing policy.

alter table public.autoposter_posts
  add column if not exists asset_path text,
  add column if not exists asset_alt text;

comment on column public.autoposter_posts.asset_path is
  'Object path in the private content-assets bucket (posts/<post_id>/<file>), or null.';
comment on column public.autoposter_posts.asset_alt is
  'Alt text for the post image (accessibility; also used as the social alt text).';

drop policy if exists "content_admins_can_write_post_assets" on storage.objects;
create policy "content_admins_can_write_post_assets"
  on storage.objects for insert
  with check (
    bucket_id = 'content-assets'
    and (storage.foldername(name))[1] = 'posts'
    and (has_role(auth.uid(), 'admin') or has_role(auth.uid(), 'content_admin'))
  );

drop policy if exists "content_admins_can_update_post_assets" on storage.objects;
create policy "content_admins_can_update_post_assets"
  on storage.objects for update
  using (
    bucket_id = 'content-assets'
    and (storage.foldername(name))[1] = 'posts'
    and (has_role(auth.uid(), 'admin') or has_role(auth.uid(), 'content_admin'))
  );

drop policy if exists "content_admins_can_delete_post_assets" on storage.objects;
create policy "content_admins_can_delete_post_assets"
  on storage.objects for delete
  using (
    bucket_id = 'content-assets'
    and (storage.foldername(name))[1] = 'posts'
    and (has_role(auth.uid(), 'admin') or has_role(auth.uid(), 'content_admin'))
  );
