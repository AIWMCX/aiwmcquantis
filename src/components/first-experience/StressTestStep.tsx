import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { GlassCard } from '@/components/ui/glass-card';
import type { FounderDemoResult } from '@/lib/demo/founder-decision-demo';
import { fmtUsd } from './format';

interface Props {
  cac: number;
  onChangeCac: (v: number) => void;
  result: FounderDemoResult;
  touched: boolean;
}

export function StressTestStep({ cac, onChangeCac, result, touched }: Props) {
  return (
    <GlassCard className={`p-6 border-2 ${result.holds ? 'border-emerald-500/40' : 'border-destructive/40'}`}>
      <h2 className="text-lg font-semibold mb-1">A good plan is not one forecast.</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Move the blended CAC assumption and watch what actually happens to the decision.
      </p>

      <div className="mb-6 space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-foreground">Blended CAC</label>
          <span className="text-sm font-bold text-primary">{fmtUsd(cac)}</span>
        </div>
        <Slider
          value={[cac]}
          onValueChange={([v]) => onChangeCac(v)}
          min={400}
          max={3000}
          step={10}
          className="w-full"
          aria-label="Blended CAC"
        />
      </div>

      <div className="flex items-center gap-2 mb-4">
        {result.holds ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
        )}
        <span className="font-semibold">{result.holds ? 'Decision holds' : 'Decision is financially fragile'}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-border p-3">
          <p className="text-muted-foreground text-xs">Payback</p>
          <p className="text-xl font-bold">{result.paybackMonth ? `Month ${result.paybackMonth}` : 'Never'}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-muted-foreground text-xs">Lowest cash</p>
          <p className="text-xl font-bold">{fmtUsd(result.lowestCash)}</p>
        </div>
      </div>

      {!touched && (
        <p className="text-xs text-muted-foreground mt-5">Move the slider to see revenue keep growing while cash quietly gets worse.</p>
      )}
    </GlassCard>
  );
}
