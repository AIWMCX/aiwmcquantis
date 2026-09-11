import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { QUANTIS_CONTENT_PLAN } from '@/data/autoposterContentPlan';

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
    mutationFn: async (input: { postId: string; platforms: AutoposterPlatform[] }) => {
      const { data, error } = await supabase.functions.invoke('autoposter-generate-content', {
        body: input,
      });
      if (error) throw error;
      return data as { success: boolean; results: Array<{ platform: string; ok: boolean; error?: string }> };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['autoposter'] });
      const ok = data.results.filter((r) => r.ok).length;
      const fail = data.results.length - ok;
      if (fail === 0) toast.success(`Generated ${ok} platform variant(s)`);
      else toast.warning(`${ok} succeeded, ${fail} failed`, {
        description: data.results.filter((r) => !r.ok).map((r) => `${r.platform}: ${r.error}`).join('\n'),
      });
    },
    onError: (e: Error) => toast.error('Generation failed', { description: e.message }),
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

/**
 * Seed (or refresh) the canonical 90-day content plan into the DB.
 * Idempotent: upserts on (week_number, day_number). Safe to run anytime
 * after editing src/data/autoposterContentPlan.ts.
 *
 * `status` is deliberately NOT in the upsert payload. It previously included
 * `status: 'draft'`, which on conflict silently overwrote every existing
 * row's status back to 'draft' -- including the 42 posts archived
 * 2026-09-11, whose archived_at stayed set while status drifted back to
 * 'draft' underneath it. New rows still get 'draft' via the column
 * default; existing rows keep whatever status they're actually in.
 */
export function useSeedContentPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const rows = QUANTIS_CONTENT_PLAN.map((p) => ({
        week_number: p.week_number,
        day_number: p.day_number,
        post_date: p.post_date,
        hook: p.hook,
        content_brief: p.content_brief,
        post_type: p.post_type,
        visual_type: p.visual_type,
        cta: p.cta,
        hashtags: p.hashtags,
        expected_reach: p.expected_reach,
      }));
      const { error } = await supabase
        .from('autoposter_posts')
        .upsert(rows, { onConflict: 'week_number,day_number' });
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['autoposter'] });
      toast.success(`Synced ${count} posts to queue`);
    },
    onError: (e: Error) => toast.error('Seed failed', { description: e.message }),
  });
}
