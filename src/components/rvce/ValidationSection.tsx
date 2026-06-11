import { AlertTriangle, HelpCircle } from 'lucide-react';
import { METRIC_LABELS, type AnalysisValidationPayload } from '@/engine/rvce/types';
import { ValidationStatusBadge } from './ValidationStatusBadge';
import { SearchHealthBar } from './SearchHealthBar';
import { cn } from '@/lib/utils';

function fmt(metric: string, value: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (metric.includes('pct')) return `${value.toFixed(1)}%`;
  if (metric.includes('ratio')) return `${value.toFixed(2)}x`;
  if (metric.includes('months')) return `${value.toFixed(1)} mo`;
  return `$${Math.round(value).toLocaleString()}`;
}

export function ValidationSection({ validation }: { validation: AnalysisValidationPayload }) {
  if (validation.status === 'UNAVAILABLE') {
    return (
      <section className="rounded-lg border border-border bg-card/40 p-4 text-sm text-muted-foreground flex items-center gap-2">
        <HelpCircle className="h-4 w-4" />
        External validation unavailable for this analysis.
      </section>
    );
  }

  const metrics = Object.entries(validation.metrics_validation);
  if (metrics.length === 0) {
    // Empty metrics with PARTIAL status means the rvce-validate call failed or
    // timed out (the client fallback) — not that the metrics were ineligible.
    const failedCall = validation.status === 'PARTIAL' && validation.latency_ms === 0;
    return (
      <section className="rounded-lg border border-border bg-card/40 p-4 text-sm text-muted-foreground flex items-center gap-2">
        <HelpCircle className="h-4 w-4" />
        {failedCall
          ? 'External validation could not be reached for this analysis — it will run automatically on your next analysis.'
          : 'No metrics were eligible for external validation.'}
      </section>
    );
  }

  const outlierCount = metrics.filter(([, v]) => v.status === 'OUTLIER').length;
  const warnCount = metrics.filter(([, v]) => v.status === 'WARN').length;
  const okCount = metrics.filter(([, v]) => v.status === 'OK').length;
  const confidencePct = Math.round(validation.global_confidence_score * 100);
  const barColor =
    confidencePct >= 70 ? 'bg-emerald-500' : confidencePct >= 40 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <section className="rounded-lg border border-border bg-card/40 p-5 space-y-5">
      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight">External Reality Validation</h2>
        <span className="text-[11px] font-mono text-muted-foreground">
          RVCE {validation.rvce_version} · {validation.latency_ms}ms
        </span>
      </header>

      {/* Confidence bar */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Global confidence score</span>
          <span className="font-mono font-medium">{confidencePct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className={cn('h-full transition-all', barColor)} style={{ width: `${confidencePct}%` }} />
        </div>
        <div className="flex items-center gap-3 text-[11px] mt-2 text-muted-foreground">
          <span><span className="text-emerald-500">●</span> {okCount} OK</span>
          <span><span className="text-amber-500">▲</span> {warnCount} Borderline</span>
          <span><span className="text-red-500">■</span> {outlierCount} Outlier</span>
        </div>
      </div>

      {/* High-severity flags */}
      {validation.flags
        .filter((f) => f.severity === 'high')
        .map((flag, i) => (
          <div
            key={`${flag.metric}-${i}`}
            className="rounded-md border border-red-500/40 bg-red-500/10 p-3 flex gap-2 text-sm"
          >
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <div className="font-medium">{METRIC_LABELS[flag.metric] ?? flag.metric}</div>
              <div className="text-muted-foreground">{flag.message}</div>
            </div>
          </div>
        ))}

      {/* Metrics table */}
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="px-2 py-2 font-medium">Metric</th>
              <th className="px-2 py-2 font-medium">Quantis</th>
              <th className="px-2 py-2 font-medium">External Median</th>
              <th className="px-2 py-2 font-medium">Range (p25–p75)</th>
              <th className="px-2 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(([key, val]) => (
              <tr key={key} className="border-b border-border/50 last:border-b-0">
                <td className="px-2 py-2">{METRIC_LABELS[key] ?? key}</td>
                <td className="px-2 py-2 font-mono">{fmt(key, val.original_value)}</td>
                <td className="px-2 py-2 font-mono text-muted-foreground">
                  {fmt(key, val.external_median)}
                </td>
                <td className="px-2 py-2 font-mono text-muted-foreground">
                  {val.p25 !== null && val.p75 !== null
                    ? `${fmt(key, val.p25)} – ${fmt(key, val.p75)}`
                    : '—'}
                </td>
                <td className="px-2 py-2">
                  <ValidationStatusBadge metric={key} validation={val} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reference classes */}
      {validation.reference_classes.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          <span className="font-medium">Compared against:</span>{' '}
          {validation.reference_classes.map((rc) => rc.description).join(' · ')}
        </p>
      )}

      {/* Search health diagnostics */}
      <SearchHealthBar
        health={validation.search_health}
        diagnostics={validation.search_diagnostics}
      />
    </section>
  );
}
