import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RefreshCw, Calculator } from 'lucide-react';
import { Decimal } from 'decimal.js';

interface InlineAssumptionEditorProps {
  initialCac?: number;
  initialRent?: number;
  initialTicketSize?: number;
  onRecalculate: (overrides: { cac: number; rent: number; ticketSize: number }) => void;
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

  // Sync if initial props change
  useEffect(() => {
    if (!isDirty) {
      setCac(initialCac);
      setRent(initialRent);
      setTicketSize(initialTicketSize);
    }
  }, [initialCac, initialRent, initialTicketSize, isDirty]);

  const handleApply = () => {
    onRecalculate({ cac, rent, ticketSize });
    setIsDirty(false);
  };

  const handleReset = () => {
    setCac(initialCac);
    setRent(initialRent);
    setTicketSize(initialTicketSize);
    onRecalculate({ cac: initialCac, rent: initialRent, ticketSize: initialTicketSize });
    setIsDirty(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          Assumption Overrides
        </h4>
        {isDirty && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs px-2 h-auto py-1">
            Reset
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <Label>Customer Acquisition Cost (CAC)</Label>
            <span className="font-mono text-muted-foreground">${cac.toFixed(0)}</span>
          </div>
          <Slider 
            value={[cac]} 
            min={Math.max(1, initialCac * 0.1)} 
            max={initialCac * 3 || 1000} 
            step={1}
            onValueChange={([val]) => { setCac(val); setIsDirty(true); }} 
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <Label>Monthly Fixed Rent/Overhead</Label>
            <span className="font-mono text-muted-foreground">${rent.toFixed(0)}</span>
          </div>
          <Slider 
            value={[rent]} 
            min={Math.max(0, initialRent * 0.5)} 
            max={initialRent * 2 || 5000} 
            step={100}
            onValueChange={([val]) => { setRent(val); setIsDirty(true); }} 
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <Label>Average Ticket Size</Label>
            <span className="font-mono text-muted-foreground">${ticketSize.toFixed(0)}</span>
          </div>
          <Slider 
            value={[ticketSize]} 
            min={Math.max(1, initialTicketSize * 0.5)} 
            max={initialTicketSize * 2 || 500} 
            step={1}
            onValueChange={([val]) => { setTicketSize(val); setIsDirty(true); }} 
          />
        </div>
      </div>

      <Button 
        onClick={handleApply} 
        disabled={!isDirty} 
        className="w-full gap-2 transition-all"
        size="sm"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isDirty ? 'animate-spin-once' : ''}`} />
        Recalculate Projections
      </Button>
    </div>
  );
}
