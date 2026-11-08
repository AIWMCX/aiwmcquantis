import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import {
  addDaysIso,
  aggregateMonthly,
  buildDailyRows,
  monthRanges,
  type GrowthRow,
  type GrowthSourceKey,
  type GrowthSummary,
} from '@/lib/growth-summary';

/**
 * /admin/growth: GA4 (property 520326058), Search Console
 * (sc-domain:aiwmcquantis.com), optional Microsoft Clarity and our own
 * first-party funnel side by side. External data is copied daily by the
 * growth-sync edge function into ext_metrics_daily; this page only reads it
 * through admin-only RPCs.
 */

const MONTHLY_FROM = '2026-01-01';
const GSC_HISTORY_MONTHS = 16;
const SOURCES: Array<{ key: GrowthSourceKey; label: string }> = [
  { key: 'ga4', label: 'Google Analytics 4' },
  { key: 'gsc', label: 'Search Console' },
  { key: 'clarity', label: 'Microsoft Clarity' },
];
const RANGES: Array<{ days: number | null; label: string }> = [
  { days: 7, label: '7 days' },
  { days: 28, label: '28 days' },
  { days: 90, label: '90 days' },
  { days: null, label: 'All' },
];

type SyncRun = {
  source: GrowthSourceKey;
  mode: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  rows_upserted: number;
  error: string | null;
};

type BreakdownRow = {
  dims: Record<string, string>;
  days: number;
  clicks?: number;
  impressions?: number;
  ctr?: number | null;
  position?: number | null;
  users?: number;
  sessions?: number;
  engaged_sessions?: number;
  views?: number;
  key_events?: number;
};

const BREAKDOWNS = [
  { report: 'ga4_channel', dim: 'sessionDefaultChannelGroup', title: 'GA4 channels' },
  { report: 'ga4_landing_page', dim: 'landingPagePlusQueryString', title: 'GA4 top landing pages' },
  { report: 'ga4_source_medium', dim: 'sessionSourceMedium', title: 'GA4 source / medium' },
  { report: 'gsc_query', dim: 'query', title: 'Search Console top queries' },
  { report: 'gsc_page', dim: 'page', title: 'Search Console top pages' },
  { report: 'ga4_country', dim: 'country', title: 'GA4 countries' },
  { report: 'gsc_country', dim: 'country', title: 'Search Console countries' },
  { report: 'ga4_device', dim: 'deviceCategory', title: 'GA4 devices' },
  { report: 'gsc_device', dim: 'device', title: 'Search Console devices' },
] as const;

const fmt = (v: number | null | undefined) => (v == null ? '—' : Math.round(v).toLocaleString('en-US'));
const fmtPct = (v: number | null | undefined) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);
const fmtPos = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1));
const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-US', { timeZone: 'America/Denver', dateStyle: 'medium', timeStyle: 'short' }) + ' MT' : '—';

