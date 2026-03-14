import React, { useMemo } from 'react';
import { checkNarrativeCoherence } from '@/lib/coherence-check';
import { AlertTriangle, Lightbulb } from 'lucide-react';

interface CoherenceFlagsProps {
  description: string;
  inputs: { arpu?: number; cac?: number; churnRate?: number; expectedCustomers?: number };
  industryType: string;
}

export function CoherenceFlags({ description, inputs, industryType }: CoherenceFlagsProps) {
  const result = useMemo(
    () => checkNarrativeCoherence(description, inputs, industryType),
    [description, inputs, industryType]
  );

  if (result.passed) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--q-text-tertiary)] flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-[var(--q-status-yellow)]" />
        Narrative Coherence Check
      </h4>
      {result.flags.map((flag, i) => (
        <div
          key={i}
          className="p-3 rounded-lg border bg-[var(--q-status-yellow-bg)] border-[var(--q-status-yellow-border)]"
        >
          <p className="text-xs font-medium text-[var(--q-text-primary)] mb-1">{flag.type.replace(/_/g, ' ')}</p>
          <p className="text-xs text-[var(--q-text-secondary)] leading-relaxed">{flag.message}</p>
          <p className="text-xs text-[var(--q-accent-primary)] mt-1.5 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" /> {flag.suggestion}
          </p>
        </div>
      ))}
    </div>
  );
}
