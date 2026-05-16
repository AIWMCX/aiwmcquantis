import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, getISOWeek } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AutoposterPost, useAutoposterPosts, useAutoposterPlatforms } from '@/hooks/useAutoposter';
import { PostEditorSheet } from './PostEditorSheet';

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-muted-foreground/40',
  pending: 'bg-amber-400',
  scheduled: 'bg-blue-400',
  published: 'bg-[var(--q-accent-primary)]',
  failed: 'bg-red-500',
};

export function PostCalendar() {
  const { data: posts = [] } = useAutoposterPosts();
  const { data: platforms = [] } = useAutoposterPlatforms();
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [active, setActive] = useState<AutoposterPost | null>(null);

  const months = useMemo(() => [anchor, addMonths(anchor, 1), addMonths(anchor, 2)], [anchor]);
  const byDate = useMemo(() => {
    const m = new Map<string, AutoposterPost[]>();
    posts.forEach((p) => {
      const key = p.post_date;
      const arr = m.get(key) ?? [];
      arr.push(p);
      m.set(key, arr);
    });
    return m;
  }, [posts]);

  const activePlatforms = active ? platforms.filter((p) => p.post_id === active.id) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAnchor(addMonths(anchor, -1))}>
            ← Prev
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(addMonths(anchor, 1))}>
            Next →
          </Button>
        </div>
        <div className="flex gap-3 text-[11px] text-[var(--q-text-secondary)]">
          {Object.entries(STATUS_DOT).map(([k, c]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${c}`} />
              {k}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {months.map((m) => {
          const days = eachDayOfInterval({ start: startOfMonth(m), end: endOfMonth(m) });
          const offset = days[0].getDay();
          return (
            <Card key={m.toISOString()} className="p-3">
              <div className="text-sm font-medium mb-3 font-sora">{format(m, 'MMMM yyyy')}</div>
              <div className="grid grid-cols-7 gap-1 text-[10px] text-[var(--q-text-secondary)] mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-center">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: offset }).map((_, i) => (
                  <div key={`o${i}`} />
                ))}
                {days.map((d) => {
                  const key = format(d, 'yyyy-MM-dd');
                  const ps = byDate.get(key) ?? [];
                  const top = ps[0];
                  return (
                    <button
                      key={key}
                      onClick={() => top && setActive(top)}
                      disabled={!top}
                      className={`aspect-square rounded text-[10px] flex flex-col items-center justify-center relative transition ${
                        top
                          ? 'hover:bg-[var(--q-bg-elevated)] cursor-pointer border border-[var(--q-border-subtle)]'
                          : 'opacity-40'
                      }`}
                      title={top?.hook}
                    >
                      <span className="font-mono">{format(d, 'd')}</span>
                      {ps.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {ps.slice(0, 3).map((p) => (
                            <span
                              key={p.id}
                              className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[p.status] ?? STATUS_DOT.draft}`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <PostEditorSheet post={active} platforms={activePlatforms} onClose={() => setActive(null)} />
    </div>
  );
}
