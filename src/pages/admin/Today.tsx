/**
 * /admin — the founder's daily overview.
 *
 * One screen for "what happened": external-only growth numbers (from the
 * admin_traffic_sources RPC, which excludes internal accounts, founder
 * grants, localhost/preview and QA traffic), the funnel ladder, top traffic
 * channels with a data-quality line, then revenue, engine and AI/ops health
 * from the same admin-gated tables their detail pages use. Every panel links
 * to its detail page; nothing here is a second source of truth.
 *
 * Rule kept from the CTO mandate: a zero or a rate is never shown without its
 * context ("no data in this window", "query failed", numerator/denominator).
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { TrafficReport } from '@/components/admin/TrafficSources';
import { cn } from '@/lib/utils';

type LoadState<T> = { status: 'loading' | 'ok' | 'error'; data: T | null; errorMessage?: string };
type EventRow = { event_name: string; unique_sessions: number };
type Growth = TrafficReport & { events: EventRow[] };

interface CommercialWindow { engaged: number; paid: number; revenueUsd: number; refunds: number }
interface EngineState { latestSweepAt: string | null; latestSweepViolations: number | null; latestSweepScanned: number | null; quarantinedTotal: number }
interface AiOps { calls: number; errors: number; costUsd: number; avgLatencyMs: number | null }
interface Failures { completed: number; failed: number }

const WINDOWS = [
  { days: 1, label: '24 hours' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
] as const;

const FUNNEL = [
  { key: 'home_view', label: 'Homepage visits' },
  { key: 'analysis_start', label: 'Analysis started' },
  { key: 'analysis_complete', label: 'Analysis completed' },
  { key: 'free_signup_complete', label: 'Signed up' },
  { key: 'paid_checkout_start', label: 'Checkout started' },
] as const;

const errMsg = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e));
const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(n / d < 0.1 ? 1 : 0)}%` : '—');

function Section({ title, description, link, children, className }: { title: string; description?: string; link?: { href: string; label: string }; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {link && (
            <Link to={link.href} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {link.label}<ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right">
        <span className="text-lg font-semibold tabular-nums">{value}</span>
        {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
      </dd>
    </div>
  );
}

function Pending<T>({ state, children }: { state: LoadState<T>; children: (d: T) => React.ReactNode }) {
  if (state.status === 'loading') return <p className="text-sm text-muted-foreground" aria-busy="true">Loading…</p>;
  if (state.status === 'error' || !state.data) return <p className="text-sm text-destructive">Query failed: {state.errorMessage}</p>;
  return <>{children(state.data)}</>;
}

function Kpi({ label, value, sub, good }: { label: string; value: React.ReactNode; sub?: string; good?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn('mt-2 text-3xl font-bold tabular-nums', good && 'text-emerald-600 dark:text-emerald-400')}>{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminToday() {
  const [days, setDays] = useState<number>(7);
  const [growth, setGrowth] = useState<LoadState<Growth>>({ status: 'loading', data: null });
  const [commercial, setCommercial] = useState<LoadState<CommercialWindow>>({ status: 'loading', data: null });
  const [engine, setEngine] = useState<LoadState<EngineState>>({ status: 'loading', data: null });
  const [aiOps, setAiOps] = useState<LoadState<AiOps>>({ status: 'loading', data: null });
  const [failures, setFailures] = useState<LoadState<Failures>>({ status: 'loading', data: null });
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async (windowDays: number) => {
    const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();
    setGrowth({ status: 'loading', data: null });

    await Promise.all([
      (async () => {
        const { data, error } = await supabase.rpc('admin_traffic_sources' as never, { p_days: windowDays } as never);
        if (error) { logger.error('admin overview: traffic', error); setGrowth({ status: 'error', data: null, errorMessage: errMsg(error) }); return; }
        setGrowth({ status: 'ok', data: data as unknown as Growth });
      })(),
      (async () => {
        try {
          const { data, error } = await supabase
            .from('paid_engagements')
            .select('payment_status,amount_paid_minor,engaged_at,paid_at')
            .or(`engaged_at.gte.${since},paid_at.gte.${since}`);
          if (error) throw error;
          const rows = data ?? [];
          const paid = rows.filter((r) => r.payment_status === 'paid');
          setCommercial({ status: 'ok', data: {
            engaged: rows.length,
            paid: paid.length,
            revenueUsd: paid.reduce((s, r) => s + (r.amount_paid_minor ?? 0), 0) / 100,
            refunds: rows.filter((r) => r.payment_status === 'refunded' || r.payment_status === 'partially_refunded').length,
          } });
        } catch (e) { logger.error('admin overview: commercial', e); setCommercial({ status: 'error', data: null, errorMessage: errMsg(e) }); }
      })(),
      (async () => {
        try {
          const [{ data: sweep, error: se }, { count: quarantined, error: qe }] = await Promise.all([
            supabase.from('financial_invariant_sweep_runs').select('run_at,violation_count,scanned_count').order('run_at', { ascending: false }).limit(1).maybeSingle(),
            supabase.from('analyses').select('id', { count: 'exact', head: true }).eq('result->>report_integrity', 'BLOCK'),
          ]);
          if (se) throw se;
          if (qe) throw qe;
          setEngine({ status: 'ok', data: {
            latestSweepAt: sweep?.run_at ?? null,
            latestSweepViolations: sweep?.violation_count ?? null,
            latestSweepScanned: sweep?.scanned_count ?? null,
            quarantinedTotal: quarantined ?? 0,
          } });
        } catch (e) { logger.error('admin overview: engine', e); setEngine({ status: 'error', data: null, errorMessage: errMsg(e) }); }
      })(),
      (async () => {
        try {
          const { data, error } = await supabase.from('ai_calls').select('cost_usd,ok,latency_ms').gte('created_at', since);
          if (error) throw error;
          const rows = data ?? [];
          const lat = rows.map((r) => r.latency_ms).filter((v): v is number => typeof v === 'number');
          setAiOps({ status: 'ok', data: {
            calls: rows.length,
            errors: rows.filter((r) => r.ok === false).length,
            costUsd: rows.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0),
            avgLatencyMs: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null,
          } });
        } catch (e) { logger.error('admin overview: ai', e); setAiOps({ status: 'error', data: null, errorMessage: errMsg(e) }); }
      })(),
      (async () => {
        try {
          const { data, error } = await supabase.from('analysis_complete_events').select('ok').gte('created_at', since);
          if (error) throw error;
          const rows = data ?? [];
          const failed = rows.filter((r) => r.ok === false).length;
          setFailures({ status: 'ok', data: { completed: rows.length - failed, failed } });
        } catch (e) { logger.error('admin overview: failures', e); setFailures({ status: 'error', data: null, errorMessage: errMsg(e) }); }
      })(),
    ]);
    setUpdatedAt(new Date());
  }, []);

  useEffect(() => { void load(days); }, [days, load]);

  async function refresh() {
    setRefreshing(true);
    await load(days);
    setRefreshing(false);
  }

  const g = growth.data;
  const ev = new Map((g?.events ?? []).map((e) => [e.event_name, Number(e.unique_sessions) || 0]));
  const at = (k: string) => ev.get(k) ?? 0;
  const top = at('home_view');
  const windowLabel = WINDOWS.find((w) => w.days === days)?.label ?? `${days} days`;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Last {windowLabel}. Growth numbers are external visitors only{updatedAt ? ` · updated ${updatedAt.toLocaleTimeString(undefined, { timeStyle: 'short' })}` : ''}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Time window">
            {WINDOWS.map((w) => (
              <button
                key={w.days}
                type="button"
                onClick={() => setDays(w.days)}
                aria-pressed={days === w.days}
                className={cn(
                  'px-3 py-1.5 text-sm rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  days === w.days ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={refresh} className="p-2 rounded-md border text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Refresh data">
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} aria-hidden="true" />
          </button>
        </div>
      </div>

      <section aria-label="Key numbers" className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {growth.status === 'error' ? (
          <Card className="col-span-full"><CardContent className="p-4 text-sm text-destructive">Growth numbers unavailable: {growth.errorMessage}</CardContent></Card>
        ) : (
          <>
            <Kpi label="External visits" value={g ? g.totals.external.toLocaleString() : '…'} sub={g ? `${g.totals.internal_excluded} internal excluded` : undefined} />
            <Kpi label="Analyses completed" value={g ? at('analysis_complete') : '…'} sub={g ? `${pct(at('analysis_complete'), top)} of homepage visits` : undefined} />
            <Kpi label="Signups" value={g ? at('free_signup_complete') : '…'} />
            <Kpi label="Checkouts started" value={g ? at('paid_checkout_start') : '…'} />
            <Kpi
              label="Paid revenue"
              value={commercial.data ? `$${commercial.data.revenueUsd.toLocaleString()}` : commercial.status === 'error' ? '—' : '…'}
              sub={commercial.data ? `${commercial.data.paid} paid engagement${commercial.data.paid === 1 ? '' : 's'}` : undefined}
              good={!!commercial.data && commercial.data.revenueUsd > 0}
            />
          </>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Section className="lg:col-span-3" title="Funnel" description="Visits that reached each step (external)" link={{ href: '/admin/funnel', label: 'Funnel & sources' }}>
          <Pending state={growth}>
            {() => (
              <>
                <ol className="space-y-3">
                  {FUNNEL.map((step, i) => {
                    const n = at(step.key);
                    const prev = i === 0 ? n : at(FUNNEL[i - 1].key);
                    const width = top > 0 ? Math.max(n > 0 ? 2 : 0, (n / top) * 100) : 0;
                    return (
                      <li key={step.key}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span>{step.label}</span>
                          <span className="tabular-nums">
                            <span className="font-semibold">{n.toLocaleString()}</span>
                            {i > 0 && <span className="ml-2 text-xs text-muted-foreground">{pct(n, prev)} of previous</span>}
                          </span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden" aria-hidden="true">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {top === 0 && <p className="mt-3 text-xs text-muted-foreground">No external homepage visits in this window.</p>}
              </>
            )}
          </Pending>
        </Section>

        <Section className="lg:col-span-2" title="Where visitors came from" description="Top channels, external visits" link={{ href: '/admin/funnel', label: 'All sources' }}>
          <Pending state={growth}>
            {(d) => (
              <>
                <ul className="divide-y">
                  {d.channels.slice(0, 6).map((c) => (
                    <li key={c.channel} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                      <span>{c.channel}</span>
                      <span className="tabular-nums">
                        <span className="font-semibold">{Number(c.sessions).toLocaleString()}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{pct(Number(c.sessions), d.totals.external)}</span>
                      </span>
                    </li>
                  ))}
                  {d.channels.length === 0 && <li className="py-2 text-sm text-muted-foreground">No external visits in this window.</li>}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Data quality: {pct(d.totals.external - d.totals.direct_unknown, d.totals.external)} of visits have a known source · {d.totals.utm_tagged} UTM-tagged.
                </p>
              </>
            )}
          </Pending>
        </Section>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Section title="Paid engagements" description="Founder Decision Review / Consultant Pilot" link={{ href: '/admin/paid-engagements', label: 'Open' }}>
          <Pending state={commercial}>
            {(d) => (
              <dl>
                <Stat label="Engaged" value={d.engaged} />
                <Stat label="Paid" value={d.paid} />
                <Stat label="Revenue" value={`$${d.revenueUsd.toLocaleString()}`} />
                <Stat label="Refunds" value={d.refunds} />
              </dl>
            )}
          </Pending>
        </Section>

        <Section title="Decision Runs" description="All users, incl. internal" link={{ href: '/admin/accuracy', label: 'Accuracy' }}>
          <Pending state={failures}>
            {(d) => (
              <dl>
                <Stat label="Completed" value={d.completed} />
                <Stat label="Failed" value={d.failed} sub={d.completed + d.failed > 0 ? `${pct(d.failed, d.completed + d.failed)} failure rate` : 'No runs in this window'} />
              </dl>
            )}
          </Pending>
        </Section>

        <Section title="Engine integrity" description="Latest invariant sweep (any date)" link={{ href: '/admin/invariant-sweeps', label: 'Sweeps' }}>
          <Pending state={engine}>
            {(d) => (
              <dl>
                <Stat
                  label="Last sweep"
                  value={d.latestSweepAt ? new Date(d.latestSweepAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'Never run'}
                  sub={d.latestSweepAt ? undefined : 'Monitoring unavailable, not the same as zero violations'}
                />
                <Stat label="Violations" value={d.latestSweepViolations ?? '—'} sub={d.latestSweepScanned != null ? `of ${d.latestSweepScanned} scanned` : undefined} />
                <Stat label="Quarantined" value={<Badge variant={d.quarantinedTotal > 0 ? 'destructive' : 'outline'}>{d.quarantinedTotal}</Badge>} />
              </dl>
            )}
          </Pending>
        </Section>

        <Section title="AI & operations" description="Provider calls in this window" link={{ href: '/admin/ai-costs', label: 'AI costs' }}>
          <Pending state={aiOps}>
            {(d) => (
              <dl>
                <Stat label="Calls" value={d.calls} />
                <Stat label="Errors" value={d.errors} sub={d.calls > 0 ? `${pct(d.errors, d.calls)} of calls` : undefined} />
                <Stat label="Cost" value={`$${d.costUsd.toFixed(2)}`} />
                <Stat label="Avg latency" value={d.avgLatencyMs != null ? `${d.avgLatencyMs} ms` : 'No calls'} />
              </dl>
            )}
          </Pending>
        </Section>
      </div>

      <p className="text-xs text-muted-foreground">
        Windows are rolling (last 24 hours, 7 or 30 days). Deploy and edge-function versions: <Link className="underline" to="/status">/status</Link>.
      </p>
    </div>
  );
}
