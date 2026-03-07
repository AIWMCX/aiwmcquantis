import React from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface AnomalyScore {
  metric: string;
  metricLabel: string;
  userValue: number;
  percentile: number;
  zScore: number;
  typicalRange: { p25: number; p75: number };
  fullRange: { p10: number; p90: number };
  severity: 'normal' | 'notable' | 'outlier';
  explanation: string;
}

interface AnomalyCardProps {
  anomalyCard: AnomalyScore[];
  peerGroupLabel?: string;
}

export function AnomalyCard({ anomalyCard, peerGroupLabel }: AnomalyCardProps) {
  if (!anomalyCard || anomalyCard.length === 0) return null;

  const outliers = anomalyCard.filter(a => a.severity === 'outlier');
  const notables = anomalyCard.filter(a => a.severity === 'notable');

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-primary" />
          Market Prior Analysis
        </h3>
        {peerGroupLabel && (
          <Badge variant="outline" className="text-xs">
            vs. {peerGroupLabel}
          </Badge>
        )}
      </div>

      {/* Summary line */}
      <p className="text-xs text-muted-foreground">
        {outliers.length > 0 
          ? `${outliers.length} metric${outliers.length > 1 ? 's' : ''} outside typical range for your peer group.`
          : notables.length > 0
          ? `${notables.length} metric${notables.length > 1 ? 's' : ''} worth reviewing.`
          : 'All metrics within normal range for your peer group.'}
      </p>

      {/* Metric bars */}
      <div className="space-y-3">
        {anomalyCard.map((item) => (
          <PercentileBar key={item.metric} item={item} />
        ))}
      </div>
    </div>
  );
}

function PercentileBar({ item }: { item: AnomalyScore }) {
  const { metricLabel, percentile, severity, explanation, fullRange, typicalRange, userValue } = item;

  // Position of user value on the 0-100 percentile scale
  const position = Math.max(2, Math.min(98, percentile));

  const SeverityIcon = severity === 'outlier' ? AlertTriangle : severity === 'notable' ? Info : CheckCircle2;
  const severityColor = severity === 'outlier'
    ? 'text-destructive'
    : severity === 'notable'
    ? 'text-amber-500'
    : 'text-emerald-500';

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground flex items-center gap-1.5">
          <SeverityIcon className={cn('w-3.5 h-3.5', severityColor)} />
          {metricLabel}
        </span>
        <span className={cn('font-bold tabular-nums', severityColor)}>
          P{percentile}
        </span>
      </div>

      {/* Percentile bar */}
      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
        {/* Normal range (p25-p75) */}
        <div
          className="absolute h-full bg-emerald-500/20 rounded-full"
          style={{ left: '25%', width: '50%' }}
        />
        {/* Notable range edges */}
        <div
          className="absolute h-full bg-amber-500/15 rounded-l-full"
          style={{ left: '10%', width: '15%' }}
        />
        <div
          className="absolute h-full bg-amber-500/15 rounded-r-full"
          style={{ left: '75%', width: '15%' }}
        />
        {/* User position marker */}
        <div
          className={cn(
            'absolute top-0 h-full w-1 rounded-full',
            severity === 'outlier' ? 'bg-destructive' :
            severity === 'notable' ? 'bg-amber-500' : 'bg-emerald-500'
          )}
          style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>P10</span>
        <span>P25</span>
        <span>P50</span>
        <span>P75</span>
        <span>P90</span>
      </div>

      {/* Explanation */}
      {severity !== 'normal' && (
        <p className="text-xs text-muted-foreground leading-relaxed pl-5">
          {explanation}
        </p>
      )}
    </div>
  );
}
