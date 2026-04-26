/**
 * ActivationKpiCard — admin-facing KPI dashboard for activation funnel.
 *
 * Surfaces:
 *  - WAF (Weekly Active Founders) vs target
 *  - Trial-to-paid conversion (90d cohort)
 *  - 3 / 6 / 12-month retention vs targets
 *
 * Data source: `get_activation_kpis` RPC (admin-only via has_role).
 */
import React from 'react';
import { useActivationKpis } from '@/hooks/useActivationKpis';
import { Activity, Users, TrendingUp, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function StatBlock({
  label,
  value,
  target,
  suffix = '',
  helper,
}: {
  label: string;
  value: number | string;
  target?: number | string;
  suffix?: string;
  helper?: string;
}) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  const numericTarget = typeof target === 'number' ? target : target ? parseFloat(target) : null;
  const onTrack =
    numericTarget !== null && !Number.isNaN(numericValue) && numericValue >= numericTarget;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold tabular-nums text-foreground">
          {value}
          {suffix}
        </span>
        {target !== undefined && (
          <span
            className={`text-xs font-medium ${
              onTrack ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            target {target}
            {suffix}
          </span>
        )}
      </div>
      {helper && <div className="text-[11px] text-muted-foreground">{helper}</div>}
    </div>
  );
}

export function ActivationKpiCard() {
  const { kpis, loading, error } = useActivationKpis();

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading activation KPIs…</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !kpis) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">Failed to load KPIs: {error || 'unknown error'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* North-star + acquisition */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Engagement & Acquisition
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <StatBlock
            label="Weekly Active Founders"
            value={kpis.waf}
            target={kpis.waf_target}
            helper="Distinct users who triggered ≥1 activation event in the last 7 days"
          />
          <StatBlock
            label="Trial → Paid (90d)"
            value={kpis.trial_to_paid.percent.toFixed(1)}
            target={kpis.trial_to_paid.target_percent}
            suffix="%"
            helper={`${kpis.trial_to_paid.paid_90d} paid / ${kpis.trial_to_paid.signups_90d} signups in last 90d`}
          />
        </div>
      </section>

      {/* Retention */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Cohort Retention
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <StatBlock
            label="3-Month Retention"
            value={kpis.retention['3m'].percent.toFixed(1)}
            target={kpis.retention['3m'].target_percent}
            suffix="%"
            helper={`${kpis.retention['3m'].active}/${kpis.retention['3m'].cohort_size} cohort still active`}
          />
          <StatBlock
            label="6-Month Retention"
            value={kpis.retention['6m'].percent.toFixed(1)}
            target={kpis.retention['6m'].target_percent}
            suffix="%"
            helper={`${kpis.retention['6m'].active}/${kpis.retention['6m'].cohort_size} cohort still active`}
          />
          <StatBlock
            label="12-Month Retention"
            value={kpis.retention['12m'].percent.toFixed(1)}
            target={kpis.retention['12m'].target_percent}
            suffix="%"
            helper={`${kpis.retention['12m'].active}/${kpis.retention['12m'].cohort_size} cohort still active`}
          />
        </div>
      </section>

      <p className="text-[10px] text-muted-foreground">
        <Users className="w-3 h-3 inline mr-1" />
        Generated {new Date(kpis.generated_at).toLocaleString()} · Source: activation_events
      </p>
    </div>
  );
}
