/**
 * TwelveVariableGrid — renders the 12-variable PLUS analysis as a 4×3 grid
 * of compact cards. Each card shows rating chip, score, and the AI's
 * one-paragraph analysis.
 *
 * Backed by `usePlusAnalysis()` from `useSpecTier`. While idle, surfaces a
 * "Run PLUS analysis" prompt that the parent can wire to a real submit.
 */
import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldQuestion, ShieldX } from 'lucide-react';
import type { PlusAnalysisJson } from '@/services/specTierApi';

type Variable = PlusAnalysisJson['twelve_variables'][number];

const RATING_STYLES: Record<Variable['rating'], { icon: React.ElementType; chip: string }> = {
  STRONG: { icon: ShieldCheck, chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  ADEQUATE: { icon: ShieldQuestion, chip: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  WEAK: { icon: ShieldAlert, chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  CRITICAL: { icon: ShieldX, chip: 'bg-destructive/15 text-destructive border-destructive/30' },
};

interface Props {
  variables?: Variable[];
  isLoading?: boolean;
}

export function TwelveVariableGrid({ variables, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="q-card p-4 h-32 animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }
  if (!variables || variables.length === 0) {
    return (
      <div className="q-card p-6 text-sm text-muted-foreground text-center">
        Run a PLUS analysis to populate the 12-variable scorecard.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {variables.map((v) => {
        const style = RATING_STYLES[v.rating] ?? RATING_STYLES.ADEQUATE;
        const Icon = style.icon;
        return (
          <article
            key={v.variable_id}
            className="q-card p-4 flex flex-col gap-2 hover:border-primary/40 transition-colors"
          >
            <header className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-muted-foreground">
                #{v.variable_id.toString().padStart(2, '0')}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${style.chip}`}
              >
                <Icon className="w-3 h-3" />
                {v.rating}
              </span>
            </header>
            <h4 className="text-sm font-semibold text-foreground leading-tight">
              {v.variable_name}
            </h4>
            <p className="text-xs text-muted-foreground line-clamp-3">{v.analysis}</p>
            <footer className="flex items-center justify-between text-[11px] mt-auto pt-2 border-t border-border/40">
              <span className="text-muted-foreground">{v.data_point}</span>
              <span className="font-mono text-foreground">{v.score}/10</span>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
