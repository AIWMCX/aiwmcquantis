import { GlassCard } from '@/components/ui/glass-card';
import type { EvidenceItem } from '@/hooks/useFirstExperienceDemo';

interface Props {
  ledger: EvidenceItem[];
  inspected: Set<string>;
  onInspect: (id: string) => void;
}

export function EvidenceStep({ ledger, inspected, onInspect }: Props) {
  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold mb-1">Know what you know.</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Quantis does not treat every number the same way. Click each one to see whether it's a fact, or something the plan is assuming.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ledger.map((item) => {
          const isInspected = inspected.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onInspect(item.id)}
              className={`text-left rounded-lg border p-4 transition-colors ${
                isInspected ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    item.type === 'FACT' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'
                  }`}
                >
                  {item.type}
                </span>
              </div>
              <p className="text-xl font-bold text-foreground mb-2">{item.value}</p>
              {isInspected && <p className="text-xs text-muted-foreground">{item.why}</p>}
              {!isInspected && <p className="text-xs text-muted-foreground/60">Click to see why it matters</p>}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-5">Quantis separates evidence from assumptions.</p>
    </GlassCard>
  );
}
