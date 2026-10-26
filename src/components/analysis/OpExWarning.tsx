import React, { useMemo } from 'react';
import { estimateOpEx } from '@/lib/opex-calculator';
import { AlertTriangle, Users } from 'lucide-react';

interface OpExWarningProps {
  industry: string;
  inputs: { customers?: number; revenue?: number };
  location: string;
  userOpEx: number;
}

export function OpExWarning({ industry, inputs, location, userOpEx }: OpExWarningProps) {
  const estimate = useMemo(
    () => userOpEx > 0 ? estimateOpEx(industry, inputs, location, userOpEx) : null,
    [industry, inputs, location, userOpEx]
  );

  if (!estimate || !estimate.deltaWarning) return null;

  const isUnder = estimate.delta < 0;

  return (
    <div className="mt-2 p-3 rounded-lg border bg-[var(--q-status-yellow-bg)] border-[var(--q-status-yellow-border)]">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-[var(--q-status-yellow)] flex-shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[var(--q-text-primary)]">
            {isUnder ? 'OpEx may be understated' : 'OpEx above bottom-up estimate'}
          </p>
          <p className="text-xs text-[var(--q-text-secondary)] leading-relaxed">
            Bottom-up estimate: <span className="font-mono font-semibold">${estimate.total.toLocaleString('en-US')}/mo</span>
            {' '}(your input: ${userOpEx.toLocaleString('en-US')}/mo · {estimate.deltaPercent}% {isUnder ? 'below' : 'above'} estimate)
          </p>

          {/* Labor breakdown */}
          <div className="space-y-0.5 pt-1">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--q-text-tertiary)] flex items-center gap-1">
              <Users className="w-3 h-3" /> Estimated Staffing
            </p>
            {estimate.laborBreakdown.map((role, i) => (
              <p key={i} className="text-[11px] text-[var(--q-text-secondary)]" style={{ fontFamily: 'var(--q-font-mono)' }}>
                {role.count}× {role.role}: ${role.monthlyCost.toLocaleString('en-US')}/mo
              </p>
            ))}
          </div>

          <p className="text-[10px] text-[var(--q-text-disabled)] italic">
            Source: {estimate.source}
          </p>
        </div>
      </div>
    </div>
  );
}
