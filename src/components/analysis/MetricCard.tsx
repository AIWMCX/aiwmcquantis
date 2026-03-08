import React, { useState } from 'react';
import { HelpCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExplainPanel, type ExplainPanelProps } from './ExplainPanel';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  positive?: boolean;
  trend?: 'up' | 'down';
  delta?: string;
  explainData?: Omit<ExplainPanelProps, 'isOpen' | 'onClose'>;
}

const isBlocked = (tier?: string) => tier === 'blocked';

export function ExplainableMetricCard({ label, value, positive = true, unit, trend, delta, explainData }: MetricCardProps) {
  const [explainOpen, setExplainOpen] = useState(false);
  const blocked = isBlocked(explainData?.confidenceTier);

  return (
    <>
      <div className="relative p-3 rounded-lg bg-[var(--q-bg-elevated)] border border-[var(--q-border-default)] text-center group">
        {/* Confidence dot */}
        {explainData && (
          <div className={cn(
            'absolute top-1.5 right-1.5 w-2 h-2 rounded-full',
            explainData.confidenceTier === 'verified' ? 'bg-[var(--q-status-green)]' :
            explainData.confidenceTier === 'confident' ? 'bg-[var(--q-accent-primary)]' :
            explainData.confidenceTier === 'estimated' ? 'bg-[var(--q-status-yellow)]' :
            explainData.confidenceTier === 'uncertain' ? 'bg-[var(--q-status-orange)]' :
            'bg-[var(--q-status-red)]'
          )} />
        )}

        {/* Explain [?] button — appears on hover */}
        {explainData && (
          <button
            onClick={() => setExplainOpen(true)}
            className="absolute top-1 left-1 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--q-bg-overlay)]"
            aria-label={`Explain ${label}`}
          >
            <HelpCircle className="w-3 h-3 text-[var(--q-text-tertiary)]" />
          </button>
        )}

        <p className="text-xs text-[var(--q-text-tertiary)] uppercase tracking-wide mb-0.5">{label}</p>
        <div className="flex items-center justify-center gap-1">
          {blocked ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-metric-sm text-[var(--q-text-disabled)] select-none" style={{ filter: 'blur(4px)' }}>
                    {value}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Low confidence — data insufficient</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
          <p className={cn(
            'text-metric-sm transition-all duration-300',
            positive ? 'text-[var(--q-status-green)]' : 'text-[var(--q-status-red)]'
          )}>
            {value}
          </p>
          {trend && (
            trend === 'up'
              ? <TrendingUp className="w-3 h-3 text-[var(--q-status-green)]" />
              : <TrendingDown className="w-3 h-3 text-[var(--q-status-red)]" />
          )}
        </div>
        {delta && <p className="text-[10px] text-[var(--q-text-tertiary)] mt-0.5">{delta}</p>}
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
