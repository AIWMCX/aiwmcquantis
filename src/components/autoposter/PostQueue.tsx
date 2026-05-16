import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  AP_PLATFORMS,
  AutoposterPost,
  AutoposterPlatformRow,
  useAutoposterPosts,
  useAutoposterPlatforms,
  useGenerateContent,
} from '@/hooks/useAutoposter';
import { PostEditorSheet } from './PostEditorSheet';

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  published: 'bg-[var(--q-accent-glow)] text-[var(--q-accent-primary)] border-[var(--q-accent-primary)]/40',
  failed: 'bg-red-500/20 text-red-400 border-red-500/40',
};

const PLATFORM_LABEL: Record<string, string> = {
  linkedin: 'LI',
  facebook: 'FB',
  instagram: 'IG',
};

export function PostQueue() {
  const { data: posts = [], isLoading } = useAutoposterPosts();
  const { data: platforms = [] } = useAutoposterPlatforms();
  const generate = useGenerateContent();
  const [filter, setFilter] = useState<'all' | 'thisWeek' | 'nextWeek'>('all');
  const [search, setSearch] = useState('');
  const [activePost, setActivePost] = useState<AutoposterPost | null>(null);

  const platformsByPost = useMemo(() => {
    const m = new Map<string, AutoposterPlatformRow[]>();
    platforms.forEach((p) => {
      const arr = m.get(p.post_id) ?? [];
      arr.push(p);
      m.set(p.post_id, arr);
    });
    return m;
  }, [platforms]);

  const filtered = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const endThis = new Date(start);
    endThis.setDate(endThis.getDate() + 7);
    const endNext = new Date(start);
    endNext.setDate(endNext.getDate() + 14);

    return posts.filter((p) => {
      const d = new Date(p.post_date);
      if (filter === 'thisWeek' && (d < start || d >= endThis)) return false;
      if (filter === 'nextWeek' && (d < endThis || d >= endNext)) return false;
      if (search && !`${p.hook} ${p.content_brief} ${p.post_type ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [posts, filter, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 rounded-md border border-[var(--q-border-subtle)] p-1">
          {(['all', 'thisWeek', 'nextWeek'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition ${
                filter === f
                  ? 'bg-[var(--q-accent-glow)] text-[var(--q-accent-primary)]'
                  : 'text-[var(--q-text-secondary)] hover:text-[var(--q-text-primary)]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'thisWeek' ? 'This week' : 'Next week'}
            </button>
          ))}
        </div>
        <Input
          placeholder="Search hook / brief / type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm h-9"
        />
        <span className="text-xs text-[var(--q-text-secondary)] ml-auto font-mono">
          {filtered.length} / {posts.length} posts
        </span>
      </div>

      {isLoading ? (
        <div className="min-h-[200px] flex items-center justify-center text-[var(--q-text-secondary)]">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-[var(--q-text-secondary)]">
          No posts. Upload your masterplan .xlsx to seed the calendar.
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((post) => {
            const ps = platformsByPost.get(post.id) ?? [];
            const generatedCount = ps.filter((p) => p.content && p.content.length > 0).length;

            return (
              <Card key={post.id} className="p-4 hover:border-[var(--q-accent-primary)]/40 transition">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 text-center w-16">
                    <div className="text-[10px] uppercase tracking-wide text-[var(--q-text-secondary)] font-mono">
                      W{post.week_number ?? '?'} D{post.day_number ?? '?'}
                    </div>
                    <div className="text-sm font-mono mt-1">
                      {format(new Date(post.post_date), 'MMM d')}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {post.post_type && (
                        <Badge variant="outline" className="text-[10px]">
                          {post.post_type}
                        </Badge>
                      )}
                      <Badge className={`text-[10px] border ${STATUS_COLOR[post.status] ?? STATUS_COLOR.draft}`}>
                        {post.status}
                      </Badge>
                      {AP_PLATFORMS.map((pl) => {
                        const row = ps.find((p) => p.platform === pl);
                        const has = !!row?.content;
                        return (
                          <span
                            key={pl}
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              has
                                ? 'bg-[var(--q-accent-glow)] text-[var(--q-accent-primary)] border-[var(--q-accent-primary)]/40'
                                : 'bg-muted text-muted-foreground border-[var(--q-border-subtle)]'
                            }`}
                            title={has ? `${pl} generated` : `${pl} not generated`}
                          >
                            {PLATFORM_LABEL[pl]}
                          </span>
                        );
                      })}
                    </div>
                    <div className="text-sm font-medium line-clamp-2">{post.hook}</div>
                    <div className="text-xs text-[var(--q-text-secondary)] line-clamp-1 mt-0.5">
                      {post.content_brief}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() =>
                        generate.mutate({ postId: post.id, platforms: [...AP_PLATFORMS] })
                      }
                      disabled={generate.isPending}
                      className="bg-[var(--q-accent-primary)] text-black hover:bg-[var(--q-accent-primary)]/90 h-8 text-xs"
                    >
                      ✦ Generate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActivePost(post)}
                      className="h-8 text-xs"
                    >
                      {generatedCount > 0 ? 'Edit & approve' : 'Open'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <PostEditorSheet
        post={activePost}
        platforms={activePost ? platformsByPost.get(activePost.id) ?? [] : []}
        onClose={() => setActivePost(null)}
      />
    </div>
  );
}
