import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logger } from '@/lib/logger';

/**
 * /admin/conversion-by-source
 *
 * Live conversion breakdown: traffic source (UTM) × funnel stage × tier.
 * Plus the per-step analysis funnel with timing + abandonment.
 *
 * Auto-refreshes every 60s so the user sees real-time pickup of marketing
 * pushes (Product Hunt, LinkedIn, etc.).
 */

type SourceRow = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  event_name: string;
  tier: string;
  unique_sessions: number;
  unique_users: number;
  total_events: number;
};

type StepRow = {
  step_name: string;
  unique_sessions: number;
  total_events: number;
  median_ms_from_prev: number | null;
  abandon_rate: number | null;
};

const STAGE_ORDER = [
  'home_view',
  'pricing_view',
  'analysis_view',
  'analysis_start',
  'analysis_complete',
  'free_signup_start',
  'free_signup_complete',
  'paid_checkout_start',
  'paid_checkout_complete',
];

const STAGE_LABEL: Record<string, string> = {
  home_view: 'Home',
  pricing_view: 'Pricing',
  analysis_view: 'Analysis view',
  analysis_start: 'Start',
  analysis_complete: 'Complete',
  free_signup_start: 'Signup start',
  free_signup_complete: 'Signup ✓',
  paid_checkout_start: 'Checkout start',
  paid_checkout_complete: 'Paid ✓',
};

export default function AdminConversionBySource() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [sources, setSources] = useState<SourceRow[] | null>(null);
  const [steps, setSteps] = useState<StepRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [a, b] = await Promise.all([
        supabase.rpc('get_conversion_by_source' as never, { _days: days } as never),
        supabase.rpc('get_analysis_step_funnel' as never, { _days: days } as never),
      ]);
      if (cancelled) return;
      if (a.error) {
        logger.error('get_conversion_by_source failed', a.error);
        setErr(a.error.message);
      }
      if (b.error) {
        logger.error('get_analysis_step_funnel failed', b.error);
        setErr((p) => p ?? b.error!.message);
      }
      setSources((a.data as unknown as SourceRow[]) ?? []);
      setSteps((b.data as unknown as StepRow[]) ?? []);
      setLastRefresh(new Date());
    };
    void load();
    const t = setInterval(load, 60_000); // live refresh
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [days]);

  // Pivot sources into a (utm_source × stage) matrix with tier breakdown tooltip.
  const pivot = useMemo(() => {
    const map = new Map<string, Map<string, { sessions: number; tiers: Record<string, number> }>>();
    for (const r of sources ?? []) {
      if (!map.has(r.utm_source)) map.set(r.utm_source, new Map());
      const stageMap = map.get(r.utm_source)!;
      const cur = stageMap.get(r.event_name) ?? { sessions: 0, tiers: {} };
      cur.sessions += r.unique_sessions;
      cur.tiers[r.tier] = (cur.tiers[r.tier] ?? 0) + r.unique_sessions;
      stageMap.set(r.event_name, cur);
    }
    return map;
  }, [sources]);

  const sortedSources = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of sources ?? []) {
      totals.set(r.utm_source, (totals.get(r.utm_source) ?? 0) + r.unique_sessions);
    }
    return [...(pivot.keys() ?? [])].sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0));
  }, [pivot, sources]);

  const fmtPct = (n: number | null | undefined) =>
    n == null ? '—' : `${(n * 100).toFixed(1)}%`;
  const fmtMs = (n: number | null | undefined) =>
    n == null ? '—' : n < 1000 ? `${Math.round(n)} ms` : `${(n / 1000).toFixed(1)}s`;

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <Helmet>
        <title>Conversion by source — Admin · AIWMC Quantis</title>
      </Helmet>

      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Conversion by source · funnel · tier</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live (refresh every 60s). Last update {lastRefresh.toLocaleTimeString()}.
            {' · '}
            <Link to="/admin/funnel" className="underline">Canonical 8-event funnel →</Link>
          </p>
        </div>
        <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v) as 7 | 30 | 90)}>
          <TabsList>
            <TabsTrigger value="7">7 days</TabsTrigger>
            <TabsTrigger value="30">30 days</TabsTrigger>
            <TabsTrigger value="90">90 days</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {err && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">Error: {err}</CardContent>
        </Card>
      )}

      {/* SOURCE × STAGE matrix */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Source × Stage (unique sessions)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {sources === null ? (
            <Skeleton className="h-48 w-full" />
          ) : sortedSources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tracked traffic yet for this window.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-semibold">Source</th>
                  {STAGE_ORDER.map((s) => (
                    <th key={s} className="text-right py-2 px-3 font-semibold whitespace-nowrap">
                      {STAGE_LABEL[s] ?? s}
                    </th>
                  ))}
                  <th className="text-right py-2 px-3 font-semibold">Visit → Paid</th>
                </tr>
              </thead>
              <tbody>
                {sortedSources.map((src) => {
                  const row = pivot.get(src)!;
                  const top = row.get('home_view')?.sessions ?? row.get('analysis_view')?.sessions ?? 0;
                  const paid = row.get('paid_checkout_complete')?.sessions ?? 0;
                  const cvr = top > 0 ? paid / top : null;
                  return (
                    <tr key={src} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-3 font-mono text-xs">{src}</td>
                      {STAGE_ORDER.map((s) => {
                        const cell = row.get(s);
                        if (!cell) return <td key={s} className="py-2 px-3 text-right text-muted-foreground/40">—</td>;
                        const tierBits = Object.entries(cell.tiers)
                          .map(([t, n]) => `${t}:${n}`)
                          .join(' · ');
                        return (
                          <td
                            key={s}
                            className="py-2 px-3 text-right tabular-nums"
                            title={tierBits}
                          >
                            {cell.sessions.toLocaleString()}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-right tabular-nums font-semibold">
                        {cvr == null ? '—' : (
                          <Badge variant={cvr >= 0.01 ? 'default' : 'secondary'}>
                            {fmtPct(cvr)}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Per-step analysis funnel */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Per-step analysis funnel + timing</CardTitle>
        </CardHeader>
        <CardContent>
          {steps === null ? (
            <Skeleton className="h-32 w-full" />
          ) : steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No per-step events yet. Per-step instrumentation activates once users start hitting{' '}
              <code>analysis_view</code> / <code>analysis_step_*</code>.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-semibold">Step</th>
                  <th className="text-right py-2 px-3 font-semibold">Unique sessions</th>
                  <th className="text-right py-2 px-3 font-semibold">Events</th>
                  <th className="text-right py-2 px-3 font-semibold">Median time from prev</th>
                  <th className="text-right py-2 px-3 font-semibold">Drop-off vs view</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((r) => (
                  <tr key={r.step_name} className="border-b border-border/50">
                    <td className="py-2 px-3 font-mono text-xs">{r.step_name}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{r.unique_sessions.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">{r.total_events.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{fmtMs(r.median_ms_from_prev)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {r.abandon_rate == null ? '—' : (
                        <Badge variant={r.abandon_rate > 0.5 ? 'destructive' : 'secondary'}>
                          {fmtPct(r.abandon_rate)}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Methodology</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Source is <code>utm_source</code> at the moment the event fires; missing UTM = <code>direct</code>.
            Tier is resolved from the user's active subscription, else <code>free</code> / <code>anonymous</code>.
          </p>
          <p>
            All internal CTAs that should be measurable are auto-tagged via <code>src/lib/utm.ts</code>.
            Per-step events come from <code>trackAnalysisStep()</code> and <code>trackAnalysisView/Abandon()</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
