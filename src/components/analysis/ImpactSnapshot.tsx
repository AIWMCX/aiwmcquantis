import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImpactRow {
  label: string;
  before: number;
  after: number;
  format?: 'currency' | 'months' | 'percent';
}

interface ImpactSnapshotProps {
  rows: ImpactRow[];
  hasChanges: boolean;
}

function formatValue(v: number, format: ImpactRow['format'] = 'currency'): string {
  if (format === 'months') return `${Math.round(v)} mo`;
  if (format === 'percent') return `${v.toFixed(1)}%`;
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

function DiffChip({ before, after, format }: { before: number; after: number; format?: ImpactRow['format'] }) {
  const diff = after - before;
  if (Math.abs(diff) < 0.5) {
    return <span className="flex items-center gap-0.5 text-[10px] text-[var(--q-text-tertiary)]"><Minus className="w-3 h-3" /> No change</span>;
  }
  const isPositive = diff > 0;
  const Icon = isPositive ? ArrowUp : ArrowDown;
  const color = isPositive ? 'text-[var(--q-status-green)]' : 'text-[var(--q-status-red)]';
  return (
    <span className={cn('flex items-center gap-0.5 text-[10px] font-semibold', color)}>
      <Icon className="w-3 h-3" />
      {isPositive ? '+' : ''}{formatValue(diff, format)}
    </span>
  );
}

export function ImpactSnapshot({ rows, hasChanges }: ImpactSnapshotProps) {
  return (
    <div className={cn(
      'q-card p-5 border-l-4 transition-all',
      hasChanges ? 'border-l-[var(--q-accent-primary)] q-focal-glow' : 'border-l-[var(--q-border-default)]'
    )}>
      <h4 className="text-label mb-3">Impact Snapshot</h4>
      {!hasChanges && (
        <p className="text-xs text-[var(--q-text-tertiary)]">Adjust levers to see projected impact.</p>
      )}
      {hasChanges && (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="text-[var(--q-text-secondary)]">{row.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[var(--q-text-tertiary)] text-xs font-mono line-through">
                  {formatValue(row.before, row.format)}
                </span>
                <span className="text-foreground font-semibold font-mono">
                  {formatValue(row.after, row.format)}
                </span>
                <DiffChip before={row.before} after={row.after} format={row.format} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
