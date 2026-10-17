import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AutoposterPlatformRow,
  useCancelPlatform,
  useMarkNotLive,
  useRecordPublishedUrl,
  useReschedulePlatform,
} from '@/hooks/useAutoposter';
import {
  canCancel,
  canRecordUrl,
  canReschedule,
  normalizeStatus,
  publishedUrlFor,
  statusView,
  toDenverParts,
  validatePublishedUrl,
} from '@/lib/autoposter-status';

const TONE_CLASS: Record<string, string> = {
  neutral: '',
  info: 'border-sky-500/50 text-sky-400',
  success: 'border-emerald-500/50 text-emerald-400',
  warning: 'border-amber-500/60 text-amber-400',
  danger: 'border-red-500/60 text-red-400',
};

interface Props {
  row: AutoposterPlatformRow;
  /** Fallback for the reschedule form when the row has no scheduled_at yet. */
  postDate: string;
}

/**
 * Status, schedule and publication record for one platform row:
 * status badge with what to do next · cancel · reschedule (Denver time) ·
 * record the live URL · reconcile an 'unknown' publish. Nothing here
 * publishes or retries anything.
 */
export function PlatformPublicationControls({ row, postDate }: Props) {
  const status = normalizeStatus(row.status);
  const view = statusView(status);
  const liveUrl = publishedUrlFor(row);

  const initial = row.scheduled_at
    ? toDenverParts(row.scheduled_at)
    : { date: postDate, time: (row.best_time_mt ?? '09:00').slice(0, 5) };
  const [mode, setMode] = useState<'idle' | 'reschedule' | 'url'>('idle');
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [url, setUrl] = useState('');
  const urlError = url ? validatePublishedUrl(row.platform, url) : null;

  const cancel = useCancelPlatform();
  const reschedule = useReschedulePlatform();
  const record = useRecordPublishedUrl();
  const notLive = useMarkNotLive();

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={`text-[10px] uppercase ${TONE_CLASS[view.tone]}`}>{view.label}</Badge>
        {row.scheduled_at && status === 'scheduled' && (
          <span className="font-mono text-[var(--q-text-secondary)]">
            {initial.date} {initial.time} Denver
          </span>
        )}
        {liveUrl && (
          <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="underline text-[var(--q-accent-primary)]">
            View live post
          </a>
        )}
      </div>

      {view.hint && <p className="text-[var(--q-text-secondary)]">{view.hint}</p>}
      {row.error_message && status !== 'published' && (
        <p className="text-[var(--q-text-secondary)] break-words">Last message: {row.error_message}</p>
      )}

      {status === 'unknown' ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setMode('url')}>
            It&apos;s live — record URL
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px]"
            disabled={notLive.isPending}
            onClick={() => {
              if (window.confirm('You checked the platform and this post is NOT there? It goes back to draft; nothing is retried.')) {
                notLive.mutate({ row });
              }
            }}
          >
            Not live — back to draft
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {canCancel(status) && (
            <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={cancel.isPending} onClick={() => cancel.mutate({ row })}>
              Cancel
            </Button>
          )}
          {canReschedule(status) && (
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setMode(mode === 'reschedule' ? 'idle' : 'reschedule')}>
              {status === 'scheduled' ? 'Reschedule' : 'Schedule'}
            </Button>
          )}
          {canRecordUrl(status) && !liveUrl && (
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setMode(mode === 'url' ? 'idle' : 'url')}>
              Record published URL
            </Button>
          )}
        </div>
      )}

      {mode === 'reschedule' && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            reschedule.mutate({ row, date, time }, { onSuccess: () => setMode('idle') });
          }}
        >
          <label htmlFor={`d-${row.id}`} className="space-y-1">
            <span className="block text-[10px] uppercase tracking-wider text-[var(--q-text-secondary)]">Date</span>
            <Input id={`d-${row.id}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 w-40 text-xs" required />
          </label>
          <label htmlFor={`t-${row.id}`} className="space-y-1">
            <span className="block text-[10px] uppercase tracking-wider text-[var(--q-text-secondary)]">Time (Denver)</span>
            <Input id={`t-${row.id}`} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-8 w-28 text-xs" required />
          </label>
          <Button type="submit" size="sm" className="h-8 text-[11px]" disabled={reschedule.isPending}>
            Save schedule
          </Button>
        </form>
      )}

      {mode === 'url' && (
        <form
          className="space-y-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (!url || urlError) return;
            record.mutate({ row, url }, { onSuccess: () => { setMode('idle'); setUrl(''); } });
          }}
        >
          <div className="flex gap-2">
            <Input
              type="url"
              inputMode="url"
              placeholder={`https://www.${row.platform}.com/…`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-8 text-xs"
              aria-invalid={!!urlError}
            />
            <Button type="submit" size="sm" className="h-8 text-[11px]" disabled={!url || !!urlError || record.isPending}>
              Save
            </Button>
          </div>
          {urlError && <p className="text-red-400">{urlError}</p>}
        </form>
      )}
    </div>
  );
}
