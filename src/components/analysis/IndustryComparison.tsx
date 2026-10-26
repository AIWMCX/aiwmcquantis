import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IndustryComparisonProps {
  metrics: {
    revenue: number;
    margin: number;
    ltvCacRatio: number;
  };
  industryAvg?: {
    revenue?: number;
    margin?: number;
    ltvCacRatio?: number;
  };
  industryName?: string;
}

function ComparisonBar({ label, value, benchmark, unit = '', suffix = '' }: {
  label: string;
  value: number;
  benchmark: number;
  unit?: string;
  suffix?: string;
}) {
  // For the bar: benchmark is always at 50%. User value scales proportionally.
  const benchmarkPos = 50;

  // Handle negative values: shift the scale so 0 maps to a visible position
  let userWidth: number;
  const isNegativeValue = value < 0;
  const isNegativeBenchmark = benchmark < 0;

  if (benchmark === 0) {
    userWidth = 0;
  } else if (isNegativeValue && !isNegativeBenchmark) {
    // Negative value vs positive benchmark: show a thin red bar at 0
    userWidth = 0;
  } else {
    userWidth = Math.min(Math.max((value / benchmark) * benchmarkPos, 0), 100);
  }

  const diff = benchmark !== 0 ? value - benchmark : 0;
  const diffPct = benchmark !== 0 ? ((diff / Math.abs(benchmark)) * 100) : 0;
  const isAbove = diff > 0;
  const isEqual = Math.abs(diffPct) < 5;

  // Determine bar color
  const barColorClass = isNegativeValue
    ? 'bg-destructive'
    : isAbove
    ? 'bg-emerald-500'
    : isEqual
    ? 'bg-primary'
    : 'bg-amber-500';

  // Determine diff text color
  const diffColorClass = isAbove
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-destructive';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-foreground tabular-nums">
            {unit}{value.toLocaleString('en-US')}{suffix}
          </span>
          {!isEqual && (
            <span className={cn('text-xs font-medium flex items-center gap-0.5', diffColorClass)}>
              {isAbove ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isAbove ? '+' : ''}{diffPct.toFixed(0)}%
            </span>
          )}
          {isEqual && (
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-0.5">
              <Minus className="w-3 h-3" /> avg
            </span>
          )}
        </div>
      </div>
      {/* Bar */}
      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
        {/* Industry avg marker at 50% */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/40 z-10"
          style={{ left: `${benchmarkPos}%` }}
          title={`Industry avg: ${unit}${benchmark.toLocaleString('en-US')}${suffix}`}
        />
        {/* Your value bar */}
        {isNegativeValue && !isNegativeBenchmark ? (
          /* For negative values against positive benchmark, show a "below zero" indicator */
          <div className="h-full w-full flex items-center justify-center">
            <span className="text-[9px] font-medium text-destructive">Below zero</span>
          </div>
        ) : (
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColorClass)}
            style={{ width: `${userWidth}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0</span>
        <span className="tabular-nums">Industry avg: {unit}{benchmark.toLocaleString('en-US')}{suffix}</span>
      </div>
    </div>
  );
}

export function IndustryComparison({ metrics, industryAvg, industryName }: IndustryComparisonProps) {
  const defaults = {
    revenue: industryAvg?.revenue || 10000,
    margin: industryAvg?.margin || 15,
    ltvCacRatio: industryAvg?.ltvCacRatio || 3,
  };

  const percentile = useMemo(() => {
    let score = 50;
    if (metrics.revenue > defaults.revenue) score += 15;
    if (metrics.margin > defaults.margin) score += 15;
    if (metrics.ltvCacRatio > defaults.ltvCacRatio) score += 10;
    if (metrics.revenue > defaults.revenue * 1.5) score += 5;
    if (metrics.margin > defaults.margin * 1.3) score += 5;
    if (metrics.revenue < defaults.revenue * 0.5) score -= 10;
    if (metrics.margin < 0) score -= 15;
    return Math.min(95, Math.max(15, score));
  }, [metrics, defaults]);

  return (
    <div className="section-card">
      <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        How You Compare{industryName ? ` to ${industryName}` : ''}
      </h3>
      <p className="text-xs text-muted-foreground mb-5">
        Your metrics vs. industry benchmarks. The line marks the industry average.
      </p>

      <div className="space-y-5">
        <ComparisonBar
          label="Monthly Revenue"
          value={metrics.revenue}
          benchmark={defaults.revenue}
          unit="$"
        />
        <ComparisonBar
          label="Net Margin"
          value={metrics.margin}
          benchmark={defaults.margin}
          suffix="%"
        />
        <ComparisonBar
          label="LTV:CAC Ratio"
          value={metrics.ltvCacRatio}
          benchmark={defaults.ltvCacRatio}
          suffix="x"
        />
      </div>

      {/* Percentile badge */}
      <div className="mt-5 p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
        <p className="text-2xl font-black text-primary tabular-nums">Top {100 - percentile}%</p>
        <p className="text-sm text-muted-foreground">
          You{'\u2019'}re outperforming {percentile}% of similar businesses
        </p>
      </div>
    </div>
  );
}
