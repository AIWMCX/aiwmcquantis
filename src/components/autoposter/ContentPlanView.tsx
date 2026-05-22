// Fast, DB-free viewer of the canonical content plan.
// Renders QUANTIS_CONTENT_PLAN instantly + supports one-click seed/refresh.
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  QUANTIS_CONTENT_PLAN,
  CONTENT_PLAN_VERSION,
  CONTENT_PLAN_WINDOW,
  CONTENT_PLAN_STATS,
  PLATFORM_TIMING_BIBLE,
  type ContentPlanEntry,
} from '@/data/autoposterContentPlan';
import { useSeedContentPlan } from '@/hooks/useAutoposter';

const PLATFORM_BADGE: Record<string, string> = {
  linkedin: 'bg-[#0a66c2]/15 text-[#4a9eff] border-[#0a66c2]/40',
  facebook: 'bg-[#1877f2]/15 text-[#6aa7f5] border-[#1877f2]/40',
  instagram: 'bg-[#e4405f]/15 text-[#ef6b85] border-[#e4405f]/40',
  threads: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40',
  reddit: 'bg-[#ff4500]/15 text-[#ff7a3d] border-[#ff4500]/40',
  twitter: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
};

export function ContentPlanView() {
  const seed = useSeedContentPlan();
  const [q, setQ] = useState('');
  const [week, setWeek] = useState<number | 'all'>('all');

  const weeks = useMemo(
    () => Array.from(new Set(QUANTIS_CONTENT_PLAN.map((p) => p.week_number))).sort((a, b) => a - b),
    [],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return QUANTIS_CONTENT_PLAN.filter((p) => {
      if (week !== 'all' && p.week_number !== week) return false;
      if (!term) return true;
      return `${p.hook} ${p.content_brief} ${p.post_type} ${p.platforms.join(' ')}`
        .toLowerCase()
        .includes(term);
    });
  }, [q, week]);

  const grouped = useMemo(() => {
    const m = new Map<number, ContentPlanEntry[]>();
    filtered.forEach((p) => {
      const arr = m.get(p.week_number) ?? [];
      arr.push(p);
      m.set(p.week_number, arr);
    });
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <Card className="p-4 flex flex-wrap items-center gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--q-text-secondary)] font-mono">
            Plan version
          </div>
          <div className="text-sm font-mono font-medium">{CONTENT_PLAN_VERSION}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--q-text-secondary)] font-mono">
            Window
          </div>
          <div className="text-sm font-mono">
            {CONTENT_PLAN_WINDOW.start} → {CONTENT_PLAN_WINDOW.end}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--q-text-secondary)] font-mono">
            Posts × weeks
          </div>
          <div className="text-sm font-mono">
            {CONTENT_PLAN_STATS.total_posts} × {CONTENT_PLAN_STATS.weeks}
          </div>
        </div>
        <div className="flex-1" />
        <Button
          onClick={() => seed.mutate()}
          disabled={seed.isPending}
          className="bg-[var(--q-accent-primary)] text-black hover:bg-[var(--q-accent-primary)]/90"
        >
          {seed.isPending ? 'Syncing…' : '↻ Seed / refresh to queue'}
        </Button>
      </Card>

      {/* Timing bible */}
      <Card className="p-4">
        <div className="text-sm font-medium mb-3 font-sora">Hashtag & timing bible</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
          {PLATFORM_TIMING_BIBLE.map((b) => (
            <div
              key={b.platform}
              className="rounded border border-[var(--q-border-subtle)] p-2 space-y-1"
            >
              <div className="font-mono text-[10px] uppercase text-[var(--q-text-secondary)]">
                {b.platform}
              </div>
              <div className="font-mono">{b.best_time_mt}</div>
              <div className="text-[var(--q-text-secondary)]">{b.best_days}</div>
              <div className="text-[var(--q-text-secondary)]">{b.frequency}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search hook / brief / type / platform…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm h-9"
        />
        <div className="flex gap-1 rounded-md border border-[var(--q-border-subtle)] p-1 flex-wrap">
          <button
            onClick={() => setWeek('all')}
            className={`px-2.5 py-1 text-xs rounded font-mono ${
              week === 'all'
                ? 'bg-[var(--q-accent-glow)] text-[var(--q-accent-primary)]'
                : 'text-[var(--q-text-secondary)]'
            }`}
          >
            ALL
          </button>
          {weeks.map((w) => (
            <button
              key={w}
              onClick={() => setWeek(w)}
              className={`px-2.5 py-1 text-xs rounded font-mono ${
                week === w
                  ? 'bg-[var(--q-accent-glow)] text-[var(--q-accent-primary)]'
                  : 'text-[var(--q-text-secondary)]'
              }`}
            >
              W{w}
            </button>
          ))}
        </div>
        <span className="text-xs text-[var(--q-text-secondary)] ml-auto font-mono">
          {filtered.length} / {QUANTIS_CONTENT_PLAN.length} posts
        </span>
      </div>

      {/* Plan grouped by week */}
      <div className="space-y-4">
        {grouped.map(([w, items]) => (
          <Card key={w} className="p-4">
            <div className="text-sm font-medium mb-3 font-sora flex items-center gap-2">
              <span className="font-mono">WEEK {w}</span>
              <span className="text-[var(--q-text-secondary)] text-xs font-normal">
                ({items[0].post_date} → {items[items.length - 1].post_date})
              </span>
            </div>
            <div className="space-y-2">
              {items.map((p) => (
                <div
                  key={`${p.week_number}-${p.day_number}`}
                  className="grid grid-cols-[80px_1fr_auto] gap-3 items-start py-2 border-t border-[var(--q-border-subtle)] first:border-t-0"
                >
                  <div className="text-[10px] font-mono text-[var(--q-text-secondary)] pt-1">
                    <div>D{p.day_number}</div>
                    <div>{p.post_date.slice(5)}</div>
                    <div className="mt-1">{p.best_time_mt}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1 mb-1">
                      <Badge variant="outline" className="text-[10px]">
                        {p.post_type}
                      </Badge>
                      {p.platforms.map((pl) => (
                        <span
                          key={pl}
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            PLATFORM_BADGE[pl] ?? 'bg-muted'
                          }`}
                        >
                          {pl}
                        </span>
                      ))}
                    </div>
                    <div className="text-sm font-medium">{p.hook}</div>
                    <div className="text-xs text-[var(--q-text-secondary)] mt-0.5 line-clamp-2">
                      {p.content_brief}
                    </div>
                    {p.hashtags.length > 0 && (
                      <div className="text-[10px] text-[var(--q-text-secondary)] mt-1 font-mono truncate">
                        {p.hashtags.join(' ')}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-[10px] text-[var(--q-text-secondary)] font-mono whitespace-nowrap">
                    <div>reach</div>
                    <div className="text-[var(--q-text-primary)]">{p.expected_reach}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
