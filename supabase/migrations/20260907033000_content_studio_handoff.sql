-- Transactional Studio -> LinkedIn draft handoff. Does not approve or publish.
-- Called only by the authenticated content-studio-generate server action.
create or replace function public.queue_content_studio_linkedin(
  p_generation_id uuid,
  p_actor_id uuid,
  p_post_date date
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.content_studio_generations%rowtype;
  v jsonb;
  receipt jsonb;
  post_id uuid;
  body_text text;
  tags text[];
  digest text;
begin
  if p_actor_id is null or not (
    coalesce(public.has_role(p_actor_id, 'admin'::public.app_role), false)
    or coalesce(public.has_role(p_actor_id, 'content_admin'::public.app_role), false)
  ) then
    raise exception 'CONTENT_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if p_post_date is null then
    raise exception 'EDITORIAL_DATE_REQUIRED' using errcode = '22023';
  end if;

  select * into g from public.content_studio_generations
  where id = p_generation_id for update;
  if not found then raise exception 'GENERATION_NOT_FOUND' using errcode = 'P0002'; end if;
  if g.meta is not null and jsonb_typeof(g.meta) <> 'object' then
    raise exception 'INVALID_GENERATION_METADATA' using errcode = '22023';
  end if;
  v := g.variants -> 'linkedin';
  if v is null or jsonb_typeof(v) <> 'object' or jsonb_typeof(v->'body') <> 'string'
     or coalesce(length(btrim(v->>'body')),0) = 0 then
    raise exception 'LINKEDIN_COPY_REQUIRED' using errcode = '22023';
  end if;
  if v ? 'hashtags' and jsonb_typeof(v->'hashtags') <> 'array' then
    raise exception 'INVALID_HASHTAGS' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_array_elements(coalesce(v->'hashtags','[]'::jsonb)) x where jsonb_typeof(x) <> 'string') then
    raise exception 'INVALID_HASHTAGS' using errcode = '22023';
  end if;
  select coalesce(array_agg(x),array[]::text[]) into tags
    from jsonb_array_elements_text(coalesce(v->'hashtags','[]'::jsonb)) x;
  body_text := btrim(v->>'body');
  if cardinality(tags) > 0 then body_text := body_text || E'\n\n' || array_to_string(tags,' '); end if;
  if char_length(body_text) > 3000 then
    raise exception 'LINKEDIN_COPY_TOO_LONG' using errcode = '22023';
  end if;
  -- Digest is a change detector, not an authentication primitive.
  digest := md5(v::text);
  receipt := g.meta->'autoposter_handoff';
  if receipt is not null then
    if receipt->>'variant_digest' is distinct from digest
       or receipt->>'post_date' is distinct from p_post_date::text then
      raise exception 'HANDOFF_CONFLICT_OPEN_EXISTING_DRAFT' using errcode = '22023';
    end if;
    post_id := (receipt->>'post_id')::uuid;
    if not exists(select 1 from public.autoposter_posts p where p.id=post_id) then
      raise exception 'HANDOFF_DRAFT_MISSING' using errcode = 'P0002';
    end if;
    return post_id;
  end if;

  insert into public.autoposter_posts(post_date,hook,content_brief,post_type,visual_type,cta,hashtags,status,notes)
  values(p_post_date,coalesce(nullif(btrim(v->>'hook'),''),g.topic),body_text,
    coalesce(g.meta->>'content_mode','organic'),'text',g.cta,tags,'draft',
    jsonb_build_object('source','content_studio','generation_id',g.id,'actor_id',p_actor_id,
      'product_id',coalesce(g.meta->>'product_id','quantis'),'variant_digest',digest,
      'review','requires_founder_approval','visual_brief',v->>'image_prompt')::text)
  returning id into post_id;
  insert into public.autoposter_post_platforms(post_id,platform,content,status)
    values(post_id,'linkedin',body_text,'draft');
  update public.content_studio_generations
    set meta=coalesce(meta,'{}'::jsonb)||jsonb_build_object('autoposter_handoff',
      jsonb_build_object('post_id',post_id,'post_date',p_post_date,'variant_digest',digest,'at',now()))
    where id=g.id;
  return post_id;
end;
$$;
revoke all on function public.queue_content_studio_linkedin(uuid,uuid,date) from public, anon, authenticated;
grant execute on function public.queue_content_studio_linkedin(uuid,uuid,date) to service_role;
comment on function public.queue_content_studio_linkedin(uuid,uuid,date) is
  'Atomic idempotent draft handoff; server validates actor; no scheduling, approval or publishing.';
