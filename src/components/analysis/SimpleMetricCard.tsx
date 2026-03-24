import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
}

export function SimpleMetricCard({ title, value, variant = 'standard', chip, benchmarkNote, explanation }: SimpleMetricCardProps) {
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

  const chipLabel = chip || (
    variant === 'success' ? 'Good vs peers' :
    variant === 'warning' ? 'Below median' :
    variant === 'danger' ? 'Critical' :
    undefined
  );

  const card = (
    <div className="q-card p-3 text-center space-y-1 hover:shadow-none">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className={cn('text-metric-md', variantColors[variant])}>{value}</p>
      {chipLabel && (
        <span className={cn('inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full', chipColors[variant])}>
          {chipLabel}
        </span>
      )}
      {benchmarkNote && (
        <p className="text-[9px] text-[var(--q-text-tertiary)] font-mono">{benchmarkNote}</p>
      )}
    </div>
  );

  if (explanation) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-xs">
            {explanation}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return card;
}
