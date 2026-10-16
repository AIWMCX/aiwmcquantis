import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AutoposterPlatform = 'linkedin' | 'facebook' | 'instagram';
export const AP_PLATFORMS: AutoposterPlatform[] = ['linkedin', 'facebook', 'instagram'];

export interface AutoposterPost {
  id: string;
  week_number: number | null;
  day_number: number | null;
  post_date: string;
  hook: string;
  content_brief: string;
  post_type: string | null;
  visual_type: string | null;
  cta: string | null;
  hashtags: string[] | null;
  expected_reach: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  source: string;
  content_studio_generation_id: string | null;
  /** Path in the private content-assets bucket (posts/<post_id>/<file>). */
  asset_path: string | null;
  asset_alt: string | null;
}

export interface AutoposterPlatformRow {
  id: string;
  post_id: string;
  platform: string;
  content: string;
  best_time_mt: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  platform_post_id: string | null;
  status: string;
  error_message: string | null;
  updated_at: string;
}

export interface AutoposterWeekly {
  id: string;
  week_number: number | null;
  period_start: string;
  period_end: string;
  linkedin_impressions: number | null;
  li_engagement_pct: number | null;
  fb_ig_reach: number | null;
  fb_ig_engagements: number | null;
  reddit_upvotes: number | null;
  website_visitors: number | null;
  social_traffic_pct: number | null;
  app_visits: number | null;
  signups: number | null;
  paid_conversions: number | null;
  mrr_usd: number | null;
  notes: string | null;
  created_at: string;
}

/**
 * Active (non-archived) posts only. The 42-post legacy plan was archived
 * 2026-09-11 (see autoposter_legacy_snapshot_and_archive migration) --
 * archived rows must stay queryable via useAutoposterArchive below, but
 * never resurface in the Queue/Calendar/Plan views a founder actually
 * schedules from.
 */
export function useAutoposterPosts() {
  return useQuery({
    queryKey: ['autoposter', 'posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('autoposter_posts')
        .select('*')
        .is('archived_at', null)
        .order('post_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AutoposterPost[];
    },
  });
}

/** Archived posts (legacy plan + any later superseded work) for the Archive view. */
export function useAutoposterArchive() {
  return useQuery({
    queryKey: ['autoposter', 'archive'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('autoposter_posts')
        .select('*')
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AutoposterPost[];
    },
  });
}

export function useAutoposterPlatforms() {
  return useQuery({
    queryKey: ['autoposter', 'platforms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('autoposter_post_platforms')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AutoposterPlatformRow[];
    },
  });
}

export function useAutoposterWeekly() {
  return useQuery({
    queryKey: ['autoposter', 'weekly'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('autoposter_analytics_weekly')
        .select('*')
        .order('period_start', { ascending: false })
        .limit(12);
      if (error) throw error;
      return ((data ?? []) as AutoposterWeekly[]).reverse(); // chronological
    },
  });
}

export function useGenerateContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { postId: string; platforms: AutoposterPlatform[]; overwrite?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('autoposter-generate-content', {
        body: input,
      });
      if (error) throw error;
      return data as { success: boolean; results: Array<{ platform: string; ok: boolean; skipped?: boolean; error?: string }> };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['autoposter'] });
      const made = data.results.filter((r) => r.ok && !r.skipped).length;
      const kept = data.results.filter((r) => r.skipped).length;
      const fail = data.results.filter((r) => !r.ok).length;
      const keptNote = kept ? ` · kept ${kept} existing draft(s)` : '';
      if (fail === 0) toast.success(`Generated ${made} platform variant(s)${keptNote}`);
      else toast.warning(`${made} generated, ${fail} failed${keptNote}`, {
        description: data.results.filter((r) => !r.ok).map((r) => `${r.platform}: ${r.error}`).join('\n'),
      });
    },
    onError: (e: Error) => toast.error('Generation failed', { description: e.message }),
  });
}

export interface ContentPlanItem {
  post_date: string;
  hook: string;
  content_brief: string;
  post_type?: string;
  visual_type?: string;
  cta?: string;
  hashtags?: string[];
}

export interface ContentPlanImportResult {
  success: boolean;
  inserted_count: number;
  inserted?: Array<{ id: string; post_date: string; hook: string }>;
  rejected_duplicate_in_batch: string[];
  rejected_existing_duplicate: string[];
}

// Insert-only bulk import (content-plan-import edge function) -- never an
// upsert, never touches an existing row's status. See that function's own
// header for why this distinction matters (the prior bulk-seed mechanism's
// deleted status-reset bug).
export function useImportContentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: ContentPlanItem[]) => {
      const { data, error } = await supabase.functions.invoke('content-plan-import', {
        body: { items },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as ContentPlanImportResult;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['autoposter'] });
      const rejected = data.rejected_duplicate_in_batch.length + data.rejected_existing_duplicate.length;
      if (rejected === 0) toast.success(`Imported ${data.inserted_count} new post(s)`);
      else toast.warning(`Imported ${data.inserted_count}, rejected ${rejected} duplicate(s)`, {
        description: [...data.rejected_duplicate_in_batch, ...data.rejected_existing_duplicate].slice(0, 5).join('\n'),
      });
    },
    onError: (e: Error) => toast.error('Import failed', { description: e.message }),
  });
}