function StatusPill({ status }: { status: string | undefined }) {
  const tone = status === 'ok'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
    : status === 'partial' || status === 'running'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
      : status === 'error'
        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
        : 'bg-muted text-muted-foreground';
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${tone}`}>{(status ?? 'never run').replace('_', ' ')}</span>;
}

function MetricsTable({ rows, clarityConfigured, partialKey }: { rows: GrowthRow[]; clarityConfigured: boolean; partialKey?: string }) {
  const th = 'px-2 py-1 text-right font-medium';
  const td = 'px-2 py-1 text-right tabular-nums';
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-2 py-1 text-left font-medium" rowSpan={2}>Period</th>
            <th className={`${th} border-l`} colSpan={2}>Supabase (first-party)</th>
            <th className={`${th} border-l`} colSpan={5}>GA4</th>
            <th className={`${th} border-l`} colSpan={4}>Search Console</th>
            <th className={`${th} border-l`}>Clarity</th>
          </tr>
          <tr className="border-b text-xs text-muted-foreground">
            <th className={`${th} border-l`}>Sessions</th>
            <th className={th}>2+ actions</th>
            <th className={`${th} border-l`}>Users</th>
            <th className={th}>Sessions</th>
            <th className={th}>Engaged</th>
            <th className={th}>Views</th>
            <th className={th}>Key events</th>
            <th className={`${th} border-l`}>Clicks</th>
            <th className={th}>Impr.</th>
            <th className={th}>CTR</th>
            <th className={th}>Avg pos.</th>
            <th className={`${th} border-l`}>Sessions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b last:border-0">
              <td className="px-2 py-1 whitespace-nowrap">
                {r.key}
                {r.key === partialKey && <span className="ml-1 text-xs text-muted-foreground">(partial)</span>}
              </td>
              <td className={`${td} border-l`}>{fmt(r.fp_sessions)}</td>
              <td className={td}>{fmt(r.fp_engaged)}</td>
              <td className={`${td} border-l`}>{fmt(r.ga4?.users)}</td>
              <td className={td}>{fmt(r.ga4?.sessions)}</td>
              <td className={td}>{fmt(r.ga4?.engaged)}</td>
              <td className={td}>{fmt(r.ga4?.views)}</td>
              <td className={td}>{fmt(r.ga4?.key_events)}</td>
              <td className={`${td} border-l`}>{fmt(r.gsc?.clicks)}</td>
              <td className={td}>{fmt(r.gsc?.impressions)}</td>
              <td className={td}>{fmtPct(r.gsc?.ctr)}</td>
              <td className={td}>{fmtPos(r.gsc?.position)}</td>
              <td className={`${td} border-l text-muted-foreground`}>
                {clarityConfigured ? fmt(r.clarity?.sessions) : 'not configured'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BreakdownTable({ title, dim, report, rows }: { title: string; dim: string; report: string; rows: BreakdownRow[] | undefined }) {
  const gsc = report.startsWith('gsc_');
  const td = 'px-2 py-1 text-right tabular-nums';
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {rows === undefined ? <Skeleton className="h-24 w-full" /> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rows in this range yet.</p>
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-1 text-left font-medium">{dim}</th>
                  {gsc ? (
                    <>
                      <th className="px-2 py-1 text-right font-medium">Clicks</th>
                      <th className="px-2 py-1 text-right font-medium">Impr.</th>
                      <th className="px-2 py-1 text-right font-medium">CTR</th>
                      <th className="px-2 py-1 text-right font-medium">Pos.</th>
                    </>
                  ) : (
                    <>
                      <th className="px-2 py-1 text-right font-medium">Sessions</th>
                      <th className="px-2 py-1 text-right font-medium">Engaged</th>
                      <th className="px-2 py-1 text-right font-medium">Views</th>
                      <th className="px-2 py-1 text-right font-medium">Key ev.</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${i}-${r.dims[dim] ?? ''}`} className="border-b last:border-0">
                    <td className="px-2 py-1 max-w-[18rem] truncate" title={r.dims[dim]}>{r.dims[dim] || '(not set)'}</td>
                    {gsc ? (
                      <>
                        <td className={td}>{fmt(r.clicks)}</td>
                        <td className={td}>{fmt(r.impressions)}</td>
                        <td className={td}>{fmtPct(r.ctr)}</td>
                        <td className={td}>{fmtPos(r.position)}</td>
                      </>
                    ) : (
                      <>
                        <td className={td}>{fmt(r.sessions)}</td>
                        <td className={td}>{fmt(r.engaged_sessions)}</td>
                        <td className={td}>{fmt(r.views)}</td>
                        <td className={td}>{fmt(r.key_events)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminGrowth() {
  const [summary, setSummary] = useState<GrowthSummary | null>(null);
  const [runs, setRuns] = useState<SyncRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<number | null>(28);
  const [breakdowns, setBreakdowns] = useState<Record<string, BreakdownRow[] | undefined>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [sumRes, runRes] = await Promise.all([
        supabase.rpc('admin_growth_summary' as never, { p_from: MONTHLY_FROM } as never),
        supabase.from('ext_sync_runs' as never)
          .select('source,mode,status,started_at,finished_at,rows_upserted,error')
          .order('started_at', { ascending: false })
          .limit(60),
      ]);
      if (cancelled) return;
      if (sumRes.error) {
        logger.error('admin_growth_summary failed', sumRes.error);
        setError(sumRes.error.message);
      } else {
        setError(null);
        setSummary(sumRes.data as unknown as GrowthSummary);
      }
      if (runRes.error) logger.error('ext_sync_runs read failed', runRes.error);
      setRuns(((runRes.data ?? []) as unknown) as SyncRun[]);
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    setBreakdowns({});
    (async () => {
      const results = await Promise.all(BREAKDOWNS.map(async (b) => {
        const { data, error } = await supabase.rpc('admin_growth_breakdown' as never, {
          p_report: b.report, p_days: rangeDays, p_limit: 50,
        } as never);
        if (error) logger.error(`admin_growth_breakdown ${b.report} failed`, error);
        return [b.report, ((data as unknown as { rows?: BreakdownRow[] } | null)?.rows ?? [])] as const;
      }));
      if (!cancelled) setBreakdowns(Object.fromEntries(results));
    })();
    return () => { cancelled = true; };
  }, [rangeDays, reloadKey]);

  const latest = useMemo(() => {
    const m = new Map<GrowthSourceKey, SyncRun>();
    // 'skipped' rows (a backfill month outside a source's range, Clarity in backfill) are noise here.
    for (const r of runs ?? []) if (r.status !== 'skipped' && !m.has(r.source)) m.set(r.source, r);
    return m;
  }, [runs]);
  const lastSuccess = useMemo(() => {
    const m = new Map<GrowthSourceKey, SyncRun>();
    for (const r of runs ?? []) if (r.status === 'ok' && !m.has(r.source)) m.set(r.source, r);
    return m;
  }, [runs]);

  const today = summary?.denver_today ?? null;
  const yesterday = today ? addDaysIso(today, -1) : null;
  const daily = useMemo(() => (summary && today ? buildDailyRows(summary, addDaysIso(today, -30), today) : []), [summary, today]);
  const monthly = useMemo(() => (summary && today ? aggregateMonthly(buildDailyRows(summary, MONTHLY_FROM, today)) : []), [summary, today]);
  const chartData = useMemo(() => [...daily].reverse().filter((r) => r.key !== today).map((r) => ({
    day: r.key.slice(5),
    supabase: r.fp_sessions,
    ga4: r.ga4?.sessions ?? null,
    gsc: r.gsc?.clicks ?? null,
  })), [daily, today]);

  const lastClarityDaily = (runs ?? []).find((r) => r.source === 'clarity' && r.mode === 'daily');
  const clarityConfigured = (summary?.ext ?? []).some((r) => r.source === 'clarity')
    || (!!lastClarityDaily && lastClarityDaily.status !== 'not_configured');

  const invoke = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('growth-sync', { body });
    if (error) throw new Error(error.message);
    return data as { success?: boolean; error?: string; results?: Record<string, { status: string; error?: string; next_from?: string }> };
  }, []);

  const runDaily = async () => {
    setBusy('Running daily sync…');
    try {
      const res = await invoke({ mode: 'daily' });
      if (res?.error) setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      setReloadKey((k) => k + 1);
    }
  };

  const runBackfill = async () => {
    if (!today) return;
    const [y, m] = today.split('-').map(Number);
    const gscStart = new Date(Date.UTC(y, m - 1 - GSC_HISTORY_MONTHS, 1)).toISOString().slice(0, 10);
    const months = monthRanges(gscStart, today);
    const ok = window.confirm(
      `Backfill ${months.length} months (${gscStart} to ${today}) from GA4 and Search Console?\n\n` +
      'Read-only on Google. Runs one month per call, so it takes a few minutes. Existing days are overwritten with fresh numbers.',
    );
    if (!ok) return;
    const failures: string[] = [];
    try {
      for (let i = 0; i < months.length; i++) {
        let from: string | undefined = months[i].from;
        // A month that hits the function's time budget returns next_from; continue from there.
        for (let guard = 0; from && guard < 5; guard++) {
          setBusy(`Backfilling ${months[i].from.slice(0, 7)} (${i + 1}/${months.length})…`);
          const res = await invoke({ mode: 'backfill', from, to: months[i].to });
          const results = res?.results ?? {};
          for (const [src, r] of Object.entries(results)) {
            if (r.status === 'error' || r.status === 'partial') failures.push(`${months[i].from.slice(0, 7)} ${src}: ${r.error ?? r.status}`);
          }
          from = results.ga4?.next_from ?? results.gsc?.next_from;
        }
      }
      setError(failures.length ? `Backfill finished with ${failures.length} problem(s): ${failures.slice(0, 3).join(' | ')}` : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      setReloadKey((k) => k + 1);
    }
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <Helmet>
        <title>Growth — Admin · AIWMC Quantis</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Growth: GA4, Search Console and first-party</h1>
          <p className="text-sm text-muted-foreground mt-1">
            GA4 property 520326058, Search Console <code>sc-domain:aiwmcquantis.com</code> and our own
            Supabase funnel, side by side. Synced daily at 13:15 UTC by <code>growth-sync</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runDaily} disabled={!!busy}>Run sync now</Button>
          <Button variant="outline" onClick={runBackfill} disabled={!!busy || !today}>Backfill history</Button>
        </div>
      </header>

      {busy && <p className="mb-4 text-sm text-muted-foreground" role="status">{busy}</p>}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8" data-testid="growth-sync-status">
        {SOURCES.map(({ key, label }) => {
          const r = latest.get(key);
          const okRun = lastSuccess.get(key);
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  {label} {runs === null ? <Skeleton className="h-5 w-16" /> : <StatusPill status={r?.status} />}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <div>Last run: {fmtTime(r?.finished_at ?? r?.started_at ?? null)}{r ? ` (${r.mode}, ${fmt(r.rows_upserted)} rows)` : ''}</div>
                <div>Last success: {fmtTime(okRun?.finished_at ?? null)}</div>
                {r?.error && <div className="text-destructive break-words">{r.error.slice(0, 300)}</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mb-8">
        <CardHeader className="pb-2"><CardTitle className="text-base">Last 30 days: sessions and search clicks</CardTitle></CardHeader>
        <CardContent>
          {summary === null ? <Skeleton className="h-56 w-full" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="supabase" name="Supabase sessions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ga4" name="GA4 sessions" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} connectNulls={false} />
                <Line type="monotone" dataKey="gsc" name="GSC clicks" stroke="hsl(var(--accent-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <h2 className="text-xl font-bold mb-2">Daily, last 30 days (Denver days)</h2>
      <p className="text-sm text-muted-foreground mb-3">
        Today ({today ?? '…'}) is partial. Complete days start at {yesterday ?? '…'}. A dash means the source has no row for that day yet.
      </p>
      <Card className="mb-8">
        <CardContent className="pt-4">
          {summary === null ? <Skeleton className="h-64 w-full" /> : (
            <MetricsTable rows={daily} clarityConfigured={clarityConfigured} partialKey={today ?? undefined} />
          )}
        </CardContent>
      </Card>

      <h2 className="text-xl font-bold mb-2">Monthly since January 2026</h2>
      <p className="text-sm text-muted-foreground mb-3">
        Sums of the daily rows. GA4 users are summed per day, so a person who came back on two days counts twice.
        Search Console CTR is clicks ÷ impressions; position is weighted by impressions. The current month is partial.
      </p>
      <Card className="mb-8">
        <CardContent className="pt-4">
          {summary === null ? <Skeleton className="h-40 w-full" /> : (
            <MetricsTable rows={monthly} clarityConfigured={clarityConfigured} partialKey={today?.slice(0, 7)} />
          )}
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Breakdowns</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Summed over the range. Landing pages and source/medium keep the top 50 per day, countries the top 30,
            queries and pages the top 200, so long-tail rows are not included.
          </p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Breakdown range">
          {RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => setRangeDays(r.days)}
              aria-pressed={rangeDays === r.days}
              className={`px-3 py-1.5 text-sm rounded-md border ${rangeDays === r.days ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {BREAKDOWNS.map((b) => (
          <BreakdownTable key={b.report} title={b.title} dim={b.dim} report={b.report} rows={breakdowns[b.report]} />
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Data honesty</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Supabase is the complete first-party count.</strong> Sessions come from <code>funnel_events_clean</code>{' '}
            with internal, founder, QA and preview traffic excluded; a session counts on its first Denver day.
            "2+ actions" means the session fired at least two different canonical events.
          </p>
          <p>
            <strong>GA4 counts only visitors who accepted the consent banner since 2026-11-03</strong>, so it reads lower than
            Supabase from that date. GA4 may also apply thresholding to small numbers; the sync records that flag per run.
            GA4 days follow the property's timezone.
          </p>
          <p>
            <strong>Search Console lags 2–3 days</strong> and keeps 16 months. Only finalized days are stored; the daily run
            re-fetches the last 5 days so late days fill in. Query rows leave out anonymized queries, so they add up to less
            than the overview. GSC days are Pacific Time.
          </p>
          <p>
            Clarity (if configured) is a 24-hour total ending at sync time, stored on the previous day. Its API has no history
            and allows 10 calls a day.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
