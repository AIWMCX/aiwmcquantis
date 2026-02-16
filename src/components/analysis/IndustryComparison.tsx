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
  const ratio = benchmark > 0 ? Math.min(value / benchmark, 2) : 1;
  const percentage = Math.round(ratio * 100);
  const diff = value - benchmark;
  const isAbove = diff > 0;
  const isEqual = Math.abs(diff) < benchmark * 0.05;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-foreground">
            {unit}{value.toLocaleString()}{suffix}
          </span>
          {!isEqual && (
            <span className={cn(
              'text-xs font-medium flex items-center gap-0.5',
              isAbove ? 'text-success' : 'text-destructive'
            )}>
              {isAbove ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isAbove ? '+' : ''}{((diff / benchmark) * 100).toFixed(0)}%
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
        {/* Industry avg marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/40 z-10"
          style={{ left: `${Math.min(50, 100)}%` }}
          title="Industry average"
        />
        {/* Your value */}
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isAbove ? 'bg-success' : isEqual ? 'bg-primary' : 'bg-amber-500'
          )}
          style={{ width: `${Math.min(percentage / 2, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0</span>
        <span>Industry avg: {unit}{benchmark.toLocaleString()}{suffix}</span>
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

  // Percentile ranking estimate
  const percentile = useMemo(() => {
    let score = 50;
    if (metrics.revenue > defaults.revenue) score += 15;
    if (metrics.margin > defaults.margin) score += 15;
    if (metrics.ltvCacRatio > defaults.ltvCacRatio) score += 10;
    if (metrics.revenue > defaults.revenue * 1.5) score += 5;
    if (metrics.margin > defaults.margin * 1.3) score += 5;
    return Math.min(99, Math.max(10, score));
  }, [metrics, defaults]);

  return (
    <div className="section-card">
      <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        How You Compare{industryName ? ` to ${industryName}` : ''}
      </h3>
      <p className="text-xs text-muted-foreground mb-5">
        Your metrics vs. industry benchmarks
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
        <p className="text-2xl font-black text-primary">Top {100 - percentile}%</p>
        <p className="text-sm text-muted-foreground">
          You{'\u2019'}re outperforming {percentile}% of similar businesses
        </p>
      </div>
    </div>
  );
}
