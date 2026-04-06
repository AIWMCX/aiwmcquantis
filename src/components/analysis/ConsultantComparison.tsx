import React from 'react';
import { Clock, DollarSign } from 'lucide-react';

interface ConsultantComparisonProps {
  analysisSeconds?: number;
}

export function ConsultantComparison({ analysisSeconds }: ConsultantComparisonProps) {
  const timeDisplay = analysisSeconds
    ? `${analysisSeconds} seconds`
    : 'under 90 seconds';

  return (
    <div
      className="animate-fade-in flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--q-border-default)] bg-[var(--q-bg-elevated)]"
      style={{ animationFillMode: 'both' }}
    >
      <div className="flex items-center gap-1.5 text-[var(--q-text-tertiary)]">
        <Clock className="w-3.5 h-3.5" />
        <DollarSign className="w-3.5 h-3.5" />
      </div>
      <p className="text-xs text-[var(--q-text-secondary)] leading-relaxed">
        <span className="text-[var(--q-text-primary)] font-medium">
          This analysis would cost $1,500–$25,000
        </span>
        {' '}from a financial consultant.{' '}
        <span className="text-[var(--q-accent-primary)] font-medium">
          You got it in {timeDisplay}.
        </span>
      </p>
    </div>
  );
}
