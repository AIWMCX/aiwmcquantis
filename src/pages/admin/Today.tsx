/**
 * /admin/today -- the single founder-only "what happened today" screen.
 *
 * CTO Execution Mandate (2026-09-11), P0.5 + section 14: the founder should
 * not need ~19 separate admin pages (AiCosts, EdgeHealth, InvariantSweeps,
 * Funnel, PaidEngagements, ...) to answer "what happened today." This page
 * does not reimplement any of their queries -- it reads the SAME tables
 * and the SAME admin-gated RLS policies those pages already use (all
 * verified live: `Admins can read all ai_calls`, `Admins can read sweep
 * run history`, `Admins can manage paid engagements`, `Admins can read all
 * analyses`), just assembled into one screen with a "since midnight UTC"
 * window. It links out to the detailed pages for drill-down rather than
 * duplicating their full UI.
 *
 * Every card shows its raw numerator/denominator or an explicit "no data
 * yet today" / "query failed" state -- per the mandate's own rule, a rate
 * or a zero without that context is not decision-ready and must not be
 * rendered as if it were a real zero.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

type LoadState<T> = { status: 'loading' | 'ok' | 'error'; data: T | null; errorMessage?: string };

interface ProductToday {
  signups: number;
  analysesStarted: number;
  analysesCompleted: number;
  analysesFailed: number;
}

interface CommercialToday {
  checkoutsStarted: number;
  paymentsConfirmed: number;
  revenueUsd: number;
  refunds: number;
}

interface EngineToday {
  latestSweepAt: string | null;
  latestSweepViolations: number | null;
  latestSweepScanned: number | null;
  quarantinedTotal: number;
}

interface AiOpsToday {
  calls: number;
  errors: number;
  costUsd: number;
  avgLatencyMs: number | null;
}

const todayStartUtcIso = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
};

function StatRow({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right">
        <span className="text-lg font-semibold tabular-nums">{value}</span>
        {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
      </span>
    </div>
  );
}

function PanelCard({ title, description, link, children }: { title: string; description: string; link: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Link to={link.href} className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
            {link.label}<ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ErrorState({ message }: { message: string }) {
  return <p className="text-sm text-destructive">Query failed: {message}</p>;
}

export default function AdminToday() {
  const [product, setProduct] = useState<LoadState<ProductToday>>({ status: 'loading', data: null });
  const [commercial, setCommercial] = useState<LoadState<CommercialToday>>({ status: 'loading', data: null });
  const [engine, setEngine] = useState<LoadState<EngineToday>>({ status: 'loading', data: null });
  const [aiOps, setAiOps] = useState<LoadState<AiOpsToday>>({ status: 'loading', data: null });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const since = todayStartUtcIso();

    // Product today. "Started" comes from analyses (every created row);
    // "completed/failed" comes from analysis_complete_events.ok, the same
    // signal the CTO mandate itself names as the completion source of truth
    // -- analyses has no status column at all.
    try {
      const [{ count: signups, error: sErr }, { count: started, error: aErr }, { data: events, error: eErr }] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since),
        supabase.from('analyses').select('id', { count: 'exact', head: true }).gte('created_at', since),
        supabase.from('analysis_complete_events').select('ok').gte('created_at', since),
      ]);
      if (sErr) throw sErr;
      if (aErr) throw aErr;
      if (eErr) throw eErr;
      const eventRows = events ?? [];
      const failed = eventRows.filter((r) => r.ok === false).length;
      setProduct({
        status: 'ok',
        data: {
          signups: signups ?? 0,
          analysesStarted: started ?? 0,
          analysesCompleted: eventRows.length - failed,
          analysesFailed: failed,
        },
      });
    } catch (err) {
      logger.error('admin/today: product query failed', err);
      setProduct({ status: 'error', data: null, errorMessage: err instanceof Error ? err.message : String(err) });
    }

    // Commercial today (paid engagements only -- the two one-time offers;
    // subscription checkout/payment activity already lives on Funnel.tsx)
    try {
      const { data, error } = await supabase
        .from('paid_engagements')
        .select('payment_status,amount_paid_minor,engaged_at,paid_at,status')
        .or(`engaged_at.gte.${since},paid_at.gte.${since}`);
      if (error) throw error;
      const rows = data ?? [];
      const paid = rows.filter((r) => r.payment_status === 'paid');
      setCommercial({
        status: 'ok',
        data: {
          checkoutsStarted: rows.length,
          paymentsConfirmed: paid.length,
          revenueUsd: paid.reduce((sum, r) => sum + (r.amount_paid_minor ?? 0), 0) / 100,
          refunds: rows.filter((r) => r.payment_status === 'refunded' || r.payment_status === 'partially_refunded').length,
        },
      });
    } catch (err) {
      logger.error('admin/today: commercial query failed', err);
      setCommercial({ status: 'error', data: null, errorMessage: err instanceof Error ? err.message : String(err) });
    }

    // Engine today (latest sweep run, regardless of when it ran -- freshness
    // is shown explicitly rather than silently querying "today only" and
    // rendering an empty state that looks like "no violations")
    try {
      const [{ data: sweep, error: sweepErr }, { count: quarantined, error: qErr }] = await Promise.all([
        supabase.from('financial_invariant_sweep_runs').select('run_at,violation_count,scanned_count').order('run_at', { ascending: false }).limit(1).maybeSingle(),
        // report_integrity lives inside the result JSONB, not a top-level
        // column (confirmed against schema -- see 2026-09-11 register entry).
        supabase.from('analyses').select('id', { count: 'exact', head: true }).eq('result->>report_integrity', 'BLOCK'),
      ]);
      if (sweepErr) throw sweepErr;
      if (qErr) throw qErr;
      setEngine({
        status: 'ok',
        data: {
          latestSweepAt: sweep?.run_at ?? null,
          latestSweepViolations: sweep?.violation_count ?? null,
          latestSweepScanned: sweep?.scanned_count ?? null,
          quarantinedTotal: quarantined ?? 0,
        },
      });
    } catch (err) {
      logger.error('admin/today: engine query failed', err);
      setEngine({ status: 'error', data: null, errorMessage: err instanceof Error ? err.message : String(err) });
    }

    // AI & ops today
    try {
      const { data, error } = await supabase
        .from('ai_calls')
        .select('cost_usd,ok,latency_ms')
        .gte('created_at', since);
      if (error) throw error;
      const rows = data ?? [];
      const latencies = rows.map((r) => r.latency_ms).filter((v): v is number => typeof v === 'number');
      setAiOps({
        status: 'ok',
        data: {
          calls: rows.length,
          errors: rows.filter((r) => r.ok === false).length,
          costUsd: rows.reduce((sum, r) => sum + (Number(r.cost_usd) || 0), 0),
          avgLatencyMs: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
        },
      });
    } catch (err) {
      logger.error('admin/today: AI/ops query failed', err);
      setAiOps({ status: 'error', data: null, errorMessage: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Today</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Since {new Date(todayStartUtcIso()).toLocaleString(undefined, { dateStyle: 'medium' })} 00:00 UTC — your local time zone applies to timestamps shown below, the window itself is UTC.
            </p>
          </div>
          <button onClick={refresh} className="text-muted-foreground hover:text-foreground" aria-label="Refresh">
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <PanelCard title="Product today" description="Signups and Decision Run volume" link={{ href: '/admin/email-funnel', label: 'Funnel' }}>
            {product.status === 'loading' && <p className="text-sm text-muted-foreground">Loading…</p>}
            {product.status === 'error' && <ErrorState message={product.errorMessage!} />}
            {product.status === 'ok' && product.data && (
              <>
                <StatRow label="New signups" value={product.data.signups} />
                <StatRow label="Analyses started" value={product.data.analysesStarted} />
                <StatRow label="Analyses completed" value={product.data.analysesCompleted} />
                <StatRow label="Analyses failed" value={product.data.analysesFailed} />
                {product.data.analysesStarted === 0 && <p className="text-xs text-muted-foreground mt-2">No analyses yet today — not the same as zero activity ever.</p>}
              </>
            )}
          </PanelCard>

          <PanelCard title="Commercial today" description="Founder Decision Review / Consultant Founding Pilot" link={{ href: '/admin/paid-engagements', label: 'Paid engagements' }}>
            {commercial.status === 'loading' && <p className="text-sm text-muted-foreground">Loading…</p>}
            {commercial.status === 'error' && <ErrorState message={commercial.errorMessage!} />}
            {commercial.status === 'ok' && commercial.data && (
              <>
                <StatRow label="Checkouts / engaged today" value={commercial.data.checkoutsStarted} />
                <StatRow label="Payments confirmed" value={commercial.data.paymentsConfirmed} />
                <StatRow label="Revenue today" value={`$${commercial.data.revenueUsd.toLocaleString()}`} />
                <StatRow label="Refunds" value={commercial.data.refunds} />
              </>
            )}
          </PanelCard>

          <PanelCard title="Engine today" description="Latest financial-invariant sweep, not necessarily run today" link={{ href: '/admin/invariant-sweeps', label: 'Invariant sweeps' }}>
            {engine.status === 'loading' && <p className="text-sm text-muted-foreground">Loading…</p>}
            {engine.status === 'error' && <ErrorState message={engine.errorMessage!} />}
            {engine.status === 'ok' && engine.data && (
              <>
                <StatRow
                  label="Last sweep"
                  value={engine.data.latestSweepAt ? new Date(engine.data.latestSweepAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'Never run'}
                  sub={engine.data.latestSweepAt ? undefined : 'MONITORING_UNAVAILABLE — not the same as zero violations'}
                />
                <StatRow
                  label="Violations found"
                  value={engine.data.latestSweepViolations ?? '—'}
                  sub={engine.data.latestSweepScanned != null ? `of ${engine.data.latestSweepScanned} scanned` : undefined}
                />
                <StatRow label="Analyses currently quarantined" value={<Badge variant={engine.data.quarantinedTotal > 0 ? 'destructive' : 'outline'}>{engine.data.quarantinedTotal}</Badge>} />
              </>
            )}
          </PanelCard>

          <PanelCard title="AI & operations today" description="Provider calls, cost, and errors since midnight UTC" link={{ href: '/admin/ai-costs', label: 'AI costs' }}>
            {aiOps.status === 'loading' && <p className="text-sm text-muted-foreground">Loading…</p>}
            {aiOps.status === 'error' && <ErrorState message={aiOps.errorMessage!} />}
            {aiOps.status === 'ok' && aiOps.data && (
              <>
                <StatRow label="AI calls" value={aiOps.data.calls} />
                <StatRow label="Errors" value={aiOps.data.errors} sub={aiOps.data.calls > 0 ? `${((aiOps.data.errors / aiOps.data.calls) * 100).toFixed(1)}% of ${aiOps.data.calls}` : undefined} />
                <StatRow label="Cost today" value={`$${aiOps.data.costUsd.toFixed(2)}`} />
                <StatRow label="Avg latency" value={aiOps.data.avgLatencyMs != null ? `${aiOps.data.avgLatencyMs}ms` : 'No calls yet'} />
              </>
            )}
          </PanelCard>
        </div>

        <p className="text-xs text-muted-foreground">
          This page reads the same admin-gated tables as Funnel, Paid Engagements, Invariant Sweeps, and AI Costs — it does not compute a second source of truth. For deploy SHA / edge-function health, see <Link className="underline" to="/status">/status</Link>.
        </p>
      </div>
    </AppLayout>
  );
}
