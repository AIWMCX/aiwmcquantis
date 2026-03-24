import React, { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RefreshCw, SlidersHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineAssumptionEditorProps {
  initialCac?: number;
  initialRent?: number;
  initialTicketSize?: number;
  onRecalculate: (overrides: { cac: number; rent: number; ticketSize: number }) => void;
}

function ImpactChip({ initial, current, format = 'currency' }: { initial: number; current: number; format?: 'currency' | 'plain' }) {
  const diff = current - initial;
  if (Math.abs(diff) < 0.5) return null;
  const isUp = diff > 0;
  const Icon = isUp ? ArrowUp : ArrowDown;
  const label = format === 'currency'
    ? `${isUp ? '+' : ''}$${Math.abs(diff).toFixed(0)}`
    : `${isUp ? '+' : ''}${diff.toFixed(0)}`;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-all',
      isUp ? 'text-[var(--q-status-green)] bg-[var(--q-status-green-bg)]' : 'text-[var(--q-status-red)] bg-[var(--q-status-red-bg)]'
    )}>
      <Icon className="w-2.5 h-2.5" />{label}
    </span>
  );
}

export function InlineAssumptionEditor({ 
  initialCac = 0, 
  initialRent = 0, 
  initialTicketSize = 0, 
  onRecalculate 
}: InlineAssumptionEditorProps) {
  const [cac, setCac] = useState(initialCac);
  const [rent, setRent] = useState(initialRent);
  const [ticketSize, setTicketSize] = useState(initialTicketSize);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setCac(initialCac);
      setRent(initialRent);
      setTicketSize(initialTicketSize);
    }
  }, [initialCac, initialRent, initialTicketSize, isDirty]);

  // Auto-apply on change (debounced feel via slider)
  useEffect(() => {
    if (isDirty) {
      onRecalculate({ cac, rent, ticketSize });
    }
  }, [cac, rent, ticketSize, isDirty]);

  const handleReset = () => {
    setCac(initialCac);
    setRent(initialRent);
    setTicketSize(initialTicketSize);
    onRecalculate({ cac: initialCac, rent: initialRent, ticketSize: initialTicketSize });
    setIsDirty(false);
  };

  const levers = useMemo(() => [
    {
      id: 'cac',
      label: 'Customer Acquisition Cost',
      sublabel: 'Revenue Lever',
      value: cac,
      initial: initialCac,
      min: Math.max(1, initialCac * 0.1),
      max: initialCac * 3 || 1000,
      step: 1,
      prefix: '$',
      onChange: (v: number) => { setCac(v); setIsDirty(true); },
      group: 'revenue' as const,
    },
    {
      id: 'ticketSize',
      label: 'Average Ticket Size',
      sublabel: 'Revenue Lever',
      value: ticketSize,
      initial: initialTicketSize,
      min: Math.max(1, initialTicketSize * 0.5),
      max: initialTicketSize * 2 || 500,
      step: 1,
      prefix: '$',
      onChange: (v: number) => { setTicketSize(v); setIsDirty(true); },
      group: 'revenue' as const,
    },
    {
      id: 'rent',
      label: 'Monthly Fixed Overhead',
      sublabel: 'Cost Lever',
      value: rent,
      initial: initialRent,
      min: Math.max(0, initialRent * 0.5),
      max: initialRent * 2 || 5000,
      step: 100,
      prefix: '$',
      onChange: (v: number) => { setRent(v); setIsDirty(true); },
      group: 'cost' as const,
    },
  ], [cac, rent, ticketSize, initialCac, initialRent, initialTicketSize]);

  return (
    <div className={cn(
      'q-card p-5 space-y-5 transition-all',
      isDirty && 'q-focal-glow'
    )}>
      <div className="flex items-center justify-between">
        <h4 className="text-label flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[var(--q-accent-primary)]" />
          Adjust Your Levers
        </h4>
        {isDirty && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs px-2 py-1 gap-1">
            <RefreshCw className="w-3 h-3" /> Reset
          </Button>
        )}
      </div>

      {/* Revenue Levers */}
      <div className="space-y-4">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--q-status-green)]">Revenue Levers</span>
        {levers.filter(l => l.group === 'revenue').map((lever) => (
          <div key={lever.id} className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <Label className="text-[var(--q-text-secondary)]">{lever.label}</Label>
              <div className="flex items-center gap-2">
                <span className="text-metric-xs tabular-nums">{lever.prefix}{lever.value.toFixed(0)}</span>
                <ImpactChip initial={lever.initial} current={lever.value} />
              </div>
            </div>
            <Slider
              value={[lever.value]}
              min={lever.min}
              max={lever.max}
              step={lever.step}
              onValueChange={([val]) => lever.onChange(val)}
            />
          </div>
        ))}
      </div>

      {/* Cost Levers */}
      <div className="space-y-4">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--q-status-red)]">Cost Levers</span>
        {levers.filter(l => l.group === 'cost').map((lever) => (
          <div key={lever.id} className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <Label className="text-[var(--q-text-secondary)]">{lever.label}</Label>
              <div className="flex items-center gap-2">
                <span className="text-metric-xs tabular-nums">{lever.prefix}{lever.value.toFixed(0)}</span>
                <ImpactChip initial={lever.initial} current={lever.value} />
              </div>
            </div>
            <Slider
              value={[lever.value]}
              min={lever.min}
              max={lever.max}
              step={lever.step}
              onValueChange={([val]) => lever.onChange(val)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
