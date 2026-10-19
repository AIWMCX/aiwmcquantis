import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export type TrafficRow = {
  channel: string;
  source?: string;
  sessions: number;
  engaged?: number;
  analysis_started: number;
  analysis_completed: number;
  signups: number;
  checkout_started: number;
  checkout_completed: number;
};

export type TrafficReport = {
  days: number;
  generated_at: string;
  totals: {
    sessions_all: number;
    internal_excluded: number;
    external: number;
    utm_tagged: number;
    direct_unknown: number;
    recovered_by_first_touch?: number;
    engaged?: number;
  };
  channels: TrafficRow[];
  sources: TrafficRow[];
};

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '—');

const COLS: Array<{ key: keyof TrafficRow; label: string }> = [
  { key: 'sessions', label: 'Visits' },
  { key: 'engaged', label: 'Engaged' },
  { key: 'analysis_started', label: 'Started' },
  { key: 'analysis_completed', label: 'Completed' },
  { key: 'signups', label: 'Signups' },
  { key: 'checkout_started', label: 'Checkout' },
  { key: 'checkout_completed', label: 'Paid' },
];

function Table({ rows, first }: { rows: TrafficRow[]; first: 'channel' | 'source' }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No external visits in this window.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            {first === 'source' && <th className="py-2 pr-4 font-medium">Channel</th>}
            <th className="py-2 pr-4 font-medium">{first === 'channel' ? 'Channel' : 'Source'}</th>
            {COLS.map((c) => (
              <th key={c.key} className="py-2 pr-4 text-right font-medium">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.channel}|${r.source ?? ''}`} className="border-b last:border-0">
              {first === 'source' && <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{r.channel}</td>}
              <td className="py-2 pr-4 font-medium whitespace-nowrap">{first === 'channel' ? r.channel : r.source}</td>
              {COLS.map((c) => (
                <td key={c.key} className="py-2 pr-4 text-right tabular-nums">{Number(r[c.key] ?? 0).toLocaleString()}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Where external visitors came from, by first touch of each visit. */
export function TrafficSources({ report }: { report: TrafficReport | null }) {
  const t = report?.totals;
  const stats = t
    ? [
        { label: 'External visits', value: t.external.toLocaleString(), note: `${t.internal_excluded.toLocaleString()} internal visits excluded` },
        { label: 'Attributed', value: pct(t.external - t.direct_unknown, t.external), note: `referrer, UTM or click id${t.recovered_by_first_touch ? ` · ${t.recovered_by_first_touch} via first visit` : ''}` },
        { label: 'Direct / unknown', value: t.direct_unknown.toLocaleString(), note: 'typed URL, app, or stripped referrer' },
        { label: 'UTM-tagged', value: t.utm_tagged.toLocaleString(), note: 'visits from tagged links' },
      ]
    : [];

  return (
    <section className="mb-10" aria-labelledby="traffic-sources-heading">
      <header className="mb-4">
        <h2 id="traffic-sources-heading" className="text-xl font-bold">Traffic sources</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Source of each visit; a visit with none of its own uses the visitor's recorded first visit (90 days), never a guess. Internal traffic is excluded: your accounts, founder grants, localhost, previews and QA-tagged links.
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {(report ? stats : Array.from({ length: 4 })).map((s, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s ? (s as { label: string }).label : <Skeleton className="h-4 w-24" />}</CardTitle>
            </CardHeader>
            <CardContent>
              {s ? (
                <>
                  <div className="text-3xl font-bold tabular-nums">{(s as { value: string }).value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{(s as { note: string }).note}</div>
                </>
              ) : (
                <Skeleton className="h-8 w-20" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">By channel</CardTitle></CardHeader>
          <CardContent>{report ? <Table rows={report.channels} first="channel" /> : <Skeleton className="h-40 w-full" />}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">By source</CardTitle></CardHeader>
          <CardContent>{report ? <Table rows={report.sources} first="source" /> : <Skeleton className="h-40 w-full" />}</CardContent>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Engaged = more than one event in the visit. Odd campaign tags on email links with no engagement are usually security scanners, not people.
      </p>
    </section>
  );
}
