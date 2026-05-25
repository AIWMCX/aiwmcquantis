import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import type { ServiceJobAssembly } from '@/lib/service-job/types';

interface Props {
  assemblies: ServiceJobAssembly[];
  onAdd: (assemblyId: string) => void;
  excludeIds?: Set<string>;
}

export function AssemblyPicker({ assemblies, onAdd, excludeIds }: Props) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return assemblies.filter((a) => {
      if (excludeIds?.has(a.id)) return false;
      if (!needle) return true;
      return (
        a.name.toLowerCase().includes(needle) ||
        a.code.toLowerCase().includes(needle)
      );
    });
  }, [assemblies, q, excludeIds]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search assemblies (e.g. outlet, breaker, fixture)…"
          className="min-h-[44px] pl-9"
        />
      </div>
      <div className="max-h-72 overflow-y-auto rounded-md border">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No assemblies match. Try another search.
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.code} • {a.labor_hours_p50}h typical • {a.unit}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="min-h-[36px] shrink-0"
                  onClick={() => onAdd(a.id)}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
