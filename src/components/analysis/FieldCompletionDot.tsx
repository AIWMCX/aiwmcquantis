import React from 'react';
import { cn } from '@/lib/utils';

interface FieldCompletionDotProps {
  isComplete: boolean;
  className?: string;
}

export function FieldCompletionDot({ isComplete, className }: FieldCompletionDotProps) {
  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full transition-all duration-300 ease-out',
        isComplete
          ? 'bg-[var(--q-status-green)] scale-100 opacity-100'
          : 'bg-transparent scale-0 opacity-0',
        className
      )}
      aria-hidden="true"
    />
  );
}
