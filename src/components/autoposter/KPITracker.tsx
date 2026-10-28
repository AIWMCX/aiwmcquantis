import { useState } from 'react';
import { format } from 'date-fns';
import { calendarDate } from '@/lib/autoposter-status';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useAutoposterWeekly, useAddWeeklySnapshot } from '@/hooks/useAutoposter';

const METRICS: Array<{ key: keyof MetricFields; label: string; format?: (n: number) => string }> = [
  { key: 'linkedin_impressions', label: 'LinkedIn Impressions' },
  { key: 'fb_ig_reach', label: 'FB/IG Reach' },
  { key: 'website_visitors', label: 'Website Visitors' },
  { key: 'signups', label: 'Signups' },
  { key: 'paid_conversions', label: 'Paid Conversions' },
  { key: 'mrr_usd', label: 'MRR (USD)', format: (n) => `$${n.toLocaleString('en-US')}` },
];

type MetricFields = {
  linkedin_impressions: number;
  fb_ig_reach: number;
  website_visitors: number;
  signups: number;
  paid_conversions: number;
  mrr_usd: number;
};

function delta(curr: number | null, prev: number | null): { v: number; pct: string } | null {
  if (curr == null || prev == null || prev === 0) return null;
  const diff = curr - prev;
  return { v: diff, pct: `${diff >= 0 ? '+' : ''}${((diff / prev) * 100).toFixed(1)}%` };
}

export function KPITracker() {
  const { data: weekly = [], isLoading } = useAutoposterWeekly();
  const add = useAddWeeklySnapshot();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    week_number: '',
    period_start: '',
    period_end: '',
    linkedin_impressions: '',
    li_engagement_pct: '',
    fb_ig_reach: '',
    fb_ig_engagements: '',
    reddit_upvotes: '',
    website_visitors: '',
    social_traffic_pct: '',
    app_visits: '',
    signups: '',
    paid_conversions: '',
    mrr_usd: '',
    notes: '',
  });

  const last = weekly[weekly.length - 1];
  const prev = weekly[weekly.length - 2];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      week_number: form.week_number ? parseInt(form.week_number) : null,
      period_start: form.period_start,
      period_end: form.period_end,
      notes: form.notes || null,
    };
    [
      'linkedin_impressions',
      'li_engagement_pct',
      'fb_ig_reach',
      'fb_ig_engagements',
      'reddit_upvotes',
      'website_visitors',
      'social_traffic_pct',
      'app_visits',
      'signups',
      'paid_conversions',
      'mrr_usd',
    ].forEach((k) => {
      const v = (form as Record<string, string>)[k];
      payload[k] = v === '' ? 0 : Number(v);
    });
    await add.mutateAsync(payload as Parameters<typeof add.mutateAsync>[0]);
    setShowForm(false);
    setForm({ ...form, notes: '' });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {METRICS.map((m) => {
          const curr = (last?.[m.key] as number | null) ?? null;
          const previous = (prev?.[m.key] as number | null) ?? null;
          const d = delta(curr, previous);
          return (
            <Card key={m.key} className="p-3">
              <div className="text-[10px] uppercase tracking-wide text-[var(--q-text-secondary)] font-mono">
                {m.label}
              </div>
              <div className="text-xl font-bold mt-1 font-sora">
                {curr == null ? '—' : m.format ? m.format(curr) : curr.toLocaleString('en-US')}
              </div>
              {d && (
                <div className={`text-[11px] font-mono mt-0.5 ${d.v >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {d.pct} WoW
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {METRICS.map((m) => (
          <Card key={m.key} className="p-4">
            <div className="text-xs font-medium mb-2">{m.label} · last 12 weeks</div>
            <div className="h-40">
              {weekly.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[var(--q-text-secondary)]">
                  No data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weekly}>
                    <XAxis
                      dataKey="period_start"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => format(calendarDate(String(v)), 'MMM d')}
                    />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, background: 'var(--q-bg-elevated)', border: '1px solid var(--q-border-subtle)' }}
                      labelFormatter={(v) => format(calendarDate(v as string), 'MMM d, yyyy')}
                    />
                    <Line
                      type="monotone"
                      dataKey={m.key}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium">Add weekly snapshot</div>
          <Button size="sm" variant="outline" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ New snapshot'}
          </Button>
        </div>
        {showForm && (
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-[10px]">Week #</Label>
              <Input type="number" value={form.week_number} onChange={(e) => setForm({ ...form, week_number: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px]">Period start</Label>
              <Input type="date" required value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px]">Period end</Label>
              <Input type="date" required value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
            </div>
            <div />
            {[
              ['linkedin_impressions', 'LI impressions'],
              ['li_engagement_pct', 'LI engagement %'],
              ['fb_ig_reach', 'FB/IG reach'],
              ['fb_ig_engagements', 'FB/IG engagements'],
              ['reddit_upvotes', 'Reddit upvotes'],
              ['website_visitors', 'Website visitors'],
              ['social_traffic_pct', 'Social traffic %'],
              ['app_visits', 'App visits'],
              ['signups', 'Signups'],
              ['paid_conversions', 'Paid conversions'],
              ['mrr_usd', 'MRR (USD)'],
            ].map(([k, label]) => (
              <div key={k}>
                <Label className="text-[10px]">{label}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(form as Record<string, string>)[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              </div>
            ))}
            <div className="col-span-2 md:col-span-4">
              <Label className="text-[10px]">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="col-span-2 md:col-span-4">
              <Button type="submit" disabled={add.isPending} className="bg-[var(--q-accent-primary)] text-black hover:bg-[var(--q-accent-primary)]/90">
                {add.isPending ? 'Saving…' : 'Save snapshot'}
              </Button>
            </div>
          </form>
        )}
        {isLoading && <div className="text-xs text-[var(--q-text-secondary)]">Loading…</div>}
      </Card>
    </div>
  );
}
