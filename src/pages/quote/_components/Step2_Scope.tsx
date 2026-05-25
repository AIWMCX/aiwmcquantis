import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Trash2 } from 'lucide-react';
import { AssemblyPicker } from './AssemblyPicker';
import type { ScopeItem, ServiceJobAssembly } from '@/lib/service-job/types';

interface Props {
  assemblies: ServiceJobAssembly[];
  value: ScopeItem[];
  onChange: (next: ScopeItem[]) => void;
}

export function Step2_Scope({ assemblies, value, onChange }: Props) {
  const byId = useMemo(
    () => new Map(assemblies.map((a) => [a.id, a])),
    [assemblies],
  );
  const usedIds = useMemo(() => new Set(value.map((s) => s.assembly_id)), [value]);

  const addItem = (assembly_id: string) =>
    onChange([...value, { assembly_id, quantity: 1, difficulty_factor: 1 }]);

  const updateItem = (i: number, patch: Partial<ScopeItem>) =>
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const removeItem = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Scope of work</h2>
        <p className="text-sm text-muted-foreground">
          Pick the assemblies, set quantity, and adjust difficulty if conditions are unusual.
        </p>
      </div>

      <AssemblyPicker assemblies={assemblies} onAdd={addItem} excludeIds={usedIds} />

      {value.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No scope items yet. Add one above to begin.
        </div>
      ) : (
        <ul className="space-y-3">
          {value.map((item, i) => {
            const a = byId.get(item.assembly_id);
            return (
              <li key={`${item.assembly_id}-${i}`}>
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{a?.name ?? 'Unknown assembly'}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a?.code} · per {a?.unit}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(i)}
                        aria-label="Remove"
                        className="min-h-[44px] min-w-[44px]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={`qty-${i}`}>Quantity</Label>
                        <Input
                          id={`qty-${i}`}
                          type="number"
                          inputMode="decimal"
                          min={0.01}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(i, { quantity: Math.max(0.01, Number(e.target.value) || 0) })
                          }
                          className="min-h-[44px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>
                          Difficulty:{' '}
                          <span className="font-mono">{item.difficulty_factor.toFixed(2)}×</span>
                        </Label>
                        <Slider
                          min={0.5}
                          max={3}
                          step={0.05}
                          value={[item.difficulty_factor]}
                          onValueChange={([v]) => updateItem(i, { difficulty_factor: v })}
                          aria-label="Difficulty factor"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Easy</span>
                          <span>Standard</span>
                          <span>Brutal</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
