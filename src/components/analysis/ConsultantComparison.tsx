import React from 'react';
import { Clock, DollarSign } from 'lucide-react';
import { CONSULTANT_COST_RANGE_DISPLAY } from '@/config/canonical-facts';

export function ConsultantComparison() {
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
          This analysis would cost {CONSULTANT_COST_RANGE_DISPLAY}
        </span>
        {' '}from a financial consultant.{' '}
        <span className="text-[var(--q-accent-primary)] font-medium">
          You got it for free.
        </span>
      </p>
    </div>
  );
}
