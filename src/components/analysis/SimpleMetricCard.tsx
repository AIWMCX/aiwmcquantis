import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { BenchmarkBadge } from './BenchmarkBadge';
import type { BenchmarkMetric, BenchmarkContext } from '@/services/benchmark-lookup';

interface SimpleMetricCardProps {
  title: string;
  value: string;
  variant?: 'standard' | 'success' | 'warning' | 'danger';
  /** Interpretive chip: "Good vs peers", "Below median", etc. */
  chip?: string;
  /** Benchmark percentile: "P70 for Denver media" */
  benchmarkNote?: string;
  /** Tooltip explaining "why" in plain English */
  explanation?: string;
  /** Plain-language hint always visible below metric */
  hint?: string;
  /** Metric key for the 95,500-row Benchmark Master library */
  benchmarkMetric?: BenchmarkMetric;
  /** Sector/geo context for benchmark lookup */
  benchmarkContext?: BenchmarkContext;
  /** Numeric form of the user's value, used to position vs P25/P75 */
  numericValue?: number;
}

/** Plain-language default hints for common metric titles */
const DEFAULT_HINTS: Record<string, string> = {
  'Monthly Revenue M12': 'Projected monthly income at month 12',
  'Net Profit M12': 'Monthly earnings after all expenses at month 12',
  'Gross Margin %': 'How much you keep from each dollar of revenue before overhead',
  'LTV:CAC Ratio': 'Customer lifetime value ÷ cost to acquire them. Above 3× is healthy',
  'Break-even Month': 'When your business starts covering all its costs',
  'Cash Runway': 'How many months you can operate before running out of money',
};

export function SimpleMetricCard({ title, value, variant = 'standard', chip, benchmarkNote, explanation, hint, benchmarkMetric, benchmarkContext, numericValue }: SimpleMetricCardProps) {
  const variantColors = {
    standard: 'text-foreground',
    success: 'text-[var(--q-status-green)]',
    warning: 'text-[var(--q-status-yellow)]',
    danger: 'text-[var(--q-status-red)]',
  };

  const chipColors = {
    standard: 'bg-[var(--q-bg-elevated)] text-[var(--q-text-tertiary)]',
    success: 'bg-[var(--q-status-green-bg)] text-[var(--q-status-green)]',
    warning: 'bg-[var(--q-status-yellow-bg)] text-[var(--q-status-yellow)]',
    danger: 'bg-[var(--q-status-red-bg)] text-[var(--q-status-red)]',
  };

  const chipLabel = chip;

  const resolvedHint = hint || DEFAULT_HINTS[title];
  const resolvedExplanation = explanation || resolvedHint;

  const card = (
    <div className="q-card p-3.5 text-center space-y-1.5 hover:shadow-none group relative">
      <div className="flex items-center justify-center gap-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{title}</p>
        {resolvedExplanation && (
          <Info className="w-3 h-3 text-[var(--q-accent-primary)] opacity-70 shrink-0" />
        )}
      </div>
      <p className={cn('text-metric-md', variantColors[variant])}>{value}</p>
      {chipLabel && (
        <span className={cn('inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full', chipColors[variant])}>
          {chipLabel}
        </span>
      )}
      {resolvedHint && (
        <p className="text-[11px] text-[var(--q-text-secondary)] leading-tight mt-1 border-l-2 border-[var(--q-accent-primary)]/30 pl-2">{resolvedHint}</p>
      )}
      {benchmarkMetric ? (
        <div className="pt-1 flex justify-center">
          <BenchmarkBadge metric={benchmarkMetric} context={benchmarkContext} userValue={numericValue} />
        </div>
      ) : benchmarkNote ? (
        <p className="text-[10px] text-[var(--q-text-tertiary)] font-mono">{benchmarkNote}</p>
      ) : null}
    </div>
  );

  if (resolvedExplanation) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed p-3">
            <p className="font-semibold mb-1">{title}</p>
            <p>{resolvedExplanation}</p>
            <a
              href="https://www.aiwmcquantis.com/methodology"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-[var(--q-accent-primary)] hover:underline text-[10px]"
            >
              How we calculate this →
            </a>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return card;
}
