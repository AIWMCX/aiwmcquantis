import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { denverWallTimeToUtcIso } from '@/lib/denver-time';

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
  /** Public URL of the live post (recorded by the founder, https only). */
  published_url?: string | null;
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
      // scheduled_at = post_date + best_time_mt in America/Denver, with the
      // correct DST offset for that date (was hard-coded -07:00, an hour late
      // all summer).
      const plan = input.platforms.map((p) => {
        const time = p.best_time_mt ?? '09:00:00';
        return { p, scheduledAt: denverWallTimeToUtcIso(input.post.post_date, time) };
      });
      // Every LinkedIn post goes out with an image (founder rule 2026-10-27).
      if (!input.post.asset_path && input.platforms.some((p) => p.platform === 'linkedin')) {
        throw new Error('Attach an image first. Every LinkedIn post goes out with an image.');
      }
      // A past time would publish the moment it is approved. Make the founder
      // pick a new date instead (2026-10-27: Oct 26/27 drafts were left behind).
      if (plan.some(({ scheduledAt }) => new Date(scheduledAt).getTime() <= Date.now())) {
        throw new Error(`${input.post.post_date} has already passed. Use Schedule on the platform row to pick a new date.`);
      }
      // Each update is checked: before, failures were ignored and the post was
      // still marked scheduled while the publisher had nothing to claim.
      const results = await Promise.all(plan.map(({ p, scheduledAt }) =>
        supabase
          .from('autoposter_post_platforms')
          .update({ status: 'scheduled', scheduled_at: scheduledAt, error_message: null })
          .eq('id', p.id)
          .in('status', ['draft', 'scheduled', 'failed', 'needs_credentials'])
          .select('id')));
      const failed = results.filter((r) => r.error || !r.data?.length);
      const scheduled = results.length - failed.length;
      if (scheduled === 0) {
        throw new Error(failed[0]?.error?.message ?? 'Nothing was scheduled. Refresh to see the current status.');
      }
      const { error } = await supabase
        .from('autoposter_posts')
        .update({ status: 'scheduled' })
        .eq('id', input.post.id);
      if (error) throw error;
      return { scheduled, failed: failed.length };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['autoposter'] });
      if (r.failed) toast.warning(`Scheduled ${r.scheduled} platform(s); ${r.failed} could not be scheduled. Refresh to see which.`);
      else toast.success('Approved & scheduled');
    },
    onError: (e: Error) => toast.error('Schedule failed', { description: e.message }),
  });
}

/**
 * Cancel one scheduled platform row. Guarded on status='scheduled' so it can
 * never race the publisher: once publish-due-posts has claimed the row
 * ('publishing'), the update matches nothing and we say so.
 */
export function useCancelPlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { row: AutoposterPlatformRow }) => {
      const { data, error } = await supabase
        .from('autoposter_post_platforms')
        .update({ status: 'draft', scheduled_at: null })
        .eq('id', input.row.id)
        .eq('status', 'scheduled')
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('It was already picked up by the publisher — refresh to see its status.');
      // If nothing else on this post is still scheduled, the post is a draft again.
      const { data: left } = await supabase
        .from('autoposter_post_platforms')
        .select('id')
        .eq('post_id', input.row.post_id)
        .eq('status', 'scheduled');
      if (!left || left.length === 0) {
        await supabase.from('autoposter_posts').update({ status: 'draft' }).eq('id', input.row.post_id).eq('status', 'scheduled');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['autoposter'] });
      toast.success('Cancelled — back to draft');
    },
    onError: (e: Error) => toast.error('Cancel failed', { description: e.message }),
  });
}

/** Reschedule one platform row to a Denver wall-clock date/time. Never for unknown/publishing/published. */
export function useReschedulePlatform() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { row: AutoposterPlatformRow; date: string; time: string }) => {
      const scheduledAt = denverWallTimeToUtcIso(input.date, input.time);
      if (new Date(scheduledAt).getTime() <= Date.now()) throw new Error('Pick a time in the future.');
      if (input.row.platform === 'linkedin') {
        const { data: post } = await supabase.from('autoposter_posts').select('asset_path').eq('id', input.row.post_id).maybeSingle();
        if (!post?.asset_path) throw new Error('Attach an image first. Every LinkedIn post goes out with an image.');
      }
      const { data, error } = await supabase
        .from('autoposter_post_platforms')
        .update({ status: 'scheduled', scheduled_at: scheduledAt, error_message: null })
        .eq('id', input.row.id)
        .in('status', ['draft', 'scheduled', 'failed', 'needs_credentials'])
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('This post can no longer be rescheduled — refresh to see its status.');
      await supabase.from('autoposter_posts').update({ status: 'scheduled' }).eq('id', input.row.post_id).eq('status', 'draft');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['autoposter'] });
      toast.success('Rescheduled');
    },
    onError: (e: Error) => toast.error('Reschedule failed', { description: e.message }),
  });
}

/** Record where the post actually lives (manual publish, or reconciling an 'unknown'). */
export function useRecordPublishedUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { row: AutoposterPlatformRow; url: string }) => {
      const { data, error } = await supabase
        .from('autoposter_post_platforms')
        .update({
          status: 'published',
          published_url: input.url.trim(),
          published_at: input.row.published_at ?? new Date().toISOString(),
          scheduled_at: null,
          error_message: null,
        })
        .eq('id', input.row.id)
        .neq('status', 'publishing')
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('The publisher is working on this post right now — try again in a minute.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['autoposter'] });
      toast.success('Published URL recorded');
    },
    onError: (e: Error) => toast.error('Could not record the URL', { description: e.message }),
  });
}

/** Reconcile an 'unknown' publish the founder checked and found NOT live: back to draft, no retry. */
export function useMarkNotLive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { row: AutoposterPlatformRow }) => {
      const { data, error } = await supabase
        .from('autoposter_post_platforms')
        .update({ status: 'draft', scheduled_at: null, error_message: 'Checked by founder: not live on the platform.' })
        .eq('id', input.row.id)
        .eq('status', 'unknown')
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Its status changed — refresh to see it.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['autoposter'] });
      toast.success('Marked not live — back to draft');
    },
    onError: (e: Error) => toast.error('Update failed', { description: e.message }),
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
