import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AutoposterPost,
  AutoposterPlatformRow,
  AP_PLATFORMS,
  PostStatus,
  useGenerateContent,
  useUpdatePlatformContent,
  useApproveAndSchedule,
  useSetPostStatus,
} from '@/hooks/useAutoposter';
import { PostAssetPanel } from './PostAssetPanel';
import { LinkedInPreview } from './PostAssetPanel';
import { PlatformPublicationControls } from './PlatformPublicationControls';
import { canReschedule } from '@/lib/autoposter-status';

interface Props {
  post: AutoposterPost | null;
  platforms: AutoposterPlatformRow[];
  onClose: () => void;
}

const LABEL: Record<string, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
};

export function PostEditorSheet({ post, platforms, onClose }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const generate = useGenerateContent();
  const update = useUpdatePlatformContent();
  const approve = useApproveAndSchedule();
  const setStatus = useSetPostStatus();

  useEffect(() => {
    const d: Record<string, string> = {};
    platforms.forEach((p) => {
      d[p.platform] = p.content;
    });
    setDrafts(d);
  }, [platforms, post?.id]);

  if (!post) return null;

  const handleSave = async () => {
    const tasks = platforms
      .filter((p) => drafts[p.platform] !== undefined && drafts[p.platform] !== p.content)
      .map((p) => update.mutateAsync({ id: p.id, content: drafts[p.platform] }));
    await Promise.all(tasks);
  };

  const handleApprove = async () => {
    await handleSave();
    // Only rows that cannot already be live, and that have copy. Published or
    // 'unknown' rows are never re-queued (that is how duplicates happen).
    const schedulable = platforms.filter((p) => canReschedule(p.status) && (drafts[p.platform] ?? p.content)?.trim());
    if (schedulable.length === 0) return;
    await approve.mutateAsync({ post, platforms: schedulable });
    onClose();
  };

  return (
    <Sheet open={!!post} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{post.hook}</SheetTitle>
          <SheetDescription className="text-xs">
            {post.post_date} · {post.post_type ?? '—'} · {post.visual_type ?? '—'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-[var(--q-text-secondary)]">Status</span>
            <Badge variant="outline" className="uppercase text-[10px]">{post.status}</Badge>
            {(['draft', 'posted', 'archived', 'not_published'] as PostStatus[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={post.status === s ? 'default' : 'outline'}
                disabled={setStatus.isPending || post.status === s}
                onClick={() => setStatus.mutate({ id: post.id, status: s })}
                className="h-7 text-[11px]"
              >
                Mark {s.replace('_', ' ')}
              </Button>
            ))}
          </div>

          <div className="rounded-md border border-[var(--q-border-subtle)] p-3 bg-[var(--q-bg-elevated)]">
            <div className="text-[10px] uppercase tracking-wider text-[var(--q-text-secondary)] mb-1">Brief</div>
            <div className="text-xs whitespace-pre-wrap">{post.content_brief}</div>
            {post.cta && (
              <div className="mt-2 text-xs">
                <span className="text-[var(--q-text-secondary)]">CTA: </span>
                {post.cta}
              </div>
            )}
            {post.hashtags && post.hashtags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {post.hashtags.map((h) => (
                  <Badge key={h} variant="outline" className="text-[10px]">#{h.replace(/^#/, '')}</Badge>
                ))}
              </div>
            )}
          </div>

          <PostAssetPanel post={post} />

          <LinkedInPreview post={post} caption={drafts.linkedin ?? ''} />

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                const existing = platforms.filter((p) => p.content?.trim()).length;
                // Existing drafts may be hand-edited: replacing them must be an explicit choice.
                const overwrite = existing > 0 && window.confirm(
                  `${existing} platform(s) already have a draft.

OK = replace them with new versions
Cancel = keep them and only generate the missing ones`,
                );
                generate.mutate({ postId: post.id, platforms: [...AP_PLATFORMS], overwrite });
              }}
              disabled={generate.isPending}
              className="bg-[var(--q-accent-primary)] text-black hover:bg-[var(--q-accent-primary)]/90"
            >
              {generate.isPending ? 'Generating…' : '✦ Generate all 3'}
            </Button>
          </div>

          {AP_PLATFORMS.map((pl) => {
            const row = platforms.find((p) => p.platform === pl);
            return (
              <div key={pl} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{LABEL[pl]}</div>
                  <div className="text-[10px] font-mono text-[var(--q-text-secondary)]">
                    best time {row?.best_time_mt?.slice(0, 5) ?? '—'} MT
                  </div>
                </div>
                <Textarea
                  value={drafts[pl] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [pl]: e.target.value }))}
                  placeholder={row ? 'Empty' : 'Not generated yet — click "Generate all 3"'}
                  disabled={!row}
                  className="min-h-[140px] font-mono text-xs"
                />
                {row && <PlatformPublicationControls row={row} postDate={post.post_date} />}
              </div>
            );
          })}

          <div className="flex gap-2 sticky bottom-0 bg-background pt-4 border-t border-[var(--q-border-subtle)]">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            <Button variant="outline" onClick={handleSave} disabled={update.isPending} className="flex-1">
              Save drafts
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approve.isPending || platforms.length === 0}
              className="flex-1 bg-[var(--q-accent-primary)] text-black hover:bg-[var(--q-accent-primary)]/90"
            >
              Approve & schedule
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