export function useUpdatePlatformContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; content: string }) => {
      const { error } = await supabase
        .from('autoposter_post_platforms')
        .update({ content: input.content })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['autoposter', 'platforms'] }),
  });
}

export type PostStatus = 'draft' | 'scheduled' | 'posted' | 'archived' | 'not_published';

/**
 * Manual status control for a post: draft / posted / archived / not_published.
 * Setting 'posted' or 'archived' sets archived_at/historical_publication_state
 * consistently with how the 2026-09-11 seed migration marks already-published
 * content, so this stays queryable the same way. Moving OFF archived/posted
 * back to draft clears those fields rather than leaving stale archive data
 * on an active post.
 */
export function useSetPostStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: PostStatus }) => {
      const isRetiring = input.status === 'archived' || input.status === 'posted' || input.status === 'not_published';
      const { error } = await supabase
        .from('autoposter_posts')
        .update({
          status: input.status,
          archived_at: isRetiring ? new Date().toISOString() : null,
          archive_reason: isRetiring ? 'manual_review' : null,
          historical_publication_state: input.status === 'posted'
            ? 'founder_reported_published'
            : input.status === 'not_published'
              ? 'not_published'
              : null,
        })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['autoposter'] });
      toast.success('Status updated');
    },
    onError: (e: Error) => toast.error('Status update failed', { description: e.message }),
  });
}

export function useApproveAndSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { post: AutoposterPost; platforms: AutoposterPlatformRow[] }) => {
      // Set scheduled_at = post_date + best_time_mt (MT = UTC-7 / UTC-6; treat as local MT, convert to UTC-7)
      const updates = input.platforms.map((p) => {
        const time = p.best_time_mt ?? '09:00:00';
        // MT is UTC-7 (MST) — approximate. Stored as UTC.
        const isoLocal = `${input.post.post_date}T${time}-07:00`;
        const scheduledAt = new Date(isoLocal).toISOString();
        return supabase
          .from('autoposter_post_platforms')
          .update({ status: 'scheduled', scheduled_at: scheduledAt })
          .eq('id', p.id);
      });
      await Promise.all(updates);
      await supabase
        .from('autoposter_posts')
        .update({ status: 'scheduled' })
        .eq('id', input.post.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['autoposter'] });
      toast.success('Approved & scheduled');
    },
    onError: (e: Error) => toast.error('Schedule failed', { description: e.message }),
  });
}

export function useAddWeeklySnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AutoposterWeekly> & { period_start: string; period_end: string }) => {
      const { error } = await supabase.from('autoposter_analytics_weekly').insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['autoposter', 'weekly'] });
      toast.success('Snapshot added');
    },
    onError: (e: Error) => toast.error('Insert failed', { description: e.message }),
  });
}


// ---------------------------------------------------------------------------
// Post image assets (private content-assets bucket, posts/<post_id>/...)
// ---------------------------------------------------------------------------

export const POST_ASSET_BUCKET = 'content-assets';
export const POST_ASSET_MAX_BYTES = 10 * 1024 * 1024;
export const POST_ASSET_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** Short-lived signed URL for a post image; refreshes before it expires. */
export function usePostAssetUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['autoposter', 'asset-url', path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(POST_ASSET_BUCKET).createSignedUrl(path as string, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

/** Upload (or replace) a post's image and store its path + alt text on the post. */
export function useUploadPostAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { post: AutoposterPost; file: File; alt: string }) => {
      const { post, file, alt } = input;
      if (!(POST_ASSET_TYPES as readonly string[]).includes(file.type)) {
        throw new Error('Use a PNG, JPEG or WebP image.');
      }
      if (file.size > POST_ASSET_MAX_BYTES) throw new Error('Image must be 10 MB or smaller.');
      const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'png';
      const path = `posts/${post.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(POST_ASSET_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase.from('autoposter_posts').update({ asset_path: path, asset_alt: alt.trim() || null }).eq('id', post.id);
      if (error) {
        await supabase.storage.from(POST_ASSET_BUCKET).remove([path]);
        throw error;
      }
      // Remove the replaced file only after the post points at the new one.
      if (post.asset_path && post.asset_path !== path) {
        await supabase.storage.from(POST_ASSET_BUCKET).remove([post.asset_path]);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['autoposter'] });
      toast.success('Image attached');
    },
    onError: (e: Error) => toast.error('Upload failed', { description: e.message }),
  });
}

export function useUpdatePostAssetAlt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; alt: string }) => {
      const { error } = await supabase.from('autoposter_posts').update({ asset_alt: input.alt.trim() || null }).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['autoposter'] });
      toast.success('Alt text saved');
    },
    onError: (e: Error) => toast.error('Could not save alt text', { description: e.message }),
  });
}

export function useRemovePostAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: AutoposterPost) => {
      if (!post.asset_path) return;
      const { error } = await supabase.from('autoposter_posts').update({ asset_path: null }).eq('id', post.id);
      if (error) throw error;
      await supabase.storage.from(POST_ASSET_BUCKET).remove([post.asset_path]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['autoposter'] });
      toast.success('Image removed');
    },
    onError: (e: Error) => toast.error('Could not remove image', { description: e.message }),
  });
}
