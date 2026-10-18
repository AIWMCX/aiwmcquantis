import { useEffect, useRef, useState } from 'react';
import { Copy, Download, ImagePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AutoposterPost,
  POST_ASSET_TYPES,
  usePostAssetUrl,
  useRemovePostAsset,
  useUpdatePostAssetAlt,
  useUploadPostAsset,
} from '@/hooks/useAutoposter';

/** LinkedIn's feed truncates long posts; roughly the first ~210 characters show before "…see more". */
const LINKEDIN_FOLD = 210;

async function copyText(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error(`Could not copy ${what.toLowerCase()} — select it and copy manually`);
  }
}

function fileNameFor(post: AutoposterPost) {
  const slug = post.hook.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'post';
  const ext = post.asset_path?.split('.').pop() ?? 'png';
  return `${post.post_date}-${slug}.${ext}`;
}

async function downloadAsset(url: string, name: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  } catch {
    toast.error('Download failed — try again');
  }
}

/** Image attachment for one post: upload/replace, alt text, download, remove. */
export function PostAssetPanel({ post }: { post: AutoposterPost }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState(post.asset_alt ?? '');
  const url = usePostAssetUrl(post.asset_path);
  const upload = useUploadPostAsset();
  const saveAlt = useUpdatePostAssetAlt();
  const remove = useRemovePostAsset();

  useEffect(() => setAlt(post.asset_alt ?? ''), [post.id, post.asset_alt]);

  const pick = () => inputRef.current?.click();

  return (
    <section aria-labelledby={`asset-${post.id}`} className="rounded-md border border-[var(--q-border-subtle)] p-3 bg-[var(--q-bg-elevated)] space-y-3">
      <div className="flex items-center justify-between">
        <h3 id={`asset-${post.id}`} className="text-[10px] uppercase tracking-wider text-[var(--q-text-secondary)]">Image</h3>
        {!post.asset_path && <span className="text-[10px] font-medium text-amber-500">No image yet</span>}
      </div>

      {post.asset_path ? (
        <div className="overflow-hidden rounded border border-[var(--q-border-subtle)] bg-black/20">
          {url.data ? (
            <img src={url.data} alt={post.asset_alt ?? ''} className="block w-full max-h-[360px] object-contain" />
          ) : (
            <div className="h-40 animate-pulse" aria-label="Loading image" />
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          className="flex w-full flex-col items-center justify-center gap-2 rounded border border-dashed border-[var(--q-border-subtle)] py-8 text-xs text-[var(--q-text-secondary)] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--q-accent-primary)]"
        >
          <ImagePlus className="h-5 w-5" aria-hidden="true" />
          Upload a PNG, JPEG or WebP (max 10 MB) — 1080×1350 works best for LinkedIn
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={POST_ASSET_TYPES.join(',')}
        className="sr-only"
        aria-label="Choose an image for this post"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) upload.mutate({ post, file, alt });
        }}
      />

      <label className="block space-y-1">
        <span className="text-[11px] text-[var(--q-text-secondary)]">Alt text (describe the image for screen readers)</span>
        <div className="flex gap-2">
          <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="e.g. Timeline: payroll starts before the revenue ramp" className="h-8 text-xs" />
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-[11px]"
            disabled={saveAlt.isPending || alt === (post.asset_alt ?? '')}
            onClick={() => saveAlt.mutate({ id: post.id, alt })}
          >
            Save
          </Button>
        </div>
      </label>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={pick} disabled={upload.isPending}>
          <ImagePlus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          {upload.isPending ? 'Uploading…' : post.asset_path ? 'Replace image' : 'Upload image'}
        </Button>
        {post.asset_path && url.data && (
          <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => downloadAsset(url.data as string, fileNameFor(post))}>
            <Download className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Download image
          </Button>
        )}
        {post.asset_path && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-[11px] text-red-400"
            disabled={remove.isPending}
            onClick={() => remove.mutate(post)}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Remove
          </Button>
        )}
      </div>
    </section>
  );
}

/** Phone-width LinkedIn feed preview: caption with the "…see more" fold, then the image. */
export function LinkedInPreview({ post, caption }: { post: AutoposterPost; caption: string }) {
  const [expanded, setExpanded] = useState(false);
  const url = usePostAssetUrl(post.asset_path);
  const folded = caption.length > LINKEDIN_FOLD && !expanded;
  const shown = folded ? caption.slice(0, LINKEDIN_FOLD).trimEnd() : caption;

  return (
    <section aria-label="LinkedIn preview" className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] uppercase tracking-wider text-[var(--q-text-secondary)]">LinkedIn preview (phone width)</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={!caption} onClick={() => copyText(caption, 'Caption')}>
            <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Copy caption
          </Button>
          {post.asset_alt && (
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => copyText(post.asset_alt as string, 'Alt text')}>
              Copy alt text
            </Button>
          )}
        </div>
      </div>
      <div className="mx-auto w-full max-w-[375px] rounded-lg border border-black/10 bg-white text-[#191919] shadow-sm">
        <div className="flex items-center gap-2 px-3 pt-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b1430] text-[10px] font-bold text-white" aria-hidden="true">AQ</div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold">AIWMC Quantis</div>
            <div className="text-[11px] text-black/60">{post.post_date} · LinkedIn</div>
          </div>
        </div>
        <div className="whitespace-pre-wrap px-3 py-2 text-[13px] leading-[1.45]">
          {caption ? shown : <span className="text-black/40">No LinkedIn caption yet.</span>}
          {folded && (
            <button type="button" onClick={() => setExpanded(true)} className="ml-1 text-black/60 hover:underline">
              …see more
            </button>
          )}
        </div>
        {post.asset_path && url.data ? (
          <img src={url.data} alt={post.asset_alt ?? ''} className="block w-full" />
        ) : (
          <div className="mx-3 mb-3 rounded bg-black/5 py-10 text-center text-[11px] text-black/50">No image attached</div>
        )}
      </div>
      {caption.length > 3000 && (
        <p role="alert" className="text-[11px] text-red-400">LinkedIn posts are limited to 3,000 characters ({caption.length} now).</p>
      )}
    </section>
  );
}
