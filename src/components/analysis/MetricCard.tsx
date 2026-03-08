import React, { useState } from 'react';
import { HelpCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExplainPanel, type ExplainPanelProps } from './ExplainPanel';

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  positive?: boolean;
  trend?: 'up' | 'down';
  delta?: string;
  explainData?: Omit<ExplainPanelProps, 'isOpen' | 'onClose'>;
}

export function ExplainableMetricCard({ label, value, positive = true, unit, trend, delta, explainData }: MetricCardProps) {
  const [explainOpen, setExplainOpen] = useState(false);

  return (
    <>
      <div className="relative p-3 rounded-lg bg-muted/30 border border-border text-center group">
        {/* Confidence dot */}
        {explainData && (
          <div className={cn(
            'absolute top-1.5 right-1.5 w-2 h-2 rounded-full',
            explainData.confidenceTier === 'verified' ? 'bg-emerald-500' :
            explainData.confidenceTier === 'confident' ? 'bg-blue-500' :
            explainData.confidenceTier === 'estimated' ? 'bg-amber-500' :
            explainData.confidenceTier === 'uncertain' ? 'bg-orange-500' :
            'bg-destructive'
          )} />
        )}

        {/* Explain button */}
        {explainData && (
          <button
            onClick={() => setExplainOpen(true)}
            className="absolute top-1 left-1 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
            aria-label={`Explain ${label}`}
          >
            <HelpCircle className="w-3 h-3 text-muted-foreground" />
          </button>
        )}

        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
        <div className="flex items-center justify-center gap-1">
          <p className={cn(
            'text-base sm:text-lg font-bold tabular-nums transition-all duration-300',
            positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
          )}>
            {value}
          </p>
          {trend && (
            trend === 'up'
              ? <TrendingUp className="w-3 h-3 text-emerald-500" />
              : <TrendingDown className="w-3 h-3 text-destructive" />
          )}
        </div>
        {delta && <p className="text-[10px] text-muted-foreground mt-0.5">{delta}</p>}
      </div>

      {explainData && (
        <ExplainPanel
          {...explainData}
          isOpen={explainOpen}
          onClose={() => setExplainOpen(false)}
        />
      )}
    </>
  );
}
