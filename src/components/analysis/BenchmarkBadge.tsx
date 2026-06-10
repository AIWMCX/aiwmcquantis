/**
 * BenchmarkBadge — shows P25–P75 range, source, sample size, and date
 * for any metric, or "Estimated · No direct benchmark" when no match.
 */
import React, { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Database, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  lookupBenchmark,
  formatBenchmarkValue,
  compactCitation,
  type BenchmarkMetric,
  type BenchmarkContext,
  type BenchmarkResult,
} from '@/services/benchmark-lookup';

interface BenchmarkBadgeProps {
  metric: BenchmarkMetric;
  context?: BenchmarkContext;
  /** When provided, classifies the user's value vs the P25/P75 band. */
  userValue?: number;
  className?: string;
  size?: 'xs' | 'sm';
}

export function BenchmarkBadge({
  metric,
  context = {},
  userValue,
  className,
  size = 'xs',
}: BenchmarkBadgeProps) {
  const [b, setB] = useState<BenchmarkResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    lookupBenchmark(metric, context).then((r) => {
      if (!cancelled) setB(r);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, context.sector, context.businessModel, context.country, context.cityTier, context.stage, context.size]);

  if (!b) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded font-mono text-[var(--q-text-tertiary)] bg-[var(--q-bg-elevated)] px-1.5 py-0.5',
          size === 'xs' ? 'text-[10px]' : 'text-[11px]',
          className
        )}
        aria-label="Loading benchmark"
      >
        <span className="opacity-50">Bench: …</span>
      </span>
    );
  }

  // Unmatched — show "Estimated · No direct benchmark"
  if (!b.matched) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded font-mono text-[var(--q-status-yellow)] bg-[var(--q-status-yellow-bg)] px-1.5 py-0.5 cursor-help',
                size === 'xs' ? 'text-[10px]' : 'text-[11px]',
                className
              )}
            >
              <AlertCircle className="w-2.5 h-2.5" />
              Estimated · No direct benchmark
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[280px] text-xs leading-relaxed p-3">
            <p className="font-semibold mb-1">Estimated metric</p>
            <p>No directly matching row in the AIWMC Quantis Benchmark Master (97,500 rows). This value is computed by the engine using sector defaults and may carry wider uncertainty.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const fmt = (v?: number) => formatBenchmarkValue(metric, v);
  const range = `${fmt(b.p25)} – ${fmt(b.p75)}`;
  const median = fmt(b.p50);

  // Position vs band
  let position: 'below' | 'in_band' | 'above' | undefined;
  if (typeof userValue === 'number' && b.p25 != null && b.p75 != null) {
    if (userValue < b.p25) position = 'below';
    else if (userValue > b.p75) position = 'above';
    else position = 'in_band';
  }

  const positionColor =
    position === 'in_band'
      ? 'text-[var(--q-status-green)] bg-[var(--q-status-green-bg)]'
      : position === 'above'
      ? 'text-[var(--q-accent-primary)] bg-[var(--q-bg-elevated)]'
      : position === 'below'
      ? 'text-[var(--q-status-orange)] bg-[var(--q-status-yellow-bg)]'
      : 'text-[var(--q-text-secondary)] bg-[var(--q-bg-elevated)]';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded font-mono cursor-help px-1.5 py-0.5',
              positionColor,
              size === 'xs' ? 'text-[10px]' : 'text-[11px]',
              className
            )}
          >
            <Database className="w-2.5 h-2.5 opacity-60" />
            <span>P25–P75: {range}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[320px] text-xs leading-relaxed p-3">
          <p className="font-semibold mb-1.5">Benchmark range</p>
          <div className="space-y-0.5 font-mono text-[11px]">
            <div>P25 (lower quartile): <span className="text-[var(--q-status-orange)]">{fmt(b.p25)}</span></div>
            <div>P50 (median): <span className="text-[var(--q-text-primary)]">{median}</span></div>
            <div>P75 (upper quartile): <span className="text-[var(--q-status-green)]">{fmt(b.p75)}</span></div>
            {typeof userValue === 'number' && (
              <div className="pt-1 mt-1 border-t border-[var(--q-border-default)]">
                Your value: <span className="font-semibold">{fmt(userValue)}</span>
                {' '}({position === 'in_band' ? 'inside band' : position === 'above' ? 'above P75' : 'below P25'})
              </div>
            )}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {compactCitation(b)} · match: {b.matchLevel}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
