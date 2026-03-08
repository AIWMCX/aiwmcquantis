import React from 'react';

interface FormProgressBarProps {
  filledCount: number;
  totalCount: number;
}

export function FormProgressBar({ filledCount, totalCount }: FormProgressBarProps) {
  const percent = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--q-text-tertiary)] font-medium" style={{ fontFamily: 'var(--q-font-body)' }}>
          Step {filledCount} of {totalCount}
        </span>
        <span className="text-[var(--q-text-tertiary)] tabular-nums">{percent}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--q-bg-elevated)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percent}%`,
            background: 'linear-gradient(90deg, var(--q-accent-primary), var(--q-accent-hover))',
          }}
        />
      </div>
    </div>
  );
}
