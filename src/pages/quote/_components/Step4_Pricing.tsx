import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PricingProfile } from '@/lib/service-job/types';

interface Props {
  value: PricingProfile;
  onChange: (next: PricingProfile) => void;
}

function pctToNum(v: string): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n) / 100;
}

export function Step4_Pricing({ value, onChange }: Props) {
  const set = <K extends keyof PricingProfile>(k: K, v: PricingProfile[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Pricing & margins</h2>
        <p className="text-sm text-muted-foreground">
          Defaults are based on US trade benchmarks. Override anything you've calibrated to your own books.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="hr_j">Hourly rate — journeyman ($)</Label>
            <Input
              id="hr_j"
              type="number"
              inputMode="decimal"
              min={20}
              value={value.hourly_rate_journeyman}
              onChange={(e) => set('hourly_rate_journeyman', Number(e.target.value) || 0)}
              className="min-h-[44px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hr_h">Hourly rate — helper ($)</Label>
            <Input
              id="hr_h"
              type="number"
              inputMode="decimal"
              min={15}
              value={value.hourly_rate_helper ?? 0}
              onChange={(e) => set('hourly_rate_helper', Number(e.target.value) || 0)}
              className="min-h-[44px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ov">Overhead (%)</Label>
            <Input
              id="ov"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              value={(value.overhead_pct * 100).toFixed(1)}
              onChange={(e) => set('overhead_pct', pctToNum(e.target.value))}
              className="min-h-[44px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tm">Target margin (%)</Label>
            <Input
              id="tm"
              type="number"
              inputMode="decimal"
              min={0}
              max={90}
              value={(value.target_margin_pct * 100).toFixed(1)}
              onChange={(e) => set('target_margin_pct', pctToNum(e.target.value))}
              className="min-h-[44px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mm">Material markup (%)</Label>
            <Input
              id="mm"
              type="number"
              inputMode="decimal"
              min={0}
              max={200}
              value={(value.material_markup_pct * 100).toFixed(1)}
              onChange={(e) => set('material_markup_pct', pctToNum(e.target.value))}
              className="min-h-[44px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wf">Waste factor (%)</Label>
            <Input
              id="wf"
              type="number"
              inputMode="decimal"
              min={0}
              max={50}
              value={(value.waste_factor_default * 100).toFixed(1)}
              onChange={(e) => set('waste_factor_default', pctToNum(e.target.value))}
              className="min-h-[44px]"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tx">Sales tax (%)</Label>
            <Input
              id="tx"
              type="number"
              inputMode="decimal"
              min={0}
              max={25}
              value={(value.tax_rate * 100).toFixed(2)}
              onChange={(e) => set('tax_rate', pctToNum(e.target.value))}
              className="min-h-[44px]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
