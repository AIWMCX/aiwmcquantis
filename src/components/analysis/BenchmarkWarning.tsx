import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
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
        <span className="w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-500 flex-shrink-0" />
        <span className="text-xs text-muted-foreground">{message}</span>
      </div>
    );
  }

  if (warningLevel === 'strong') {
    return (
      <div
        className={cn(
          'flex items-start gap-2 mt-1.5 p-2 rounded-md border',
          'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300',
          className
        )}
      >
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs leading-snug">{message}</p>
          {onUseMedian && (
            <button
              type="button"
              onClick={onUseMedian}
              className="mt-1 text-xs font-medium underline underline-offset-2 hover:no-underline text-amber-700 dark:text-amber-400 transition-colors"
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
        'flex items-start gap-2 mt-1.5 p-2 rounded-md border',
        'bg-destructive/10 border-destructive/20 text-destructive',
        className
      )}
    >
      <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-snug">{message}</p>
        {onUseMedian && (
          <button
            type="button"
            onClick={onUseMedian}
            className="mt-1 text-xs font-medium underline underline-offset-2 hover:no-underline transition-colors"
          >
            Adjust to realistic
          </button>
        )}
      </div>
    </div>
  );
}
