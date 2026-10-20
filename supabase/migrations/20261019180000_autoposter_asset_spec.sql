-- Post image automation: a post can carry a structured image spec that the
-- scheduled renderer (scripts/post-images, .github/workflows/render-post-images.yml)
-- turns into a PNG in content-assets and writes back to asset_path.
alter table public.autoposter_posts
  add column if not exists asset_spec jsonb,
  add column if not exists asset_render_error text;

comment on column public.autoposter_posts.asset_spec is
  'Poster spec (headline/sub/blocks/cta) rendered to asset_path by scripts/post-images. Every displayed number must appear in the post text.';
comment on column public.autoposter_posts.asset_render_error is
  'Last reason the renderer refused or failed to render asset_spec (null when the image rendered).';
