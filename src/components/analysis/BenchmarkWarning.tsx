import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WarningLevel } from '@/lib/benchmark-calibrator';

interface BenchmarkWarningProps {
  warningLevel: WarningLevel;
  message: string;
  benchmarkRange: { p25: number; p75: number };
  percentile: number;
  unit?: string;
  onUseMedian?: () => void;
  className?: string;
}

export function BenchmarkWarning({
  warningLevel,
  message,
  onUseMedian,
  className,
}: BenchmarkWarningProps) {
  if (warningLevel === 'none') return null;

  if (warningLevel === 'mild') {
    return (
      <div className={cn('flex items-center gap-1.5 mt-1', className)}>
        <span className="w-2 h-2 rounded-full bg-[var(--q-status-yellow)] flex-shrink-0" />
        <span className="text-xs text-[var(--q-text-tertiary)]">{message}</span>
      </div>
    );
  }

  if (warningLevel === 'strong') {
    return (
      <div
        className={cn(
          'flex items-start gap-2.5 mt-2 p-3 rounded-[var(--q-radius-md)] border',
          'bg-[var(--q-status-yellow-bg)] border-[var(--q-status-yellow-border)] text-[var(--q-status-yellow)]',
          'animate-in slide-in-from-top-1 fade-in duration-200',
          className
        )}
      >
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs leading-snug text-[var(--q-text-primary)]">{message}</p>
          {onUseMedian && (
            <button
              type="button"
              onClick={onUseMedian}
              className="mt-1.5 text-xs font-semibold px-3 py-1 rounded-[var(--q-radius-sm)] bg-[var(--q-status-yellow)]/15 text-[var(--q-status-yellow)] hover:bg-[var(--q-status-yellow)]/25 transition-colors duration-[var(--q-duration-fast)]"
            >
              Use median
            </button>
          )}
        </div>
      </div>
    );
  }

  // critical
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 mt-2 p-3 rounded-[var(--q-radius-md)] border',
        'bg-[var(--q-status-red-bg)] border-[var(--q-status-red-border)] text-[var(--q-status-red)]',
        'animate-in slide-in-from-top-1 fade-in duration-200',
        'border-l-[3px] border-l-[var(--q-status-red)]',
        className
      )}
    >
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 animate-pulse" />
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-snug font-medium text-[var(--q-text-primary)]">{message}</p>
        {onUseMedian && (
          <button
            type="button"
            onClick={onUseMedian}
            className="mt-1.5 text-xs font-semibold px-3 py-1 rounded-[var(--q-radius-sm)] bg-[var(--q-status-red)]/15 text-[var(--q-status-red)] hover:bg-[var(--q-status-red)]/25 transition-colors duration-[var(--q-duration-fast)]"
          >
            Adjust to realistic
          </button>
        )}
      </div>
    </div>
  );
}
