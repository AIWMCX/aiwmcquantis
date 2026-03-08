import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONFIDENCE_BADGE_CONFIG, type ConfidenceTier } from '@/services/confidence-scorer';

export interface ExplainPanelProps {
  metricName: string;
  metricValue: number;
  unit: string;
  formulaSteps: { label: string; operation: string; value: number }[];
  benchmark: { p25: number; p50: number; p75: number; industryType: string };
  explanation: string;
  confidence: number;
  confidenceTier: ConfidenceTier;
  modelContributions: { model: string; weight: number; value: number }[];
  isOpen: boolean;
  onClose: () => void;
}

function getBenchmarkZone(value: number, b: { p25: number; p75: number }) {
  if (value >= b.p25 && value <= b.p75) return 'emerald';
  return 'destructive';
}

function getMarkerPosition(value: number, b: { p25: number; p50: number; p75: number }) {
  const range = b.p75 - b.p25;
  if (range === 0) return 50;
  // Map value to 10–90% of bar width, with p25 at 25% and p75 at 75%
  const normalized = ((value - b.p25) / range) * 50 + 25;
  return Math.max(2, Math.min(98, normalized));
}

export function ExplainPanel({
  metricName,
  metricValue,
  unit,
  formulaSteps,
  benchmark,
  explanation,
  confidence,
  confidenceTier,
  modelContributions,
  isOpen,
  onClose,
}: ExplainPanelProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const badgeConfig = CONFIDENCE_BADGE_CONFIG[confidenceTier];
  const zone = getBenchmarkZone(metricValue, benchmark);
  const markerPos = getMarkerPosition(metricValue, benchmark);
  const totalWeight = modelContributions.reduce((sum, m) => sum + m.weight, 0) || 1;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-50',
          'transition-transform duration-300 ease-out overflow-y-auto',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-label={`Explanation for ${metricName}`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{metricName}</h2>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono font-bold text-foreground">{metricValue.toLocaleString()}</span> {unit}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Section 1: Calculation Chain */}
          <section>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Calculation Chain</h3>
            <div className="space-y-2">
              {formulaSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="text-xs">
                    <span className="text-foreground">{step.label}</span>
                    <span className="text-muted-foreground"> = </span>
                    <span className="text-muted-foreground">{step.operation}</span>
                    <span className="text-muted-foreground"> = </span>
                    <span className="font-mono font-bold text-foreground">
                      {typeof step.value === 'number' ? step.value.toLocaleString() : step.value}
                    </span>
                  </div>
                </div>
              ))}
              {formulaSteps.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No detailed calculation steps available.</p>
              )}
            </div>
          </section>

          {/* Section 2: Benchmark Position */}
          <section>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Benchmark Position</h3>
            <p className="text-[10px] text-muted-foreground mb-2">
              Industry: {benchmark.industryType.replace(/_/g, ' ')}
            </p>
            <div className="relative h-8 rounded-lg bg-muted/30 border border-border">
              {/* P25 / P50 / P75 markers */}
              <div className="absolute top-0 h-full w-px bg-border" style={{ left: '25%' }} />
              <div className="absolute top-0 h-full w-px bg-primary/40" style={{ left: '50%' }} />
              <div className="absolute top-0 h-full w-px bg-border" style={{ left: '75%' }} />

              {/* Value marker */}
              <div
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-card shadow-sm transition-all duration-500',
                  zone === 'emerald' ? 'bg-emerald-500' : 'bg-destructive'
                )}
                style={{ left: `${markerPos}%` }}
              />

              {/* Labels */}
              <div className="absolute -bottom-4 text-[9px] text-muted-foreground font-mono" style={{ left: '25%', transform: 'translateX(-50%)' }}>
                p25: {benchmark.p25}
              </div>
              <div className="absolute -bottom-4 text-[9px] text-primary font-mono font-semibold" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                p50: {benchmark.p50}
              </div>
              <div className="absolute -bottom-4 text-[9px] text-muted-foreground font-mono" style={{ left: '75%', transform: 'translateX(-50%)' }}>
                p75: {benchmark.p75}
              </div>
            </div>
            <div className="mt-6" />
          </section>

          {/* Section 3: AI Model Contributions */}
          {modelContributions.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">AI Model Contributions</h3>
              <div className="space-y-2">
                {modelContributions.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-foreground w-20 truncate">{m.model}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all duration-500"
                        style={{ width: `${(m.weight / totalWeight) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono w-14 text-right">
                      {(m.weight * 100).toFixed(0)}% · {m.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 4: Confidence */}
          <section>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Confidence</h3>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                `bg-${badgeConfig.color}-500/10 text-${badgeConfig.color}-700 dark:text-${badgeConfig.color}-400 border-${badgeConfig.color}-500/30`
              )}>
                {badgeConfig.label}
              </span>
              <span className="text-sm font-mono font-bold text-foreground">{confidence.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{explanation}</p>
          </section>

          {/* Footer */}
          <div className="pt-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground">
              Data refreshed within this session
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
