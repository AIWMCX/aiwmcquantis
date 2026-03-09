import React from 'react';
import { cn } from '@/lib/utils';

interface SimpleMetricCardProps {
  title: string;
  value: string;
  variant?: 'standard' | 'success' | 'warning' | 'danger';
}

export function SimpleMetricCard({ title, value, variant = 'standard' }: SimpleMetricCardProps) {
  const variantColors = {
    standard: 'text-foreground',
    success: 'text-[var(--q-status-green)]',
    warning: 'text-[var(--q-status-yellow)]',
    danger: 'text-[var(--q-status-red)]',
  };

  return (
    <div className="q-card p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{title}</p>
      <p className={cn('text-lg font-semibold font-mono', variantColors[variant])}>{value}</p>
    </div>
  );
}
