import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FreeVsProMatrixProps {
  compact?: boolean;
  className?: string;
}

const features = [
  { label: 'Scenarios', free: '3 / month', pro: 'Unlimited' },
  { label: 'Benchmark depth', free: 'Quick', pro: 'Full forensic' },
  { label: 'PDF & exports', free: false, pro: true },
  { label: 'Monte Carlo', free: false, pro: true },
  { label: 'Custom branding', free: false, pro: true },
  { label: 'Priority support', free: false, pro: true },
];

export function FreeVsProMatrix({ compact = false, className }: FreeVsProMatrixProps) {
  const rows = compact ? features.slice(0, 4) : features;

  return (
    <div className={cn('rounded-lg border border-border overflow-hidden', className)}>
      {/* Header */}
      <div className="grid grid-cols-3 text-xs font-medium bg-muted/50">
        <div className="p-2 text-muted-foreground">Feature</div>
        <div className="p-2 text-center text-muted-foreground">Free</div>
        <div className="p-2 text-center text-primary">Plus</div>
      </div>
      {/* Rows */}
      {rows.map((f, i) => (
        <div
          key={f.label}
          className={cn(
            'grid grid-cols-3 text-xs border-t border-border',
            i % 2 === 0 ? 'bg-background' : 'bg-muted/20'
          )}
        >
          <div className="p-2 text-foreground">{f.label}</div>
          <div className="p-2 flex items-center justify-center">
            {typeof f.free === 'string' ? (
              <span className="text-muted-foreground">{f.free}</span>
            ) : f.free ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : (
              <X className="w-3.5 h-3.5 text-muted-foreground/40" />
            )}
          </div>
          <div className="p-2 flex items-center justify-center">
            {typeof f.pro === 'string' ? (
              <span className="text-primary font-medium">{f.pro}</span>
            ) : f.pro ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : (
              <X className="w-3.5 h-3.5 text-muted-foreground/40" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
