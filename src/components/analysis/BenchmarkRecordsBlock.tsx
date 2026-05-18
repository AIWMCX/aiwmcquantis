/**
 * BenchmarkRecordsBlock — strict reader of `metadata.benchmarks[]`.
 *
 * Step 8 of the Benchmark-First Hardening Plan. This is the ONLY UI surface
 * that renders benchmark percentiles. It does NOT recompute or fall back to
 * legacy fields like `benchmark_source` or hardcoded priors. If the engine
 * did not ship a record, we say so honestly via the `none` badge.
 *
 * Read by:
 *   - AccuracyTransparentResults.tsx (dashboard)
 *   - components/pdf/ReportBenchmarks.tsx (print)
 */
import React from 'react';
import { ShieldCheck, AlertTriangle, MinusCircle, Download } from 'lucide-react';
import { downloadBenchmarksCsv } from '@/lib/benchmarksCsv';

export type MatchType = 'direct' | 'similar' | 'none';

export interface BenchmarkRecord {
  metric: string;
  unit: 'percent' | 'months' | 'usd' | 'ratio';
  value: number | null;
  p25: number | null;
  median: number | null;
  p75: number | null;
  sample_size: number;
  source: string | null;
  dataset_date: string | null;
  match_type: MatchType;
  match_level: string | null;
}

const METRIC_LABELS: Record<string, string> = {
  gross_margin: 'Gross Margin',
  operating_margin: 'Operating Margin',
  net_margin: 'Net Margin',
  revenue_growth_yoy: 'Revenue Growth YoY',
  cac: 'CAC',
  ltv: 'LTV',
  ltv_cac_ratio: 'LTV : CAC',
  cac_payback_months: 'CAC Payback',
  churn_monthly: 'Monthly Churn',
  retention_12m: '12-mo Retention',
  arpu: 'ARPU',
  rent_pct_rev: 'Rent % of Revenue',
  payroll_pct_rev: 'Payroll % of Revenue',
  marketing_pct_rev: 'Marketing % of Revenue',
  survival_years: 'Median Survival',
};

function fmt(value: number | null, unit: BenchmarkRecord['unit']): string {
  if (value === null || !Number.isFinite(value)) return '—';
  switch (unit) {
    case 'percent':
      // Engine stores fractions (0..1) for margins, but some rows are
      // already in % (growth_yoy). Heuristic: |v| <= 1.5 → fraction.
      return Math.abs(value) <= 1.5 ? `${(value * 100).toFixed(1)}%` : `${value.toFixed(1)}%`;
    case 'months':
      return `${value.toFixed(1)} mo`;
    case 'usd':
      return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    case 'ratio':
      return `${value.toFixed(2)}×`;
    default:
      return String(value);
  }
}

function MatchBadge({ type }: { type: MatchType }) {
  const map = {
    direct: {
      label: 'Direct',
      Icon: ShieldCheck,
      cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    },
    similar: {
      label: 'Similar',
      Icon: AlertTriangle,
      cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    },
    none: {
      label: 'No match',
      Icon: MinusCircle,
      cls: 'bg-muted text-muted-foreground border-border',
    },
  }[type];
  const { Icon } = map;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${map.cls}`}
    >
      <Icon className="w-3 h-3" /> {map.label}
    </span>
  );
}

interface Props {
  records: BenchmarkRecord[] | undefined | null;
  mode?: 'live' | 'unavailable';
  summary?: { direct: number; similar: number; none: number; total: number };
  className?: string;
}

export function BenchmarkRecordsBlock({ records, mode, summary, className }: Props) {
  if (!records || records.length === 0) {
    return (
      <div className={`q-card p-5 ${className ?? ''}`}>
        <h3 className="font-semibold text-sm mb-2">Benchmark Coverage</h3>
        <p className="text-xs text-muted-foreground">
          No benchmark records were returned by the engine for this analysis. The dashboard
          shows engine-computed values only.
        </p>
      </div>
    );
  }
  const hasAnyMatch = records.some(r => r.match_type !== 'none');
  return (
    <div className={`q-card p-5 ${className ?? ''}`}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="font-semibold text-sm">Live Benchmark Block</h3>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>
            Mode:{' '}
            <span
              className={
                mode === 'live'
                  ? 'text-emerald-500 font-semibold'
                  : 'text-amber-500 font-semibold'
              }
            >
              {mode ?? (hasAnyMatch ? 'live' : 'unavailable')}
            </span>
          </span>
          {summary && (
            <span>
              · Direct {summary.direct} / Similar {summary.similar} / None {summary.none} of{' '}
              {summary.total}
            </span>
          )}
          <button
            type="button"
            onClick={() =>
              downloadBenchmarksCsv(
                records,
                `quantis-benchmarks-${new Date().toISOString().slice(0, 10)}.csv`
              )
            }
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border/60 bg-background/60 hover:bg-background text-foreground"
            title="Download P25 / Median / P75 + match_type as CSV"
          >
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-2 pr-3 font-medium">Metric</th>
              <th className="py-2 pr-3 font-medium text-right">Your value</th>
              <th className="py-2 pr-3 font-medium text-right">P25</th>
              <th className="py-2 pr-3 font-medium text-right">Median</th>
              <th className="py-2 pr-3 font-medium text-right">P75</th>
              <th className="py-2 pr-3 font-medium">Match</th>
              <th className="py-2 pr-3 font-medium text-right">n</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.metric} className="border-b border-border/50 last:border-0">
                <td className="py-1.5 pr-3 text-foreground">{METRIC_LABELS[r.metric] ?? r.metric}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums font-medium text-foreground">
                  {fmt(r.value, r.unit)}
                </td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">{fmt(r.p25, r.unit)}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">{fmt(r.median, r.unit)}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">{fmt(r.p75, r.unit)}</td>
                <td className="py-1.5 pr-3"><MatchBadge type={r.match_type} /></td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">
                  {r.sample_size > 0 ? r.sample_size : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {records[0]?.source && (
        <p className="mt-3 text-[10px] text-muted-foreground">
          Source: {records[0].source}
          {records[0].dataset_date ? ` · ${records[0].dataset_date}` : ''}
        </p>
      )}
    </div>
  );
}
