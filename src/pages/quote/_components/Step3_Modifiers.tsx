import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import type { JobModifiers } from '@/lib/service-job/types';

interface Props {
  value: JobModifiers;
  onChange: (next: JobModifiers) => void;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0" />
    </div>
  );
}

export function Step3_Modifiers({ value, onChange }: Props) {
  const set = <K extends keyof JobModifiers>(k: K, v: JobModifiers[K]) =>
    onChange({ ...value, [k]: v });

  const access = (value.access_difficulty as number | undefined) ?? 1;
  const height = (value.height_factor as number | undefined) ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Job modifiers</h2>
        <p className="text-sm text-muted-foreground">
          Anything that shifts time, risk, or rate beyond standard scope.
        </p>
      </div>

      <Card>
        <CardContent className="divide-y p-4">
          <ToggleRow
            label="Emergency"
            description="Same-day, all-hands. Adds 1.5× labor."
            checked={!!value.emergency}
            onChange={(v) => set('emergency', v)}
          />
          <ToggleRow
            label="After-hours"
            description="Outside 7am–5pm. Adds 1.25× labor."
            checked={!!value.after_hours}
            onChange={(v) => set('after_hours', v)}
          />
          <ToggleRow
            label="Weekend"
            description="Sat/Sun work. Adds 1.4× labor."
            checked={!!value.weekend}
            onChange={(v) => set('weekend', v)}
          />
          <ToggleRow
            label="Permit required"
            description="Pulls permit; adds fixed fee."
            checked={!!value.permit_required}
            onChange={(v) => set('permit_required', v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <Label>
              Access difficulty: <span className="font-mono">{access.toFixed(2)}×</span>
            </Label>
            <Slider
              min={0.8}
              max={2.5}
              step={0.05}
              value={[access]}
              onValueChange={([v]) => set('access_difficulty', v)}
            />
            <p className="text-xs text-muted-foreground">
              Crawlspace, basement, locked rooms, narrow halls.
            </p>
          </div>
          <div className="space-y-2">
            <Label>
              Height factor: <span className="font-mono">{height.toFixed(2)}×</span>
            </Label>
            <Slider
              min={1}
              max={2.0}
              step={0.05}
              value={[height]}
              onValueChange={([v]) => set('height_factor', v)}
            />
            <p className="text-xs text-muted-foreground">
              Ladders, lifts, scaffolding. 1.0 = ground level.
            </p>
          </div>
          {value.permit_required && (
            <div className="space-y-2">
              <Label htmlFor="permit_fee">Permit fee (USD)</Label>
              <Input
                id="permit_fee"
                type="number"
                inputMode="decimal"
                min={0}
                value={(value.permit_fee as number | undefined) ?? ''}
                onChange={(e) => set('permit_fee', e.target.value ? Number(e.target.value) : 0)}
                placeholder="150"
                className="min-h-[44px]"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="travel_miles">Travel (miles, one-way)</Label>
            <Input
              id="travel_miles"
              type="number"
              inputMode="decimal"
              min={0}
              value={(value.travel_miles as number | undefined) ?? ''}
              onChange={(e) => set('travel_miles', e.target.value ? Number(e.target.value) : 0)}
              placeholder="12"
              className="min-h-[44px]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
