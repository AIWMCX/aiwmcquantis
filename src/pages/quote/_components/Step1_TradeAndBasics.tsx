import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface Step1Value {
  trade_id: string;
  client_name: string;
  site_address: string;
  site_zip: string;
  building_type: string;
  year_built: number | null;
}

interface Props {
  value: Step1Value;
  onChange: (next: Step1Value) => void;
}

const TRADES = [
  { id: 'electrical', name: 'Electrical', enabled: true },
  { id: 'plumbing', name: 'Plumbing', enabled: true },
  { id: 'hvac', name: 'HVAC', enabled: false },
];

const BUILDING_TYPES = ['Residential', 'Commercial', 'Industrial', 'Multifamily', 'Other'];

export function Step1_TradeAndBasics({ value, onChange }: Props) {
  const set = <K extends keyof Step1Value>(k: K, v: Step1Value[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Trade & job basics</h2>
        <p className="text-sm text-muted-foreground">Tell us who and where. You can edit anything later.</p>
      </div>

      <div className="space-y-2">
        <Label>Trade</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TRADES.map((t) => (
            <Card
              key={t.id}
              role="button"
              aria-pressed={value.trade_id === t.id}
              aria-disabled={!t.enabled}
              onClick={() => t.enabled && set('trade_id', t.id)}
              className={cn(
                'min-h-[44px] cursor-pointer transition border-2',
                value.trade_id === t.id ? 'border-primary' : 'border-border',
                !t.enabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <CardContent className="flex items-center justify-between px-4 py-3">
                <span className="font-medium">{t.name}</span>
                {!t.enabled && <Badge variant="secondary">Coming soon</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="client_name">Client name</Label>
          <Input
            id="client_name"
            value={value.client_name}
            onChange={(e) => set('client_name', e.target.value)}
            placeholder="e.g. Acme Restaurant"
            className="min-h-[44px]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="site_zip">Site ZIP</Label>
          <Input
            id="site_zip"
            inputMode="numeric"
            value={value.site_zip}
            onChange={(e) => set('site_zip', e.target.value)}
            placeholder="80202"
            className="min-h-[44px]"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="site_address">Site address</Label>
          <Input
            id="site_address"
            value={value.site_address}
            onChange={(e) => set('site_address', e.target.value)}
            placeholder="1234 Main St, Denver, CO"
            className="min-h-[44px]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="building_type">Building type</Label>
          <select
            id="building_type"
            value={value.building_type}
            onChange={(e) => set('building_type', e.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {BUILDING_TYPES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="year_built">Year built</Label>
          <Input
            id="year_built"
            type="number"
            inputMode="numeric"
            value={value.year_built ?? ''}
            onChange={(e) => set('year_built', e.target.value ? Number(e.target.value) : null)}
            placeholder="1985"
            min={1700}
            max={2100}
            className="min-h-[44px]"
          />
        </div>
      </div>
    </div>
  );
}
