import React from 'react';
import { useActivation } from '@/hooks/useActivation';
import { BAND_META } from '@/lib/activationTracking';
import { Sparkles } from 'lucide-react';

/**
 * ActivationWidget — compact sidebar status card showing the user's
 * activation score, band, and next-best step.
 */
export function ActivationWidget({ collapsed = false }: { collapsed?: boolean }) {
  const { score, isPlus } = useActivation();

  if (isPlus) return null;
  if (collapsed) {
    return (
      <div className="mx-auto my-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {score.score}
      </div>
    );
  }

  const meta = BAND_META[score.band];
  return (
    <div className="mx-3 mb-3 rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Activation
        </span>
        <span className={`text-[10px] font-bold ${meta.tone}`}>
          {meta.label.toUpperCase()}
        </span>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold tabular-nums text-foreground">
          {score.score}
        </span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-2">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${score.score}%` }}
        />
      </div>
      <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug">
        <Sparkles className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
        <span>{score.next_step}</span>
      </div>
    </div>
  );
}
