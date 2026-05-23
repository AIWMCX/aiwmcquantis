import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { METRIC_LABELS, type MetricValidation, type ValidationStatus } from '@/engine/rvce/types';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<
  ValidationStatus,
  { color: string; bg: string; icon: string; label: string }
> = {
  OK:      { color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: '●', label: 'Validated' },
  WARN:    { color: 'text-amber-500',   bg: 'bg-amber-500/10 border-amber-500/30',     icon: '▲', label: 'Borderline' },
  OUTLIER: { color: 'text-red-500',     bg: 'bg-red-500/10 border-red-500/30',         icon: '■', label: 'Outlier' },
  NO_DATA: { color: 'text-muted-foreground', bg: 'bg-muted/40 border-border',          icon: '○', label: 'No data' },
};

function fmtMetric(metric: string, value: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (metric.includes('pct')) return `${value.toFixed(1)}%`;
  if (metric.includes('ratio')) return `${value.toFixed(2)}x`;
  if (metric.includes('months')) return `${value.toFixed(1)} mo`;
  return `$${Math.round(value).toLocaleString()}`;
}

export function ValidationStatusBadge({
  metric,
  validation,
}: {
  metric: string;
  validation: MetricValidation;
}) {
  const config = STATUS_CONFIG[validation.status];
  const label = METRIC_LABELS[metric] ?? metric;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium cursor-help',
              config.bg,
              config.color,
            )}
          >
            <span aria-hidden>{config.icon}</span>
            <span>{config.label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <div className="font-semibold">{label}</div>
            <div>
              <span className="text-muted-foreground">Quantis: </span>
              {fmtMetric(metric, validation.original_value)}
            </div>
            {validation.external_median !== null && (
              <div>
                <span className="text-muted-foreground">External median: </span>
                {fmtMetric(metric, validation.external_median)}
                {validation.p25 !== null && validation.p75 !== null && (
                  <span className="text-muted-foreground">
                    {' '}
                    (p25–p75: {fmtMetric(metric, validation.p25)}–{fmtMetric(metric, validation.p75)})
                  </span>
                )}
              </div>
            )}
            {validation.recommended_value !== undefined && (
              <div className="text-amber-500">
                Recommended: {fmtMetric(metric, validation.recommended_value)}
              </div>
            )}
            <div className="text-muted-foreground">{validation.notes}</div>
            <div className="text-[10px] text-muted-foreground/70">
              Based on {validation.observation_count} external observations
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
