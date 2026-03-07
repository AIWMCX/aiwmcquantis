import React, { useState } from 'react';
import { AlertTriangle, Shield, ChevronDown, ChevronUp, Zap, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CriticalPathItem {
  assumption: string;
  sensitivity: number;
  breakingThreshold: number;
  currentValue: number;
  direction: string;
  recommendation: string;
}

interface AssumptionGraphData {
  nodes: Array<{ id: string; label: string; value: number; source: string; confidence: number }>;
  edges: Array<{ from: string; to: string; weight: number }>;
  criticalPath: CriticalPathItem[];
  fragility_score: number;
}

interface AssumptionGraphProps {
  graph?: AssumptionGraphData;
}

export function AssumptionGraph({ graph }: AssumptionGraphProps) {
  const [expanded, setExpanded] = useState(false);

  if (!graph || !graph.criticalPath?.length) return null;

  const fragilityColor = graph.fragility_score >= 60
    ? 'text-destructive'
    : graph.fragility_score >= 35
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400';

  const fragilityLabel = graph.fragility_score >= 60
    ? 'Fragile Model'
    : graph.fragility_score >= 35
    ? 'Moderate Fragility'
    : 'Robust Model';

  const fragilityBg = graph.fragility_score >= 60
    ? 'bg-destructive/10 border-destructive/30'
    : graph.fragility_score >= 35
    ? 'bg-amber-500/10 border-amber-500/30'
    : 'bg-emerald-500/10 border-emerald-500/30';

  return (
    <div className="section-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Assumption Critical Path
        </h3>
        <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold', fragilityBg, fragilityColor)}>
          <Zap className="w-4 h-4" />
          {graph.fragility_score}/100 — {fragilityLabel}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        These assumptions have the highest impact on your model. Small changes here cause the largest profit swings.
      </p>

      <div className="space-y-3">
        {graph.criticalPath.slice(0, expanded ? undefined : 3).map((item, i) => {
          const severityColor = item.sensitivity >= 0.7
            ? 'border-destructive/40 bg-destructive/5'
            : item.sensitivity >= 0.4
            ? 'border-amber-500/40 bg-amber-500/5'
            : 'border-border bg-muted/30';

          const barColor = item.sensitivity >= 0.7
            ? 'bg-destructive'
            : item.sensitivity >= 0.4
            ? 'bg-amber-500'
            : 'bg-emerald-500';

          return (
            <div key={i} className={cn('p-3 rounded-lg border', severityColor)}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                  <span className="text-sm font-semibold text-foreground">{item.assumption}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {item.direction === 'positive' ? '↑ helps' : item.direction === 'negative' ? '↑ hurts' : '↕ mixed'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-3 mb-1.5">
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className={cn('h-full rounded-full transition-all', barColor)} 
                      style={{ width: `${Math.round(item.sensitivity * 100)}%` }} 
                    />
                  </div>
                </div>
                <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                  {Math.round(item.sensitivity * 100)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  <TrendingDown className="w-3 h-3 inline mr-1" />
                  Breaks if changed by ±{Math.round(item.breakingThreshold)}%
                </span>
                <span className="font-mono">
                  Current: {typeof item.currentValue === 'number' && item.currentValue > 1 
                    ? `$${item.currentValue.toLocaleString()}`
                    : `${(item.currentValue * 100).toFixed(1)}%`}
                </span>
              </div>

              <p className="text-xs text-muted-foreground mt-1.5 italic">{item.recommendation}</p>
            </div>
          );
        })}
      </div>

      {graph.criticalPath.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-sm text-primary hover:underline flex items-center gap-1"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? 'Show less' : `Show ${graph.criticalPath.length - 3} more`}
        </button>
      )}
    </div>
  );
}
