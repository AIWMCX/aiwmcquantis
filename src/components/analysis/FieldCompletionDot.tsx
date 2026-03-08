import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldCompletionDotProps {
  isComplete: boolean;
  className?: string;
}

export function FieldCompletionDot({ isComplete, className }: FieldCompletionDotProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-4 h-4 transition-all duration-300 ease-out',
        isComplete ? 'opacity-100 scale-100' : 'opacity-0 scale-0',
        className
      )}
      aria-hidden="true"
    >
      {isComplete && (
        <Check className="w-3.5 h-3.5 text-[var(--q-status-green)]" strokeWidth={3} />
      )}
    </span>
  );
}
