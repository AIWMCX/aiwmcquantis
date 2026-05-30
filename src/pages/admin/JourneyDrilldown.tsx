import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { logger } from '@/lib/logger';

/**
 * /admin/journey-drilldown
 *
 * Pick a UTM source + tier and see the user journey timeline:
 * unique sessions per step, median time-to-step from first touch,
 * step-to-step delta, and drop-off vs previous + vs top of funnel.
 *
 * Powers the "where do paying users come from, and how long do they take?"
 * question with one screen.
 */

type FilterRow = { utm_source: string; tier: string; sessions: number };
type StepRow = {
  step_order: number;
  step_name: string;
  unique_sessions: number;
  median_ms_from_first: number | null;
};

const STAGE_LABEL: Record<string, string> = {
  home_view: 'Home view',
  pricing_view: 'Pricing view',
  analysis_view: 'Analysis view',
  analysis_start: 'Analysis start',
  analysis_step_view: 'Step view',
  analysis_step_complete: 'Step complete',
  analysis_complete: 'Analysis complete',
  free_signup_start: 'Signup start',
  free_signup_complete: 'Signup complete',
  paid_checkout_start: 'Checkout start',
  paid_checkout_complete: 'Paid ✓',
};

const fmtMs = (n: number | null | undefined) => {
  if (n == null) return '—';
  if (n < 1000) return `${Math.round(n)} ms`;
  if (n < 60_000) return `${(n / 1000).toFixed(1)}s`;
  if (n < 3_600_000) return `${(n / 60_000).toFixed(1)} min`;
  return `${(n / 3_600_000).toFixed(1)} h`;
};
const fmtPct = (n: number | null) =>
  n == null ? '—' : `${(n * 100).toFixed(1)}%`;

export default function JourneyDrilldown() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [filters, setFilters] = useState<FilterRow[] | null>(null);
  const [source, setSource] = useState<string>('');
  const [tier, setTier] = useState<string>('__all__');
  const [steps, setSteps] = useState<StepRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Load filter options
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc(
        'get_journey_drilldown_filters' as never,
        { _days: days } as never,
      );
      if (cancelled) return;
      if (error) {
        logger.error('drilldown_filters failed', error);
        setErr(error.message);
        return;
      }
      const rows = (data as unknown as FilterRow[]) ?? [];
      setFilters(rows);
      if (!source && rows[0]) setSource(rows[0].utm_source);
    })();
    return () => { cancelled = true; };
  }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load drilldown when source/tier change
  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    setSteps(null);
    (async () => {
      const { data, error } = await supabase.rpc(
        'get_journey_drilldown' as never,
        {
          _source: source,
          _tier: tier === '__all__' ? null : tier,
          _days: days,
        } as never,
      );
      if (cancelled) return;
      if (error) {
        logger.error('journey_drilldown failed', error);
        setErr(error.message);
        return;
      }
      setSteps((data as unknown as StepRow[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [source, tier, days]);

  const tiersForSource = useMemo(() => {
    const list = (filters ?? []).filter((f) => f.utm_source === source);
    return list;
  }, [filters, source]);

  // Compute step-to-step delta + drop-off in client
  const enriched = useMemo(() => {
    if (!steps) return null;
    const top = steps.find((s) => s.unique_sessions > 0)?.unique_sessions ?? 0;
    let prev: StepRow | null = null;
    return steps.map((s) => {
      const median_from_prev =
        prev && s.median_ms_from_first != null && prev.median_ms_from_first != null
          ? Math.max(0, s.median_ms_from_first - prev.median_ms_from_first)
          : null;
      const dropoff_from_prev =
        prev && prev.unique_sessions > 0
          ? 1 - s.unique_sessions / prev.unique_sessions
          : null;
      const dropoff_from_top =
        top > 0 ? 1 - s.unique_sessions / top : null;
      prev = s.unique_sessions > 0 ? s : prev;
      return { ...s, median_from_prev, dropoff_from_prev, dropoff_from_top };
    });
  }, [steps]);

  const maxSessions = useMemo(
    () => Math.max(1, ...((steps ?? []).map((s) => s.unique_sessions))),
    [steps],
  );

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <Helmet>
        <title>Journey drilldown — Admin · AIWMC Quantis</title>
      </Helmet>

      <header className="mb-6">
        <h1 className="text-2xl font-bold">Journey drilldown</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a traffic source and tier to see the exact step-by-step path
          users took to paid — with median timings and drop-off.{' '}
          <Link to="/admin/conversion-by-source" className="underline">
            ← Back to source matrix
          </Link>
        </p>
      </header>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6 flex flex-wrap gap-3 items-end">
          <div className="min-w-[200px]">
            <label className="text-xs text-muted-foreground block mb-1">UTM source</label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue placeholder="Pick source" /></SelectTrigger>
              <SelectContent>
                {[...new Set((filters ?? []).map((f) => f.utm_source))].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px]">
            <label className="text-xs text-muted-foreground block mb-1">Tier</label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All tiers</SelectItem>
                {tiersForSource.map((t) => (
                  <SelectItem key={t.tier} value={t.tier}>
                    {t.tier} ({t.sessions})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v) as 7 | 30 | 90)}>
            <TabsList>
              <TabsTrigger value="7">7d</TabsTrigger>
              <TabsTrigger value="30">30d</TabsTrigger>
              <TabsTrigger value="90">90d</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {err && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">Error: {err}</CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Journey: <span className="font-mono">{source || '—'}</span>
            {tier !== '__all__' && (
              <span className="text-muted-foreground"> · {tier}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enriched === null ? (
            <Skeleton className="h-64 w-full" />
          ) : enriched.every((s) => s.unique_sessions === 0) ? (
            <p className="text-sm text-muted-foreground">
              No sessions for this source/tier in the selected window.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground pb-2 border-b border-border">
                <div className="col-span-3">Step</div>
                <div className="col-span-3">Volume</div>
                <div className="col-span-2 text-right">Sessions</div>
                <div className="col-span-2 text-right">Δ from prev</div>
                <div className="col-span-1 text-right">Drop-off</div>
                <div className="col-span-1 text-right">vs top</div>
              </div>
              {enriched.map((s) => {
                const widthPct = (s.unique_sessions / maxSessions) * 100;
                const isDead = s.unique_sessions === 0;
                return (
                  <div
                    key={s.step_name}
                    className={`grid grid-cols-12 gap-2 items-center py-2 text-sm border-b border-border/40 ${isDead ? 'opacity-40' : ''}`}
                  >
                    <div className="col-span-3 font-medium">
                      {STAGE_LABEL[s.step_name] ?? s.step_name}
                    </div>
                    <div className="col-span-3">
                      <div className="h-5 bg-muted rounded relative overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="col-span-2 text-right tabular-nums font-mono">
                      {s.unique_sessions.toLocaleString()}
                    </div>
                    <div className="col-span-2 text-right tabular-nums text-muted-foreground">
                      {fmtMs(s.median_from_prev)}
                    </div>
                    <div className="col-span-1 text-right tabular-nums">
                      {s.dropoff_from_prev == null ? '—' : (
                        <Badge
                          variant={s.dropoff_from_prev > 0.5 ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {fmtPct(s.dropoff_from_prev)}
                        </Badge>
                      )}
                    </div>
                    <div className="col-span-1 text-right tabular-nums text-xs text-muted-foreground">
                      {fmtPct(s.dropoff_from_top)}
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground pt-3">
                Median time is measured from the session's first tracked event.
                Δ from prev = increment between successive medians. Drop-off compares
                each step to the previous non-zero step.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
