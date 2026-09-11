import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AutoposterPost,
  AutoposterPlatformRow,
  useAutoposterArchive,
  useAutoposterPlatforms,
} from '@/hooks/useAutoposter';
import { PostEditorSheet } from './PostEditorSheet';

const STATUS_COLOR: Record<string, string> = {
  archived: 'bg-muted text-muted-foreground',
  posted: 'bg-[var(--q-accent-glow)] text-[var(--q-accent-primary)] border-[var(--q-accent-primary)]/40',
  not_published: 'bg-red-500/20 text-red-400 border-red-500/40',
};

const SOURCE_LABEL: Record<string, string> = {
  content_studio: 'Content Studio',
  external_seed: 'External seed',
  manual: 'Manual',
};

/**
 * Archived posts: the 42-post legacy plan (archived 2026-09-11) and every
 * Content Studio generation seeded as already-posted the same day. Uses
 * useAutoposterArchive() (archived_at is not null) -- the mirror image of
 * PostQueue's useAutoposterPosts() (archived_at is null) -- so archived
 * content stays reviewable and re-openable via the same PostEditorSheet
 * instead of just disappearing.
 */
export function PostArchive() {
  const { data: posts = [], isLoading } = useAutoposterArchive();
  const { data: platforms = [] } = useAutoposterPlatforms();
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
    if (!search) return posts;
    const q = search.toLowerCase();
    return posts.filter((p) => `${p.hook} ${p.content_brief}`.toLowerCase().includes(q));
  }, [posts, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search hook / brief…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm h-9"
        />
        <span className="text-xs text-[var(--q-text-secondary)] ml-auto font-mono">
          {filtered.length} / {posts.length} archived
        </span>
      </div>

      {isLoading ? (
        <div className="min-h-[200px] flex items-center justify-center text-[var(--q-text-secondary)]">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-[var(--q-text-secondary)]">Nothing archived yet.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((post) => (
            <Card key={post.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="shrink-0 text-center w-20">
                  <div className="text-sm font-mono">{format(new Date(post.post_date), 'MMM d')}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge className={`text-[10px] border ${STATUS_COLOR[post.status] ?? STATUS_COLOR.archived}`}>
                      {post.status}
                    </Badge>
                    {post.source && (
                      <Badge variant="outline" className="text-[10px]">
                        {SOURCE_LABEL[post.source] ?? post.source}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm font-medium line-clamp-2">{post.hook}</div>
                  <div className="text-xs text-[var(--q-text-secondary)] line-clamp-1 mt-0.5">{post.content_brief}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setActivePost(post)} className="h-8 text-xs shrink-0">
                  Review
                </Button>
              </div>
            </Card>
          ))}
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
